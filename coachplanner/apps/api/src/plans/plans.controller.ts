import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@repo/database';

@Controller('plans')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get('limits')
  @Roles(Role.ADMIN)
  getLimits() {
    return this.plansService.getLimits();
  }

  @Patch('limits')
  @Roles(Role.ADMIN)
  updateLimits(@Body() body: any) {
    return this.plansService.updateLimits(body);
  }
}