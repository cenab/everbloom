// Types for worker service

/**
 * Email status in the email_outbox
 */
export type EmailStatus = 'pending' | 'sent' | 'failed';

/**
 * Email type identifier
 */
export type EmailType = 'invitation' | 'reminder' | 'save_the_date' | 'thank_you' | 'update';

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
 * Scheduled email job payload for the worker queue
 * PRD: "Admin can schedule emails for future send"
 */
export interface ScheduledEmailJobData {
  scheduledEmailId: string;
  weddingId: string;
  guestIds: string[];
  emailType: EmailType;
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

/**
 * Queue name for scheduled emails
 */
export const SCHEDULED_EMAIL_QUEUE_NAME = 'scheduled-emails' as const;
