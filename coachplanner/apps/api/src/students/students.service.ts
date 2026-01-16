import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@repo/database';
import { CreateStudentDto } from './dto/create-student.dto'; 

@Injectable()
export class StudentsService {
  constructor(private readonly db: DatabaseService) {}

  async create(data: CreateStudentDto, orgId: string) {
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
        categoryId: data.categoryId, 
      },
      include: {
        user: true,
      },
    });
  }

  async findAll(orgId: string) {
    const memberships = await this.db.membership.findMany({
      where: { organizationId: orgId, role: Role.STUDENT },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        category: { select: { id: true, name: true } }
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
      categoryName: m.category?.name || 'General',
      categoryId: m.categoryId,
    }));
  }

  async update(userId: string, orgId: string, data: { categoryId?: number | null }) {
    const membership = await this.db.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } }
    });

    if (!membership) throw new NotFoundException('Alumno no encontrado');

    return this.db.membership.update({
      where: { id: membership.id },
      data: {
        categoryId: data.categoryId
      }
    });
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
        creditPackages: {
          where: {
            expiresAt: { gt: new Date() },
            remainingAmount: { gt: 0 },
          },
        },
      }
    });

    if (!membership) {
      return { credits: 0, fullName: '', bookingsCount: 0 };
    }

    const realValidCredits = membership.creditPackages.reduce(
      (sum, pkg) => sum + pkg.remainingAmount, 
      0
    );

    return {
      id: membership.userId,
      fullName: membership.user.fullName,
      email: membership.user.email,
      credits: realValidCredits,
      role: membership.role,
      categoryId: membership.categoryId,
    };
  }
}