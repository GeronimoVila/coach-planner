import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { CreditPackagesService } from './credit-packages.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@repo/database';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('credit-packages')
export class CreditPackagesController {
  constructor(private readonly creditPackagesService: CreditPackagesService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  create(@Request() req, @Body() createCreditPackageDto: CreateCreditPackageDto) {
    const orgId = req.user.orgId;
    return this.creditPackagesService.create(createCreditPackageDto, orgId);
  }

  @Get('student/:studentId')
  @Roles(Role.OWNER, Role.ADMIN)
  getHistoryAdmin(@Request() req, @Param('studentId') studentId: string) {
    const orgId = req.user.orgId;
    return this.creditPackagesService.findAllByStudent(studentId, orgId);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  getMyHistory(@Request() req) {
    const orgId = req.user.orgId;
    const myUserId = req.user.userId || req.user.sub;
    return this.creditPackagesService.findAllByStudent(myUserId, orgId);
  }
}