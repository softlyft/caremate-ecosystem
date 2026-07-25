import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import jwt from 'jsonwebtoken';

export type AuthUser = {
  userId: string;
  email?: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};

type SupabaseJwtPayload = {
  sub?: string;
  email?: string;
};

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const secret = this.config.get<string>('SUPABASE_JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Server JWT secret is not configured');
    }

    try {
      const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }) as SupabaseJwtPayload;

      const userId = typeof payload.sub === 'string' ? payload.sub : null;
      if (!userId) {
        throw new UnauthorizedException('Invalid token subject');
      }

      request.user = {
        userId,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
