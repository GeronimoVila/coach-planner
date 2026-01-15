import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@repo/database';

@Injectable()
export class StudentsService {
  constructor(private readonly db: DatabaseService) {}

  async create(data: { email: string; fullName: string }, orgId: string) {
    let user = await this.db.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      user = await this.db.user.create({
        data: {
          email: data.email,
          fullName: data.fullName,
          passwordHash: hashedPassword,
        },
      });
    }

    const existingMembership = await this.db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('Este usuario ya está registrado en tu gimnasio.');
    }

    return this.db.membership.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: Role.STUDENT,
      },
      include: {
        user: true,
      },
    });
  }

  async findAll(orgId: string) {
    const memberships = await this.db.membership.findMany({
      where: {
        organizationId: orgId,
        role: Role.STUDENT, 
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      id: m.userId,
      membershipId: m.id,
      fullName: m.user.fullName,
      email: m.user.email,
      joinedAt: m.joinedAt,
      role: m.role,
      credits: m.credits,
    }));
  }

  async findMe(userId: string, orgId: string) {
    const membership = await this.db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: userId,
          organizationId: orgId,
        },
      },
      include: {
        user: true,
      }
    });

    if (!membership) {
      return { credits: 0, fullName: '', bookingsCount: 0 };
    }

    return {
      id: membership.userId,
      fullName: membership.user.fullName,
      email: membership.user.email,
      credits: membership.credits,
      role: membership.role,
    };
  }
}