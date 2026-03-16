import { Controller, Get, Patch, Param, UseGuards, NotFoundException, Query, Body, Post, Delete } from '@nestjs/common';
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
  @Roles(Role.ADMIN)
  async getUsers(
    @Query('q') query?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('status') status?: string
  ) {
    return this.adminService.getUsers(
      query, 
      page ? Number(page) : 1, 
      limit ? Number(limit) : 10,
      role,
      status
    );
  }

  @Get('users/:id')
  async getUserDetails(@Param('id') id: string) {
    const user = await this.adminService.getUserDetails(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  @Get('organizations')
  @Roles(Role.ADMIN)
  async getOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string
  ) {
    return this.adminService.getOrganizations(
      page ? Number(page) : 1, 
      limit ? Number(limit) : 10,
      search,
      status,
      plan
    );
  }

  @Patch('organizations/:id/status')
  toggleStatus(@Param('id') id: string) {
    return this.adminService.toggleOrganizationStatus(id);
  }

  @Patch('organizations/:id/plan')
  updatePlan(
    @Param('id') id: string,
    @Body('plan') plan: string
  ) {
    return this.adminService.updateOrganizationPlan(id, plan);
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

  @Get('users/:id/activity')
  async getAdminActivity(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    return this.adminService.getAdminActivity(id, Number(page), Number(limit));
  }

  @Delete('users/:id')
  @Roles(Role.ADMIN)
  async deleteUser(@Param('id') id: string) {
    return this.adminService.softDeleteUser(id);
  }

  @Patch('users/:id/restore')
  @Roles(Role.ADMIN)
  async restoreUser(@Param('id') id: string) {
    return this.adminService.restoreUser(id);
  }
}