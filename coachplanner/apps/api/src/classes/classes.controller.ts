import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Query, BadRequestException, Patch } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@repo/database';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OWNER, Role.INSTRUCTOR)
  create(@Body() createClassDto: CreateClassDto, @Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;

    const instructorId = req.user.id || req.user.sub || req.user.userId;

    if (!instructorId) {
      console.error('User Object:', req.user);
      throw new BadRequestException('No se pudo identificar al instructor. Token inválido.');
    }
    return this.classesService.create(createClassDto, orgId, instructorId);
  }

  @Get('schedule')
  getSchedule(
    @Request() req,
    @Query('start') start: string,
    @Query('end') end: string
  ) {
    const orgId = req.user.orgId;
    const userId = req.user.userId;
    return this.classesService.getSchedule(orgId, userId, start, end);
  }

  @Get()
  findAll(@Request() req, @Query('start') start?: string, @Query('end') end?: string) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.classesService.findAll(orgId, start, end);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.classesService.findOne(id, orgId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  remove(@Param('id') id: string, @Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.classesService.remove(id, orgId);
  }

  @Patch(':id/cancel')
  @Roles(Role.OWNER, Role.ADMIN, Role.INSTRUCTOR)
  cancelSession(@Request() req, @Param('id') id: string) {
    return this.classesService.cancelClassSession(id, req.user.orgId);
  }
}