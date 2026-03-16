import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private db: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'SECRET_KEY_TEMPORAL',
    });
  }

  async validate(payload: any) {
    const user = await this.db.user.findUnique({ 
        where: { id: payload.sub } 
    });

    if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.deletedAt) {
        throw new UnauthorizedException('Esta cuenta ha sido desactivada.');
    }
    
    return { 
      id: payload.sub,
      email: payload.email, 
      role: payload.role,
      orgId: payload.orgId 
    };
  }
}