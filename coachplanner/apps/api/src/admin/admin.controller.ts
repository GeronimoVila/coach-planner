import { Controller, Get, Patch, Param, UseGuards, NotFoundException, Query, Body, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@repo/database';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(@Query('q') q?: string) {
    return this.adminService.getUsers(q);
  }

  @Get('users/:id')
  async getUserDetails(@Param('id') id: string) {
    const user = await this.adminService.getUserDetails(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  @Get('organizations')
  getOrganizations() {
    return this.adminService.getOrganizations();
  }

  @Patch('organizations/:id/status')
  toggleStatus(@Param('id') id: string) {
    return this.adminService.toggleOrganizationStatus(id);
  }

  @Patch('users/:id/email')
  async updateUserEmail(
    @Param('id') id: string,
    @Body('email') email: string
  ) {
    return this.adminService.updateUserEmail(id, email);
  }

  @Patch('users/:id/password')
  async resetPassword(
    @Param('id') id: string,
    @Body('password') password: string
  ) {
    return this.adminService.resetUserPassword(id, password);
  }

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('announcement')
  getAnnouncementConfig() {
    return this.adminService.getAnnouncement();
  }

  @Post('announcement')
  updateAnnouncement(@Body() body: { message: string; isActive: boolean; type: string }) {
    return this.adminService.updateAnnouncement(body.message, body.isActive, body.type);
  }
}