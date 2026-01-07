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

/**
 * Rate limiting configuration.
 * PRD: "API endpoints are rate limited"
 *
 * Three tiers of limits:
 * - Default: 100 requests per minute (general API usage)
 * - Strict: 10 requests per minute (sensitive operations like auth, RSVP submit)
 * - Relaxed: 300 requests per minute (read-heavy endpoints)
 *
 * Each tier can be applied to specific endpoints using @Throttle() decorator.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
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
    ]),
    AuthModule,
    BillingModule,
    WeddingModule,
    GuestModule,
    RsvpModule,
    InvitationModule,
    PhotosModule,
    GuestbookModule,
  ],
  controllers: [AppController],
  providers: [
    {
      // Apply throttling globally to all endpoints
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
