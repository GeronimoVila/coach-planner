import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CreditPackagesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService
  ) {}

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

    const newPackage = await this.db.$transaction(async (tx) => {
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
    try {
        await this.notifications.create(
          dto.studentId,
          '¡Pack de Créditos Activado! 🎒',
          `Se han acreditado ${dto.amount} clases del pack "${dto.name}". Vencen el ${expiresAt.toLocaleDateString()}.`,
          'SUCCESS'
        );
    } catch (error) {
        console.error('Error enviando notificación de paquete:', error);
    }

    return newPackage;
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