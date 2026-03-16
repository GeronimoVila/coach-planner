import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@repo/database';
import { ActiveOrganizationGuard } from '../auth/guards/active-organization.guard';

@UseGuards(AuthGuard('jwt'), ActiveOrganizationGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OWNER)
  create(@Body() createCategoryDto: CreateCategoryDto, @Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.categoriesService.create(createCategoryDto, orgId);
  }

  @Get()
  findAll(@Request() req, @Query('all') all?: string) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.categoriesService.findAll(orgId, all === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.categoriesService.findOne(+id, orgId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto, @Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.categoriesService.update(+id, updateCategoryDto, orgId);
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN, Role.OWNER)
  toggleStatus(@Param('id') id: string, @Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.categoriesService.toggleStatus(+id, orgId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  remove(@Param('id') id: string, @Request() req) {
    const orgId = req.user.organizationId || req.user.orgId;
    return this.categoriesService.remove(+id, orgId);
  }
}