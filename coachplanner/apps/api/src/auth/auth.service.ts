import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from 'src/database/database.service';
import { RegisterOwnerDto } from './dto/create-auth.dto';
import { RegisterStudentDto } from './dto/register-student.dto'; 
import { LoginDto } from './dto/login.dto';
import { Role } from '@repo/database';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterOwnerDto) {
    const existing = await this.db.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) throw new ConflictException('El email ya existe');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    try {
      return await this.db.$transaction(async (tx) => {
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
            slug: org.slug 
        };
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error al registrar usuario');
    }
  }

  async registerStudent(slug: string, dto: RegisterStudentDto) {
    const organization = await this.db.organization.findUnique({
      where: { slug: slug },
    });

    if (!organization) {
      throw new NotFoundException('El gimnasio no existe o el enlace es incorrecto.');
    }

    const existingUser = await this.db.user.findUnique({
      where: { email: dto.email },
      include: { memberships: true }
    });

    let userIdToLink = '';

    if (existingUser) {
      
      if (!existingUser.passwordHash) {
        throw new ConflictException('El usuario ya existe pero no tiene contraseña configurada. Contacta soporte.');
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

    let primaryRole: Role = Role.STUDENT; 
    let orgId: string | null = null; 

    if (user.organizationsOwned.length > 0) {
      primaryRole = Role.OWNER;
      orgId = user.organizationsOwned[0].id;
    } else if (user.memberships.length > 0) {
      primaryRole = user.memberships[0].role;
      orgId = user.memberships[0].organizationId;
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: primaryRole,
      orgId: orgId
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: primaryRole,
        organizationId: orgId 
      }
    };
  }

  async getGymInfo(slug: string) {
    const organization = await this.db.organization.findUnique({
      where: { slug: slug },
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
}