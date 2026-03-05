import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from 'src/database/database.service';
import { RegisterOwnerDto } from './dto/create-auth.dto';
import { RegisterStudentDto } from './dto/register-student.dto'; 
import { LoginDto } from './dto/login.dto';
import { Role, PlanType } from '@repo/database';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService,
    private readonly plansService: PlansService
  ) {}

  async validateOAuthUser(profile: any, action: string = 'login') {
    let user = await this.db.user.findUnique({
      where: { email: profile.email },
      include: { 
        memberships: true,
        organizationsOwned: true
      }
    });

    if (!user) {
      if (action === 'login') {
         throw new NotFoundException('user_not_found');
      } 
      else {
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
      }
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

  async joinGym(userId: string, slug: string) {
    const org = await this.db.organization.findFirst({
        where: { slug: { equals: slug, mode: 'insensitive' } },
        include: { owner: true } 
    });

    if (!org) throw new NotFoundException('Gimnasio no encontrado');

    await this.plansService.validateAddStudent(org.id);

    const existing = await this.db.membership.findFirst({
        where: { userId, organizationId: org.id }
    });

    if (existing) {
        return { message: `Ya eres miembro de ${org.name}` };
    }

    await this.db.membership.create({
        data: {
            userId,
            organizationId: org.id,
            role: Role.STUDENT
        }
    });

    await this.notifications.create(
        userId,
        '¡Bienvenido! 👋',
        `Te has unido exitosamente a ${org.name}.`,
        'SUCCESS'
    );

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
      throw new InternalServerErrorException('Ocurrió un error inesperado al crear tu cuenta. Por favor, intenta de nuevo en unos minutos.');
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
        plan: true,
        categories: {
          where: { isActive: true },
          select: { id: true, name: true },
        }
      }
    });

    if (!organization) {
      throw new NotFoundException('El gimnasio no existe.');
    }

    let isFull = false;
    if (organization.plan === PlanType.FREE) {
        const limits = await this.db.planLimits.findUnique({ where: { plan: PlanType.FREE } });
        if (limits) {
            const currentStudents = await this.db.membership.count({
                where: { organizationId: organization.id, role: Role.STUDENT }
            });
            if (currentStudents >= limits.maxStudents) {
                isFull = true;
            }
        }
    }

    return {
        ...organization,
        isFull
    };
  }

  async registerStudent(slug: string, dto: RegisterStudentDto) {
    const organization = await this.db.organization.findFirst({
      where: { 
        slug: {
           equals: slug,
           mode: 'insensitive'
        }
      },
      include: { owner: true }
    });

    if (!organization) {
      throw new NotFoundException('El gimnasio no existe o el enlace es incorrecto.');
    }

    await this.plansService.validateAddStudent(organization.id);

    return this.db.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
            where: { email: dto.email },
            include: { memberships: true }
        });

        let userIdToLink = '';
        let isNewUser = false;
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
            
            verificationToken = uuidv4(); 

            const newUser = await tx.user.create({
                data: {
                    email: dto.email,
                    fullName: dto.name, 
                    phoneNumber: dto.phoneNumber,
                    passwordHash: hashedPassword,
                    verificationToken: verificationToken,
                    emailVerified: null
                },
            });
            userIdToLink = newUser.id;
            isNewUser = true;
        }

        await tx.membership.create({
            data: {
                userId: userIdToLink,
                organizationId: organization.id,
                role: Role.STUDENT,
                categoryId: dto.categoryId, 
            }
        });

        this.sendPostRegisterActions(isNewUser, dto, userIdToLink, verificationToken, organization);

        return { 
            message: existingUser 
                ? `¡Cuenta vinculada! Bienvenido a ${organization.name}` 
                : `Registro exitoso. Revisa tu correo para verificar tu cuenta.`,
            userId: userIdToLink 
        };
    });
  }

  private async sendPostRegisterActions(isNewUser: boolean, dto: any, userId: string, token: string | null, org: any) {
      try {
          if (isNewUser) {
              if (token) await this.emailService.sendVerificationEmail(dto.email, token);
              await this.notifications.create(
                  userId, '¡Bienvenido! 👋', `Gracias por registrarte. Verifica tu correo para continuar.`, 'INFO'
              );
          } else {
              await this.notifications.create(
                  userId, 'Nueva Organización Agregado 🏋️', `Te has unido exitosamente a ${org.name}.`, 'SUCCESS'
              );
          }
          
          if (org.owner && org.owner.email) {
              await this.emailService.sendNewStudentAlert(org.owner.email, dto.name, org.name);
          }
      } catch (e) {
          console.error("Error en acciones post-registro:", e);
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
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Tu cuenta está vinculada a Google. Por favor, inicia sesión con Google.');
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

  async getMyGyms(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: { select: { id: true, name: true, slug: true } }
          }
        },
        organizationsOwned: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const gyms: any[] = [];

    user.organizationsOwned?.forEach(org => {
        gyms.push({ id: org.id, name: org.name, slug: org.slug, role: Role.OWNER });
    });

    user.memberships?.forEach(m => {
        if (!gyms.find(g => g.id === m.organization.id)) {
            gyms.push({ id: m.organization.id, name: m.organization.name, slug: m.organization.slug, role: m.role });
        }
    });

    return gyms;
  }

  async switchGym(userId: string, targetOrgId: string) {
      const user = await this.db.user.findUnique({
          where: { id: userId },
          include: { memberships: true, organizationsOwned: true }
      });

      if (!user) throw new NotFoundException('Usuario no encontrado');

      const hasAccess = user.memberships.some(m => m.organizationId === targetOrgId) || 
                        user.organizationsOwned.some(o => o.id === targetOrgId);

      if (!hasAccess && user.role !== Role.ADMIN) {
          throw new UnauthorizedException('No tienes acceso a este gimnasio');
      }

      return this.generateJwt(user, targetOrgId);
  }

  private generateJwt(user: any, targetOrgId?: string) {
    let primaryRole: Role = Role.STUDENT; 
    let orgId: string | null = null; 
    let categoryId: number | null = null;
    let plan: string = 'FREE'; 

    if (targetOrgId) {
        const ownedOrg = user.organizationsOwned?.find((o: any) => o.id === targetOrgId);
        const membership = user.memberships?.find((m: any) => m.organizationId === targetOrgId);

        if (user.role === Role.ADMIN) {
            primaryRole = Role.ADMIN;
            orgId = targetOrgId;
        } else if (ownedOrg) {
            primaryRole = Role.OWNER;
            orgId = ownedOrg.id;
            plan = ownedOrg.plan || 'FREE';
            if (!ownedOrg.isActive) throw new UnauthorizedException('Tu gimnasio ha sido suspendido.');
        } else if (membership) {
            primaryRole = membership.role;
            orgId = membership.organizationId;
            categoryId = membership.categoryId;
        }
    } else {
        if (user.role === Role.ADMIN) {
            primaryRole = Role.ADMIN;
            if (user.organizationsOwned && user.organizationsOwned.length > 0) {
                orgId = user.organizationsOwned[0].id;
                plan = user.organizationsOwned[0].plan || 'FREE';
            }
        } 
        else if (user.organizationsOwned && user.organizationsOwned.length > 0) {
          primaryRole = Role.OWNER;
          orgId = user.organizationsOwned[0].id;
          plan = user.organizationsOwned[0].plan || 'FREE';
          
          const ownedOrg = user.organizationsOwned[0];
          if (ownedOrg && !ownedOrg.isActive) {
            throw new UnauthorizedException('Tu gimnasio ha sido suspendido. Contacta a soporte.');
          }
        } else if (user.memberships && user.memberships.length > 0) {
          primaryRole = user.memberships[0].role;
          orgId = user.memberships[0].organizationId;
          categoryId = user.memberships[0].categoryId;
        }
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: primaryRole,
      orgId: orgId,
      categoryId: categoryId,
      plan: plan,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      phoneNumber: user.phoneNumber
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        phoneNumber: user.phoneNumber,
        role: primaryRole,
        organizationId: orgId,
        categoryId: categoryId,
        plan: plan
      }
    };
  }

  async forgotPassword(email: string) {
    const user = await this.db.user.findFirst({ 
        where: { 
            email: {
                equals: email.toLowerCase().trim(),
                mode: 'insensitive'
            } 
        } 
    });

    if (!user) {
        console.warn("❌ [AuthService] Usuario no encontrado para el email:", email);
        return { message: 'Si el correo existe en nuestro sistema, recibirás un enlace para recuperar tu cuenta.' };
    }

    if (user.provider === 'GOOGLE') {
        console.warn("⚠️ [AuthService] El usuario se registró con Google. No se puede resetear password manual.");
        return { message: 'Tu cuenta está vinculada a Google. Por favor, inicia sesión con Google.' };
    }

    const token = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); 

    try {
        await this.db.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: expires
            }
        });
    } catch (dbError) {
        console.error("🔥 [AuthService] Error crítico actualizando el token en la BD:", dbError);
        throw new InternalServerErrorException('Ocurrió un problema temporal al generar tu enlace de recuperación. Inténtalo de nuevo.');
    }

    try {
        await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (mailError) {
        console.error("🔥 [AuthService] Error al enviar el email:", mailError);
    }

    return { message: 'Si el correo existe en nuestro sistema, recibirás un enlace para recuperar tu cuenta.' };
  }

  async resetPassword(token: string, newPassword: string) {

    const user = await this.db.user.findUnique({
        where: { resetPasswordToken: token }
    });

    if (!user) {
        console.error("❌ [AuthService] Token no encontrado en la base de datos.");
        throw new BadRequestException('El enlace es inválido o ya ha sido utilizado.');
    }

    if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) {
        console.error("⏰ [AuthService] El token ha expirado. Expiración:", user.resetPasswordExpires);
        throw new BadRequestException('El enlace ha expirado. Solicita uno nuevo.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.db.user.update({
        where: { id: user.id },
        data: {
            passwordHash: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        }
    });

    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }

  async refreshToken(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        memberships: true,
        organizationsOwned: true
      }
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    return this.generateJwt(user);
  }
}