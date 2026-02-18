import { Injectable, OnModuleInit, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PlanType, Role } from '@repo/database'; 

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(private db: DatabaseService) {}

  async onModuleInit() {
    try {
      const existingConfig = await this.db.planLimits.findUnique({
        where: { plan: PlanType.FREE },
      });

      if (!existingConfig) {
        await this.db.planLimits.create({
          data: {
            plan: PlanType.FREE,
            maxStudents: 5,
            maxCategories: 2,
            maxClasses: 5,
          },
        });
      }
    } catch (error) {
      console.warn("⚠️ [PlansService] Error cargando límites:", error);
    }
  }

  async getLimits() {
      const limits = await this.db.planLimits.findUnique({
          where: { plan: PlanType.FREE }
      });
      return limits;
  }

  async updateLimits(dto: any) {
      return this.db.planLimits.update({
          where: { plan: PlanType.FREE },
          data: {
              maxStudents: dto.maxStudents,
              maxClasses: dto.maxClasses,
              maxCategories: dto.maxCategories
          }
      });
  }

  async validateAddStudent(organizationId: string) {
    const org = await this.db.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    if (!org) throw new BadRequestException('Organización no encontrada');

    if (org.plan === PlanType.PRO) return true;

    const limits = await this.db.planLimits.findUnique({ where: { plan: PlanType.FREE } });
    
    if (!limits) throw new InternalServerErrorException('Error de configuración de límites en el sistema.');

    const currentStudents = await this.db.membership.count({
      where: { 
        organizationId, 
        role: Role.STUDENT 
      }, 
    });

    if (currentStudents >= limits.maxStudents) {
      throw new BadRequestException(
        `Has alcanzado el límite de ${limits.maxStudents} alumnos del plan GRATIS. Pásate a PRO.`,
      );
    }

    return true;
  }

  async validateCreateClass(organizationId: string, quantity: number = 1) {
    const org = await this.db.organization.findUnique({
        where: { id: organizationId },
        select: { plan: true },
    });

    if (!org) throw new BadRequestException('Organización no encontrada');

    if (org.plan === PlanType.PRO) return true;

    const limits = await this.db.planLimits.findUnique({ where: { plan: PlanType.FREE } });

    if (!limits) throw new InternalServerErrorException('Límites no configurados');
    
    const activeFutureClasses = await this.db.classSession.count({
        where: {
            organizationId,
            startTime: { gt: new Date() },
            isCancelled: false
        }
    });

    if ((activeFutureClasses + quantity) > limits.maxClasses) {
        throw new BadRequestException(
            `Límite de clases alcanzado (${limits.maxClasses} activas simultáneas). Tienes ${activeFutureClasses} programadas a futuro. Elimina o espera a que terminen.`
        );
    }

    return true;
  }

  async validateCreateCategory(organizationId: string) {
    const org = await this.db.organization.findUnique({
        where: { id: organizationId },
        select: { plan: true },
    });

    if (!org) throw new BadRequestException('Organización no encontrada');

    if (org.plan === PlanType.PRO) return true;

    const limits = await this.db.planLimits.findUnique({ where: { plan: PlanType.FREE } });
    if (!limits) throw new InternalServerErrorException('Límites no configurados');

    const currentCategories = await this.db.category.count({
        where: { organizationId }
    });

    if (currentCategories >= limits.maxCategories) {
        throw new BadRequestException(
            `Has alcanzado el límite de ${limits.maxCategories} categorías del plan GRATIS. Pásate a PRO para ilimitadas.`
        );
    }

    return true;
  }
}