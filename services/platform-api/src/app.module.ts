import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { WeddingModule } from './wedding/wedding.module';
import { GuestModule } from './guest/guest.module';
import { RsvpModule } from './rsvp/rsvp.module';
import { InvitationModule } from './invitation/invitation.module';

@Module({
  imports: [
    AuthModule,
    BillingModule,
    WeddingModule,
    GuestModule,
    RsvpModule,
    InvitationModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
