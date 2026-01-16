import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findMe(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        fullName: true,
      }
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateMe(userId: string, data: UpdateUserDto) {
    const updateData: any = {};

    if (data.fullName) {
      updateData.fullName = data.fullName;
    }

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(data.password, salt);
    }

    return this.db.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, fullName: true, email: true }
    });
  }
}