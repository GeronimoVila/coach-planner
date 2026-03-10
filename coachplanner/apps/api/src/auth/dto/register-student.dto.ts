import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsNumber } from 'class-validator';

export class RegisterStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;
}