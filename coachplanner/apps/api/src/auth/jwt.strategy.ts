import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Role } from '@repo/database';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private db: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'SECRET_KEY_TEMPORAL',
    });
  }

  async validate(payload: any) {

    const user = await this.db.user.findUnique({ 
        where: { id: payload.sub } 
    });

    if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.role === Role.ADMIN) {
        return { 
            userId: payload.sub, 
            email: payload.email, 
            role: payload.role,
            orgId: payload.orgId 
        };
    }

    const orgIdToCheck = payload.orgId;

    if (orgIdToCheck) {
        const org = await this.db.organization.findUnique({
            where: { id: orgIdToCheck },
            select: { isActive: true, name: true }
        });

        if (org) {
            if (!org.isActive) {
                throw new UnauthorizedException('El gimnasio se encuentra suspendido temporalmente.');
            }
        }
    } 
    else if (user.role === Role.OWNER) {
        const ownedOrg = await this.db.organization.findFirst({
            where: { ownerId: user.id }
        });
        if (ownedOrg && !ownedOrg.isActive) {
             throw new UnauthorizedException('Tu cuenta ha sido suspendida.');
        }
    }
    return { 
      userId: payload.sub, 
      email: payload.email, 
      role: payload.role,
      orgId: payload.orgId 
    };
  }
}