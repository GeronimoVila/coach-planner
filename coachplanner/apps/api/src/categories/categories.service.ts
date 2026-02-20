import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DatabaseService } from 'src/database/database.service';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly plansService: PlansService
  ) {}

  async create(createCategoryDto: CreateCategoryDto, orgId: string) {
    await this.plansService.validateCreateCategory(orgId);

    return this.db.category.create({
      data: {
        name: createCategoryDto.name,
        organizationId: orgId,
      },
    });
  }

  async findAll(orgId: string, includeAll: boolean = false) {
    return this.db.category.findMany({
      where: { 
        organizationId: orgId,
        ...(includeAll ? {} : { isActive: true })
      },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: number, orgId: string) {
    const category = await this.db.category.findUnique({
      where: { id },
    });

    if (!category || category.organizationId !== orgId) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto, orgId: string) {
    await this.findOne(id, orgId);

    return this.db.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async toggleStatus(id: number, orgId: string) {
    const category = await this.findOne(id, orgId);

    return this.db.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
  }

  async remove(id: number, orgId: string) {
    await this.findOne(id, orgId);
    return this.db.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}