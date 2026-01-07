import { Module, forwardRef } from '@nestjs/common';
import { InvitationController } from './invitation.controller';
import { SendGridWebhookController } from './sendgrid-webhook.controller';
import { InvitationService } from './invitation.service';
import { EmailService } from './email.service';
import { ReminderQueueService } from './reminder-queue.service';
import { ScheduledEmailQueueService } from './scheduled-email-queue.service';
import { AuthModule } from '../auth/auth.module';
import { GuestModule } from '../guest/guest.module';
import { WeddingModule } from '../wedding/wedding.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => GuestModule),
    forwardRef(() => WeddingModule),
  ],
  controllers: [InvitationController, SendGridWebhookController],
  providers: [
    InvitationService,
    EmailService,
    ReminderQueueService,
    ScheduledEmailQueueService,
  ],
  exports: [
    InvitationService,
    EmailService,
    ReminderQueueService,
    ScheduledEmailQueueService,
  ],
})
export class InvitationModule {}
