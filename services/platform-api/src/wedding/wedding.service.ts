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
  Template,
  TemplateCategory,
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

/**
 * Available templates - curated set matching design system
 */
const TEMPLATES: Template[] = [
  {
    id: 'minimal-001',
    name: 'Serene',
    category: 'minimal' as TemplateCategory,
    description: 'Clean lines and generous whitespace for a modern, understated elegance.',
    defaultTheme: {
      primary: '#c9826b',
      accent: '#8fac8b',
      neutralLight: '#faf8f5',
      neutralDark: '#2d2d2d',
    },
  },
  {
    id: 'minimal-002',
    name: 'Whisper',
    category: 'minimal' as TemplateCategory,
    description: 'Soft tones and delicate typography for an intimate, romantic feel.',
    defaultTheme: {
      primary: '#b8a090',
      accent: '#c9b8a8',
      neutralLight: '#fdfcfb',
      neutralDark: '#3d3d3d',
    },
  },
  {
    id: 'classic-001',
    name: 'Heritage',
    category: 'classic' as TemplateCategory,
    description: 'Timeless design with traditional flourishes and refined details.',
    defaultTheme: {
      primary: '#8b7355',
      accent: '#a89078',
      neutralLight: '#f9f7f4',
      neutralDark: '#2f2f2f',
    },
  },
  {
    id: 'modern-001',
    name: 'Edge',
    category: 'modern' as TemplateCategory,
    description: 'Bold typography and contemporary layouts for the style-forward couple.',
    defaultTheme: {
      primary: '#4a5568',
      accent: '#718096',
      neutralLight: '#f7fafc',
      neutralDark: '#1a202c',
    },
  },
  {
    id: 'destination-001',
    name: 'Wanderlust',
    category: 'destination' as TemplateCategory,
    description: 'Inspired by travel and adventure, perfect for destination celebrations.',
    defaultTheme: {
      primary: '#5f8a8b',
      accent: '#9bbec8',
      neutralLight: '#f8fafa',
      neutralDark: '#2c3e3f',
    },
  },
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
  private buildFeatureFlags(
    planId: PlanTier,
    selectedFeatures?: Partial<Record<FeatureFlag, boolean>>,
  ): Record<FeatureFlag, boolean> {
    const allowedFeatures = PLAN_FEATURES[planId] || [];
    const allowedSet = new Set(allowedFeatures);
    const features: Record<FeatureFlag, boolean> = {} as Record<FeatureFlag, boolean>;
    const selection = selectedFeatures ?? {};

    for (const flag of ALL_FEATURES) {
      if (!allowedSet.has(flag)) {
        features[flag] = false;
        continue;
      }

      if (typeof selection[flag] === 'boolean') {
        features[flag] = selection[flag] as boolean;
      } else {
        features[flag] = true;
      }
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
      features: this.buildFeatureFlags(payload.planId, payload.features),
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

  /**
   * Get all available templates
   */
  getTemplates(): Template[] {
    return TEMPLATES;
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): Template | null {
    return TEMPLATES.find((t) => t.id === templateId) || null;
  }

  /**
   * Update feature flags for a wedding
   * Updates both the wedding record and regenerates render_config with new flags
   */
  updateFeatures(
    weddingId: string,
    features: Partial<Record<FeatureFlag, boolean>>,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    // Update wedding features
    const updatedFeatures = { ...wedding.features };
    for (const [flag, enabled] of Object.entries(features) as [FeatureFlag, boolean][]) {
      if (ALL_FEATURES.includes(flag)) {
        updatedFeatures[flag] = enabled;
      }
    }

    // Update wedding record
    wedding.features = updatedFeatures;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    // Update render_config features
    const existingConfig = this.renderConfigs.get(weddingId);
    if (!existingConfig) {
      return null;
    }

    const updatedConfig: RenderConfig = {
      ...existingConfig,
      features: updatedFeatures,
      // Also update section enabled states based on features
      sections: existingConfig.sections.map((section) => {
        if (section.type === 'rsvp') {
          return { ...section, enabled: updatedFeatures.RSVP };
        }
        // Add other feature-dependent sections here as needed
        return section;
      }),
    };

    this.renderConfigs.set(weddingId, updatedConfig);

    this.logger.log(`Updated features for wedding ${weddingId}: ${JSON.stringify(updatedFeatures)}`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Change a wedding's template while preserving content
   * This updates the render_config with the new template and its theme,
   * but keeps the existing sections data (content) intact.
   */
  changeTemplate(weddingId: string, templateId: string): RenderConfig | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    const template = this.getTemplate(templateId);
    if (!template) {
      return null;
    }

    const existingConfig = this.renderConfigs.get(weddingId);
    if (!existingConfig) {
      return null;
    }

    // Update render_config with new template while preserving content
    const updatedConfig: RenderConfig = {
      ...existingConfig,
      templateId: template.id,
      theme: template.defaultTheme,
      // Sections (content) are preserved - only visual presentation changes
    };

    // Store updated config
    this.renderConfigs.set(weddingId, updatedConfig);

    // Update wedding timestamp
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    this.logger.log(`Changed template for wedding ${weddingId} to ${templateId}`);

    return updatedConfig;
  }
}
