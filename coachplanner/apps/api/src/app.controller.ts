import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Controller()
export class AppController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async getHello() {

    const usersCount = await this.db.user.count();

    return {
      status: 'OPERATIVO 🟢',
      message: 'La API está conectada correctamente a PostgreSQL',
      total_usuarios_db: usersCount,
      timestamp: new Date().toISOString(),
    };
  }
}