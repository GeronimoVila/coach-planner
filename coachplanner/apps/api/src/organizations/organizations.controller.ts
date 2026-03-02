import { Body, Controller, Get, Patch, Post, Delete, Param, Request, UseGuards } from '@nestjs/common';
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
    const org = await this.organizationsService.createOnboarding(req.user.id, dto);

    const updatedUser = {
        id: req.user.id,
        email: req.user.email,
        role: Role.OWNER,
        orgId: org.id
    };

    const tokenResult = await this.authService.signTokenForUser(updatedUser);

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

  @Post('links')
  @Roles(Role.OWNER, Role.ADMIN)
  addLink(@Request() req, @Body() body: { label: string, url: string }) {
    return this.organizationsService.addLink(req.user.orgId, body.label, body.url);
  }

  @Delete('links/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  removeLink(@Request() req, @Param('id') linkId: string) {
    return this.organizationsService.removeLink(req.user.orgId, linkId);
  }

  @Patch('links/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  updateLink(@Request() req, @Param('id') linkId: string, @Body() body: { label?: string, url?: string, isActive?: boolean }) {
    return this.organizationsService.updateLink(req.user.orgId, linkId, body);
  }
}