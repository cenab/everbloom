import { Injectable, Logger } from '@nestjs/common';
import * as jose from 'jose';

/**
 * JWT payload after verification
 */
export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
}

/**
 * Auth context attached to request after JWT verification
 */
export interface AuthContext {
  sub: string;
  email: string;
  role: string;
}

/**
 * JWT verification error reasons for logging
 */
export type JwtErrorReason =
  | 'jwt_missing'
  | 'jwt_malformed'
  | 'jwt_invalid_signature'
  | 'jwt_wrong_issuer'
  | 'jwt_wrong_audience'
  | 'jwt_expired'
  | 'jwt_not_yet_valid'
  | 'jwt_unknown_kid'
  | 'jwt_unknown_error';

/**
 * Result of JWT verification
 */
export type JwtVerifyResult =
  | { success: true; payload: JwtPayload }
  | { success: false; reason: JwtErrorReason; message: string };

/**
 * Service for verifying Supabase Auth JWTs using JWKS
 *
 * Features:
 * - Fetches JWKS from Supabase with kid-based cache
 * - Refreshes cache on unknown kid (key rotation support)
 * - Verifies iss, aud, exp locally (no network hop per request)
 * - Authorization enforced separately via admins table
 */
@Injectable()
export class JwtVerifyService {
  private readonly logger = new Logger(JwtVerifyService.name);
  private jwks: jose.JWTVerifyGetKey | null = null;
  private jwksLastFetched: number = 0;
  private readonly JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Get the JWKS URL for the Supabase project
   */
  private getJwksUrl(): string {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
    return `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  }

  /**
   * Get the expected issuer for JWT verification
   */
  private getExpectedIssuer(): string {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
    return `${supabaseUrl}/auth/v1`;
  }

  /**
   * Get the expected audience for JWT verification
   * Supabase uses 'authenticated' as the audience for access tokens
   */
  private getExpectedAudience(): string {
    return 'authenticated';
  }

  /**
   * Get or refresh the JWKS key set
   */
  private async getJwks(forceRefresh = false): Promise<jose.JWTVerifyGetKey> {
    const now = Date.now();

    // Return cached JWKS if still valid and not forcing refresh
    if (!forceRefresh && this.jwks && now - this.jwksLastFetched < this.JWKS_CACHE_TTL_MS) {
      return this.jwks;
    }

    // Fetch fresh JWKS
    const jwksUrl = this.getJwksUrl();
    this.logger.log(`Fetching JWKS from ${jwksUrl}${forceRefresh ? ' (forced refresh)' : ''}`);

    // createRemoteJWKSet handles kid lookup internally
    this.jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
    this.jwksLastFetched = now;

    return this.jwks;
  }

  /**
   * Verify JWT with optional retry on unknown kid
   */
  private async verifyWithRetry(
    token: string,
    jwks: jose.JWTVerifyGetKey,
    retryOnUnknownKid: boolean,
  ): Promise<jose.JWTVerifyResult> {
    const options = {
      issuer: this.getExpectedIssuer(),
      audience: this.getExpectedAudience(),
    };

    try {
      return await jose.jwtVerify(token, jwks, options);
    } catch (error) {
      // Check if this is an unknown kid error - retry with fresh JWKS
      if (
        retryOnUnknownKid &&
        error instanceof jose.errors.JWKSNoMatchingKey
      ) {
        this.logger.log('Unknown kid, refreshing JWKS and retrying');
        const freshJwks = await this.getJwks(true);
        return await jose.jwtVerify(token, freshJwks, options);
      }
      throw error;
    }
  }

  /**
   * Verify a JWT token
   *
   * @param token - The JWT access token (without 'Bearer ' prefix)
   * @returns Verification result with payload or error reason
   */
  async verifyToken(token: string): Promise<JwtVerifyResult> {
    if (!token) {
      return { success: false, reason: 'jwt_missing', message: 'No token provided' };
    }

    try {
      const jwks = await this.getJwks();
      const { payload } = await this.verifyWithRetry(token, jwks, true);

      // Token is valid if signature, iss, aud, exp all pass
      // Authorization (is this user an admin?) is handled separately
      return {
        success: true,
        payload: {
          sub: payload.sub as string,
          email: payload.email as string | undefined,
          role: payload.role as string | undefined,
          aud: payload.aud as string | undefined,
          iss: payload.iss as string | undefined,
          exp: payload.exp as number | undefined,
          iat: payload.iat as number | undefined,
        },
      };
    } catch (error) {
      // Handle specific JWT errors
      if (error instanceof jose.errors.JWTExpired) {
        return { success: false, reason: 'jwt_expired', message: 'Token has expired' };
      }

      if (error instanceof jose.errors.JWTClaimValidationFailed) {
        const message = error.message.toLowerCase();
        if (message.includes('issuer')) {
          return { success: false, reason: 'jwt_wrong_issuer', message: 'Invalid token issuer' };
        }
        if (message.includes('audience')) {
          return { success: false, reason: 'jwt_wrong_audience', message: 'Invalid token audience' };
        }
        if (message.includes('not yet valid') || message.includes('nbf')) {
          return { success: false, reason: 'jwt_not_yet_valid', message: 'Token not yet valid' };
        }
        return { success: false, reason: 'jwt_malformed', message: error.message };
      }

      if (error instanceof jose.errors.JWKSNoMatchingKey) {
        // Still no matching key after refresh
        this.logger.warn('No matching key found in JWKS after refresh');
        return { success: false, reason: 'jwt_unknown_kid', message: 'Unknown signing key' };
      }

      if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
        return { success: false, reason: 'jwt_invalid_signature', message: 'Invalid token signature' };
      }

      if (error instanceof jose.errors.JOSEError) {
        this.logger.error(`JWT verification error: ${error.message}`);
        return { success: false, reason: 'jwt_malformed', message: 'Malformed token' };
      }

      // Unknown error
      this.logger.error(`Unknown JWT error: ${error}`);
      return { success: false, reason: 'jwt_unknown_error', message: 'Token verification failed' };
    }
  }

  /**
   * Extract Bearer token from Authorization header
   */
  extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}
