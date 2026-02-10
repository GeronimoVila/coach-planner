import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { CreateOnboardingOrgDto } from './dto/create-onboarding-org.dto';
import { Role } from '@repo/database';

@Injectable()
export class OrganizationsService {
  constructor(private readonly db: DatabaseService) {}

  async createOnboarding(userId: string, dto: CreateOnboardingOrgDto) {
    return this.db.$transaction(async (tx) => {
      const generatedSlug = dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug: generatedSlug,
          ownerId: userId,
          isActive: true,
        },
      });

      await tx.membership.create({
        data: {
          userId: userId,
          organizationId: org.id,
          role: Role.OWNER,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { fullName: dto.fullName },
      });

      return org;
    });
  }

  async getConfig(orgId: string) {
    return this.db.organization.findUnique({
      where: { id: orgId },
      select: { 
        name: true,
        slug: true,
        slotDurationMinutes: true,
        openHour: true,
        closeHour: true,
        cancellationWindow: true
      }
    });
  }

  async updateConfig(orgId: string, dto: UpdateConfigDto) {
    return this.db.organization.update({
      where: { id: orgId },
      data: { ...dto },
    });
  }
}