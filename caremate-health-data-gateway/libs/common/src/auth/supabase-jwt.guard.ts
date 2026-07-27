import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export type AuthUser = {
  userId: string;
  email?: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};

type SupabaseJwtPayload = JWTPayload & {
  email?: string;
};

/**
 * Verifies Supabase Auth access tokens.
 *
 * Prefer JWKS (ES256 / RS256) — current Supabase projects mint asymmetric JWTs.
 * Fall back to HS256 with SUPABASE_JWT_SECRET for legacy shared-secret tokens.
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.verifyAccessToken(token);
      const userId = typeof payload.sub === 'string' ? payload.sub : null;
      if (!userId) {
        throw new UnauthorizedException('Invalid token subject');
      }

      request.user = {
        userId,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getJwks() {
    if (!this.jwks) {
      const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL').replace(/\/$/, '');
      this.jwks = createRemoteJWKSet(
        new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
      );
    }
    return this.jwks;
  }

  private async verifyAccessToken(token: string): Promise<SupabaseJwtPayload> {
    // 1) Asymmetric keys (current Supabase Auth default).
    try {
      const { payload } = await jwtVerify(token, this.getJwks(), {
        algorithms: ['ES256', 'RS256'],
      });
      return payload as SupabaseJwtPayload;
    } catch {
      // Continue to legacy HS256.
    }

    // 2) Legacy shared JWT secret.
    const secret = this.config.get<string>('SUPABASE_JWT_SECRET')?.trim();
    if (!secret) {
      throw new UnauthorizedException('Server JWT secret is not configured');
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    return payload as SupabaseJwtPayload;
  }
}
