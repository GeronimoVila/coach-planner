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
    });

    if (existingUser) {
      throw new ConflictException('Este correo ya está registrado en la plataforma.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    try {
      return await this.db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: dto.email,
            fullName: dto.name, 
            passwordHash: hashedPassword,
          },
        });

        await tx.membership.create({
          data: {
            userId: newUser.id,
            organizationId: organization.id,
            role: Role.STUDENT,
          }
        });

        return { message: `Bienvenido a ${organization.name}`, userId: newUser.id };
      });

    } catch (error) {
      console.error('Error registrando alumno:', error);
      throw new InternalServerErrorException('Error al crear la cuenta del alumno.');
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.db.user.findUnique({ 
      where: { email },
      include: { memberships: true }
    });
    
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

    const primaryRole = user.memberships.length > 0 ? user.memberships[0].role : Role.STUDENT;
    const orgId = user.memberships.length > 0 ? user.memberships[0].organizationId : null;

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
        role: primaryRole,
        organizationId: orgId 
      }
    };
  }

  async getGymInfo(slug: string) {
  const organization = await this.db.organization.findUnique({
    where: { slug: slug },
    select: { name: true, id: true }
  });

  if (!organization) {
    throw new NotFoundException('El gimnasio no existe.');
  }

  return organization;
}
}