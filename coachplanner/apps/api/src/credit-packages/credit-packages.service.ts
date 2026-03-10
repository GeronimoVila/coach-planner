import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class CreditPackagesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  async create(dto: CreateCreditPackageDto, orgId: string, adminId: string) {
    const membership = await this.db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: dto.studentId,
          organizationId: orgId,
        },
      },
      include: { user: true }
    });

    if (!membership) {
      throw new NotFoundException('El alumno no pertenece a tu gimnasio.');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + dto.daysValid);

    const result = await this.db.$transaction(async (tx) => {
      const creditPackage = await tx.creditPackage.create({
        data: {
          membershipId: membership.id,
          initialAmount: dto.amount,
          remainingAmount: dto.amount,
          expiresAt: expiresAt,
          name: dto.name,
        },
      });

      const updatedMembership = await tx.membership.update({
        where: { id: membership.id },
        data: {
          credits: { increment: dto.amount },
        },
      });

      await tx.creditTransaction.create({
        data: {
          membershipId: membership.id,
          creditPackageId: creditPackage.id,
          userId: dto.studentId,
          performedById: adminId,
          amount: dto.amount,
          type: 'MANUAL_ADD',
          description: `Pack añadido: ${dto.name}`,
        }
      });

      return { creditPackage, updatedMembership };
    });

    try {
        const expiresStr = expiresAt.toLocaleDateString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires'
        });

        await this.notifications.create(
          dto.studentId,
          '¡Pack de Créditos Activado! 🎒',
          `Se han acreditado ${dto.amount} clases del pack "${dto.name}". Vencen el ${expiresStr}.`,
          'SUCCESS',
          orgId
        );
        if (membership.user && membership.user.email) {
            await this.emailService.sendBalanceAdded(
                membership.user.email,
                dto.amount,
                result.updatedMembership.credits
            );
        }

    } catch (error) {
        console.error('Error enviando notificación/email de paquete:', error);
    }

    return result.creditPackage;
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