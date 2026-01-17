import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from 'src/database/database.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyMaintenance() {
    this.logger.log('Iniciando mantenimiento nocturno...');

    await this.checkExpiredCredits();
    await this.notifyExpiringSoon();
    
    this.logger.log('Mantenimiento finalizado.');
  }

  private async checkExpiredCredits() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0,0,0,0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23,59,59,999);
    const expiredPackages = await this.db.creditPackage.findMany({
      where: {
        expiresAt: {
          gte: startOfYesterday,
          lte: endOfYesterday
        },
        remainingAmount: { gt: 0 }
      },
      include: {
        membership: { include: { user: true } }
      }
    });

    if (expiredPackages.length > 0) {
      this.logger.warn(`Se encontraron ${expiredPackages.length} paquetes vencidos ayer con saldo remanente.`);
      
      for (const pkg of expiredPackages) {
        this.logger.log(
          `   - Usuario: ${pkg.membership.user.email} | Perdió: ${pkg.remainingAmount} créditos.`
        );

        await this.notifications.create(
            pkg.membership.userId,
            'Créditos Vencidos ❌',
            `Tu pack "${pkg.name || 'de créditos'}" ha expirado.`,
            'INFO'
        );
      }
    } else {
      this.logger.log('No hubo vencimientos de créditos ayer.');
    }
  }

  private async notifyExpiringSoon() {
    const daysInAdvance = 3;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysInAdvance);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23,59,59,999);

    const packagesExpiringSoon = await this.db.creditPackage.findMany({
        where: {
            expiresAt: {
                gte: startOfDay,
                lte: endOfDay
            },
            remainingAmount: { gt: 0 }
        },
        include: {
            membership: { include: { user: true } }
        }
    });

    if (packagesExpiringSoon.length > 0) {
        this.logger.log(`Enviando alertas de vencimiento para ${packagesExpiringSoon.length} paquetes.`);

        for (const pkg of packagesExpiringSoon) {
            await this.notifications.create(
                pkg.membership.userId,
                'Tu pack vence pronto ⏳',
                `Te quedan ${pkg.remainingAmount} clases en tu pack "${pkg.name || 'Créditos'}" que vencen el ${pkg.expiresAt.toLocaleDateString()}. ¡Úsalos!`,
                'WARNING'
            );
        }
    }
  }
}