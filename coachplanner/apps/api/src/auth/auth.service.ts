import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from 'src/database/database.service';
import { RegisterOwnerDto } from './dto/create-auth.dto';
import { RegisterStudentDto } from './dto/register-student.dto'; 
import { LoginDto } from './dto/login.dto';
import { Role } from '@repo/database';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  async validateOAuthUser(profile: any) {
    let user = await this.db.user.findUnique({
      where: { email: profile.email },
      include: { 
        memberships: true,
        organizationsOwned: true
      }
    });

    if (!user) {
      user = await this.db.user.create({
        data: {
          email: profile.email,
          fullName: `${profile.firstName} ${profile.lastName}`,
          avatarUrl: profile.picture,
          provider: 'GOOGLE',
          emailVerified: new Date(),
        },
        include: { memberships: true, organizationsOwned: true }
      });
    } else {
      if (user.provider === 'GOOGLE' || !user.avatarUrl) {
         user = await this.db.user.update({
             where: { id: user.id },
             data: { 
                 avatarUrl: profile.picture,
                 emailVerified: user.emailVerified || new Date()
             },
             include: { memberships: true, organizationsOwned: true }
         });
      }
    }

    return this.generateJwt(user);
  }

  // --- NUEVO MÉTODO AGREGADO ---
  async joinGym(userId: string, slug: string) {
    // 1. Buscar la organización por slug
    const org = await this.db.organization.findFirst({
        where: { slug: { equals: slug, mode: 'insensitive' } },
        include: { owner: true } // Traemos al dueño para notificarle
    });

    if (!org) throw new NotFoundException('Gimnasio no encontrado');

    // 2. Verificar si ya es miembro
    const existing = await this.db.membership.findFirst({
        where: { userId, organizationId: org.id }
    });

    if (existing) {
        // Si ya es miembro, no hacemos nada, solo devolvemos éxito
        return { message: `Ya eres miembro de ${org.name}` };
    }

    // 3. Crear Membresía
    await this.db.membership.create({
        data: {
            userId,
            organizationId: org.id,
            role: Role.STUDENT
        }
    });

    // 4. Notificar al Alumno
    await this.notifications.create(
        userId,
        '¡Bienvenido! 👋',
        `Te has unido exitosamente a ${org.name}.`,
        'SUCCESS'
    );

    // 5. Notificar al Dueño (Si existe email y es válido para enviar)
    try {
        const student = await this.db.user.findUnique({ where: { id: userId } });
        const studentName = student?.fullName || 'Un nuevo alumno';
        
        if (org.owner && org.owner.email) {
             await this.emailService.sendNewStudentAlert(
                org.owner.email, 
                studentName, 
                org.name
            );
        }
    } catch (e) {
        console.error("Error enviando alerta al dueño:", e);
    }

    return { message: `Te has unido a ${org.name}` };
  }
  
  async verifyEmail(token: string) {
    const user = await this.db.user.findUnique({
      where: { verificationToken: token }
    });

    if (!user) {
        throw new NotFoundException('Token de verificación inválido o expirado.');
    }

    await this.db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null
      }
    });

    return { message: 'Correo verificado exitosamente', valid: true };
  }

  async register(dto: RegisterOwnerDto) {
    const existing = await this.db.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) throw new ConflictException('El email ya existe');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);
    
    // Explicitamos que es un string
    const verificationToken: string = uuidv4();

    try {
      const result = await this.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            fullName: dto.fullName,
            passwordHash: hashedPassword,
            verificationToken: verificationToken,
            emailVerified: null,
          },
        });

        const generatedSlug = dto.organizationName.toLowerCase().replace(/ /g, '-') + '-' + Math.floor(Math.random() * 1000);

        const org = await tx.organization.create({
          data: { 
            name: dto.organizationName, 
            ownerId: user.id,
            slug: generatedSlug 
          },
        });

        await tx.membership.create({
          data: { userId: user.id, organizationId: org.id, role: Role.OWNER },
        });

        return { 
            message: 'Usuario registrado correctamente', 
            userId: user.id,
            slug: org.slug,
            user: user,
            email: user.email
        };
      });

      try {
        // Aquí verificationToken siempre es string, así que es seguro
        await this.emailService.sendVerificationEmail(result.email, verificationToken);
      } catch (emailError) {
        console.error("❌ Error enviando email de verificación:", emailError);
      }
      try {
        await this.notifications.create(
          result.userId,
          '¡Bienvenido a la Plataforma! 👋',
          'Gracias por registrarte. Por favor verifica tu correo electrónico.',
          'INFO'
        );
      } catch (notifError) {
        console.error('Error enviando notificación de bienvenida:', notifError);
      }

      const { user, email, ...response } = result;
      return { ...response, message: 'Registro exitoso. Revisa tu correo para verificar tu cuenta.' };

    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error al registrar usuario');
    }
  }

  async getGymInfo(slug: string) {
    const organization = await this.db.organization.findFirst({
      where: { 
        slug: {
           equals: slug,
           mode: 'insensitive'
        }
      },
      select: { 
        name: true, 
        id: true,
        categories: {
          select: { id: true, name: true },
        }
      }
    });

    if (!organization) {
      throw new NotFoundException('El gimnasio no existe.');
    }

    return organization;
  }

  async registerStudent(slug: string, dto: RegisterStudentDto) {
    const organization = await this.db.organization.findFirst({
      where: { 
        slug: {
           equals: slug,
           mode: 'insensitive'
        }
      },
      include: { owner: true } // Incluimos dueño para notificar
    });

    if (!organization) {
      throw new NotFoundException('El gimnasio no existe o el enlace es incorrecto.');
    }

    const existingUser = await this.db.user.findUnique({
      where: { email: dto.email },
      include: { memberships: true }
    });

    let userIdToLink = '';
    let isNewUser = false;
    
    // CORRECCIÓN: Definimos explícitamente el tipo union
    let verificationToken: string | null = null; 

    if (existingUser) {
      if (!existingUser.passwordHash) {
        throw new ConflictException('El usuario ya existe pero no tiene contraseña configurada. Contacta soporte o entra con Google.');
      }
      const isMatch = await bcrypt.compare(dto.password, existingUser.passwordHash);
      if (!isMatch) {
        throw new ConflictException('El usuario ya existe. Ingresa tu contraseña actual para unirte a este gimnasio.');
      }

      if (!existingUser.emailVerified) {
          throw new UnauthorizedException('Debes verificar tu correo antes de unirte.');
      }

      const isAlreadyMember = existingUser.memberships.some(m => m.organizationId === organization.id);
      if (isAlreadyMember) {
        throw new ConflictException('Ya eres miembro de este gimnasio. Inicia sesión.');
      }
      userIdToLink = existingUser.id;
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(dto.password, salt);
      
      // Asignamos el valor, ahora TypeScript sabe que es un string válido dentro de este bloque
      verificationToken = uuidv4(); 

      const newUser = await this.db.user.create({
        data: {
          email: dto.email,
          fullName: dto.name, 
          passwordHash: hashedPassword,
          verificationToken: verificationToken,
          emailVerified: null
        },
      });
      userIdToLink = newUser.id;
      isNewUser = true;
    }

    try {
      await this.db.membership.create({
        data: {
          userId: userIdToLink,
          organizationId: organization.id,
          role: Role.STUDENT,
          categoryId: dto.categoryId, 
        }
      });

      if (isNewUser) {
          try {
             // CORRECCIÓN: Validamos que no sea null
             if (verificationToken) {
                await this.emailService.sendVerificationEmail(dto.email, verificationToken);
             }
          } catch (e) { console.error(e); }

          await this.notifications.create(
            userIdToLink,
            '¡Bienvenido! 👋',
            `Gracias por registrarte. Verifica tu correo para continuar.`,
            'INFO'
          );
      } else {
        await this.notifications.create(
            userIdToLink,
            'Nueva Organización Agregado 🏋️',
            `Te has unido exitosamente a ${organization.name}.`,
            'SUCCESS'
        );
      }

      // Notificar al dueño sobre el nuevo alumno
      try {
        if (organization.owner && organization.owner.email) {
            await this.emailService.sendNewStudentAlert(
                organization.owner.email, 
                dto.name, 
                organization.name
            );
        }
      } catch (e) { console.error(e); }

      return { 
        message: existingUser 
          ? `¡Cuenta vinculada! Bienvenido a ${organization.name}` 
          : `Registro exitoso. Revisa tu correo para verificar tu cuenta.`,
        userId: userIdToLink 
      };

    } catch (error) {
      console.error('Error creando membresía:', error);
      throw new InternalServerErrorException('Error al unirse al gimnasio.');
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.db.user.findUnique({ 
      where: { email },
      include: { 
        memberships: true,
        organizationsOwned: true
      }
    });
    
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.emailVerified) {
        throw new UnauthorizedException('Debes verificar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');
   
    return this.generateJwt(user);
  }

  async impersonateUser(targetUserId: string) {
    const user = await this.db.user.findUnique({
      where: { id: targetUserId },
      include: {
        memberships: true,
        organizationsOwned: true
      }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.generateJwt(user);
  }

  async getPublicAnnouncement() {
    return this.db.announcement.findFirst({
      where: { isActive: true },
      select: { message: true, type: true }
    });
  }

  async signTokenForUser(user: any) {
    const payload = { 
        sub: user.id, 
        email: user.email, 
        role: user.role,
        orgId: user.orgId || user.organizationId,
        fullName: user.fullName, 
        avatarUrl: user.avatarUrl
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: user
    };
  }

  private generateJwt(user: any) {
    let primaryRole: Role = Role.STUDENT; 
    let orgId: string | null = null; 

    if (user.role === Role.ADMIN) {
        primaryRole = Role.ADMIN;
        if (user.organizationsOwned.length > 0) {
            orgId = user.organizationsOwned[0].id;
        }
    } 
    else if (user.organizationsOwned.length > 0) {
      primaryRole = Role.OWNER;
      orgId = user.organizationsOwned[0].id;
      const ownedOrg = user.organizationsOwned[0];
      if (ownedOrg && !ownedOrg.isActive) {
        throw new UnauthorizedException('Tu gimnasio ha sido suspendido. Contacta a soporte.');
      }
    } else if (user.memberships.length > 0) {
      primaryRole = user.memberships[0].role;
      orgId = user.memberships[0].organizationId;
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: primaryRole,
      orgId: orgId,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: primaryRole,
        organizationId: orgId 
      }
    };
  }
}