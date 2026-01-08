import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtVerifyService } from './jwt-verify.service';
import { AdminService, AdminRole } from './admin.service';
import { FORBIDDEN, UNAUTHORIZED } from '../types';

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly jwtVerifyService: JwtVerifyService,
    private readonly adminService: AdminService,
  ) {}

  async requireAdmin(
    authHeader: string | undefined,
    requiredRole: AdminRole = 'admin',
  ): Promise<AdminUser> {
    const token = this.jwtVerifyService.extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const jwtResult = await this.jwtVerifyService.verifyToken(token);
    if (!jwtResult.success || !jwtResult.payload.sub) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const adminResult = await this.adminService.checkAdmin(
      jwtResult.payload.sub,
      requiredRole,
    );

    if (!adminResult.authorized) {
      throw new ForbiddenException({ ok: false, error: FORBIDDEN });
    }

    return {
      id: jwtResult.payload.sub,
      email: jwtResult.payload.email || adminResult.admin.email,
      role: adminResult.admin.role,
    };
  }
}
