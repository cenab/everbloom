import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtVerifyService, AuthContext } from './jwt-verify.service';
import { AdminService, AdminRole } from './admin.service';

/**
 * Metadata key for required admin role
 */
export const ADMIN_ROLE_KEY = 'adminRole';

/**
 * Decorator to set required admin role for an endpoint
 * @param role - Minimum role required (owner, admin, readonly)
 */
export const RequireAdminRole = (role: AdminRole) => SetMetadata(ADMIN_ROLE_KEY, role);

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
 * Guard that verifies Supabase JWT and checks admin authorization
 *
 * Usage:
 * @UseGuards(AdminAuthGuard)
 * @RequireAdminRole('admin') // optional, defaults to 'readonly'
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminAuthGuard.name);

  constructor(
    private readonly jwtVerifyService: JwtVerifyService,
    private readonly adminService: AdminService,
    private readonly reflector: Reflector,
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

    // Get required role from decorator (default to 'readonly')
    const requiredRole = this.reflector.get<AdminRole>(
      ADMIN_ROLE_KEY,
      context.getHandler(),
    ) || 'readonly';

    // Check admin authorization
    const adminResult = await this.adminService.checkAdmin(
      jwtResult.payload.sub,
      requiredRole,
    );

    if (!adminResult.authorized) {
      this.logger.warn(`Admin auth failed: ${adminResult.reason}`, {
        path: request.path,
        method: request.method,
        ip: request.ip,
        sub: jwtResult.payload.sub,
        reason: adminResult.reason,
      });

      if (adminResult.reason === 'admin_not_found') {
        throw new ForbiddenException({
          ok: false,
          error: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      if (adminResult.reason === 'admin_disabled') {
        throw new ForbiddenException({
          ok: false,
          error: 'FORBIDDEN',
          message: 'Account disabled',
        });
      }

      if (adminResult.reason === 'admin_insufficient_role') {
        throw new ForbiddenException({
          ok: false,
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      throw new ForbiddenException({
        ok: false,
        error: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    // Attach auth context to request (simple: sub, email, role)
    request.auth = {
      sub: jwtResult.payload.sub,
      email: jwtResult.payload.email || adminResult.admin.email,
      role: adminResult.admin.role,
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
