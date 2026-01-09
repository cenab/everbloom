import { Injectable, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import { JwtVerifyService } from './jwt-verify.service';
import { getSupabaseClient } from '../utils/supabase';
import { UNAUTHORIZED } from '../types';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly jwtVerifyService: JwtVerifyService,
  ) {}

  async requireUser(
    authHeader: string | undefined,
  ): Promise<AuthenticatedUser> {
    const token = this.jwtVerifyService.extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const jwtResult = await this.jwtVerifyService.verifyToken(token);
    if (!jwtResult.success || !jwtResult.payload.sub) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    const email = jwtResult.payload.email?.toLowerCase();
    if (!email) {
      throw new UnauthorizedException({ ok: false, error: UNAUTHORIZED });
    }

    return this.ensureUserRecord(jwtResult.payload.sub, email);
  }

  /**
   * Backwards-compatible alias for authenticated user checks.
   * @deprecated Use requireUser instead.
   */
  async requireAdmin(
    authHeader: string | undefined,
  ): Promise<AuthenticatedUser> {
    return this.requireUser(authHeader);
  }

  private async ensureUserRecord(
    sub: string,
    email: string,
  ): Promise<AuthenticatedUser> {
    const supabase = getSupabaseClient();
    const notFoundCode = 'PGRST116';

    const { data: byId, error: byIdError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', sub)
      .single();

    if (byId) {
      return { id: byId.id, email: byId.email };
    }

    if (byIdError && byIdError.code !== notFoundCode) {
      this.logger.error('Failed to load user by id', byIdError);
      throw new InternalServerErrorException({
        ok: false,
        error: 'USER_LOOKUP_FAILED',
      });
    }

    const { data: byEmail, error: byEmailError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (byEmail) {
      return { id: byEmail.id, email: byEmail.email };
    }

    if (byEmailError && byEmailError.code !== notFoundCode) {
      this.logger.error('Failed to load user by email', byEmailError);
      throw new InternalServerErrorException({
        ok: false,
        error: 'USER_LOOKUP_FAILED',
      });
    }

    const { data: created, error: createError } = await supabase
      .from('users')
      .insert({
        id: sub,
        email,
        plan_tier: 'free',
      })
      .select('id, email')
      .single();

    if (createError || !created) {
      this.logger.error('Failed to create user', createError);
      throw new InternalServerErrorException({
        ok: false,
        error: 'USER_CREATE_FAILED',
      });
    }

    return { id: created.id, email: created.email };
  }
}
