import { Injectable, Logger } from '@nestjs/common';
import type { Guest, Theme, Wedding } from '../types';

/**
 * Email content for transactional emails
 */
interface EmailContent {
  to: string;
  toName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Default theme colors (fallback if no theme provided)
 */
const DEFAULT_THEME: Theme = {
  primary: '#c9826b',
  accent: '#8fac8b',
  neutralLight: '#faf8f5',
  neutralDark: '#2d2d2d',
};

/**
 * Result of sending an email
 */
interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Build the RSVP URL for a guest
   * Takes the raw token as a parameter - tokens are never stored in plaintext
   */
  private buildRsvpUrl(rawToken: string): string {
    const baseUrl = process.env.WEDDING_SITE_URL || 'http://localhost:4321';
    return `${baseUrl}/rsvp?token=${rawToken}`;
  }

  /**
   * Lighten a hex color by a given factor (0-1)
   * Used to create derived colors from theme while staying accessible
   */
  private lightenColor(hex: string, factor: number): string {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Parse RGB
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    // Lighten by mixing with white
    const newR = Math.round(r + (255 - r) * factor);
    const newG = Math.round(g + (255 - g) * factor);
    const newB = Math.round(b + (255 - b) * factor);

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  /**
   * Build invitation email content
   * PRD: "Email design matches wedding theme"
   * @param guest The guest to send the invitation to
   * @param wedding The wedding details
   * @param rawToken The raw RSVP token for the URL (not stored, only used for email)
   * @param theme Optional theme to use for email colors (falls back to default)
   */
  buildInvitationEmail(
    guest: Guest,
    wedding: Wedding,
    rawToken: string,
    theme?: Theme,
  ): EmailContent {
    const rsvpUrl = this.buildRsvpUrl(rawToken);
    const partnerNames = `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;
    const colors = theme || DEFAULT_THEME;

    const subject = `You're Invited: ${partnerNames}'s Wedding`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${colors.neutralDark};
      background-color: ${colors.neutralLight};
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: ${this.lightenColor(colors.neutralLight, 0.02)};
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 32px;
      font-weight: 400;
      color: ${colors.primary};
      margin: 0 0 24px 0;
      text-align: center;
    }
    p {
      margin: 0 0 16px 0;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 24px;
    }
    .cta-button {
      display: inline-block;
      background-color: ${colors.primary};
      color: ${colors.neutralLight} !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      margin: 24px 0;
    }
    .cta-container {
      text-align: center;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid ${this.lightenColor(colors.neutralDark, 0.7)};
      font-size: 14px;
      color: ${this.lightenColor(colors.neutralDark, 0.3)};
    }
    .link-fallback {
      font-size: 12px;
      color: ${this.lightenColor(colors.neutralDark, 0.4)};
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>${partnerNames}</h1>
      <p class="greeting">Dear ${guest.name},</p>
      <p>We're overjoyed to invite you to celebrate our wedding!</p>
      <p>Your presence would mean the world to us as we begin this new chapter together.</p>
      <div class="cta-container">
        <a href="${rsvpUrl}" class="cta-button">View Invitation & RSVP</a>
      </div>
      <p class="link-fallback">
        If the button doesn't work, copy and paste this link into your browser:<br>
        ${rsvpUrl}
      </p>
      <div class="footer">
        <p>We can't wait to see you there!</p>
        <p>With love,<br>${partnerNames}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textBody = `
${partnerNames}

Dear ${guest.name},

We're overjoyed to invite you to celebrate our wedding!

Your presence would mean the world to us as we begin this new chapter together.

Please RSVP by visiting:
${rsvpUrl}

We can't wait to see you there!

With love,
${partnerNames}
    `.trim();

    return {
      to: guest.email,
      toName: guest.name,
      subject,
      htmlBody,
      textBody,
    };
  }

  /**
   * Build reminder email content
   * PRD: "Email design matches wedding theme"
   * @param guest The guest to send the reminder to
   * @param wedding The wedding details
   * @param rawToken The raw RSVP token for the URL (not stored, only used for email)
   * @param theme Optional theme to use for email colors (falls back to default)
   */
  buildReminderEmail(
    guest: Guest,
    wedding: Wedding,
    rawToken: string,
    theme?: Theme,
  ): EmailContent {
    const rsvpUrl = this.buildRsvpUrl(rawToken);
    const partnerNames = `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;
    const colors = theme || DEFAULT_THEME;

    const subject = `A gentle reminder: RSVP for ${partnerNames}'s wedding`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${colors.neutralDark};
      background-color: ${colors.neutralLight};
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: ${this.lightenColor(colors.neutralLight, 0.02)};
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 30px;
      font-weight: 400;
      color: ${colors.primary};
      margin: 0 0 16px 0;
      text-align: center;
    }
    p {
      margin: 0 0 16px 0;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 24px;
    }
    .cta-button {
      display: inline-block;
      background-color: ${colors.primary};
      color: ${colors.neutralLight} !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      margin: 24px 0;
    }
    .cta-container {
      text-align: center;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid ${this.lightenColor(colors.neutralDark, 0.7)};
      font-size: 14px;
      color: ${this.lightenColor(colors.neutralDark, 0.3)};
    }
    .link-fallback {
      font-size: 12px;
      color: ${this.lightenColor(colors.neutralDark, 0.4)};
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>${partnerNames}</h1>
      <p class="greeting">Hi ${guest.name},</p>
      <p>We hope you're doing well. If you haven't had a chance to RSVP yet, we'd love to hear from you.</p>
      <p>Your response helps us finalize the details and celebrate with care.</p>
      <div class="cta-container">
        <a href="${rsvpUrl}" class="cta-button">RSVP Now</a>
      </div>
      <p class="link-fallback">
        If the button doesn't work, copy and paste this link into your browser:<br>
        ${rsvpUrl}
      </p>
      <div class="footer">
        <p>With gratitude,<br>${partnerNames}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textBody = `
${partnerNames}

Hi ${guest.name},

We hope you're doing well. If you haven't had a chance to RSVP yet, we'd love to hear from you.

Your response helps us finalize the details and celebrate with care.

Please RSVP here:
${rsvpUrl}

With gratitude,
${partnerNames}
    `.trim();

    return {
      to: guest.email,
      toName: guest.name,
      subject,
      htmlBody,
      textBody,
    };
  }

  /**
   * Send an email via SendGrid
   * In development mode, logs the email instead of actually sending
   */
  async sendEmail(content: EmailContent): Promise<SendEmailResult> {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'invites@everbloom.wedding';
    const fromName = process.env.SENDGRID_FROM_NAME || 'Everbloom Weddings';

    // Development mode: log instead of sending
    if (!sendgridApiKey) {
      this.logger.log(`📧 DEVELOPMENT MODE - Email would be sent:`);
      this.logger.log(`   To: ${content.toName} <${content.to}>`);
      this.logger.log(`   Subject: ${content.subject}`);
      this.logger.log(`   ---`);
      this.logger.log(`   ${content.textBody.split('\n').slice(0, 5).join('\n')}...`);
      this.logger.log(`   ---`);

      return {
        success: true,
        messageId: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    }

    // Production mode: send via SendGrid API
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: content.to, name: content.toName }],
            },
          ],
          from: { email: fromEmail, name: fromName },
          subject: content.subject,
          content: [
            { type: 'text/plain', value: content.textBody },
            { type: 'text/html', value: content.htmlBody },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`SendGrid API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `SendGrid API error: ${response.status}`,
        };
      }

      // SendGrid returns message ID in header
      const messageId = response.headers.get('X-Message-Id') || `sg-${Date.now()}`;
      this.logger.log(`Email sent successfully to ${content.to}, messageId: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
