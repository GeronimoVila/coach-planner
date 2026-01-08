import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { RegisterOwnerDto } from './dto/create-auth.dto';
import { Role } from '@repo/database'; 

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async register(dto: RegisterOwnerDto) {
    // 1. Verificar duplicados
    const existing = await this.db.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existing) throw new ConflictException('Usuario o Email ya existe');

    try {
      // 2. Transacción
      return await this.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            username: dto.username,
            fullName: dto.fullName,
            passwordHash: dto.password, 
          },
        });

        const organization = await tx.organization.create({
          data: {
            name: dto.organizationName,
            ownerId: user.id,
          },
        });

        await tx.membership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: Role.OWNER,
          },
        });

        return { 
          message: 'Usuario registrado con éxito',
          user_id: user.id,
          organization: organization.name 
        };
      });

    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error creando el usuario');
    }
  }
}