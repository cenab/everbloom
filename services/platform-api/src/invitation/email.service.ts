import { Injectable, Logger } from '@nestjs/common';
import type { Guest, Wedding } from '@wedding-bestie/shared';

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
   */
  private buildRsvpUrl(guest: Guest): string {
    const baseUrl = process.env.WEDDING_SITE_URL || 'http://localhost:4321';
    return `${baseUrl}/rsvp?token=${guest.rsvpToken}`;
  }

  /**
   * Build invitation email content
   */
  buildInvitationEmail(guest: Guest, wedding: Wedding): EmailContent {
    const rsvpUrl = this.buildRsvpUrl(guest);
    const partnerNames = `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;

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
      color: #2d2d2d;
      background-color: #faf8f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 32px;
      font-weight: 400;
      color: #c9826b;
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
      background-color: #c9826b;
      color: #ffffff !important;
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
      border-top: 1px solid #e5e5e5;
      font-size: 14px;
      color: #666;
    }
    .link-fallback {
      font-size: 12px;
      color: #888;
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
   */
  buildReminderEmail(guest: Guest, wedding: Wedding): EmailContent {
    const rsvpUrl = this.buildRsvpUrl(guest);
    const partnerNames = `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;

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
      color: #2d2d2d;
      background-color: #faf8f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 30px;
      font-weight: 400;
      color: #c9826b;
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
      background-color: #c9826b;
      color: #ffffff !important;
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
      border-top: 1px solid #e5e5e5;
      font-size: 14px;
      color: #666;
    }
    .link-fallback {
      font-size: 12px;
      color: #888;
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
