import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { DatabaseService } from 'src/database/database.service';
import { BookingStatus } from '@repo/database';
import { CloneWeekDto } from './dto/clone-week.dto';

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
      include: { 
        category: true,
        bookings: {
          where: { status: BookingStatus.CONFIRMED }, 
          include: { 
             user: true
          }
        }
      }
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

  async getSchedule(orgId: string, userId: string, startStr: string, endStr: string) {
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    const classes = await this.db.classSession.findMany({
      where: {
        organizationId: orgId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        isCancelled: false,
      },
      include: {
        instructor: { select: { fullName: true } },
        category: { select: { name: true } },
        bookings: {
          where: { status: BookingStatus.CONFIRMED },
          select: { userId: true }
        }
      },
      orderBy: { startTime: 'asc' },
    });

    return classes.map((cls) => {
      const isBookedByMe = cls.bookings.some(b => b.userId === userId);
      
      const bookedCount = cls.bookings.length;

      return {
        id: cls.id,
        title: cls.title,
        description: cls.description,
        startTime: cls.startTime,
        endTime: cls.endTime,
        instructorName: cls.instructor.fullName,
        categoryName: cls.category?.name || 'General',
        categoryId: cls.categoryId,
        capacity: cls.capacity,
        bookedCount: bookedCount,
        isFull: bookedCount >= cls.capacity,
        availableSlots: cls.capacity - bookedCount,
        isBookedByMe: isBookedByMe, 
      };
    });
  }
  async cancelClassSession(id: string, orgId: string) {
    return this.db.$transaction(async (tx) => {
      const session = await tx.classSession.findUnique({
        where: { id, organizationId: orgId },
        include: { bookings: { where: { status: BookingStatus.CONFIRMED } } } 
      });

      if (!session) throw new NotFoundException('Clase no encontrada');
      if (session.isCancelled) throw new BadRequestException('La clase ya estaba cancelada');

      await tx.classSession.update({
        where: { id },
        data: { isCancelled: true }
      });

      for (const booking of session.bookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED }
        });

        await tx.creditPackage.update({
          where: { id: booking.creditPackageId },
          data: { remainingAmount: { increment: 1 } }
        });
        
        await tx.membership.update({
            where: { userId_organizationId: { userId: booking.userId, organizationId: orgId } },
            data: { credits: { increment: 1 } }
        });
      }

      return { message: `Clase cancelada. Se reembolsaron ${session.bookings.length} créditos.` };
    });
  }

  async cloneWeek(orgId: string, dto: CloneWeekDto) {
    return this.db.$transaction(async (tx) => {
      const sourceStart = new Date(dto.sourceWeekStart);
      const targetStart = new Date(dto.targetWeekStart);

      const sourceEnd = new Date(sourceStart);
      sourceEnd.setDate(sourceEnd.getDate() + 7);

      const sourceClasses = await tx.classSession.findMany({
        where: {
          organizationId: orgId,
          startTime: {
            gte: sourceStart,
            lt: sourceEnd,
          },
          isCancelled: false,
        },
      });

      if (sourceClasses.length === 0) {
        return { count: 0, message: 'No hay clases para clonar en la semana seleccionada.' };
      }

      const timeDiff = targetStart.getTime() - sourceStart.getTime();

      const newClassesData = sourceClasses.map((cls) => {
        const newStartTime = new Date(cls.startTime.getTime() + timeDiff);
        const newEndTime = new Date(cls.endTime.getTime() + timeDiff);

        return {
          organizationId: orgId,
          title: cls.title,
          description: cls.description,
          startTime: newStartTime,
          endTime: newEndTime,
          capacity: cls.capacity,
          categoryId: cls.categoryId,
          instructorId: cls.instructorId,
          isCancelled: false,
        };
      });

      const result = await tx.classSession.createMany({
        data: newClassesData,
      });

      return { 
        count: result.count, 
        message: `Se clonaron ${result.count} clases exitosamente a la semana del ${targetStart.toLocaleDateString()}.` 
      };
    });
  }
}