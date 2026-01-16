import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '@repo/database';

@Injectable()
export class BookingsService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, orgId: string, dto: CreateBookingDto) {
    return this.db.$transaction(async (tx) => {
      
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
}