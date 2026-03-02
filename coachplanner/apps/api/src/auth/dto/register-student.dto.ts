import { IsEmail, IsNotEmpty, MinLength, IsString, IsOptional, IsNumber } from 'class-validator';

export class RegisterStudentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsNotEmpty({ message: 'El número de celular es obligatorio' })
  @IsString()
  @MinLength(8, { message: 'El número de celular debe tener al menos 8 caracteres' })
  phoneNumber: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;
}