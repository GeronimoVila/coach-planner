import { Injectable, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Role, PlanType } from '@repo/database';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  async getUsers(search?: string) {
    const whereCondition = search ? {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    const users = await this.db.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            memberships: true,
            instructedClasses: true,
            organizationsOwned: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return users.map((user) => {
      let realRole = user.role;

      if (user.role !== Role.ADMIN) {
        if (user._count.organizationsOwned > 0) {
          realRole = Role.OWNER;
        }
        else if (user._count.instructedClasses > 0) {
           realRole = Role.INSTRUCTOR;
        }
      }

      return {
        ...user,
        role: realRole,
      };
    });
  }
  
  async getOrganizations() {
    const orgs = await this.db.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        isActive: true,
        plan: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            classSessions: true,
            memberships: {
              where: { role: Role.STUDENT }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      owner: {
        id: org.owner.id,
        name: org.owner.fullName || org.owner.email,
        email: org.owner.email
      },
      createdAt: org.createdAt,
      totalClasses: org._count.classSessions,
      activeStudents: org._count.memberships,
      isActive: org.isActive,
    }));
  }

  async toggleOrganizationStatus(id: string) {
    const org = await this.db.organization.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!org) throw new Error('Organización no encontrada');

    return this.db.organization.update({
      where: { id },
      data: { isActive: !org.isActive },
    });
  }

  async updateOrganizationPlan(id: string, newPlan: string) {
    const org = await this.db.organization.findUnique({
      where: { id },
    });

    if (!org) throw new Error('Organización no encontrada');

    return this.db.organization.update({
      where: { id },
      data: { plan: newPlan as any }, 
    });
  }

  async getUserDetails(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      include: {
        organizationsOwned: {
          select: { id: true, name: true, slug: true, isActive: true, createdAt: true }
        },
        memberships: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true }
            }
          }
        },
        _count: {
          select: {
            instructedClasses: true
          }
        }
      },
    });

    if (!user) return null;

    let realRole = user.role;
    if (user.role !== Role.ADMIN && user.organizationsOwned.length > 0) {
        realRole = Role.OWNER;
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: realRole,
      createdAt: user.createdAt,
      ownedGyms: user.organizationsOwned,
      memberships: user.memberships.map(m => ({
        gymName: m.organization.name,
        role: m.role,
        credits: m.credits,
        joinedAt: m.joinedAt 
      })),
      
      stats: {
        classesTaught: user._count.instructedClasses
      }
    };
  }

  async updateUserEmail(userId: string, newEmail: string) {
    const existingUser = await this.db.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Este email ya está registrado.');
    }

    return this.db.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: { id: true, email: true }
    });
  }

  async resetUserPassword(userId: string, newPassword: string) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    return this.db.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
  }

  async getAnnouncement() {
    return this.db.announcement.findFirst();
  }

  async updateAnnouncement(message: string, isActive: boolean, type: string) {
    const existing = await this.db.announcement.findFirst();

    if (existing) {
      return this.db.announcement.update({
        where: { id: existing.id },
        data: { message, isActive, type },
      });
    } else {
      return this.db.announcement.create({
        data: { message, isActive, type },
      });
    }
  }

  async getDashboardStats() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const [totalGyms, activeGyms, totalUsers, newUsers, classesToday] = await Promise.all([
      this.db.organization.count(),
      this.db.organization.count({ where: { isActive: true } }),
      this.db.user.count(),
      this.db.user.count({ where: { createdAt: { gte: yesterday } } }),
      this.db.classSession.count({
        where: {
          startTime: { gte: startOfDay, lte: endOfDay }
        }
      })
    ]);

    return {
      gyms: {
        total: totalGyms,
        active: activeGyms,
        inactive: totalGyms - activeGyms
      },
      users: {
        total: totalUsers,
        new24h: newUsers
      },
      activity: {
        classesToday
      }
    };
  }
}