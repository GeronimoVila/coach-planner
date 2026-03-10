import { Controller, Post, Body, UseGuards, Request, Get, Delete, Param, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@repo/database';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.STUDENT)
  create(@Request() req, @Body() createBookingDto: CreateBookingDto) {
    const userId = req.user.id || req.user.userId;
    const orgId = req.user.orgId || req.user.organizationId;
    return this.bookingsService.create(userId, orgId, createBookingDto);
  }

  @Get('my-bookings')
  @Roles(Role.STUDENT)
  findMyBookings(@Request() req) {
    const userId = req.user.id || req.user.userId;
    const orgId = req.user.orgId || req.user.organizationId;
    return this.bookingsService.findMyBookings(userId, orgId);
  }

  @Get('history')
  @Roles(Role.STUDENT)
  getHistory(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const userId = req.user.id || req.user.userId;
    const orgId = req.user.orgId || req.user.organizationId;
    return this.bookingsService.getStudentHistory(userId, orgId, Number(page), Number(limit));
  }

  @Delete(':classId')
  @Roles(Role.STUDENT)
  cancel(@Request() req, @Param('classId') classId: string) {
    const userId = req.user.id || req.user.userId;
    const orgId = req.user.orgId || req.user.organizationId;
    return this.bookingsService.cancelByStudent(userId, orgId, classId);
  }
}