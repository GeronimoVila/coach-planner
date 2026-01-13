import { Module } from '@nestjs/common';
import { CreditPackagesService } from './credit-packages.service';
import { CreditPackagesController } from './credit-packages.controller';

@Module({
  controllers: [CreditPackagesController],
  providers: [CreditPackagesService],
})
export class CreditPackagesModule {}
