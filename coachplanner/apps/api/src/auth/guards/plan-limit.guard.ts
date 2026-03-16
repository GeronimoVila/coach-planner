import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PlansService } from '../../plans/plans.service';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(private readonly plansService: PlansService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    const targetOrgId = user.orgId || request.body?.organizationId || request.params?.orgId;

    if (!targetOrgId) {
      return true; 
    }

    const isOverLimit = await this.plansService.checkIfOverLimit(targetOrgId);

    if (isOverLimit) {
      throw new ForbiddenException(
        'El gimnasio ha excedido los límites operativos de su plan actual. Las reservas e inscripciones se encuentran pausadas.'
      );
    }

    return true;
  }
}