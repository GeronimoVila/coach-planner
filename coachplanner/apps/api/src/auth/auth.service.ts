import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from 'src/database/database.service';
import { RegisterOwnerDto } from './dto/create-auth.dto';
import { RegisterStudentDto } from './dto/register-student.dto'; 
import { LoginDto } from './dto/login.dto';
import { Role } from '@repo/database';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly notifications: NotificationsService
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
        },
        include: { memberships: true, organizationsOwned: true }
      });
    } else {
      if (user.provider === 'GOOGLE' || !user.avatarUrl) {
         user = await this.db.user.update({
             where: { id: user.id },
             data: { avatarUrl: profile.picture },
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
        where: { slug: { equals: slug, mode: 'insensitive' } }
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

    // 4. Notificar
    await this.notifications.create(
        userId,
        '¡Bienvenido! 👋',
        `Te has unido exitosamente a ${org.name}.`,
        'SUCCESS'
    );

    return { message: `Te has unido a ${org.name}` };
  }
  // ----------------------------

  async register(dto: RegisterOwnerDto) {
    // ... (El código existente sigue igual)
    const existing = await this.db.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) throw new ConflictException('El email ya existe');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    try {
      const result = await this.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            fullName: dto.fullName,
            passwordHash: hashedPassword,
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
            user: user
        };
      });
      try {
        await this.notifications.create(
          result.userId,
          '¡Bienvenido a la Plataforma! 👋',
          'Gracias por registrar tu negocio. Aquí podrás gestionar tus clases, alumnos y créditos.',
          'INFO'
        );
      } catch (notifError) {
        console.error('Error enviando notificación de bienvenida:', notifError);
      }

      const { user, ...response } = result;
      return response;

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
    // ... (El código existente sigue igual)
    const organization = await this.db.organization.findFirst({
      where: { 
        slug: {
           equals: slug,
           mode: 'insensitive'
        }
      },
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

    if (existingUser) {
      if (!existingUser.passwordHash) {
        throw new ConflictException('El usuario ya existe pero no tiene contraseña configurada. Contacta soporte o entra con Google.');
      }
      const isMatch = await bcrypt.compare(dto.password, existingUser.passwordHash);
      if (!isMatch) {
        throw new ConflictException('El usuario ya existe. Ingresa tu contraseña actual para unirte a este gimnasio.');
      }
      const isAlreadyMember = existingUser.memberships.some(m => m.organizationId === organization.id);
      if (isAlreadyMember) {
        throw new ConflictException('Ya eres miembro de este gimnasio. Inicia sesión.');
      }
      userIdToLink = existingUser.id;
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(dto.password, salt);
      const newUser = await this.db.user.create({
        data: {
          email: dto.email,
          fullName: dto.name, 
          passwordHash: hashedPassword,
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
        await this.notifications.create(
            userIdToLink,
            '¡Bienvenido! 👋',
            `Gracias por registrarte. Te has unido exitosamente a ${organization.name}.`,
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

      return { 
        message: existingUser 
          ? `¡Cuenta vinculada! Bienvenido a ${organization.name}` 
          : `Registro exitoso. Bienvenido a ${organization.name}`,
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