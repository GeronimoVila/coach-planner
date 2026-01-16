import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly db: DatabaseService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyMaintenance() {
    this.logger.log('Iniciando mantenimiento nocturno...');

    await this.checkExpiredCredits();
    
    this.logger.log('Mantenimiento finalizado.');
  }

  private async checkExpiredCredits() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const expiredPackages = await this.db.creditPackage.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
          gt: yesterday
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
      }
    } else {
      this.logger.log('No hubo vencimientos de créditos ayer.');
    }
  }
}