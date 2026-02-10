import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@repo/database';
import { RolesGuard } from '../auth/roles.guard';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req) {
    const { id, role, orgId, userId } = req.user;
    const finalUserId = id || userId;
    return this.dashboardService.getStats(finalUserId, role, orgId);
  }

  @Get('admin-stats')
  @Roles(Role.ADMIN)
  async getAdminStats() {
    return this.dashboardService.getAdminStats();
  }
}