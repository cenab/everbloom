import { Injectable, Logger } from '@nestjs/common';
import type { Guest, Theme, Wedding, EmailTemplateContent, GuestDataExport } from '../types';

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
   * Replace merge fields in a template string with actual values
   * PRD: "Email templates support merge fields"
   *
   * Supported merge fields:
   * - {{guest_name}} - Guest's name
   * - {{partner_names}} - Partner names (e.g., "John & Jane")
   * - {{wedding_date}} - Formatted wedding date
   * - {{wedding_venue}} - Venue name
   * - {{wedding_city}} - City name
   * - {{rsvp_link}} - RSVP link with token
   */
  private replaceMergeFields(
    template: string,
    guest: Guest,
    wedding: Wedding,
    rsvpLink?: string,
  ): string {
    const partnerNames = `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;

    // Format wedding date if available
    const weddingDate = wedding.eventDetails?.date
      ? new Date(wedding.eventDetails.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Date to be announced';

    const venue = wedding.eventDetails?.venue || '';
    const city = wedding.eventDetails?.city || '';

    return template
      .replace(/\{\{guest_name\}\}/g, guest.name)
      .replace(/\{\{partner_names\}\}/g, partnerNames)
      .replace(/\{\{wedding_date\}\}/g, weddingDate)
      .replace(/\{\{wedding_venue\}\}/g, venue)
      .replace(/\{\{wedding_city\}\}/g, city)
      .replace(/\{\{rsvp_link\}\}/g, rsvpLink || '');
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
   * Build HTML email wrapper with consistent styling
   * Used for all email types to ensure design consistency
   */
  private buildEmailHtml(
    headline: string,
    greeting: string,
    bodyParagraphs: string[],
    ctaText: string | null,
    ctaUrl: string | null,
    closing: string,
    signature: string,
    colors: Theme,
    linkFallback?: string,
  ): string {
    const ctaBlock = ctaText && ctaUrl ? `
      <div class="cta-container">
        <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
      </div>
      ${linkFallback ? `<p class="link-fallback">
        If the button doesn't work, copy and paste this link into your browser:<br>
        ${linkFallback}
      </p>` : ''}
    ` : '';

    return `
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
      <h1>${headline}</h1>
      <p class="greeting">${greeting}</p>
      ${bodyParagraphs.map(p => `<p>${p}</p>`).join('\n      ')}
      ${ctaBlock}
      <div class="footer">
        <p>${closing}</p>
        <p>${signature}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Build invitation email content
   * PRD: "Email design matches wedding theme"
   * PRD: "Admin can customize invitation email content"
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

    // Check for custom template
    const customTemplate = wedding.emailTemplates?.invitation;

    // Use custom subject or default
    const subject = customTemplate?.subject
      ? this.replaceMergeFields(customTemplate.subject, guest, wedding, rsvpUrl)
      : `You're Invited: ${partnerNames}'s Wedding`;

    // Use custom greeting or default
    const greeting = customTemplate?.greeting
      ? this.replaceMergeFields(customTemplate.greeting, guest, wedding, rsvpUrl)
      : `Dear ${guest.name},`;

    // Use custom body text or default
    const bodyText = customTemplate?.bodyText
      ? this.replaceMergeFields(customTemplate.bodyText, guest, wedding, rsvpUrl)
      : `We're overjoyed to invite you to celebrate our wedding!\n\nYour presence would mean the world to us as we begin this new chapter together.`;

    // Use custom closing or default
    const closing = customTemplate?.closing
      ? this.replaceMergeFields(customTemplate.closing, guest, wedding, rsvpUrl)
      : `We can't wait to see you there!`;

    // Split body text into paragraphs for HTML
    const bodyParagraphs = bodyText.split('\n').filter(p => p.trim());

    const htmlBody = this.buildEmailHtml(
      partnerNames,
      greeting,
      bodyParagraphs,
      'View Invitation & RSVP',
      rsvpUrl,
      closing,
      `With love,<br>${partnerNames}`,
      colors,
      rsvpUrl,
    );

    const textBody = `
${partnerNames}

${greeting}

${bodyText}

Please RSVP by visiting:
${rsvpUrl}

${closing}

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
   * PRD: "Admin can customize invitation email content" (applies to reminders too)
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

    // Check for custom template
    const customTemplate = wedding.emailTemplates?.reminder;

    // Use custom subject or default
    const subject = customTemplate?.subject
      ? this.replaceMergeFields(customTemplate.subject, guest, wedding, rsvpUrl)
      : `A gentle reminder: RSVP for ${partnerNames}'s wedding`;

    // Use custom greeting or default
    const greeting = customTemplate?.greeting
      ? this.replaceMergeFields(customTemplate.greeting, guest, wedding, rsvpUrl)
      : `Hi ${guest.name},`;

    // Use custom body text or default
    const bodyText = customTemplate?.bodyText
      ? this.replaceMergeFields(customTemplate.bodyText, guest, wedding, rsvpUrl)
      : `We hope you're doing well. If you haven't had a chance to RSVP yet, we'd love to hear from you.\n\nYour response helps us finalize the details and celebrate with care.`;

    // Use custom closing or default
    const closing = customTemplate?.closing
      ? this.replaceMergeFields(customTemplate.closing, guest, wedding, rsvpUrl)
      : `With gratitude,`;

    // If custom template, use the buildEmailHtml helper
    if (customTemplate) {
      const bodyParagraphs = bodyText.split('\n').filter(p => p.trim());
      const htmlBody = this.buildEmailHtml(
        partnerNames,
        greeting,
        bodyParagraphs,
        'RSVP Now',
        rsvpUrl,
        closing,
        partnerNames,
        colors,
        rsvpUrl,
      );

      const textBody = `
${partnerNames}

${greeting}

${bodyText}

Please RSVP here:
${rsvpUrl}

${closing}
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

    // Default template (kept for backwards compatibility)

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
   * Build save-the-date email content
   * PRD: "Save-the-date uses different template than invitation"
   * PRD: "Verify template focuses on date announcement"
   * PRD: "Verify no RSVP link is included"
   * PRD: "Verify design matches wedding theme"
   * PRD: "Admin can customize invitation email content" (applies to save-the-date too)
   * @param guest The guest to send the save-the-date to
   * @param wedding The wedding details
   * @param theme Optional theme to use for email colors (falls back to default)
   */
  buildSaveTheDateEmail(
    guest: Guest,
    wedding: Wedding,
    theme?: Theme,
  ): EmailContent {
    const partnerNames = `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;
    const colors = theme || DEFAULT_THEME;
    const eventDate = wedding.eventDetails?.date
      ? new Date(wedding.eventDetails.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Date to be announced';
    const venue = wedding.eventDetails?.venue || '';
    const city = wedding.eventDetails?.city || '';
    const location = venue && city ? `${venue}, ${city}` : venue || city || '';
    const weddingSiteUrl = process.env.WEDDING_SITE_URL || 'http://localhost:4321';
    const siteUrl = `${weddingSiteUrl}/w/${wedding.slug}`;

    // Check for custom template
    const customTemplate = wedding.emailTemplates?.saveTheDate;

    // Use custom subject or default
    const subject = customTemplate?.subject
      ? this.replaceMergeFields(customTemplate.subject, guest, wedding)
      : `Save the Date: ${partnerNames}'s Wedding`;

    // If custom template, use it with merge fields
    if (customTemplate) {
      const greeting = customTemplate.greeting
        ? this.replaceMergeFields(customTemplate.greeting, guest, wedding)
        : `Dear ${guest.name},`;

      const bodyText = customTemplate.bodyText
        ? this.replaceMergeFields(customTemplate.bodyText, guest, wedding)
        : `We're thrilled to share some wonderful news with you!\n\n${eventDate}\n${location}\n\nWe would be honored to have you join us as we celebrate our love and begin our new journey together.\n\nA formal invitation will follow with all the details.`;

      const closing = customTemplate.closing
        ? this.replaceMergeFields(customTemplate.closing, guest, wedding)
        : `With love and excitement,`;

      const bodyParagraphs = bodyText.split('\n').filter(p => p.trim());
      const htmlBody = this.buildEmailHtml(
        partnerNames,
        greeting,
        bodyParagraphs,
        siteUrl ? 'Visit Our Wedding Site' : null,
        siteUrl || null,
        closing,
        partnerNames,
        colors,
      );

      const textBody = `
SAVE THE DATE

${partnerNames}

${greeting}

${bodyText}

${siteUrl ? `Visit our wedding site: ${siteUrl}` : ''}

${closing}
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

    // Default template (kept for backwards compatibility)

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
      padding: 48px 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      text-align: center;
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${colors.accent};
      margin-bottom: 16px;
    }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 36px;
      font-weight: 400;
      color: ${colors.primary};
      margin: 0 0 32px 0;
    }
    .date-block {
      background: ${this.lightenColor(colors.primary, 0.85)};
      border-radius: 8px;
      padding: 24px 32px;
      margin: 24px 0;
    }
    .date-text {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 24px;
      font-weight: 500;
      color: ${colors.primary};
      margin: 0;
    }
    .location-text {
      font-size: 16px;
      color: ${this.lightenColor(colors.neutralDark, 0.2)};
      margin-top: 8px;
    }
    p {
      margin: 0 0 16px 0;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 8px;
      text-align: left;
    }
    .message {
      text-align: left;
      margin-bottom: 24px;
    }
    .site-link {
      display: inline-block;
      color: ${colors.primary};
      text-decoration: none;
      font-size: 14px;
      margin-top: 16px;
    }
    .site-link:hover {
      text-decoration: underline;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid ${this.lightenColor(colors.neutralDark, 0.7)};
      font-size: 14px;
      color: ${this.lightenColor(colors.neutralDark, 0.3)};
      text-align: left;
    }
    .note {
      font-size: 14px;
      color: ${this.lightenColor(colors.neutralDark, 0.3)};
      font-style: italic;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <span class="badge">Save the Date</span>
      <h1>${partnerNames}</h1>

      <p class="greeting">Dear ${guest.name},</p>
      <p class="message">We're thrilled to share some wonderful news with you!</p>

      <div class="date-block">
        <p class="date-text">${eventDate}</p>
        ${location ? `<p class="location-text">${location}</p>` : ''}
      </div>

      <p>We would be honored to have you join us as we celebrate our love and begin our new journey together.</p>

      <p class="note">A formal invitation will follow with all the details.</p>

      ${siteUrl ? `<a href="${siteUrl}" class="site-link">Visit our wedding site →</a>` : ''}

      <div class="footer">
        <p>With love and excitement,<br>${partnerNames}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textBody = `
SAVE THE DATE

${partnerNames}

Dear ${guest.name},

We're thrilled to share some wonderful news with you!

${eventDate}
${location ? location : ''}

We would be honored to have you join us as we celebrate our love and begin our new journey together.

A formal invitation will follow with all the details.

${siteUrl ? `Visit our wedding site: ${siteUrl}` : ''}

With love and excitement,
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
   * Build thank-you email content
   * PRD: "Admin can send thank-you emails"
   * PRD: "Admin can customize invitation email content" (applies to thank-you too)
   * @param guest The guest to send the thank-you to
   * @param wedding The wedding details
   * @param attended Whether the guest attended the wedding
   * @param theme Optional theme to use for email colors (falls back to default)
   */
  buildThankYouEmail(
    guest: Guest,
    wedding: Wedding,
    attended: boolean,
    theme?: Theme,
  ): EmailContent {
    const partnerNames = `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`;
    const colors = theme || DEFAULT_THEME;

    // Check for custom template based on attendance
    const customTemplate = attended
      ? wedding.emailTemplates?.thankYouAttended
      : wedding.emailTemplates?.thankYouNotAttended;

    // Use custom subject or default
    const subject = customTemplate?.subject
      ? this.replaceMergeFields(customTemplate.subject, guest, wedding)
      : `Thank You from ${partnerNames}`;

    // If custom template, use it with merge fields
    if (customTemplate) {
      const greeting = customTemplate.greeting
        ? this.replaceMergeFields(customTemplate.greeting, guest, wedding)
        : `Dear ${guest.name},`;

      const bodyText = customTemplate.bodyText
        ? this.replaceMergeFields(customTemplate.bodyText, guest, wedding)
        : attended
          ? `What a beautiful celebration it was, and having you there made it even more special.\n\nWe are so grateful for your presence, your warm wishes, and your love.\n\nThe memories we made together will be cherished forever.`
          : `Although we missed you at our wedding, we want you to know that you were in our hearts.\n\nThank you for your kind thoughts and warm wishes. They meant the world to us.\n\nWe hope to celebrate with you soon!`;

      const closing = customTemplate.closing
        ? this.replaceMergeFields(customTemplate.closing, guest, wedding)
        : `With all our love and gratitude,`;

      const bodyParagraphs = bodyText.split('\n').filter(p => p.trim());
      const htmlBody = this.buildEmailHtml(
        partnerNames,
        greeting,
        bodyParagraphs,
        null,
        null,
        closing,
        partnerNames,
        colors,
      );

      const textBody = `
THANK YOU

${partnerNames}

${greeting}

${bodyText}

${closing}
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

    // Default template (kept for backwards compatibility)
    // Different message for attendees vs non-attendees
    const attendeeMessage = `
      <p>What a beautiful celebration it was, and having you there made it even more special.</p>
      <p>We are so grateful for your presence, your warm wishes, and your love.</p>
      <p>The memories we made together will be cherished forever.</p>
    `;

    const nonAttendeeMessage = `
      <p>Although we missed you at our wedding, we want you to know that you were in our hearts.</p>
      <p>Thank you for your kind thoughts and warm wishes. They meant the world to us.</p>
      <p>We hope to celebrate with you soon!</p>
    `;

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
      padding: 48px 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${colors.accent};
      margin-bottom: 16px;
      text-align: center;
      width: 100%;
    }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 32px;
      font-weight: 400;
      color: ${colors.primary};
      margin: 0 0 32px 0;
      text-align: center;
    }
    p {
      margin: 0 0 16px 0;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 24px;
    }
    .heart {
      text-align: center;
      font-size: 32px;
      margin: 24px 0;
      color: ${colors.primary};
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid ${this.lightenColor(colors.neutralDark, 0.7)};
      font-size: 14px;
      color: ${this.lightenColor(colors.neutralDark, 0.3)};
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <span class="badge">Thank You</span>
      <h1>${partnerNames}</h1>

      <p class="greeting">Dear ${guest.name},</p>

      ${attended ? attendeeMessage : nonAttendeeMessage}

      <div class="heart">♥</div>

      <div class="footer">
        <p>With all our love and gratitude,<br>${partnerNames}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const attendeeTextMessage = `What a beautiful celebration it was, and having you there made it even more special.

We are so grateful for your presence, your warm wishes, and your love.

The memories we made together will be cherished forever.`;

    const nonAttendeeTextMessage = `Although we missed you at our wedding, we want you to know that you were in our hearts.

Thank you for your kind thoughts and warm wishes. They meant the world to us.

We hope to celebrate with you soon!`;

    const textBody = `
THANK YOU

${partnerNames}

Dear ${guest.name},

${attended ? attendeeTextMessage : nonAttendeeTextMessage}

♥

With all our love and gratitude,
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
   * Build data export email content
   * PRD: "Guest can request their data"
   * PRD: "Verify email with data is sent"
   * @param guest The guest who requested their data
   * @param dataExport The guest's exported data
   * @param theme Optional theme to use for email colors (falls back to default)
   */
  buildDataExportEmail(
    guest: Guest,
    dataExport: GuestDataExport,
    theme?: Theme,
  ): EmailContent {
    const colors = theme || DEFAULT_THEME;
    const partnerNames = dataExport.wedding.partnerNames.join(' & ');

    const subject = `Your Data Export - ${partnerNames}'s Wedding`;

    // Format the data as readable text
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return 'Not specified';
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatDateTime = (dateStr?: string) => {
      if (!dateStr) return 'Not specified';
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    // Build data summary HTML
    const dataRows = [
      { label: 'Name', value: dataExport.guest.name },
      { label: 'Email', value: dataExport.guest.email },
      { label: 'Party Size', value: dataExport.guest.partySize.toString() },
      { label: 'RSVP Status', value: this.formatRsvpStatus(dataExport.guest.rsvpStatus) },
    ];

    if (dataExport.guest.dietaryNotes) {
      dataRows.push({ label: 'Dietary Notes', value: dataExport.guest.dietaryNotes });
    }

    if (dataExport.guest.mealOptionId) {
      dataRows.push({ label: 'Meal Selection ID', value: dataExport.guest.mealOptionId });
    }

    if (dataExport.guest.photoOptOut) {
      dataRows.push({ label: 'Photo Opt-Out', value: 'Yes' });
    }

    if (dataExport.guest.inviteSentAt) {
      dataRows.push({ label: 'Invite Sent', value: formatDateTime(dataExport.guest.inviteSentAt) });
    }

    if (dataExport.guest.rsvpSubmittedAt) {
      dataRows.push({ label: 'RSVP Submitted', value: formatDateTime(dataExport.guest.rsvpSubmittedAt) });
    }

    dataRows.push({ label: 'Profile Created', value: formatDateTime(dataExport.guest.createdAt) });

    // Plus-ones if any
    let plusOnesHtml = '';
    let plusOnesText = '';
    if (dataExport.guest.plusOneGuests && dataExport.guest.plusOneGuests.length > 0) {
      plusOnesHtml = `
        <h3 style="color: ${colors.primary}; margin-top: 24px;">Plus-One Guests</h3>
        <ul style="margin: 8px 0;">
          ${dataExport.guest.plusOneGuests.map(p => `<li>${p.name}${p.dietaryNotes ? ` (Dietary: ${p.dietaryNotes})` : ''}</li>`).join('\n          ')}
        </ul>
      `;
      plusOnesText = '\n\nPlus-One Guests:\n' +
        dataExport.guest.plusOneGuests.map(p => `- ${p.name}${p.dietaryNotes ? ` (Dietary: ${p.dietaryNotes})` : ''}`).join('\n');
    }

    // Table assignment if any
    let tableHtml = '';
    let tableText = '';
    if (dataExport.tableAssignment) {
      tableHtml = `
        <h3 style="color: ${colors.primary}; margin-top: 24px;">Table Assignment</h3>
        <p>Table: ${dataExport.tableAssignment.tableName}${dataExport.tableAssignment.seatNumber ? ` (Seat ${dataExport.tableAssignment.seatNumber})` : ''}</p>
      `;
      tableText = `\n\nTable Assignment: ${dataExport.tableAssignment.tableName}${dataExport.tableAssignment.seatNumber ? ` (Seat ${dataExport.tableAssignment.seatNumber})` : ''}`;
    }

    // Event RSVPs if any
    let eventsHtml = '';
    let eventsText = '';
    if (dataExport.eventRsvps && dataExport.eventRsvps.length > 0) {
      eventsHtml = `
        <h3 style="color: ${colors.primary}; margin-top: 24px;">Event RSVPs</h3>
        <ul style="margin: 8px 0;">
          ${dataExport.eventRsvps.map(e => `<li>${e.eventName} (${formatDate(e.eventDate)}): ${this.formatRsvpStatus(e.rsvpStatus)}</li>`).join('\n          ')}
        </ul>
      `;
      eventsText = '\n\nEvent RSVPs:\n' +
        dataExport.eventRsvps.map(e => `- ${e.eventName} (${formatDate(e.eventDate)}): ${this.formatRsvpStatus(e.rsvpStatus)}`).join('\n');
    }

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
      font-size: 28px;
      font-weight: 400;
      color: ${colors.primary};
      margin: 0 0 8px 0;
      text-align: center;
    }
    h2 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${colors.accent};
      margin: 0 0 24px 0;
      text-align: center;
    }
    h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 24px 0 12px 0;
    }
    p {
      margin: 0 0 16px 0;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid ${this.lightenColor(colors.neutralDark, 0.8)};
    }
    .data-table td:first-child {
      font-weight: 500;
      color: ${this.lightenColor(colors.neutralDark, 0.2)};
      width: 140px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid ${this.lightenColor(colors.neutralDark, 0.7)};
      font-size: 12px;
      color: ${this.lightenColor(colors.neutralDark, 0.4)};
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h2>Data Export Request</h2>
      <h1>${partnerNames}'s Wedding</h1>

      <p style="margin-top: 24px;">Dear ${guest.name},</p>
      <p>As requested, here is a copy of all the data we have stored about you for this wedding.</p>

      <h3 style="color: ${colors.primary};">Your Information</h3>
      <table class="data-table">
        ${dataRows.map(row => `<tr><td>${row.label}</td><td>${row.value}</td></tr>`).join('\n        ')}
      </table>

      ${plusOnesHtml}
      ${tableHtml}
      ${eventsHtml}

      <h3 style="color: ${colors.primary}; margin-top: 24px;">Wedding Information</h3>
      <table class="data-table">
        <tr><td>Couple</td><td>${partnerNames}</td></tr>
        <tr><td>Date</td><td>${formatDate(dataExport.wedding.date)}</td></tr>
        ${dataExport.wedding.venue ? `<tr><td>Venue</td><td>${dataExport.wedding.venue}</td></tr>` : ''}
        ${dataExport.wedding.city ? `<tr><td>City</td><td>${dataExport.wedding.city}</td></tr>` : ''}
      </table>

      <div class="footer">
        <p>This export was generated on ${formatDateTime(dataExport.exportedAt)}.</p>
        <p>If you have any questions about your data or wish to have it removed, please contact the wedding organizers directly.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textBody = `
DATA EXPORT REQUEST
${partnerNames}'s Wedding

Dear ${guest.name},

As requested, here is a copy of all the data we have stored about you for this wedding.

YOUR INFORMATION
${dataRows.map(row => `${row.label}: ${row.value}`).join('\n')}${plusOnesText}${tableText}${eventsText}

WEDDING INFORMATION
Couple: ${partnerNames}
Date: ${formatDate(dataExport.wedding.date)}
${dataExport.wedding.venue ? `Venue: ${dataExport.wedding.venue}` : ''}
${dataExport.wedding.city ? `City: ${dataExport.wedding.city}` : ''}

---
This export was generated on ${formatDateTime(dataExport.exportedAt)}.
If you have any questions about your data or wish to have it removed, please contact the wedding organizers directly.
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
   * Format RSVP status for display
   */
  private formatRsvpStatus(status: string): string {
    switch (status) {
      case 'attending':
        return 'Attending';
      case 'not_attending':
        return 'Not Attending';
      case 'pending':
        return 'Awaiting Response';
      default:
        return status;
    }
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
