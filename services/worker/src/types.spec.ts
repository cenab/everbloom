import { describe, it, expect } from 'vitest';
import {
  REMINDER_QUEUE_NAME,
  SCHEDULED_EMAIL_QUEUE_NAME,
  type EmailStatus,
  type EmailType,
  type ReminderJobData,
  type ScheduledEmailJobData,
  type UpdateOutboxStatusRequest,
} from './types.js';

describe('Worker Types', () => {
  describe('Queue Names', () => {
    it('should have correct reminder queue name', () => {
      expect(REMINDER_QUEUE_NAME).toBe('email-reminders');
    });

    it('should have correct scheduled email queue name', () => {
      expect(SCHEDULED_EMAIL_QUEUE_NAME).toBe('scheduled-emails');
    });
  });

  describe('Type Validation', () => {
    it('should accept valid ReminderJobData', () => {
      const jobData: ReminderJobData = {
        outboxId: 'outbox-1',
        weddingId: 'wedding-1',
        guestId: 'guest-1',
        toEmail: 'test@example.com',
        toName: 'Test User',
        subject: 'Test Subject',
        htmlBody: '<p>Test</p>',
        textBody: 'Test',
      };

      expect(jobData.outboxId).toBe('outbox-1');
      expect(jobData.toEmail).toBe('test@example.com');
    });

    it('should accept valid ScheduledEmailJobData', () => {
      const jobData: ScheduledEmailJobData = {
        scheduledEmailId: 'scheduled-1',
        weddingId: 'wedding-1',
        guestIds: ['guest-1', 'guest-2'],
        emailType: 'invitation',
      };

      expect(jobData.guestIds).toHaveLength(2);
      expect(jobData.emailType).toBe('invitation');
    });

    it('should accept valid UpdateOutboxStatusRequest', () => {
      const successRequest: UpdateOutboxStatusRequest = {
        status: 'sent',
      };

      const failedRequest: UpdateOutboxStatusRequest = {
        status: 'failed',
        errorMessage: 'Network error',
      };

      expect(successRequest.status).toBe('sent');
      expect(failedRequest.errorMessage).toBe('Network error');
    });

    it('should validate all email types', () => {
      const emailTypes: EmailType[] = ['invitation', 'reminder', 'save_the_date', 'thank_you', 'update'];

      emailTypes.forEach((type) => {
        expect(['invitation', 'reminder', 'save_the_date', 'thank_you', 'update']).toContain(type);
      });
    });

    it('should validate all email statuses', () => {
      const statuses: EmailStatus[] = ['pending', 'sent', 'failed'];

      statuses.forEach((status) => {
        expect(['pending', 'sent', 'failed']).toContain(status);
      });
    });
  });
});
