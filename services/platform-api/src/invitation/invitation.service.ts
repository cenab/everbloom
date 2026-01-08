import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type {
  BounceType,
  EmailOutbox,
  EmailStatus,
  EmailStatistics,
  EmailType,
  Guest,
  ReminderJobData,
  Wedding,
  SendInvitationResult,
  SendRemindersResponse,
  SendSaveTheDateResult,
  SendThankYouResult,
  ScheduledEmail,
  ScheduledEmailJobData,
  ScheduleEmailResponse,
} from '../types';
import {
  REMINDER_QUEUE_FAILED,
  SCHEDULED_EMAIL_NOT_FOUND,
  SCHEDULED_EMAIL_ALREADY_SENT,
  INVALID_SCHEDULE_TIME,
} from '../types';
import { EmailService } from './email.service';
import { ReminderQueueService } from './reminder-queue.service';
import { ScheduledEmailQueueService } from './scheduled-email-queue.service';
import { GuestService } from '../guest/guest.service';
import { WeddingService } from '../wedding/wedding.service';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  // In-memory store for email_outbox (development mode)
  private emailOutbox: Map<string, EmailOutbox> = new Map();

  // In-memory store for scheduled emails (development mode)
  private scheduledEmails: Map<string, ScheduledEmail> = new Map();

  constructor(
    private readonly emailService: EmailService,
    private readonly reminderQueueService: ReminderQueueService,
    private readonly scheduledEmailQueueService: ScheduledEmailQueueService,
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
    emailType: EmailType,
  ): EmailOutbox {
    const now = new Date().toISOString();
    const id = randomBytes(16).toString('hex');

    const record: EmailOutbox = {
      id,
      weddingId: wedding.id,
      guestId: guest.id,
      emailType,
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
    options?: {
      errorMessage?: string;
      messageId?: string;
      bounceType?: BounceType;
      bounceReason?: string;
    },
  ): void {
    const record = this.emailOutbox.get(recordId);
    if (!record) return;

    record.status = status;
    record.attempts += 1;
    record.updatedAt = new Date().toISOString();

    if (status === 'sent') {
      record.sentAt = new Date().toISOString();
    }

    if (status === 'delivered') {
      record.deliveredAt = new Date().toISOString();
    }

    if (status === 'bounced') {
      record.bouncedAt = new Date().toISOString();
      if (options?.bounceType) {
        record.bounceType = options.bounceType;
      }
      if (options?.bounceReason) {
        record.bounceReason = options.bounceReason;
      }
    }

    if (options?.errorMessage) {
      record.errorMessage = options.errorMessage;
    }

    if (options?.messageId) {
      record.messageId = options.messageId;
    }

    this.emailOutbox.set(recordId, record);
  }

  /**
   * Update an outbox record status by ID for a wedding
   */
  updateOutboxRecord(
    weddingId: string,
    recordId: string,
    status: EmailStatus,
    options?: {
      errorMessage?: string;
      messageId?: string;
      bounceType?: BounceType;
      bounceReason?: string;
    },
  ): boolean {
    const record = this.emailOutbox.get(recordId);
    if (!record || record.weddingId !== weddingId) {
      return false;
    }

    this.updateOutboxStatus(recordId, status, options);
    return true;
  }

  /**
   * Find an outbox record by SendGrid message ID
   */
  findOutboxByMessageId(messageId: string): EmailOutbox | undefined {
    for (const record of this.emailOutbox.values()) {
      if (record.messageId === messageId) {
        return record;
      }
    }
    return undefined;
  }

  /**
   * Update outbox status by SendGrid message ID (for webhook events)
   */
  updateOutboxByMessageId(
    messageId: string,
    status: EmailStatus,
    options?: {
      bounceType?: BounceType;
      bounceReason?: string;
    },
  ): boolean {
    const record = this.findOutboxByMessageId(messageId);
    if (!record) {
      return false;
    }

    this.updateOutboxStatus(record.id, status, options);
    this.logger.log(
      `Updated outbox ${record.id} status to ${status} via webhook (messageId: ${messageId})`,
    );
    return true;
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
   * PRD: "Email design matches wedding theme"
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
    const wedding = await this.weddingService.getWedding(weddingId);
    if (!wedding) {
      throw new Error('WEDDING_NOT_FOUND');
    }

    // Get the theme from render_config so emails match the wedding site
    const renderConfig = await this.weddingService.getRenderConfig(weddingId);
    const theme = renderConfig?.theme;

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

      // Regenerate RSVP token for security - old links are invalidated
      // The raw token is only available during this request cycle
      // Pass event date for token expiry capping
      let tokenResult: { guest: any; rawToken: string } | null;
      try {
        tokenResult = this.guestService.regenerateRsvpToken(guestId, wedding.eventDetails?.date);
      } catch (error) {
        if (error instanceof Error && error.message === 'EVENT_EXPIRED') {
          results.push({
            guestId,
            guestName: guest.name,
            email: guest.email,
            success: false,
            error: 'Cannot send invitations for past events',
          });
          failed++;
          continue;
        }
        throw error;
      }
      if (!tokenResult) {
        results.push({
          guestId,
          guestName: guest.name,
          email: guest.email,
          success: false,
          error: 'Failed to generate RSVP token',
        });
        failed++;
        continue;
      }

      // Build invitation email with the new raw token
      // PRD: "Email design matches wedding theme" - pass theme for branded emails
      const emailContent = this.emailService.buildInvitationEmail(
        tokenResult.guest,
        wedding,
        tokenResult.rawToken,
        theme,
      );

      // Create outbox record (tracks email)
      const outboxRecord = this.createOutboxRecord(
        tokenResult.guest,
        wedding,
        emailContent.subject,
        'invitation',
      );

      // Send the email
      const sendResult = await this.emailService.sendEmail(emailContent);

      if (sendResult.success) {
        this.updateOutboxStatus(outboxRecord.id, 'sent', {
          messageId: sendResult.messageId,
        });
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
        this.updateOutboxStatus(outboxRecord.id, 'failed', {
          errorMessage: sendResult.error,
        });

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
   * Enqueue reminder emails for pending guests
   * PRD: "Reminder emails are sent via worker queue"
   * PRD: "Email design matches wedding theme"
   */
  async enqueueReminders(
    weddingId: string,
    guestIds?: string[],
  ): Promise<SendRemindersResponse> {
    const wedding = await this.weddingService.getWedding(weddingId);
    if (!wedding) {
      throw new Error('WEDDING_NOT_FOUND');
    }

    if (!wedding.features.RSVP) {
      throw new Error('FEATURE_DISABLED');
    }

    // Get the theme from render_config so emails match the wedding site
    const renderConfig = await this.weddingService.getRenderConfig(weddingId);
    const theme = renderConfig?.theme;

    let guests = this.guestService
      .getGuestsForWedding(weddingId)
      .filter((guest) => guest.rsvpStatus === 'pending');

    if (guestIds && guestIds.length > 0) {
      const allowed = new Set(guestIds);
      guests = guests.filter((guest) => allowed.has(guest.id));
    }

    if (guests.length === 0) {
      return { queued: 0, total: 0, guestIds: [], jobIds: [] };
    }

    const jobs: ReminderJobData[] = [];

    for (const guest of guests) {
      // Regenerate RSVP token for security - old links are invalidated
      // Pass event date for token expiry capping
      let tokenResult: { guest: any; rawToken: string } | null;
      try {
        tokenResult = this.guestService.regenerateRsvpToken(guest.id, wedding.eventDetails?.date);
      } catch (error) {
        if (error instanceof Error && error.message === 'EVENT_EXPIRED') {
          this.logger.warn(`Cannot send reminder for guest ${guest.id} - event expired`);
          continue;
        }
        throw error;
      }
      if (!tokenResult) {
        this.logger.warn(`Failed to regenerate token for guest ${guest.id}`);
        continue;
      }

      // PRD: "Email design matches wedding theme" - pass theme for branded emails
      const emailContent = this.emailService.buildReminderEmail(
        tokenResult.guest,
        wedding,
        tokenResult.rawToken,
        theme,
      );
      const outboxRecord = this.createOutboxRecord(
        tokenResult.guest,
        wedding,
        emailContent.subject,
        'reminder',
      );

      jobs.push({
        outboxId: outboxRecord.id,
        weddingId: wedding.id,
        guestId: guest.id,
        toEmail: emailContent.to,
        toName: emailContent.toName,
        subject: emailContent.subject,
        htmlBody: emailContent.htmlBody,
        textBody: emailContent.textBody,
      });
    }

    try {
      const jobIds = await this.reminderQueueService.enqueueReminders(jobs);
      this.logger.log(
        `Queued ${jobIds.length} reminder(s) for wedding ${weddingId}.`,
      );
      return {
        queued: jobIds.length,
        total: jobs.length,
        guestIds: guests.map((guest) => guest.id),
        jobIds,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Queue error';
      for (const job of jobs) {
        this.updateOutboxStatus(job.outboxId, 'failed', { errorMessage: errMsg });
      }
      throw new Error(REMINDER_QUEUE_FAILED);
    }
  }

  /**
   * Send save-the-date emails to selected guests
   * PRD: "Admin can send save-the-date emails"
   * PRD: "Save-the-date uses different template than invitation"
   */
  async sendSaveTheDates(
    weddingId: string,
    guestIds: string[],
  ): Promise<{
    sent: number;
    failed: number;
    total: number;
    results: SendSaveTheDateResult[];
  }> {
    const wedding = await this.weddingService.getWedding(weddingId);
    if (!wedding) {
      throw new Error('WEDDING_NOT_FOUND');
    }

    // Get the theme from render_config so emails match the wedding site
    const renderConfig = await this.weddingService.getRenderConfig(weddingId);
    const theme = renderConfig?.theme;

    const results: SendSaveTheDateResult[] = [];
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

      // Build save-the-date email (no RSVP link per PRD)
      const emailContent = this.emailService.buildSaveTheDateEmail(
        guest,
        wedding,
        theme,
      );

      // Create outbox record
      const outboxRecord = this.createOutboxRecord(
        guest,
        wedding,
        emailContent.subject,
        'save_the_date',
      );

      // Send the email
      const sendResult = await this.emailService.sendEmail(emailContent);

      if (sendResult.success) {
        this.updateOutboxStatus(outboxRecord.id, 'sent', {
          messageId: sendResult.messageId,
        });

        results.push({
          guestId,
          guestName: guest.name,
          email: guest.email,
          success: true,
        });
        sent++;

        this.logger.log(`Save-the-date sent to ${guest.name} <${guest.email}>`);
      } else {
        this.updateOutboxStatus(outboxRecord.id, 'failed', {
          errorMessage: sendResult.error,
        });

        results.push({
          guestId,
          guestName: guest.name,
          email: guest.email,
          success: false,
          error: sendResult.error || 'Failed to send email',
        });
        failed++;

        this.logger.warn(`Failed to send save-the-date to ${guest.email}: ${sendResult.error}`);
      }
    }

    this.logger.log(
      `Save-the-date batch for wedding ${weddingId}: ${sent} sent, ${failed} failed`,
    );

    return {
      sent,
      failed,
      total: guestIds.length,
      results,
    };
  }

  /**
   * Send thank-you emails to selected guests
   * PRD: "Admin can send thank-you emails"
   * PRD: "Thank-you can be personalized by attendance"
   */
  async sendThankYous(
    weddingId: string,
    guestIds: string[],
  ): Promise<{
    sent: number;
    failed: number;
    total: number;
    results: SendThankYouResult[];
  }> {
    const wedding = await this.weddingService.getWedding(weddingId);
    if (!wedding) {
      throw new Error('WEDDING_NOT_FOUND');
    }

    // Get the theme from render_config so emails match the wedding site
    const renderConfig = await this.weddingService.getRenderConfig(weddingId);
    const theme = renderConfig?.theme;

    const results: SendThankYouResult[] = [];
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

      // Determine if guest attended (based on RSVP status)
      // PRD: "Thank-you can be personalized by attendance"
      const attended = guest.rsvpStatus === 'attending';

      // Build thank-you email with personalization based on attendance
      const emailContent = this.emailService.buildThankYouEmail(
        guest,
        wedding,
        attended,
        theme,
      );

      // Create outbox record
      const outboxRecord = this.createOutboxRecord(
        guest,
        wedding,
        emailContent.subject,
        'thank_you',
      );

      // Send the email
      const sendResult = await this.emailService.sendEmail(emailContent);

      if (sendResult.success) {
        this.updateOutboxStatus(outboxRecord.id, 'sent', {
          messageId: sendResult.messageId,
        });

        results.push({
          guestId,
          guestName: guest.name,
          email: guest.email,
          success: true,
        });
        sent++;

        this.logger.log(`Thank-you sent to ${guest.name} <${guest.email}> (attended: ${attended})`);
      } else {
        this.updateOutboxStatus(outboxRecord.id, 'failed', {
          errorMessage: sendResult.error,
        });

        results.push({
          guestId,
          guestName: guest.name,
          email: guest.email,
          success: false,
          error: sendResult.error || 'Failed to send email',
        });
        failed++;

        this.logger.warn(`Failed to send thank-you to ${guest.email}: ${sendResult.error}`);
      }
    }

    this.logger.log(
      `Thank-you batch for wedding ${weddingId}: ${sent} sent, ${failed} failed`,
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

  /**
   * Get email delivery statistics for a wedding
   * PRD: "Dashboard shows email delivery statistics"
   */
  getEmailStatistics(weddingId: string): EmailStatistics {
    const records = this.getOutboxForWedding(weddingId);

    // Initialize counters
    const stats: EmailStatistics = {
      totalSent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      byType: {
        invitation: { sent: 0, delivered: 0, failed: 0 },
        reminder: { sent: 0, delivered: 0, failed: 0 },
        save_the_date: { sent: 0, delivered: 0, failed: 0 },
        thank_you: { sent: 0, delivered: 0, failed: 0 },
      },
    };

    for (const record of records) {
      // Count overall totals
      stats.totalSent++;

      // Count by status
      if (record.status === 'sent' || record.status === 'delivered') {
        stats.delivered++;
      } else if (record.status === 'failed' || record.status === 'bounced') {
        stats.failed++;
      } else if (record.status === 'pending') {
        stats.pending++;
      }

      // Count by type
      const typeKey = record.emailType as keyof typeof stats.byType;
      if (stats.byType[typeKey]) {
        stats.byType[typeKey].sent++;
        if (record.status === 'sent' || record.status === 'delivered') {
          stats.byType[typeKey].delivered++;
        } else if (record.status === 'failed' || record.status === 'bounced') {
          stats.byType[typeKey].failed++;
        }
      }
    }

    // Note: openRate would require tracking pixel implementation
    // which is not currently implemented, so we leave it undefined

    return stats;
  }

  // ============================================================================
  // Scheduled Email Methods
  // PRD: "Admin can schedule emails for future send"
  // ============================================================================

  /**
   * Schedule an email to be sent at a future time
   * PRD: "Admin can schedule emails for future send"
   */
  async scheduleEmail(
    weddingId: string,
    guestIds: string[],
    emailType: EmailType,
    scheduledAt: string,
  ): Promise<ScheduleEmailResponse> {
    const wedding = await this.weddingService.getWedding(weddingId);
    if (!wedding) {
      throw new Error('WEDDING_NOT_FOUND');
    }

    // Validate scheduled time is in the future
    const scheduledTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    if (scheduledTime <= now) {
      throw new Error(INVALID_SCHEDULE_TIME);
    }

    // Validate guest IDs belong to this wedding
    for (const guestId of guestIds) {
      const guest = this.guestService.getGuest(guestId);
      if (!guest || guest.weddingId !== weddingId) {
        throw new Error('GUEST_NOT_FOUND');
      }
    }

    // Create scheduled email record
    const id = randomBytes(16).toString('hex');
    const scheduledEmail: ScheduledEmail = {
      id,
      weddingId,
      guestIds,
      emailType,
      scheduledAt,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create job data
    const jobData: ScheduledEmailJobData = {
      scheduledEmailId: id,
      weddingId,
      guestIds,
      emailType,
    };

    // Schedule the email via BullMQ
    const jobId = await this.scheduledEmailQueueService.scheduleEmail(
      jobData,
      scheduledAt,
    );

    scheduledEmail.jobId = jobId;
    this.scheduledEmails.set(id, scheduledEmail);

    this.logger.log(
      `Scheduled ${emailType} email for ${guestIds.length} guest(s) at ${scheduledAt}`,
    );

    return {
      scheduledEmail,
      jobId,
    };
  }

  /**
   * Get all scheduled emails for a wedding
   * PRD: "Admin can view and cancel scheduled emails"
   */
  getScheduledEmailsForWedding(weddingId: string): ScheduledEmail[] {
    const emails: ScheduledEmail[] = [];
    for (const email of this.scheduledEmails.values()) {
      if (email.weddingId === weddingId) {
        emails.push(email);
      }
    }
    // Sort by scheduledAt ascending (soonest first)
    return emails.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }

  /**
   * Get a single scheduled email by ID
   */
  getScheduledEmail(scheduledEmailId: string): ScheduledEmail | undefined {
    return this.scheduledEmails.get(scheduledEmailId);
  }

  /**
   * Cancel a scheduled email
   * PRD: "Admin can view and cancel scheduled emails"
   */
  async cancelScheduledEmail(
    weddingId: string,
    scheduledEmailId: string,
  ): Promise<ScheduledEmail> {
    const scheduledEmail = this.scheduledEmails.get(scheduledEmailId);

    if (!scheduledEmail || scheduledEmail.weddingId !== weddingId) {
      throw new Error(SCHEDULED_EMAIL_NOT_FOUND);
    }

    // Check if already sent or cancelled
    if (scheduledEmail.status === 'completed') {
      throw new Error(SCHEDULED_EMAIL_ALREADY_SENT);
    }

    if (scheduledEmail.status === 'cancelled') {
      return scheduledEmail;
    }

    // Cancel the BullMQ job
    const cancelled = await this.scheduledEmailQueueService.cancelScheduledEmail(
      scheduledEmailId,
    );

    if (!cancelled) {
      // Job might be already processing
      throw new Error(SCHEDULED_EMAIL_ALREADY_SENT);
    }

    // Update status
    scheduledEmail.status = 'cancelled';
    scheduledEmail.updatedAt = new Date().toISOString();
    this.scheduledEmails.set(scheduledEmailId, scheduledEmail);

    this.logger.log(`Cancelled scheduled email ${scheduledEmailId}`);

    return scheduledEmail;
  }

  /**
   * Update scheduled email status (called by worker after processing)
   */
  updateScheduledEmailStatus(
    scheduledEmailId: string,
    status: 'processing' | 'completed' | 'cancelled',
    results?: { sent: number; failed: number; total: number },
  ): boolean {
    const scheduledEmail = this.scheduledEmails.get(scheduledEmailId);
    if (!scheduledEmail) {
      return false;
    }

    scheduledEmail.status = status;
    scheduledEmail.updatedAt = new Date().toISOString();
    if (results) {
      scheduledEmail.results = results;
    }

    this.scheduledEmails.set(scheduledEmailId, scheduledEmail);
    return true;
  }

  /**
   * Execute a scheduled email send (called by worker)
   * This method actually sends the emails when the scheduled time arrives
   */
  async executeScheduledEmail(
    jobData: ScheduledEmailJobData,
  ): Promise<{ sent: number; failed: number; total: number }> {
    const { scheduledEmailId, weddingId, guestIds, emailType } = jobData;

    // Mark as processing
    this.updateScheduledEmailStatus(scheduledEmailId, 'processing');

    let results: { sent: number; failed: number; total: number };

    try {
      // Execute the appropriate send method based on email type
      switch (emailType) {
        case 'invitation':
          const inviteResults = await this.sendInvitations(weddingId, guestIds);
          results = {
            sent: inviteResults.sent,
            failed: inviteResults.failed,
            total: inviteResults.total,
          };
          break;

        case 'reminder':
          const reminderResults = await this.enqueueReminders(weddingId, guestIds);
          results = {
            sent: reminderResults.queued,
            failed: reminderResults.total - reminderResults.queued,
            total: reminderResults.total,
          };
          break;

        case 'save_the_date':
          const stdResults = await this.sendSaveTheDates(weddingId, guestIds);
          results = {
            sent: stdResults.sent,
            failed: stdResults.failed,
            total: stdResults.total,
          };
          break;

        case 'thank_you':
          const tyResults = await this.sendThankYous(weddingId, guestIds);
          results = {
            sent: tyResults.sent,
            failed: tyResults.failed,
            total: tyResults.total,
          };
          break;

        default:
          results = { sent: 0, failed: guestIds.length, total: guestIds.length };
      }

      // Mark as completed with results
      this.updateScheduledEmailStatus(scheduledEmailId, 'completed', results);

      this.logger.log(
        `Executed scheduled email ${scheduledEmailId}: ${results.sent} sent, ${results.failed} failed`,
      );

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to execute scheduled email ${scheduledEmailId}: ${errorMessage}`,
      );

      results = { sent: 0, failed: guestIds.length, total: guestIds.length };
      this.updateScheduledEmailStatus(scheduledEmailId, 'completed', results);

      throw error;
    }
  }
}
