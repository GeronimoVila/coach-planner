import { Controller, Post, Body, UseGuards, Request, Get, Param, Req } from '@nestjs/common';
import { CreditPackagesService } from './credit-packages.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@repo/database';
import { ActiveOrganizationGuard } from '../auth/guards/active-organization.guard';

@UseGuards(AuthGuard('jwt'), ActiveOrganizationGuard, RolesGuard)
@Controller('credit-packages')
export class CreditPackagesController {
  constructor(private readonly creditPackagesService: CreditPackagesService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.STAFF, Role.INSTRUCTOR)
  async createPackage(@Body() dto: CreateCreditPackageDto, @Req() req) {
    const orgId = req.user.orgId; 
    const adminId = req.user.id;
    return this.creditPackagesService.create(dto, orgId, adminId);
  }

  @Get('student/:studentId')
  @Roles(Role.OWNER, Role.ADMIN, Role.STAFF, Role.INSTRUCTOR)
  getHistoryAdmin(@Request() req, @Param('studentId') studentId: string) {
    const orgId = req.user.orgId || req.user.organizationId;
    return this.creditPackagesService.findAllByStudent(studentId, orgId);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  getMyHistory(@Request() req) {
    const orgId = req.user.orgId || req.user.organizationId;
    const myUserId = req.user.id || req.user.userId || req.user.sub;
    return this.creditPackagesService.findAllByStudent(myUserId, orgId);
  }
}