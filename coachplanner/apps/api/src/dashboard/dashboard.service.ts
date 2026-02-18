import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BookingStatus, Role, PlanType } from '@repo/database';

@Injectable()
export class DashboardService {
  constructor(private db: DatabaseService) {}

  async getStats(userId: string, role: string, orgIdToken?: string) {
    let orgId = orgIdToken;

    if (role === 'OWNER' || role === 'ADMIN' || role === 'INSTRUCTOR') {
      
      if (!orgId) {
          const org = await this.db.organization.findFirst({
            where: { ownerId: userId }
          });
          
          if (role === 'ADMIN' && !org) {
             return { empty: true, message: 'Bienvenido al Panel de Administración Global' };
          }
          if (!org) return { empty: true, message: 'No tienes gimnasios registrados' };
          
          orgId = org.id;
      }

      return this.getOwnerStats(orgId);

    } else {
      if (!orgId) {
          const membership = await this.db.membership.findFirst({
            where: { userId: userId }
          });
          if (!membership) return { empty: true, message: 'No estás inscripto en ningún gimnasio' };
          orgId = membership.organizationId;
      }

      return this.getStudentStats(userId, orgId);
    }
  }

  async getAdminStats() {
    const [organizationsCount, usersCount] = await Promise.all([
      this.db.organization.count(),
      this.db.user.count(),
    ]);

    return {
      organizationsCount,
      usersCount,
    };
  }

  private async getOwnerStats(orgId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const org = await this.db.organization.findUnique({
        where: { id: orgId },
        select: { slug: true, plan: true }
    });

    const activeStudents = await this.db.membership.count({
      where: { organizationId: orgId, role: Role.STUDENT }
    });

    let maxStudents = 0; 
    let isPro = false;

    if (org?.plan === PlanType.PRO) {
        isPro = true;
        maxStudents = 9999;
    } else {
        const limits = await this.db.planLimits.findUnique({
            where: { plan: PlanType.FREE }
        });
        maxStudents = limits?.maxStudents || 5;
    }

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

    return {
      role: 'OWNER',
      cards: {
        activeStudents,
        maxStudents,
        isPro,
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
           orderBy: { expiresAt: 'asc' }
        }
      }
    });

    const realCredits = membership?.creditPackages 
      ? membership.creditPackages.reduce((sum, pkg) => sum + pkg.remainingAmount, 0)
      : 0;

    const nextExpiration = membership?.creditPackages && membership.creditPackages.length > 0
      ? membership.creditPackages[0].expiresAt
      : null;

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
        credits: realCredits,
        nextExpiration,
        nextClass: nextClassData,
        classesThisMonth
      }
    };
  }
}