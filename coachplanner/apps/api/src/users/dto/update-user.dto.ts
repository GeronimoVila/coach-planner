import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @ValidateIf(o => o.fullName !== '' && o.fullName !== null)
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @ValidateIf(o => o.phoneNumber !== '' && o.phoneNumber !== null)
  @IsString()
  @MinLength(8, { message: 'El número de celular debe tener al menos 8 caracteres' })
  phoneNumber?: string;
}