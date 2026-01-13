import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@repo/database';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('config')
  getConfig(@Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.organizationsService.getConfig(orgId);
  }

  @Patch('config')
  @Roles(Role.OWNER, Role.ADMIN)
  updateConfig(@Request() req, @Body('slotDurationMinutes') duration: number) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.organizationsService.updateConfig(orgId, duration);
  }
}