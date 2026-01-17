import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '@repo/database';
import { ForbiddenException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService
  ) {}

  async create(userId: string, orgId: string, dto: CreateBookingDto) {
    const bookingResult = await this.db.$transaction(async (tx) => {
      
      const membership = await tx.membership.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
      });

      if (!membership) throw new NotFoundException('No eres alumno de este gimnasio');
      if (membership.credits <= 0) throw new BadRequestException('No tienes créditos suficientes');

      const classSession = await tx.classSession.findUnique({
        where: { id: dto.classId },
        include: { bookings: true },
      });

      if (!classSession) throw new NotFoundException('La clase no existe');
      
      if (new Date(classSession.startTime) < new Date()) {
         throw new BadRequestException('La clase ya comenzó o finalizó');
      }

      if (classSession.categoryId && !membership.categoryId) {
        throw new BadRequestException('No tienes una categoría asignada para inscribirte a esta clase.');
      }

      if (classSession.categoryId && membership.categoryId !== classSession.categoryId) {
        throw new ConflictException('Esta clase no pertenece a tu categoría.');
      }

      const activeBookings = classSession.bookings.filter(b => b.status === BookingStatus.CONFIRMED);
      
      if (activeBookings.length >= classSession.capacity) {
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

      const validPackages = await tx.creditPackage.findMany({
        where: {
          membershipId: membership.id,
          remainingAmount: { gt: 0 },
          expiresAt: { gt: new Date() },
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
    });

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
        'SUCCESS'
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
        include: { classSession: true }
      });

      if (!booking) throw new NotFoundException('No tienes una reserva activa para esta clase');

      const now = new Date();
      const classStart = new Date(booking.classSession.startTime);
      const diffInHours = (classStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffInHours < org.cancellationWindow) {
        throw new ForbiddenException(
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
        message: 'Reserva cancelada y crédito devuelto' 
      };
    });

    try {
      await this.notifications.create(
        userId,
        'Reserva Cancelada ↩️',
        `Has cancelado tu asistencia a ${cancelResult.className}. Se te ha devuelto el crédito.`,
        'INFO'
      );
    } catch (error) {
       console.error('Error enviando notificación de cancelación:', error);
    }

    return { message: cancelResult.message };
  }
}