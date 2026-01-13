import { PartialType } from '@nestjs/swagger';
import { CreateCreditPackageDto } from './create-credit-package.dto';

export class UpdateCreditPackageDto extends PartialType(CreateCreditPackageDto) {}
