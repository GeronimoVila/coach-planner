import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdatePhoneDto {
  @IsNotEmpty({ message: 'El número de celular es obligatorio' })
  @IsString()
  @MinLength(8, { message: 'El número de celular debe tener al menos 8 caracteres' })
  phoneNumber: string;
}