import { Controller, Get, Body, Patch, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.usersService.findMe(userId);
  }

  @Patch('me')
  updateMe(@Request() req, @Body() dto: UpdateUserDto) {
    const userId = req.user.id || req.user.userId;
    return this.usersService.updateMe(userId, dto);
  }
}