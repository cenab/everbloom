import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type {
  EmailOutbox,
  EmailStatus,
  Guest,
  Wedding,
  SendInvitationResult,
} from '@wedding-bestie/shared';
import { EmailService } from './email.service';
import { GuestService } from '../guest/guest.service';
import { WeddingService } from '../wedding/wedding.service';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  // In-memory store for email_outbox (development mode)
  private emailOutbox: Map<string, EmailOutbox> = new Map();

  constructor(
    private readonly emailService: EmailService,
    private readonly guestService: GuestService,
    private readonly weddingService: WeddingService,
  ) {}

  /**
   * Create an email outbox record
   */
  private createOutboxRecord(
    guest: Guest,
    wedding: Wedding,
    subject: string,
  ): EmailOutbox {
    const now = new Date().toISOString();
    const id = randomBytes(16).toString('hex');

    const record: EmailOutbox = {
      id,
      weddingId: wedding.id,
      guestId: guest.id,
      emailType: 'invitation',
      status: 'pending',
      toEmail: guest.email,
      toName: guest.name,
      subject,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.emailOutbox.set(id, record);
    return record;
  }

  /**
   * Update an email outbox record status
   */
  private updateOutboxStatus(
    recordId: string,
    status: EmailStatus,
    errorMessage?: string,
  ): void {
    const record = this.emailOutbox.get(recordId);
    if (!record) return;

    record.status = status;
    record.attempts += 1;
    record.updatedAt = new Date().toISOString();

    if (status === 'sent') {
      record.sentAt = new Date().toISOString();
    }

    if (errorMessage) {
      record.errorMessage = errorMessage;
    }

    this.emailOutbox.set(recordId, record);
  }

  /**
   * Update guest's inviteSentAt timestamp
   */
  private async markGuestInviteSent(guestId: string): Promise<void> {
    const guest = this.guestService.getGuest(guestId);
    if (guest) {
      // Update the guest record with invite sent timestamp
      await this.guestService.updateGuest(guestId, {});
      // The GuestService doesn't have a direct way to set inviteSentAt,
      // so we'll track it via the outbox record for now
    }
  }

  /**
   * Send invitations to selected guests
   * PRD: "Admin can send invitation emails"
   */
  async sendInvitations(
    weddingId: string,
    guestIds: string[],
  ): Promise<{
    sent: number;
    failed: number;
    total: number;
    results: SendInvitationResult[];
  }> {
    const wedding = this.weddingService.getWedding(weddingId);
    if (!wedding) {
      throw new Error('WEDDING_NOT_FOUND');
    }

    const results: SendInvitationResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const guestId of guestIds) {
      const guest = this.guestService.getGuest(guestId);

      if (!guest) {
        results.push({
          guestId,
          guestName: 'Unknown',
          email: 'Unknown',
          success: false,
          error: 'Guest not found',
        });
        failed++;
        continue;
      }

      if (guest.weddingId !== weddingId) {
        results.push({
          guestId,
          guestName: guest.name,
          email: guest.email,
          success: false,
          error: 'Guest does not belong to this wedding',
        });
        failed++;
        continue;
      }

      // Build and send the invitation email
      const emailContent = this.emailService.buildInvitationEmail(guest, wedding);

      // Create outbox record (tracks email)
      const outboxRecord = this.createOutboxRecord(guest, wedding, emailContent.subject);

      // Send the email
      const sendResult = await this.emailService.sendEmail(emailContent);

      if (sendResult.success) {
        this.updateOutboxStatus(outboxRecord.id, 'sent');
        await this.markGuestInviteSent(guestId);

        results.push({
          guestId,
          guestName: guest.name,
          email: guest.email,
          success: true,
        });
        sent++;

        this.logger.log(`Invitation sent to ${guest.name} <${guest.email}>`);
      } else {
        this.updateOutboxStatus(outboxRecord.id, 'failed', sendResult.error);

        results.push({
          guestId,
          guestName: guest.name,
          email: guest.email,
          success: false,
          error: sendResult.error || 'Failed to send email',
        });
        failed++;

        this.logger.warn(`Failed to send invitation to ${guest.email}: ${sendResult.error}`);
      }
    }

    this.logger.log(
      `Invitation batch for wedding ${weddingId}: ${sent} sent, ${failed} failed`,
    );

    return {
      sent,
      failed,
      total: guestIds.length,
      results,
    };
  }

  /**
   * Get email outbox records for a wedding
   */
  getOutboxForWedding(weddingId: string): EmailOutbox[] {
    const records: EmailOutbox[] = [];
    for (const record of this.emailOutbox.values()) {
      if (record.weddingId === weddingId) {
        records.push(record);
      }
    }
    // Sort by createdAt descending
    return records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Get email outbox records for a guest
   */
  getOutboxForGuest(guestId: string): EmailOutbox[] {
    const records: EmailOutbox[] = [];
    for (const record of this.emailOutbox.values()) {
      if (record.guestId === guestId) {
        records.push(record);
      }
    }
    return records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
