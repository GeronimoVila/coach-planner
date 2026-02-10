import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { CreateOnboardingOrgDto } from './dto/create-onboarding-org.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@repo/database';
import { AuthService } from 'src/auth/auth.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly authService: AuthService
  ) {}

  @Post('onboarding')
  async createOnboarding(@Request() req, @Body() dto: CreateOnboardingOrgDto) {
    // 1. Crear organización
    const org = await this.organizationsService.createOnboarding(req.user.id, dto);

    // 2. Preparar datos del usuario con los nuevos permisos
    const updatedUser = {
        id: req.user.id,
        email: req.user.email,
        role: Role.OWNER,
        orgId: org.id
    };

    // 3. Generar nuevo token SIN pedir contraseña
    // USAMOS EL MÉTODO NUEVO AQUÍ 👇
    const tokenResult = await this.authService.signTokenForUser(updatedUser);

    // 4. Devolver token y organización
    return {
        ...tokenResult,
        organization: org
    };
  }

  @Get('config')
  getConfig(@Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.organizationsService.getConfig(orgId);
  }

  @Patch('config')
  @Roles(Role.OWNER, Role.ADMIN)
  updateConfig(@Request() req, @Body() updateConfigDto: UpdateConfigDto) {
    return this.organizationsService.updateConfig(req.user.orgId, updateConfigDto);
  }
}