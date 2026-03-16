import { Body, Controller, Get, Post, Request, UseGuards, Patch, Param, BadRequestException, Query } from '@nestjs/common';
import { StudentsService } from './students.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@repo/database';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { ActiveOrganizationGuard } from '../auth/guards/active-organization.guard';

@UseGuards(AuthGuard('jwt'), ActiveOrganizationGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me')
  @Roles(Role.STUDENT)
  getMe(@Request() req) {
    const userId = req.user.id || req.user.userId;
    const orgId = req.user.orgId || req.user.organizationId;
    if (!orgId) {
       throw new BadRequestException('El usuario no está asociado a ninguna organización en la sesión actual');
    }
    
    return this.studentsService.findMe(userId, orgId);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.INSTRUCTOR)
  create(@Request() req, @Body() body: { email: string; fullName: string }) {
    const orgId = req.user.orgId || req.user.organizationId;
    return this.studentsService.create(body, orgId);
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.INSTRUCTOR)
  findAll(@Request() req) {
    const orgId = req.user.orgId || req.user.organizationId;
    return this.studentsService.findAll(orgId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.STAFF, Role.INSTRUCTOR)
  update(
    @Request() req, 
    @Param('id') studentId: string, 
    @Body() body: { categoryId?: number }
  ) {
    const orgId = req.user.orgId || req.user.organizationId;
    return this.studentsService.update(studentId, orgId, body);
  }

  @Patch('me/category')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async updateMyCategory(@Request() req, @Body() dto: UpdateCategoryDto) {
    const userId = req.user.id;
    const orgId = req.user.orgId;

    if (!orgId) {
       throw new BadRequestException('No se identificó la organización en la sesión.');
    }

    const updatedMembership = await this.studentsService.updateCategory(userId, orgId, dto.categoryId);
    
    return { 
      message: 'Categoría actualizada correctamente', 
      categoryId: updatedMembership.categoryId 
    };
  }

  @Get('me/available-categories')
  @UseGuards(JwtAuthGuard)
  async getAvailableCategories(@Request() req) {
      const orgId = req.user.orgId;
      if (!orgId) throw new BadRequestException('Sin organización');
      
      return this.studentsService['db'].category.findMany({ 
          where: { 
            organizationId: orgId,
            isActive: true 
          },
          select: { id: true, name: true }
      });
  }

  @Patch('me/phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async updateMyPhone(@Request() req, @Body() dto: UpdatePhoneDto) {
    const userId = req.user.id;

    await this.studentsService.updatePhone(userId, dto.phoneNumber);
    
    return { 
      message: 'Teléfono actualizado correctamente' 
    }
  };

@Get(':id/credit-history')
  @Roles(Role.OWNER, Role.ADMIN, Role.STAFF, Role.INSTRUCTOR)
  async getStudentCreditHistory(
    @Request() req,
    @Param('id') studentId: string,
    @Query('orgId') queryOrgId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    let orgIdToFilter = queryOrgId;
    
    if (req.user.role !== Role.ADMIN) {
      orgIdToFilter = req.user.orgId || req.user.organizationId;
    }

    return this.studentsService.getCreditHistory(
      studentId, 
      orgIdToFilter, 
      Number(page), 
      Number(limit)
    );
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.STAFF, Role.INSTRUCTOR)
  findOne(@Request() req, @Param('id') studentId: string) {
    const orgId = req.user.orgId || req.user.organizationId;
    return this.studentsService.findOne(studentId, orgId);
  }
}