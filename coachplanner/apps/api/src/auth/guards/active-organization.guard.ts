import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ActiveOrganizationGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const targetOrgId = user.orgId || request.body?.organizationId || request.params?.orgId;

    if (!targetOrgId) {
      return true; 
    }

    const organization = await this.db.organization.findUnique({
      where: { id: targetOrgId },
      select: { isActive: true, name: true }
    });

    if (!organization) {
      throw new ForbiddenException('Organización no encontrada.');
    }

    if (!organization.isActive) {
      throw new ForbiddenException(`El gimnasio "${organization.name}" se encuentra temporalmente suspendido.`);
    }

    return true;
  }
}