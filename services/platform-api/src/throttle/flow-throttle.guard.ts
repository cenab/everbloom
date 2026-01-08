import { Injectable, ExecutionContext, Logger, SetMetadata } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerModuleOptions } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * Rate limit flow types.
 *
 * PRD: "API endpoints are rate limited"
 * - admin: Rate limit by Supabase Auth sub (admin user)
 * - guest: Rate limit by invite_id (RSVP token)
 * - public: Rate limit by IP address
 */
export type RateLimitFlow = 'admin' | 'guest' | 'public';

/**
 * Metadata key for rate limit flow
 */
export const RATE_LIMIT_FLOW_KEY = 'rateLimitFlow';

/**
 * Decorator to set the rate limit flow for an endpoint.
 * @param flow - The flow type (admin, guest, public)
 */
export const RateLimitFlow = (flow: RateLimitFlow) =>
  SetMetadata(RATE_LIMIT_FLOW_KEY, flow);

/**
 * Custom throttler guard that extracts rate limit keys based on flow type.
 *
 * Key patterns:
 * - admin: admin:{sub}
 * - guest: guest:{invite_id}
 * - public: public:{ip}
 */
@Injectable()
export class FlowThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(FlowThrottlerGuard.name);

  constructor(
    options: ThrottlerModuleOptions,
    storageService: any,
    private readonly reflector2: Reflector,
  ) {
    super(options, storageService, reflector2);
  }

  /**
   * Generate the tracking key based on the flow type.
   */
  protected async getTracker(req: Request): Promise<string> {
    // Get the flow type from decorator or default to public
    const context = (req as any).__executionContext as ExecutionContext | undefined;
    let flow: RateLimitFlow = 'public';

    if (context) {
      const handlerFlow = this.reflector2.get<RateLimitFlow>(
        RATE_LIMIT_FLOW_KEY,
        context.getHandler(),
      );
      const classFlow = this.reflector2.get<RateLimitFlow>(
        RATE_LIMIT_FLOW_KEY,
        context.getClass(),
      );
      flow = handlerFlow || classFlow || 'public';
    }

    switch (flow) {
      case 'admin': {
        // Use Supabase Auth sub from the auth context
        const sub = (req as any).auth?.sub;
        if (sub) {
          return `admin:${sub}`;
        }
        // Fallback to IP if no sub available
        return `admin:ip:${this.getClientIP(req)}`;
      }

      case 'guest': {
        // Use invite_id from query, body, or RSVP token context
        const inviteId =
          req.query?.invite_id ||
          req.body?.invite_id ||
          (req as any).rsvpContext?.inviteId;
        if (inviteId) {
          return `guest:${inviteId}`;
        }
        // Fallback to IP if no invite_id
        return `guest:ip:${this.getClientIP(req)}`;
      }

      case 'public':
      default:
        return `public:${this.getClientIP(req)}`;
    }
  }

  /**
   * Get the client IP address, handling proxies.
   */
  private getClientIP(req: Request): string {
    // Check for forwarded headers (when behind a proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips.trim();
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Handle throttling exception with structured error.
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();

    this.logger.warn('Rate limit exceeded', {
      path: req.path,
      method: req.method,
      ip: this.getClientIP(req),
      tracker: await this.getTracker(req),
      limit: throttlerLimitDetail?.limit,
      ttl: throttlerLimitDetail?.ttl,
    });

    throw new ThrottlerException();
  }
}
