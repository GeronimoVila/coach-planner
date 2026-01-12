import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class RegisterOwnerDto {
  @IsNotEmpty()
  @IsString()
  organizationName: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}