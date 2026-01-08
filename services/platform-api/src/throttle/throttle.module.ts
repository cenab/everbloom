import { Module, Global } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
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
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            name: 'default',
            ttl: seconds(60),
            limit: 100,
          },
          {
            name: 'strict',
            ttl: seconds(60),
            limit: 10,
          },
          {
            name: 'relaxed',
            ttl: seconds(60),
            limit: 300,
          },
        ],
      }),
    }),
  ],
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class ThrottleModule {}
