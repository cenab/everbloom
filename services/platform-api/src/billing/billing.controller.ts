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
import { AuthService } from '../auth/auth.service';
import { WeddingService } from '../wedding/wedding.service';
import type {
  ApiResponse,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  Plan,
  WeddingProvisionResponse,
} from '@wedding-bestie/shared';
import { CHECKOUT_SESSION_FAILED, WEBHOOK_SIGNATURE_INVALID } from '@wedding-bestie/shared';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly authService: AuthService,
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
    const token = this.extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.authService.validateSession(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Validate request body
    if (!body.planId || !['starter', 'premium'].includes(body.planId)) {
      throw new BadRequestException('Valid plan selection is required');
    }

    if (!body.weddingName || typeof body.weddingName !== 'string') {
      throw new BadRequestException('Wedding name is required');
    }

    if (
      !body.partnerNames ||
      !Array.isArray(body.partnerNames) ||
      body.partnerNames.length !== 2 ||
      !body.partnerNames[0] ||
      !body.partnerNames[1]
    ) {
      throw new BadRequestException('Both partner names are required');
    }

    try {
      const result = await this.billingService.createCheckoutSession(user.id, body);
      return { ok: true, data: result };
    } catch {
      return { ok: false, error: CHECKOUT_SESSION_FAILED };
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
      throw new BadRequestException('Missing request body');
    }

    // Verify webhook signature
    const event = await this.billingService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!event) {
      return { ok: false, error: WEBHOOK_SIGNATURE_INVALID };
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata;

      if (!metadata?.userId || !metadata?.planId || !metadata?.weddingName) {
        // Not a wedding checkout session, ignore
        return { ok: true, data: { received: true } };
      }

      const result = await this.weddingService.provisionWedding({
        userId: metadata.userId,
        planId: metadata.planId as 'starter' | 'premium',
        weddingName: metadata.weddingName,
        partnerNames: [metadata.partner1 || '', metadata.partner2 || ''],
        stripeSessionId: session.id,
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

  /**
   * Extract Bearer token from Authorization header
   */
  private extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}
