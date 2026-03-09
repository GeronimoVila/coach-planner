import type { Response } from 'express'; 
import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request, Param, Res, Query, BadRequestException, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterOwnerDto } from './dto/create-auth.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { LoginDto } from './dto/login.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { Role } from '@repo/database';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    return {
      state: req.query.action || 'login',
    };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Request() req) {
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Res() res: Response, @Query('state') state: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const action = state || 'login';

    try {
      const result = await this.authService.validateOAuthUser(req.user, action);
      return res.redirect(`${frontendUrl}/auth/callback?token=${result.access_token}&status=success`);
    } catch (error: any) {
      if (error.status === 404 || error.message === 'user_not_found') {
        return res.redirect(`${frontendUrl}/login?error=not_registered`);
      }
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
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

  @Post('register-invited')
  registerInvited(@Body() dto: any) {
    if (!dto.token || !dto.password || !dto.fullName) {
      throw new BadRequestException('Faltan datos requeridos');
    }
    return this.authService.registerInvited(dto);
  }

  @Get('invitations/info/:token')
  getInvitationInfo(@Param('token') token: string) {
    return this.authService.getInvitationInfo(token);
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

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    if (!email) throw new BadRequestException('El email es obligatorio');
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string, 
    @Body('password') password: string
  ) {
    if (!token || !password) throw new BadRequestException('Faltan datos');
    if (password.length < 6) throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    
    return this.authService.resetPassword(token, password);
  }

  @Get('my-gyms')
  @UseGuards(JwtAuthGuard)
  getMyGyms(@Request() req) {
    return this.authService.getMyGyms(req.user.id);
  }

  @Post('switch-gym')
  @UseGuards(JwtAuthGuard)
  switchGym(@Request() req, @Body('targetOrgId') targetOrgId: string) {
    return this.authService.switchGym(req.user.id, targetOrgId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('refresh')
  async refreshSession(@Request() req) {
    return this.authService.refreshToken(req.user.id);
  }
}