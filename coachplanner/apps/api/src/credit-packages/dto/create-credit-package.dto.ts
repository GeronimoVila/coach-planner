import { IsInt, IsNotEmpty, IsPositive, IsString, IsUUID, Min } from 'class-validator';

export class CreateCreditPackageDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsInt()
  @Min(1)
  daysValid: number;

  @IsString()
  @IsNotEmpty()
  name: string;
}