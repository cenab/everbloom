import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import type { PlanTier, CreateCheckoutSessionRequest } from '../types';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_placeholder';

/**
 * Plan configuration with Stripe price IDs
 * In production, these would come from environment variables
 */
const PLANS: Record<PlanTier, { name: string; priceId: string; features: string[] }> = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter_test',
    features: [
      'Beautiful wedding website',
      'RSVP tracking',
      'Guest list management',
      'Mobile-friendly design',
    ],
  },
  premium: {
    name: 'Premium',
    priceId: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_test',
    features: [
      'Everything in Starter',
      'Photo gallery',
      'Custom domain',
      'Announcement banners',
      'Advanced customization',
    ],
  },
};

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(BillingService.name);

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Get available plans
   */
  getPlans() {
    return Object.entries(PLANS).map(([id, plan]) => ({
      id: id as PlanTier,
      ...plan,
    }));
  }

  /**
   * Create a Stripe checkout session for a new wedding
   */
  async createCheckoutSession(
    userId: string,
    request: CreateCheckoutSessionRequest,
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    const plan = PLANS[request.planId];
    if (!plan) {
      throw new Error(`Invalid plan: ${request.planId}`);
    }

    // Store pending wedding data in metadata for webhook processing
    const metadata: Record<string, string> = {
      userId,
      planId: request.planId,
      weddingName: request.weddingName,
      partner1: request.partnerNames[0],
      partner2: request.partnerNames[1],
    };

    if (request.features) {
      metadata.features = JSON.stringify(request.features);
    }

    const successUrl = `${process.env.PLATFORM_URL || 'http://localhost:3000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.PLATFORM_URL || 'http://localhost:3000'}/billing/cancel`;

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        client_reference_id: userId,
      });

      this.logger.log(`Created checkout session ${session.id} for user ${userId}`);

      return {
        checkoutUrl: session.url!,
        sessionId: session.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create checkout session: ${error}`);
      throw error;
    }
  }

  /**
   * Verify Stripe webhook signature and construct event
   * Returns null if verification fails
   */
  async verifyWebhookSignature(
    rawBody: Buffer,
    signature: string,
  ): Promise<Stripe.Event | null> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        STRIPE_WEBHOOK_SECRET,
      );
      this.logger.log(`Verified webhook event: ${event.type}`);
      return event;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error}`);
      return null;
    }
  }
}
