import type { Response } from 'express'; 
import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request, Param, Res, Query, BadRequestException } from '@nestjs/common';
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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {
    // Inicia el flujo
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    console.log("🔵 [Backend] Google Callback recibido");
    
    // 1. Validamos usuario
    const result = await this.authService.validateOAuthUser(req.user);
    
    console.log("🟢 [Backend] Usuario validado:", req.user.email);

    // 2. Definimos URL del frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log("👉 [Backend] Redirigiendo a:", `${frontendUrl}/auth/callback`);

    // 3. Redirección
    return res.redirect(`${frontendUrl}/auth/callback?token=${result.access_token}&status=success`);
  }

  @Get('verify')
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
        throw new BadRequestException('Falta el token de verificación');
    }
    return this.authService.verifyEmail(token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('join')
  async joinGym(@Request() req, @Body('slug') slug: string) {
    return this.authService.joinGym(req.user.id, slug);
  }

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

  @Post('impersonate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async impersonate(@Body('userId') userId: string) {
    return this.authService.impersonateUser(userId);
  }

  @Get('global-announcement') 
  getGlobalAnnouncement() {
    return this.authService.getPublicAnnouncement();
  }
}