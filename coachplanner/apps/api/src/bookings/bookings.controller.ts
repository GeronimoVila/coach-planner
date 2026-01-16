import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
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
    const userId = req.user.userId;
    const orgId = req.user.orgId;
    return this.bookingsService.create(userId, orgId, createBookingDto);
  }

  @Get('my-bookings')
  @Roles(Role.STUDENT)
  findMyBookings(@Request() req) {
    const userId = req.user.userId;
    const orgId = req.user.orgId;
    return this.bookingsService.findMyBookings(userId, orgId);
  }
}