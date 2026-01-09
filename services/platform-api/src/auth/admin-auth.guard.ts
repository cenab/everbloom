import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtVerifyService, AuthContext } from './jwt-verify.service';

/**
 * Extend Express Request to include auth context
 */
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Guard that verifies Supabase JWT for authenticated requests.
 *
 * Usage:
 * @UseGuards(AdminAuthGuard)
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminAuthGuard.name);

  constructor(
    private readonly jwtVerifyService: JwtVerifyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    // Extract Bearer token
    const token = this.jwtVerifyService.extractBearerToken(authHeader);

    if (!token) {
      this.logger.warn('Auth failed: jwt_missing', {
        path: request.path,
        method: request.method,
        ip: request.ip,
      });
      throw new UnauthorizedException({
        ok: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Verify JWT
    const jwtResult = await this.jwtVerifyService.verifyToken(token);

    if (!jwtResult.success) {
      this.logger.warn(`Auth failed: ${jwtResult.reason}`, {
        path: request.path,
        method: request.method,
        ip: request.ip,
        reason: jwtResult.reason,
      });
      throw new UnauthorizedException({
        ok: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }

    if (!jwtResult.payload.sub) {
      throw new UnauthorizedException({
        ok: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Attach auth context to request (simple: sub, email, role)
    request.auth = {
      sub: jwtResult.payload.sub,
      email: jwtResult.payload.email || '',
      role: jwtResult.payload.role || 'authenticated',
    };

    this.logger.debug('Auth success', {
      path: request.path,
      method: request.method,
      sub: request.auth.sub,
      role: request.auth.role,
    });

    return true;
  }
}
