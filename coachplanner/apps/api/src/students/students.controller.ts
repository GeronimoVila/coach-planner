import { Body, Controller, Get, Post, Request, UseGuards, Patch, Param, BadRequestException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@repo/database';
import { UpdateCategoryDto } from './dto/update-category.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me')
  @Roles(Role.STUDENT)
  getMe(@Request() req) {
    const userId = req.user.id || req.user.userId;
    const orgId = req.user.orgId || req.user.organizationId;
    
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
  @Roles(Role.OWNER, Role.ADMIN)
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
          where: { organizationId: orgId },
          select: { id: true, name: true }
      });
  }
}