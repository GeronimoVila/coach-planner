import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { CreateOnboardingOrgDto } from './dto/create-onboarding-org.dto';
import { v4 as uuidv4 } from 'uuid';
import { InvitationStatus, Role } from '@repo/database';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { EmailService } from '../email/email.service';
import { PlansService } from 'src/plans/plans.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly plansService: PlansService,
    private readonly emailService: EmailService
  ) {}

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
        cancellationWindow: true,
        bookingWindowMinutes: true,
        links: {
            select: { id: true, label: true, url: true, isActive: true },
            orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async updateConfig(orgId: string, dto: UpdateConfigDto) {
    return this.db.organization.update({
      where: { id: orgId },
      data: { ...dto },
    });
  }

  async addLink(orgId: string, label: string, url: string) {
    return this.db.organizationLink.create({
      data: { organizationId: orgId, label, url }
    });
  }

  async removeLink(orgId: string, linkId: string) {
    return this.db.organizationLink.deleteMany({
      where: { id: linkId, organizationId: orgId }
    });
  }

  async updateLink(orgId: string, linkId: string, data: { label?: string, url?: string, isActive?: boolean }) {
    const link = await this.db.organizationLink.findFirst({
      where: { id: linkId, organizationId: orgId }
    });

    if (!link) throw new NotFoundException('El enlace no existe');

    return this.db.organizationLink.update({
      where: { id: linkId },
      data
    });
  }

  async inviteStaff(orgId: string, dto: CreateInvitationDto, ownerId: string) {
    const org = await this.db.organization.findUnique({ where: { id: orgId } });
    if (!org || org.ownerId !== ownerId) {
      throw new ForbiddenException('Solo el dueño puede invitar personal');
    }

    const emailLower = dto.email.toLowerCase().trim();

    const existingUser = await this.db.user.findUnique({
      where: { email: emailLower },
      include: { memberships: { where: { organizationId: orgId } } }
    });

    if (existingUser && existingUser.memberships.length > 0) {
      const currentRole = existingUser.memberships[0].role;
      throw new BadRequestException(`Este usuario ya pertenece a la organización con el rol de ${currentRole}`);
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.db.invitation.upsert({
      where: {
        email_organizationId: {
          email: emailLower,
          organizationId: orgId
        }
      },
      update: {
        token,
        role: dto.role,
        status: InvitationStatus.PENDING,
        expiresAt
      },
      create: {
        email: emailLower,
        organizationId: orgId,
        role: dto.role,
        token,
        expiresAt
      }
    });

    await this.emailService.sendStaffInvitation(emailLower, org.name, dto.role, token);

    return { message: 'Invitación enviada exitosamente', invitation };
  }

  async getInvitations(orgId: string, ownerId: string) {
    const org = await this.db.organization.findUnique({ where: { id: orgId } });
    if (!org || org.ownerId !== ownerId) {
      throw new ForbiddenException('Solo el dueño puede ver las invitaciones');
    }

    return this.db.invitation.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async revokeInvitation(orgId: string, invitationId: string, ownerId: string) {
    const org = await this.db.organization.findUnique({ where: { id: orgId } });
    if (!org || org.ownerId !== ownerId) {
      throw new ForbiddenException('Solo el dueño puede revocar invitaciones');
    }

    await this.db.invitation.delete({
      where: { id: invitationId }
    });

    return { message: 'Invitación revocada' };
  }

  async acceptInvitation(userId: string, token: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException('Usuario no encontrado o desactivado');

    const invitation = await this.db.invitation.findUnique({
      where: { token },
      include: { organization: true }
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada o inválida');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Esta invitación ya fue procesada o está cancelada');
    }

    if (new Date() > invitation.expiresAt) {
      await this.db.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED }
      });
      throw new BadRequestException('La invitación ha expirado');
    }

    await this.db.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: invitation.organizationId
          }
        },
        update: {
          role: invitation.role
        },
        create: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role
        }
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED }
      });
    });

    return { 
      message: `Te has unido exitosamente a ${invitation.organization.name}`,
      organizationId: invitation.organizationId 
    };
  }

  async getStaff(orgId: string, ownerId: string) {
    const org = await this.db.organization.findUnique({ where: { id: orgId } });
    if (!org || org.ownerId !== ownerId) {
      throw new ForbiddenException('Solo el dueño puede ver el equipo');
    }

    return this.db.membership.findMany({
      where: {
        organizationId: orgId,
        role: { in: ['INSTRUCTOR', 'STAFF'] },
        user: { deletedAt: null }
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } }
      }
    });
  }

  async removeStaff(orgId: string, staffUserId: string, ownerId: string) {
    const org = await this.db.organization.findUnique({ where: { id: orgId } });
    if (!org || org.ownerId !== ownerId) {
      throw new ForbiddenException('Solo el dueño puede eliminar personal');
    }

    if (staffUserId === ownerId) {
      throw new BadRequestException('No puedes eliminarte a ti mismo del equipo');
    }

    await this.db.membership.delete({
      where: {
        userId_organizationId: {
          userId: staffUserId,
          organizationId: orgId
        }
      }
    });

    return { message: 'Miembro del equipo eliminado exitosamente' };
  }
}