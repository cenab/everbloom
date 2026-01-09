import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { AdminAuthService } from '../auth/admin-auth.service';
import { WeddingService } from '../wedding/wedding.service';
import type {
  ApiResponse,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  FeatureFlag,
  Plan,
  WeddingProvisionResponse,
} from '../types';
import { CHECKOUT_SESSION_FAILED, WEBHOOK_SIGNATURE_INVALID, VALIDATION_ERROR } from '../types';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly adminAuthService: AdminAuthService,
    private readonly weddingService: WeddingService,
  ) {}

  /**
   * Get available plans
   */
  @Get('plans')
  async getPlans(): Promise<ApiResponse<Plan[]>> {
    const plans = this.billingService.getPlans();
    return { ok: true, data: plans };
  }

  /**
   * Create a Stripe checkout session for a new wedding
   * Requires authentication
   */
  @Post('checkout-session')
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(
    @Headers('authorization') authHeader: string,
    @Body() body: CreateCheckoutSessionRequest,
  ): Promise<ApiResponse<CreateCheckoutSessionResponse>> {
    // Validate authentication
    const user = await this.adminAuthService.requireUser(authHeader);

    // Validate request body
    if (!body.planId || !['starter', 'premium'].includes(body.planId)) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    if (!body.weddingName || typeof body.weddingName !== 'string') {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    if (
      !body.partnerNames ||
      !Array.isArray(body.partnerNames) ||
      body.partnerNames.length !== 2 ||
      !body.partnerNames[0] ||
      !body.partnerNames[1]
    ) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    try {
      const result = await this.billingService.createCheckoutSession(user.id, body);
      return { ok: true, data: result };
    } catch {
      throw new BadRequestException({ ok: false, error: CHECKOUT_SESSION_FAILED });
    }
  }

  /**
   * Stripe webhook handler for checkout events
   * Provisions wedding on checkout.session.completed
   */
  @Post('stripe-webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<ApiResponse<WeddingProvisionResponse | { received: true }>> {
    const rawBody = request.rawBody;

    if (!rawBody) {
      throw new BadRequestException({ ok: false, error: VALIDATION_ERROR });
    }

    // Verify webhook signature
    const event = await this.billingService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!event) {
      throw new UnauthorizedException({ ok: false, error: WEBHOOK_SIGNATURE_INVALID });
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata;

      if (!metadata?.userId || !metadata?.planId || !metadata?.weddingName) {
        // Not a wedding checkout session, ignore
        return { ok: true, data: { received: true } };
      }

      let selectedFeatures: Partial<Record<FeatureFlag, boolean>> | undefined;
      if (metadata.features) {
        try {
          const parsed = JSON.parse(metadata.features);
          if (parsed && typeof parsed === 'object') {
            const normalized: Partial<Record<FeatureFlag, boolean>> = {};
            for (const [key, value] of Object.entries(parsed)) {
              if (typeof value === 'boolean') {
                normalized[key as FeatureFlag] = value;
              }
            }
            selectedFeatures = normalized;
          }
        } catch {
          selectedFeatures = undefined;
        }
      }

      const result = await this.weddingService.provisionWedding({
        userId: metadata.userId,
        planId: metadata.planId as 'starter' | 'premium',
        weddingName: metadata.weddingName,
        partnerNames: [metadata.partner1 || '', metadata.partner2 || ''],
        stripeSessionId: session.id,
        features: selectedFeatures,
      });

      return {
        ok: true,
        data: {
          wedding: result.wedding,
          renderConfig: result.renderConfig,
        },
      };
    }

    // Acknowledge other event types
    return { ok: true, data: { received: true } };
  }

}
