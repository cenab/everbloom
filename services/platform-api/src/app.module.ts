import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard, seconds } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { WeddingModule } from './wedding/wedding.module';
import { GuestModule } from './guest/guest.module';
import { RsvpModule } from './rsvp/rsvp.module';
import { InvitationModule } from './invitation/invitation.module';
import { PhotosModule } from './photos/photos.module';
import { GuestbookModule } from './guestbook/guestbook.module';
import { MusicModule } from './music/music.module';
import { SeatingModule } from './seating/seating.module';
import { RedisThrottlerStorage } from './throttle/redis-throttle.storage';

/**
 * Rate limiting configuration with Redis-backed storage.
 * PRD: "API endpoints are rate limited"
 *
 * Three tiers of limits:
 * - Default: 100 requests per minute (general API usage)
 * - Strict: 10 requests per minute (sensitive operations like auth, RSVP submit)
 * - Relaxed: 300 requests per minute (read-heavy endpoints)
 *
 * Per-flow keys:
 * - admin: Rate limited by Supabase Auth sub
 * - guest: Rate limited by invite_id
 * - public: Rate limited by IP address
 *
 * Use @RateLimitFlow('admin' | 'guest' | 'public') decorator on controllers/handlers.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [
          {
            // Default limit: 100 requests per minute
            name: 'default',
            ttl: seconds(60),
            limit: 100,
          },
          {
            // Strict limit: 10 requests per minute (auth, RSVP, uploads)
            name: 'strict',
            ttl: seconds(60),
            limit: 10,
          },
          {
            // Relaxed limit: 300 requests per minute (read-only endpoints)
            name: 'relaxed',
            ttl: seconds(60),
            limit: 300,
          },
        ],
        storage,
      }),
      inject: [RedisThrottlerStorage],
    }),
    AuthModule,
    BillingModule,
    WeddingModule,
    GuestModule,
    RsvpModule,
    InvitationModule,
    PhotosModule,
    GuestbookModule,
    MusicModule,
    SeatingModule,
  ],
  controllers: [AppController],
  providers: [
    RedisThrottlerStorage,
    {
      // Apply throttling globally to all endpoints
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
