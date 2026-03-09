import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@repo/database';

export class CreateInvitationDto {
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @IsNotEmpty()
  email: string;

  @IsEnum([Role.INSTRUCTOR, Role.STAFF], { 
    message: 'El rol debe ser INSTRUCTOR o STAFF' 
  })
  @IsNotEmpty()
  role: Role;
}