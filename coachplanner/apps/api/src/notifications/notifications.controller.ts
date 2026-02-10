import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Request() req) {
    const userId = req.user.id || req.user.userId;
    const list = await this.notificationsService.findAll(userId);
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    return { list, unreadCount };
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.notificationsService.markAsRead(id, userId);
  }
}