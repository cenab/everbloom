// Types for worker service

/**
 * Email status in the email_outbox
 */
export type EmailStatus = 'pending' | 'sent' | 'failed';

/**
 * Reminder job payload for the worker queue
 */
export interface ReminderJobData {
  outboxId: string;
  weddingId: string;
  guestId: string;
  toEmail: string;
  toName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Outbox status update payload (worker -> platform API)
 */
export interface UpdateOutboxStatusRequest {
  status: EmailStatus;
  errorMessage?: string;
}

/**
 * Queue name for reminder emails
 */
export const REMINDER_QUEUE_NAME = 'email-reminders' as const;
