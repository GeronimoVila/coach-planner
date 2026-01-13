import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ClassesService {
  constructor(private readonly db: DatabaseService) {}

  async create(createClassDto: CreateClassDto, orgId: string, instructorId: string) {
    if (createClassDto.startTime >= createClassDto.endTime) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la de fin');
    }

    const now = new Date();
    if (new Date(createClassDto.startTime) < now) {
      throw new BadRequestException('No puedes crear una clase en el pasado');
    }

    const category = await this.db.category.findUnique({
      where: { id: createClassDto.categoryId },
    });

    if (!category || category.organizationId !== orgId) {
      throw new BadRequestException('La categoría seleccionada no es válida');
    }

    return this.db.classSession.create({
      data: {
        ...createClassDto,
        organizationId: orgId,
        instructorId: instructorId,
      },
    });
  }

  async findAll(orgId: string, start?: string, end?: string) {
    const whereClause: any = { organizationId: orgId };
    if (start && end) {
      whereClause.startTime = { gte: new Date(start), lte: new Date(end) };
    }
    return this.db.classSession.findMany({
      where: whereClause,
      include: { category: true, _count: { select: { bookings: true } } },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const classSession = await this.db.classSession.findUnique({
      where: { id },
      include: { bookings: true }
    });

    if (!classSession || classSession.organizationId !== orgId) {
      throw new NotFoundException('Clase no encontrada');
    }

    return classSession;
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return this.db.classSession.delete({ where: { id } });
  }
}