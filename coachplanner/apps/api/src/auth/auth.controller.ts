import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterOwnerDto } from './dto/create-auth.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { LoginDto } from './dto/login.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { Role } from '@repo/database';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterOwnerDto) {
    return this.authService.register(dto);
  }

  @Post('register/:slug')
  registerStudent(
    @Param('slug') slug: string, 
    @Body() dto: RegisterStudentDto
  ) {
    return this.authService.registerStudent(slug, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('gym-info/:slug')
  getGymInfo(@Param('slug') slug: string) {
    return this.authService.getGymInfo(slug);
  }

  // --- RUTA PROTEGIDA ---
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return {
      message: '¡Acceso autorizado!',
      user_data: req.user
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER)
  @Get('admin-only')
  getAdminData() {
    return { message: 'Hola Jefe, aquí tienes los datos secretos 💰' };
  }
}