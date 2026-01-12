import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

export class RegisterStudentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}