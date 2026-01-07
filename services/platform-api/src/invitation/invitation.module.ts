import { Module, forwardRef } from '@nestjs/common';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { EmailService } from './email.service';
import { ReminderQueueService } from './reminder-queue.service';
import { AuthModule } from '../auth/auth.module';
import { GuestModule } from '../guest/guest.module';
import { WeddingModule } from '../wedding/wedding.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => GuestModule),
    forwardRef(() => WeddingModule),
  ],
  controllers: [InvitationController],
  providers: [InvitationService, EmailService, ReminderQueueService],
  exports: [InvitationService, EmailService, ReminderQueueService],
})
export class InvitationModule {}
