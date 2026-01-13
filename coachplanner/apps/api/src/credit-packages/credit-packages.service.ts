import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';

@Injectable()
export class CreditPackagesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateCreditPackageDto, orgId: string) {
    const membership = await this.db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: dto.studentId,
          organizationId: orgId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('El alumno no pertenece a tu gimnasio.');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + dto.daysValid);

    return this.db.$transaction(async (tx) => {
      const creditPackage = await tx.creditPackage.create({
        data: {
          membershipId: membership.id,
          initialAmount: dto.amount,
          remainingAmount: dto.amount,
          expiresAt: expiresAt,
          name: dto.name,
        },
      });

      await tx.membership.update({
        where: { id: membership.id },
        data: {
          credits: { increment: dto.amount },
        },
      });

      return creditPackage;
    });
  }

  async findAllByStudent(studentId: string, orgId: string) {
    const membership = await this.db.membership.findUnique({
      where: { userId_organizationId: { userId: studentId, organizationId: orgId } }
    });

    if (!membership) return [];

    return this.db.creditPackage.findMany({
      where: { membershipId: membership.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}