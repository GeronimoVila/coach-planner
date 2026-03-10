import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, title: string, message: string, type: 'INFO' | 'WARNING' | 'SUCCESS' = 'INFO', organizationId?: string) {
    return this.db.notification.create({
      data: { userId, title, message, type, organizationId },
    });
  }

  async findAll(userId: string) {
    return this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        organization: { select: { name: true } }
      }
    });
  }

  async getUnreadCount(userId: string) {
    return this.db.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.db.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async notifyAdmins(orgId: string, title: string, message: string, type: 'INFO' | 'WARNING' | 'SUCCESS' = 'INFO') {
    const org = await this.db.organization.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          where: { role: { in: ['INSTRUCTOR', 'STAFF'] } }
        }
      }
    });

    if (!org) return;

    const adminIds = new Set([
      org.ownerId,
      ...org.memberships.map(m => m.userId)
    ]);

    const notifications = Array.from(adminIds).map(userId => ({
      userId,
      title,
      message,
      type,
      organizationId: orgId
    }));

    if (notifications.length > 0) {
      await this.db.notification.createMany({ data: notifications });
    }
  }
}