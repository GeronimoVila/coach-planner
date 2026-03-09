import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, Prisma } from '@repo/database';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService
  ) {}

async create(userId: string, orgId: string, dto: CreateBookingDto) {
    const membership = await this.db.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });

    if (!membership) throw new NotFoundException('No eres alumno de este gimnasio');
    if (membership.credits <= 0) throw new BadRequestException('No tienes créditos suficientes');

    const classSession = await this.db.classSession.findUnique({
      where: { id: dto.classId },
      include: { 
          categories: true,
          organization: { select: { bookingWindowMinutes: true } }
      },
    });

    if (!classSession) throw new NotFoundException('La clase no existe');
    
    const now = new Date();
    const classStart = new Date(classSession.startTime);

    if (classStart < now) {
       throw new BadRequestException('La clase ya comenzó o finalizó');
    }

    const diffInMs = classStart.getTime() - now.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < classSession.organization.bookingWindowMinutes) {
      throw new BadRequestException(
        `Las inscripciones ya cerraron. Debes reservar con al menos ${classSession.organization.bookingWindowMinutes} minutos de anticipación.`
      );
    }

    const classCategories = classSession.categories.map(c => c.categoryId);
    if (classCategories.length > 0) {
      if (!membership.categoryId) {
        throw new BadRequestException('No tienes una categoría asignada para inscribirte a esta clase.');
      }
      if (!classCategories.includes(membership.categoryId)) {
        throw new ConflictException('Esta clase no pertenece a tu disciplina/categoría.');
      }
    }

    let bookingResult;

    try {
      bookingResult = await this.db.$transaction(async (tx) => {
        
        await tx.$executeRaw`SELECT 1 FROM class_sessions WHERE id = ${dto.classId} FOR UPDATE`;

        const activeBookingsCount = await tx.booking.count({
          where: {
            classSessionId: dto.classId,
            status: BookingStatus.CONFIRMED
          }
        });
        
        if (activeBookingsCount >= classSession.capacity) {
          throw new ConflictException('La clase está llena');
        }

        const existingBooking = await tx.booking.findFirst({
          where: {
            classSessionId: dto.classId, 
            userId: userId,
            status: BookingStatus.CONFIRMED,
          },
        });
        if (existingBooking) throw new ConflictException('Ya estás anotado en esta clase');

        await tx.$executeRaw`SELECT 1 FROM memberships WHERE user_id = ${userId} AND organization_id = ${orgId} FOR UPDATE`;

        const validPackages = await tx.creditPackage.findMany({
          where: {
            membershipId: membership.id,
            remainingAmount: { gt: 0 },
            expiresAt: { gt: now },
          },
          orderBy: { expiresAt: 'asc' },
        });

        if (validPackages.length === 0) throw new BadRequestException('Tus créditos han vencido o no son válidos');
        const targetPackage = validPackages[0];

        const booking = await tx.booking.create({
          data: {
            userId: userId,
            classSessionId: dto.classId,
            creditPackageId: targetPackage.id,
            status: BookingStatus.CONFIRMED,
          },
          include: { classSession: true }
        });

        await tx.creditPackage.update({
          where: { id: targetPackage.id },
          data: { remainingAmount: { decrement: 1 } },
        });

        await tx.membership.update({
          where: { id: membership.id },
          data: { credits: { decrement: 1 } },
        });

        return booking;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        maxWait: 5000,
        timeout: 10000
      });
      
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2028' || error.code === 'P2034') {
          throw new ConflictException('El sistema está procesando demasiadas reservas en este momento. Por favor, intenta de nuevo en unos segundos.');
        }
      }
      
      console.error("Error crítico en reserva:", error);
      throw error;
    }

    try {
      const dateStr = bookingResult.classSession.startTime.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute:'2-digit' 
      });
      
      await this.notifications.create(
        userId,
        'Reserva Confirmada ✅',
        `Te esperamos en la clase de ${bookingResult.classSession.title} el ${dateStr}.`,
        'SUCCESS',
        orgId
      );

      const student = await this.db.user.findUnique({ where: { id: userId }, select: { fullName: true } });
      await this.notifications.notifyAdmins(
        orgId,
        'Nueva Reserva 📅',
        `El alumno ${student?.fullName || 'Usuario'} se anotó en la clase de ${bookingResult.classSession.title}.`,
        'INFO'
      );
    } catch (error) {
      console.error('Error enviando notificación de reserva:', error);
    }

    return bookingResult;
  }

  async findMyBookings(userId: string, orgId: string) {
    return this.db.booking.findMany({
      where: {
        userId: userId,
        classSession: {
          organizationId: orgId,
        },
        status: BookingStatus.CONFIRMED,
      },
      include: {
        classSession: true,
      },
      orderBy: {
        classSession: { startTime: 'asc' },
      },
    });
  }

  async cancelByStudent(userId: string, orgId: string, classId: string) {
    const cancelResult = await this.db.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { cancellationWindow: true }
      });

      if (!org) throw new NotFoundException('Gimnasio no encontrado');

      const booking = await tx.booking.findFirst({
        where: {
          userId,
          classSessionId: classId,
          status: BookingStatus.CONFIRMED
        },
        include: { 
          classSession: true,
          user: { select: { fullName: true } } 
        }
      });

      if (!booking) throw new NotFoundException('No tienes una reserva activa para esta clase');

      const now = new Date();
      const classStart = new Date(booking.classSession.startTime);
      const diffInHours = (classStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffInHours < org.cancellationWindow) {
        throw new BadRequestException(
          `Ya no puedes cancelar. Debes hacerlo con ${org.cancellationWindow} horas de anticipación.`
        );
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED }
      });

      await tx.creditPackage.update({
        where: { id: booking.creditPackageId },
        data: { remainingAmount: { increment: 1 } }
      });

      await tx.membership.update({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        data: { credits: { increment: 1 } }
      });

      return { 
        className: booking.classSession.title,
        studentName: booking.user.fullName,
        instructorId: booking.classSession.instructorId,
        classDate: booking.classSession.startTime,
        message: 'Reserva cancelada y crédito devuelto' 
      };
    });

    try {
      await this.notifications.create(
        userId,
        'Reserva Cancelada ↩️',
        `Has cancelado tu asistencia a ${cancelResult.className}. Se te ha devuelto el crédito.`,
        'INFO',
        orgId
      );

      const dateStr = cancelResult.classDate.toLocaleDateString('es-ES', { 
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
      });

      await this.notifications.notifyAdmins(
        orgId,
        'Baja de Reserva 📢',
        `El alumno ${cancelResult.studentName} canceló su asistencia a ${cancelResult.className} (${dateStr}).`,
        'WARNING'
      );

    } catch (error) {
        console.error('Error enviando notificaciones de cancelación:', error);
    }

    return { message: cancelResult.message };
  }

  async getStudentHistory(userId: string, orgId: string) {
    const bookings = await this.db.booking.findMany({
      where: {
        userId: userId,
        classSession: {
          organizationId: orgId,
        },
      },
      include: {
        classSession: {
          include: {
            instructor: { select: { fullName: true } }
          }
        }, 
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const historyLog: any[] = [];

    bookings.forEach((booking) => {
      historyLog.push({
        id: booking.id + '_created',
        action: 'RESERVED',
        date: booking.createdAt,
        className: booking.classSession.title,
        instructorName: booking.classSession.instructor?.fullName || 'Sin instructor',
        classDate: booking.classSession.startTime,
        creditsMovement: -1,
      });

      if (booking.status === BookingStatus.CANCELLED) {
        historyLog.push({
          id: booking.id + '_cancelled',
          action: 'CANCELLED',
          date: (booking as any).updatedAt, 
          className: booking.classSession.title,
          instructorName: booking.classSession.instructor?.fullName || 'Sin instructor',
          classDate: booking.classSession.startTime,
          creditsMovement: 1,
        });
      }
    });

    return historyLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}