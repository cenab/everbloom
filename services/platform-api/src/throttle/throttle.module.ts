import { Module, Global } from '@nestjs/common';
import { RedisThrottlerStorage } from './redis-throttle.storage';

/**
 * Throttle module with Redis-backed storage.
 *
 * PRD: "API endpoints are rate limited"
 *
 * Three tiers of limits:
 * - default: 100 requests per minute (general API usage)
 * - strict: 10 requests per minute (sensitive operations like auth, RSVP submit)
 * - relaxed: 300 requests per minute (read-heavy endpoints)
 */
@Global()
@Module({
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class ThrottleModule {}
