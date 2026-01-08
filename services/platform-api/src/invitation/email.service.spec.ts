import { EmailService } from './email.service';
import type { Guest, Wedding, Theme } from '../types';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
  });

  // Helper to create a mock guest
  const createMockGuest = (overrides?: Partial<Guest>): Guest => ({
    id: 'guest-1',
    weddingId: 'wedding-1',
    name: 'John Doe',
    email: 'john@example.com',
    partySize: 2,
    rsvpStatus: 'pending',
    rsvpTokenHash: 'hashed-token',
    tagIds: [],
    plusOneAllowance: 1,
    plusOneGuests: [],
    photoOptOut: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  // Helper to create a mock wedding
  const createMockWedding = (overrides?: Partial<Wedding>): Wedding => ({
    id: 'wedding-1',
    userId: 'user-1',
    slug: 'john-and-jane',
    name: 'John & Jane Wedding',
    partnerNames: ['John', 'Jane'],
    planId: 'premium',
    status: 'active',
    features: {
      RSVP: true,
      CALENDAR_INVITE: true,
      PHOTO_UPLOAD: true,
      ANNOUNCEMENT_BANNER: true,
      FAQ_SECTION: true,
      PASSCODE_SITE: false,
      REGISTRY: true,
      ACCOMMODATIONS: true,
      GUESTBOOK: true,
      MUSIC_REQUESTS: true,
      SEATING_CHART: true,
      VIDEO_EMBED: true,
    },
    eventDetails: {
      date: '2025-06-15',
      startTime: '14:00',
      endTime: '22:00',
      venue: 'Grand Ballroom',
      address: '123 Wedding Lane',
      city: 'New York',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  const mockTheme: Theme = {
    primary: '#c9826b',
    accent: '#8fac8b',
    neutralLight: '#faf8f5',
    neutralDark: '#2d2d2d',
  };

  describe('buildInvitationEmail', () => {
    it('should build invitation email with default template', () => {
      const guest = createMockGuest();
      const wedding = createMockWedding();
      const rawToken = 'raw-rsvp-token';

      const result = emailService.buildInvitationEmail(guest, wedding, rawToken, mockTheme);

      expect(result.to).toBe('john@example.com');
      expect(result.toName).toBe('John Doe');
      expect(result.subject).toContain('John & Jane');
      expect(result.htmlBody).toContain('John Doe');
      expect(result.htmlBody).toContain('rsvp?token=raw-rsvp-token');
      expect(result.textBody).toContain('John Doe');
    });

    it('should build invitation email with custom template and merge fields', () => {
      const guest = createMockGuest({ name: 'Alice Smith' });
      const wedding = createMockWedding({
        emailTemplates: {
          invitation: {
            subject: 'You are invited to {{partner_names}} wedding!',
            greeting: 'Hello {{guest_name}},',
            bodyText: 'Join us on {{wedding_date}} at {{wedding_venue}}!',
            closing: 'See you there!',
          },
        },
      });
      const rawToken = 'token-123';

      const result = emailService.buildInvitationEmail(guest, wedding, rawToken, mockTheme);

      expect(result.subject).toBe('You are invited to John & Jane wedding!');
      expect(result.htmlBody).toContain('Hello Alice Smith,');
      expect(result.htmlBody).toContain('Grand Ballroom');
      expect(result.textBody).toContain('Hello Alice Smith,');
    });

    it('should include theme colors in HTML email', () => {
      const guest = createMockGuest();
      const wedding = createMockWedding();
      const rawToken = 'token';

      const result = emailService.buildInvitationEmail(guest, wedding, rawToken, mockTheme);

      expect(result.htmlBody).toContain('#c9826b');
      expect(result.htmlBody).toContain('#faf8f5');
    });
  });

  describe('buildReminderEmail', () => {
    it('should build reminder email with default template', () => {
      const guest = createMockGuest();
      const wedding = createMockWedding();
      const rawToken = 'reminder-token';

      const result = emailService.buildReminderEmail(guest, wedding, rawToken, mockTheme);

      expect(result.to).toBe('john@example.com');
      expect(result.subject).toContain('reminder');
      expect(result.htmlBody).toContain('RSVP');
      expect(result.textBody).toContain('RSVP');
    });

    it('should build reminder email with custom template', () => {
      const guest = createMockGuest({ name: 'Bob Jones' });
      const wedding = createMockWedding({
        emailTemplates: {
          reminder: {
            subject: 'Reminder: RSVP for {{partner_names}}',
            greeting: 'Dear {{guest_name}},',
            bodyText: 'Please respond by visiting {{rsvp_link}}',
            closing: 'Thanks!',
          },
        },
      });
      const rawToken = 'token-456';

      const result = emailService.buildReminderEmail(guest, wedding, rawToken, mockTheme);

      expect(result.subject).toBe('Reminder: RSVP for John & Jane');
      expect(result.htmlBody).toContain('Dear Bob Jones,');
    });
  });

  describe('buildSaveTheDateEmail', () => {
    it('should build save-the-date email without RSVP link', () => {
      const guest = createMockGuest();
      const wedding = createMockWedding();

      const result = emailService.buildSaveTheDateEmail(guest, wedding, mockTheme);

      expect(result.subject).toContain('Save the Date');
      expect(result.htmlBody).not.toContain('rsvp?token=');
      expect(result.textBody).not.toContain('rsvp?token=');
    });

    it('should include wedding date and location', () => {
      const guest = createMockGuest();
      const wedding = createMockWedding({
        eventDetails: {
          date: '2025-06-15',
          startTime: '14:00',
          endTime: '22:00',
          venue: 'Beautiful Garden',
          address: '456 Event St',
          city: 'Los Angeles',
        },
      });

      const result = emailService.buildSaveTheDateEmail(guest, wedding, mockTheme);

      expect(result.htmlBody).toContain('2025');
      expect(result.htmlBody).toContain('Beautiful Garden');
      expect(result.textBody).toContain('Los Angeles');
    });
  });

  describe('buildThankYouEmail', () => {
    it('should build thank-you email for attendees', () => {
      const guest = createMockGuest();
      const wedding = createMockWedding();

      const result = emailService.buildThankYouEmail(guest, wedding, true, mockTheme);

      expect(result.subject).toContain('Thank You');
      expect(result.htmlBody).toContain('beautiful celebration');
      expect(result.textBody).toContain('beautiful celebration');
    });

    it('should build thank-you email for non-attendees', () => {
      const guest = createMockGuest();
      const wedding = createMockWedding();

      const result = emailService.buildThankYouEmail(guest, wedding, false, mockTheme);

      expect(result.subject).toContain('Thank You');
      expect(result.htmlBody).toContain('missed you');
      expect(result.textBody).toContain('missed you');
    });
  });

  describe('sendEmail', () => {
    it('should log email in development mode when no API key', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        toName: 'Test User',
        subject: 'Test Subject',
        htmlBody: '<p>Test</p>',
        textBody: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toContain('dev-');

      logSpy.mockRestore();
    });
  });
});
