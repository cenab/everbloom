import { BillingService } from './billing.service';

describe('BillingService', () => {
  let billingService: BillingService;

  beforeEach(() => {
    billingService = new BillingService();
  });

  describe('getPlans', () => {
    it('should return available plans', () => {
      const plans = billingService.getPlans();

      expect(plans).toHaveLength(2);
      expect(plans.map(p => p.id)).toContain('starter');
      expect(plans.map(p => p.id)).toContain('premium');
    });

    it('should include plan features', () => {
      const plans = billingService.getPlans();

      const starterPlan = plans.find(p => p.id === 'starter');
      const premiumPlan = plans.find(p => p.id === 'premium');

      expect(starterPlan?.features).toBeDefined();
      expect(starterPlan?.features.length).toBeGreaterThan(0);
      expect(premiumPlan?.features).toBeDefined();
      expect(premiumPlan?.features.length).toBeGreaterThan(0);
    });

    it('should have price IDs for each plan', () => {
      const plans = billingService.getPlans();

      plans.forEach(plan => {
        expect(plan.priceId).toBeDefined();
        expect(plan.priceId.length).toBeGreaterThan(0);
      });
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return null for invalid signature', async () => {
      const rawBody = Buffer.from('{}');
      const invalidSignature = 'invalid-signature';

      const result = await billingService.verifyWebhookSignature(rawBody, invalidSignature);

      expect(result).toBeNull();
    });

    it('should return null for malformed body', async () => {
      const rawBody = Buffer.from('not-json');
      const signature = 't=123,v1=abc';

      const result = await billingService.verifyWebhookSignature(rawBody, signature);

      expect(result).toBeNull();
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw for invalid plan', async () => {
      await expect(
        billingService.createCheckoutSession('user-1', {
          planId: 'invalid' as any,
          weddingName: 'Test Wedding',
          partnerNames: ['John', 'Jane'],
        })
      ).rejects.toThrow('Invalid plan');
    });
  });
});
