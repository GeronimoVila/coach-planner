import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { DatabaseService } from 'src/database/database.service';
import { BookingStatus } from '@repo/database';
import { CloneWeekDto } from './dto/clone-week.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class ClassesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService,
    private readonly plansService: PlansService
  ) {}

  async create(createClassDto: CreateClassDto, orgId: string, instructorId: string) {
    await this.plansService.validateCreateClass(orgId, 1);

    if (createClassDto.startTime >= createClassDto.endTime) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la de fin');
    }

    const now = new Date();
    if (new Date(createClassDto.startTime) < now) {
      throw new BadRequestException('No puedes crear una clase en el pasado');
    }

    if (createClassDto.categoryIds && createClassDto.categoryIds.length > 0) {
        const validCategories = await this.db.category.count({
          where: { 
              id: { in: createClassDto.categoryIds },
              organizationId: orgId 
          }
        });

        if (validCategories !== createClassDto.categoryIds.length) {
          throw new BadRequestException('Una o más categorías seleccionadas no son válidas');
        }
    }

    return this.db.classSession.create({
      data: {
        title: createClassDto.title,
        description: createClassDto.description,
        startTime: createClassDto.startTime,
        endTime: createClassDto.endTime,
        capacity: createClassDto.capacity,
        organizationId: orgId,
        instructorId: instructorId,
        categories: {
            create: createClassDto.categoryIds?.map(id => ({
                categoryId: id
            })) || []
        }
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
      include: { 
          categories: { include: { category: true } }, 
          _count: { select: { bookings: true } } 
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const classSession = await this.db.classSession.findUnique({
      where: { id },
      include: { 
        categories: { include: { category: true } },
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
        categories: { include: { category: { select: { id: true, name: true } } } },
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
      const categoryNames = cls.categories.map(c => c.category.name);
      const categoryIds = cls.categories.map(c => c.category.id);

      return {
        id: cls.id,
        title: cls.title,
        description: cls.description,
        startTime: cls.startTime,
        endTime: cls.endTime,
        instructorName: cls.instructor.fullName,
        categoryNames: categoryNames.length > 0 ? categoryNames : ['General'],
        categoryIds: categoryIds,
        capacity: cls.capacity,
        bookedCount: bookedCount,
        isFull: bookedCount >= cls.capacity,
        availableSlots: cls.capacity - bookedCount,
        isBookedByMe: isBookedByMe, 
      };
    });
  }

  async cancelClassSession(id: string, orgId: string) {
    const transactionResult = await this.db.$transaction(async (tx) => {
      const session = await tx.classSession.findUnique({
        where: { id, organizationId: orgId },
        include: { 
            bookings: { 
                where: { status: BookingStatus.CONFIRMED },
                include: { user: true }
            } 
        } 
      });

      if (!session) throw new NotFoundException('Clase no encontrada');
      if (session.isCancelled) throw new BadRequestException('La clase ya estaba cancelada');

      await tx.classSession.update({
        where: { id },
        data: { isCancelled: true }
      });

      const now = new Date();
      const shouldRefund = session.startTime > now; 

      for (const booking of session.bookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED }
        });

        if (shouldRefund) {
            await tx.creditPackage.update({
              where: { id: booking.creditPackageId },
              data: { remainingAmount: { increment: 1 } }
            });
            
            await tx.membership.update({
                where: { userId_organizationId: { userId: booking.userId, organizationId: orgId } },
                data: { credits: { increment: 1 } }
            });
        }
      }

      const message = shouldRefund 
        ? `Clase cancelada. Se reembolsaron ${session.bookings.length} créditos.`
        : `Clase del pasado cancelada. No se reembolsaron créditos.`;

      return { 
        session,
        shouldRefund,
        message 
      };
    });

    if (transactionResult.session.bookings.length > 0) {
      const formattedDate = transactionResult.session.startTime.toLocaleDateString('es-ES', { 
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
      });
      const className = transactionResult.session.title;

      const notifMessage = transactionResult.shouldRefund
        ? `El profesor ha cancelado la clase de "${className}" del ${formattedDate}. Se te ha reembolsado el crédito.`
        : `El profesor ha cancelado el registro de la clase pasada de "${className}" del ${formattedDate}.`;

      const promises = transactionResult.session.bookings.map(async (booking) => {
        await this.notifications.create(
          booking.userId,
          'Clase Cancelada',
          notifMessage,
          'WARNING'
        );

        try {
            if (booking.user.email) {
                await this.emailService.sendClassCancellation(
                    booking.user.email,
                    className,
                    formattedDate
                );
            }
        } catch (emailError) {
            console.error(`Error enviando email de cancelación a ${booking.userId}:`, emailError);
        }
      });
      
      await Promise.all(promises);
    }

    return { message: transactionResult.message };
  }

  async cloneWeek(orgId: string, dto: CloneWeekDto) {
    await this.plansService.validateCreateClass(orgId, 1);

    return this.db.$transaction(async (tx) => {
      const sourceStart = new Date(dto.sourceWeekStart);
      const targetStart = new Date(dto.targetWeekStart);

      const sourceEnd = new Date(sourceStart);
      sourceEnd.setDate(sourceEnd.getDate() + 7);

      const targetEnd = new Date(targetStart);
      targetEnd.setDate(targetEnd.getDate() + 7);

      const sourceClasses = await tx.classSession.findMany({
        where: {
          organizationId: orgId,
          startTime: {
            gte: sourceStart,
            lte: sourceEnd,
          },
          isCancelled: false,
        },
        include: {
           categories: true
        }
      });

      if (sourceClasses.length === 0) {
        return { count: 0, message: 'No hay clases para clonar en la semana seleccionada.' };
      }

      const existingTargetClasses = await tx.classSession.findMany({
        where: {
          organizationId: orgId,
          startTime: {
            gte: targetStart,
            lte: targetEnd,
          },
          isCancelled: false,
        },
      });

      const timeDiff = targetStart.getTime() - sourceStart.getTime();
      let createdCount = 0;
      let skippedCount = 0;

      for (const cls of sourceClasses) {
        const newStartTime = new Date(cls.startTime.getTime() + timeDiff);
        const newEndTime = new Date(cls.endTime.getTime() + timeDiff);

        const isOccupied = existingTargetClasses.some((existing) => {
          return newStartTime < existing.endTime && newEndTime > existing.startTime;
        });

        if (isOccupied) {
          skippedCount++;
          continue;
        }

        await tx.classSession.create({
          data: {
            organizationId: orgId,
            title: cls.title,
            description: cls.description,
            startTime: newStartTime,
            endTime: newEndTime,
            capacity: cls.capacity,
            instructorId: cls.instructorId,
            isCancelled: false,
            categories: {
                create: cls.categories.map(c => ({ categoryId: c.categoryId }))
            }
          }
        });
        createdCount++;
      }

      let message = `Se clonaron ${createdCount} clases exitosamente.`;
      if (skippedCount > 0) {
        message += ` Se omitieron ${skippedCount} clases por coincidir con horarios ya ocupados.`;
      }

      return { 
        count: createdCount, 
        skipped: skippedCount,
        message: message
      };
    });
  }
}