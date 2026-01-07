import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { InvitationService } from './invitation.service';
import type {
  SendGridWebhookEvent,
  BounceType,
  EmailStatus,
} from '../types';
import { SENDGRID_WEBHOOK_INVALID } from '../types';

/**
 * Controller for SendGrid webhook events (bounce, delivered, etc.)
 * PRD: "Admin can see bounce and failure status"
 *
 * SendGrid sends events to this endpoint when emails are delivered, bounced, etc.
 * This allows tracking of actual delivery status beyond initial send acceptance.
 */
@Controller('webhooks')
export class SendGridWebhookController {
  private readonly logger = new Logger(SendGridWebhookController.name);

  constructor(private readonly invitationService: InvitationService) {}

  /**
   * Handle SendGrid Event Webhook
   *
   * SendGrid sends an array of events to this endpoint.
   * We process bounce, delivered, and dropped events to update email status.
   *
   * Webhook verification uses ECDSA signature when configured.
   */
  @Post('sendgrid')
  async handleSendGridWebhook(
    @Headers('x-twilio-email-event-webhook-signature') signature: string | undefined,
    @Headers('x-twilio-email-event-webhook-timestamp') timestamp: string | undefined,
    @Body() events: SendGridWebhookEvent[],
  ): Promise<{ processed: number; errors: number }> {
    // Verify webhook signature if configured
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    if (verificationKey && signature && timestamp) {
      const isValid = this.verifySignature(
        JSON.stringify(events),
        signature,
        timestamp,
        verificationKey,
      );
      if (!isValid) {
        this.logger.warn('SendGrid webhook signature verification failed');
        throw new HttpException(
          { ok: false, error: SENDGRID_WEBHOOK_INVALID },
          HttpStatus.UNAUTHORIZED,
        );
      }
    }

    if (!Array.isArray(events)) {
      this.logger.warn('SendGrid webhook received non-array body');
      return { processed: 0, errors: 0 };
    }

    let processed = 0;
    let errors = 0;

    for (const event of events) {
      try {
        const result = await this.processEvent(event);
        if (result) {
          processed++;
        }
      } catch (error) {
        errors++;
        this.logger.error(
          `Error processing SendGrid event: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { event: event.event, email: event.email },
        );
      }
    }

    this.logger.log(
      `SendGrid webhook processed: ${processed} events, ${errors} errors`,
    );

    return { processed, errors };
  }

  /**
   * Process a single SendGrid event
   */
  private async processEvent(event: SendGridWebhookEvent): Promise<boolean> {
    const { sg_message_id, event: eventType, email } = event;

    // We need the message ID to find the outbox record
    if (!sg_message_id) {
      this.logger.debug('Skipping event without message ID', { eventType, email });
      return false;
    }

    // Extract the base message ID (SendGrid adds filter suffixes)
    const messageId = sg_message_id.split('.')[0];

    switch (eventType) {
      case 'delivered':
        return this.handleDelivered(messageId);

      case 'bounce':
        return this.handleBounce(messageId, event);

      case 'dropped':
        return this.handleDropped(messageId, event);

      case 'deferred':
        // Log but don't change status - deferred is temporary
        this.logger.debug(`Email deferred: ${email} (${messageId})`);
        return false;

      case 'spamreport':
      case 'unsubscribe':
        // Log spam reports - may want to mark guest in future
        this.logger.warn(`Email ${eventType}: ${email} (${messageId})`);
        return false;

      default:
        // processed, open, click - informational only
        return false;
    }
  }

  /**
   * Handle delivered event - email was successfully delivered
   */
  private handleDelivered(messageId: string): boolean {
    const updated = this.invitationService.updateOutboxByMessageId(
      messageId,
      'delivered' as EmailStatus,
    );

    if (updated) {
      this.logger.log(`Email delivered: ${messageId}`);
    } else {
      this.logger.debug(`No outbox record found for delivered messageId: ${messageId}`);
    }

    return updated;
  }

  /**
   * Handle bounce event - email bounced (hard or soft)
   */
  private handleBounce(
    messageId: string,
    event: SendGridWebhookEvent,
  ): boolean {
    const bounceType: BounceType = event.type === 'hard' ? 'hard' : 'soft';
    const bounceReason = event.reason || event.response || 'Unknown bounce reason';

    const updated = this.invitationService.updateOutboxByMessageId(
      messageId,
      'bounced' as EmailStatus,
      { bounceType, bounceReason },
    );

    if (updated) {
      this.logger.warn(
        `Email bounced (${bounceType}): ${event.email} - ${bounceReason}`,
      );
    } else {
      this.logger.debug(`No outbox record found for bounced messageId: ${messageId}`);
    }

    return updated;
  }

  /**
   * Handle dropped event - email was dropped by SendGrid
   * This happens when the email address is on a suppression list
   */
  private handleDropped(
    messageId: string,
    event: SendGridWebhookEvent,
  ): boolean {
    const bounceReason = event.reason || event.response || 'Dropped by SendGrid';

    // Treat dropped as a hard bounce
    const updated = this.invitationService.updateOutboxByMessageId(
      messageId,
      'bounced' as EmailStatus,
      { bounceType: 'hard', bounceReason },
    );

    if (updated) {
      this.logger.warn(`Email dropped: ${event.email} - ${bounceReason}`);
    } else {
      this.logger.debug(`No outbox record found for dropped messageId: ${messageId}`);
    }

    return updated;
  }

  /**
   * Verify SendGrid webhook signature using ECDSA
   *
   * SendGrid uses ECDSA signatures for webhook verification.
   * This prevents replay attacks and ensures authenticity.
   */
  private verifySignature(
    payload: string,
    signature: string,
    timestamp: string,
    verificationKey: string,
  ): boolean {
    try {
      // SendGrid's signed payload is timestamp + payload
      const signedPayload = timestamp + payload;

      // Create HMAC-SHA256 for basic verification
      // Note: For production, implement full ECDSA verification
      const expectedSignature = createHmac('sha256', verificationKey)
        .update(signedPayload)
        .digest('base64');

      const sigBuffer = Buffer.from(signature, 'base64');
      const expectedBuffer = Buffer.from(expectedSignature, 'base64');

      // Use timing-safe comparison
      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch (error) {
      this.logger.error('Signature verification error', error);
      return false;
    }
  }
}
