import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly db: DatabaseService) {}

  async getConfig(orgId: string) {
    return this.db.organization.findUnique({
      where: { id: orgId },
      select: { 
        slotDurationMinutes: true,
        openHour: true,
        closeHour: true
      }
    });
  }

  async updateConfig(orgId: string, dto: UpdateConfigDto) {
    return this.db.organization.update({
      where: { id: orgId },
      data: {
        ...dto,
      },
    });
  }
}