import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BookingStatus, Role } from '@repo/database';

@Injectable()
export class DashboardService {
  constructor(private db: DatabaseService) {}

  async getStats(userId: string, role: string) {
    let orgId = '';

    if (role === 'OWNER' || role === 'ADMIN' || role === 'INSTRUCTOR') {
      const org = await this.db.organization.findFirst({
        where: { ownerId: userId }
      });
      if (!org) return { empty: true, message: 'No tienes gimnasios registrados' };
      orgId = org.id;

      return this.getOwnerStats(orgId);

    } else {
      const membership = await this.db.membership.findFirst({
        where: { userId: userId }
      });
      if (!membership) return { empty: true, message: 'No estás inscripto en ningún gimnasio' };
      orgId = membership.organizationId;

      return this.getStudentStats(userId, orgId);
    }
  }

  private async getOwnerStats(orgId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeStudents = await this.db.membership.count({
      where: { organizationId: orgId, role: Role.STUDENT }
    });

    const classesToday = await this.db.classSession.count({
      where: {
        organizationId: orgId,
        startTime: { gte: today, lt: tomorrow },
        isCancelled: false
      }
    });

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const expiringPacks = await this.db.creditPackage.count({
      where: {
        membership: { organizationId: orgId },
        expiresAt: {
          gte: new Date(),
          lte: nextWeek
        },
        remainingAmount: { gt: 0 }
      }
    });

    const org = await this.db.organization.findUnique({
        where: { id: orgId },
        select: { slug: true }
    });

    return {
      role: 'OWNER',
      cards: {
        activeStudents,
        classesToday,
        expiringPacks,
        registerSlug: org?.slug || ''
      }
    };
  }

  private async getStudentStats(userId: string, orgId: string) {
    const membership = await this.db.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId }
      },
      include: {
        creditPackages: {
           where: { 
             expiresAt: { gt: new Date() },
             remainingAmount: { gt: 0 }
           },
           orderBy: { expiresAt: 'asc' },
           take: 1
        }
      }
    });

    const credits = membership?.credits || 0;

    const nextExpiration = membership?.creditPackages[0]?.expiresAt || null;

    const nextClassBooking = await this.db.booking.findFirst({
      where: {
        userId,
        status: BookingStatus.CONFIRMED,
        classSession: {
            organizationId: orgId,
            startTime: { gt: new Date() },
            isCancelled: false
        }
      },
      orderBy: { classSession: { startTime: 'asc' } },
      include: { classSession: true }
    });

    const nextClassData = nextClassBooking ? {
        title: nextClassBooking.classSession.title,
        date: nextClassBooking.classSession.startTime
    } : null;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const classesThisMonth = await this.db.booking.count({
        where: {
            userId,
            classSession: { organizationId: orgId },
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.ATTENDED] },
            createdAt: { gte: startOfMonth }
        }
    });

    return {
      role: 'STUDENT',
      cards: {
        credits,
        nextExpiration,
        nextClass: nextClassData,
        classesThisMonth
      }
    };
  }
}