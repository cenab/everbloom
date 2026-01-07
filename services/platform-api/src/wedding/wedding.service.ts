import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type {
  Wedding,
  WeddingStatus,
  CreateWeddingPayload,
  RenderConfig,
  FeatureFlag,
  PlanTier,
  Theme,
} from '@wedding-bestie/shared';

/**
 * Default theme for new weddings - calm, warm palette
 */
const DEFAULT_THEME: Theme = {
  primary: '#c9826b', // terracotta
  accent: '#8fac8b', // sage
  neutralLight: '#faf8f5', // warm off-white
  neutralDark: '#2d2d2d', // soft black
};

/**
 * Features enabled by plan tier
 */
const PLAN_FEATURES: Record<PlanTier, FeatureFlag[]> = {
  starter: ['RSVP', 'CALENDAR_INVITE'],
  premium: [
    'RSVP',
    'CALENDAR_INVITE',
    'PHOTO_UPLOAD',
    'ANNOUNCEMENT_BANNER',
    'FAQ_SECTION',
    'PASSCODE_SITE',
  ],
};

/**
 * All feature flags with default disabled state
 */
const ALL_FEATURES: FeatureFlag[] = [
  'RSVP',
  'CALENDAR_INVITE',
  'PHOTO_UPLOAD',
  'ANNOUNCEMENT_BANNER',
  'FAQ_SECTION',
  'PASSCODE_SITE',
];

@Injectable()
export class WeddingService {
  private readonly logger = new Logger(WeddingService.name);

  // In-memory store for development
  private weddings: Map<string, Wedding> = new Map();
  private renderConfigs: Map<string, RenderConfig> = new Map();
  private processedSessions: Set<string> = new Set();

  /**
   * Generate a URL-safe slug from partner names
   */
  private generateSlug(partnerNames: [string, string]): string {
    const baseSlug = partnerNames
      .map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .join('-and-');

    // Add a short random suffix for uniqueness
    const suffix = randomBytes(3).toString('hex');
    return `${baseSlug}-${suffix}`;
  }

  /**
   * Build feature flags record based on plan tier
   */
  private buildFeatureFlags(planId: PlanTier): Record<FeatureFlag, boolean> {
    const enabledFeatures = PLAN_FEATURES[planId];
    const features: Record<FeatureFlag, boolean> = {} as Record<FeatureFlag, boolean>;

    for (const flag of ALL_FEATURES) {
      features[flag] = enabledFeatures.includes(flag);
    }

    return features;
  }

  /**
   * Generate initial render_config for a new wedding
   */
  private generateRenderConfig(wedding: Wedding): RenderConfig {
    return {
      templateId: 'minimal-001', // Default template
      theme: DEFAULT_THEME,
      features: wedding.features,
      sections: [
        {
          id: 'hero',
          type: 'hero',
          enabled: true,
          order: 0,
          data: {
            headline: `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`,
          },
        },
        {
          id: 'details',
          type: 'event-details',
          enabled: true,
          order: 1,
          data: {
            title: 'Our Wedding Day',
            description: 'We can\'t wait to celebrate with you.',
          },
        },
        {
          id: 'rsvp',
          type: 'rsvp',
          enabled: wedding.features.RSVP,
          order: 2,
          data: {
            title: 'RSVP',
            description: 'Please let us know if you can join us.',
          },
        },
      ],
      wedding: {
        slug: wedding.slug,
        partnerNames: wedding.partnerNames,
      },
    };
  }

  /**
   * Check if a checkout session has already been processed (idempotency)
   */
  isSessionProcessed(sessionId: string): boolean {
    return this.processedSessions.has(sessionId);
  }

  /**
   * Mark a checkout session as processed
   */
  markSessionProcessed(sessionId: string): void {
    this.processedSessions.add(sessionId);
  }

  /**
   * Provision a new wedding from checkout completion
   * This is idempotent - calling with the same sessionId will return existing wedding
   */
  async provisionWedding(payload: CreateWeddingPayload): Promise<{
    wedding: Wedding;
    renderConfig: RenderConfig;
    isNew: boolean;
  }> {
    // Check idempotency
    if (this.isSessionProcessed(payload.stripeSessionId)) {
      this.logger.log(`Session ${payload.stripeSessionId} already processed, returning existing wedding`);

      // Find the existing wedding by session
      for (const wedding of this.weddings.values()) {
        // We need to track which session created which wedding
        // For now, find by userId and recent creation (not perfect but works for dev)
        if (wedding.userId === payload.userId) {
          const renderConfig = this.renderConfigs.get(wedding.id);
          if (renderConfig) {
            return { wedding, renderConfig, isNew: false };
          }
        }
      }
    }

    const now = new Date().toISOString();
    const weddingId = randomBytes(16).toString('hex');

    const wedding: Wedding = {
      id: weddingId,
      userId: payload.userId,
      slug: this.generateSlug(payload.partnerNames),
      name: payload.weddingName,
      partnerNames: payload.partnerNames,
      planId: payload.planId,
      status: 'active' as WeddingStatus,
      features: this.buildFeatureFlags(payload.planId),
      createdAt: now,
      updatedAt: now,
    };

    // Generate render_config
    const renderConfig = this.generateRenderConfig(wedding);

    // Store wedding and config
    this.weddings.set(weddingId, wedding);
    this.renderConfigs.set(weddingId, renderConfig);
    this.markSessionProcessed(payload.stripeSessionId);

    this.logger.log(`Provisioned wedding ${weddingId} with slug ${wedding.slug}`);

    return { wedding, renderConfig, isNew: true };
  }

  /**
   * Get a wedding by ID
   */
  getWedding(id: string): Wedding | null {
    return this.weddings.get(id) || null;
  }

  /**
   * Get a wedding by slug
   */
  getWeddingBySlug(slug: string): Wedding | null {
    for (const wedding of this.weddings.values()) {
      if (wedding.slug === slug) {
        return wedding;
      }
    }
    return null;
  }

  /**
   * Get all weddings for a user
   */
  getWeddingsForUser(userId: string): Wedding[] {
    const userWeddings: Wedding[] = [];
    for (const wedding of this.weddings.values()) {
      if (wedding.userId === userId) {
        userWeddings.push(wedding);
      }
    }
    return userWeddings;
  }

  /**
   * Get render_config for a wedding
   */
  getRenderConfig(weddingId: string): RenderConfig | null {
    return this.renderConfigs.get(weddingId) || null;
  }
}
