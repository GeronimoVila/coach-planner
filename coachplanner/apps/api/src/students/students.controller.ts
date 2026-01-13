import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@repo/database';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.INSTRUCTOR)
  create(@Request() req, @Body() body: { email: string; fullName: string }) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.studentsService.create(body, orgId);
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.INSTRUCTOR)
  findAll(@Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.studentsService.findAll(orgId);
  }
}