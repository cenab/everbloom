import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
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
  Announcement,
  Section,
  EventDetailsData,
  FaqConfig,
  PasscodeConfigBase,
  HeroContentData,
  MealConfig,
  RegistryConfig,
  AccommodationsConfig,
  GuestbookConfig,
} from '../types';

const scryptAsync = promisify(scrypt);

/**
 * Hash a passcode using scrypt
 * Format: salt:hash (both hex-encoded)
 */
async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(passcode, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a passcode against a stored hash using timing-safe comparison
 */
async function verifyPasscode(passcode: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) {
    return false;
  }
  const derivedKey = (await scryptAsync(passcode, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(hash, 'hex');

  // Use timing-safe comparison to prevent timing attacks
  if (derivedKey.length !== storedBuffer.length) {
    return false;
  }
  return timingSafeEqual(derivedKey, storedBuffer);
}

/**
 * Default theme for new weddings - calm, warm palette
 */
const DEFAULT_THEME: Theme = {
  primary: '#c9826b', // terracotta
  accent: '#8fac8b', // sage
  neutralLight: '#faf8f5', // warm off-white
  neutralDark: '#2d2d2d', // soft black
};

const DEFAULT_ANNOUNCEMENT: Announcement = {
  enabled: false,
  title: '',
  message: '',
};

const DEFAULT_FAQ: FaqConfig = {
  items: [],
};

const PHOTO_UPLOAD_SECTION_ID = 'photos';
const FAQ_SECTION_ID = 'faq';

const DEFAULT_PHOTO_SECTION_DATA = {
  title: 'Share Photos',
  description: 'Add your favorite moments to our shared album.',
  ctaLabel: 'Add your photos',
};

const createPhotoUploadSection = (order: number, enabled: boolean): Section => ({
  id: PHOTO_UPLOAD_SECTION_ID,
  type: 'photo-upload',
  enabled,
  order,
  data: { ...DEFAULT_PHOTO_SECTION_DATA },
});

const DEFAULT_FAQ_SECTION_DATA = {
  title: 'Frequently Asked Questions',
  description: 'Find answers to common questions about our celebration.',
};

const createFaqSection = (order: number, enabled: boolean): Section => ({
  id: FAQ_SECTION_ID,
  type: 'faq',
  enabled,
  order,
  data: { ...DEFAULT_FAQ_SECTION_DATA },
});

const REGISTRY_SECTION_ID = 'registry';

const DEFAULT_REGISTRY_SECTION_DATA = {
  title: 'Gift Registry',
  description: 'Your presence is our greatest gift, but if you wish to honor us, we have registered at these stores.',
};

const DEFAULT_REGISTRY: RegistryConfig = {
  links: [],
};

const createRegistrySection = (order: number, enabled: boolean): Section => ({
  id: REGISTRY_SECTION_ID,
  type: 'registry',
  enabled,
  order,
  data: { ...DEFAULT_REGISTRY_SECTION_DATA },
});

const ACCOMMODATIONS_SECTION_ID = 'accommodations';

const DEFAULT_ACCOMMODATIONS_SECTION_DATA = {
  title: 'Accommodations & Travel',
  description: 'Information about lodging and getting to our celebration.',
};

const DEFAULT_ACCOMMODATIONS: AccommodationsConfig = {
  hotels: [],
  travelInfo: {},
};

const createAccommodationsSection = (order: number, enabled: boolean): Section => ({
  id: ACCOMMODATIONS_SECTION_ID,
  type: 'accommodations',
  enabled,
  order,
  data: { ...DEFAULT_ACCOMMODATIONS_SECTION_DATA },
});

const GUESTBOOK_SECTION_ID = 'guestbook';

const DEFAULT_GUESTBOOK_SECTION_DATA = {
  title: 'Guestbook',
  description: 'Leave a message for the happy couple.',
};

const createGuestbookSection = (order: number, enabled: boolean): Section => ({
  id: GUESTBOOK_SECTION_ID,
  type: 'guestbook',
  enabled,
  order,
  data: { ...DEFAULT_GUESTBOOK_SECTION_DATA },
});

const MUSIC_REQUEST_SECTION_ID = 'music-request';

const DEFAULT_MUSIC_REQUEST_SECTION_DATA = {
  title: 'Suggest a Song',
  description: 'Help us create the perfect playlist for our celebration.',
};

const createMusicRequestSection = (order: number, enabled: boolean): Section => ({
  id: MUSIC_REQUEST_SECTION_ID,
  type: 'music-request',
  enabled,
  order,
  data: { ...DEFAULT_MUSIC_REQUEST_SECTION_DATA },
});

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
    'REGISTRY',
    'ACCOMMODATIONS',
    'GUESTBOOK',
    'MUSIC_REQUESTS',
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
  'REGISTRY',
  'ACCOMMODATIONS',
  'GUESTBOOK',
  'MUSIC_REQUESTS',
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
  {
    id: 'cultural-001',
    name: 'Mosaic',
    category: 'cultural' as TemplateCategory,
    description: 'Rich, ceremonial details with warm tones to honor cultural traditions.',
    defaultTheme: {
      primary: '#9a5a4a',
      accent: '#c79a7b',
      neutralLight: '#f6f1ea',
      neutralDark: '#3b2f2a',
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
    const config: RenderConfig = {
      templateId: 'minimal-001', // Default template
      theme: DEFAULT_THEME,
      features: wedding.features,
      announcement: wedding.announcement ?? { ...DEFAULT_ANNOUNCEMENT },
      faq: wedding.faq ?? { ...DEFAULT_FAQ },
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
        createPhotoUploadSection(3, wedding.features.PHOTO_UPLOAD),
        createFaqSection(4, wedding.features.FAQ_SECTION),
        createRegistrySection(5, wedding.features.REGISTRY),
        createAccommodationsSection(6, wedding.features.ACCOMMODATIONS),
        createGuestbookSection(7, wedding.features.GUESTBOOK),
        createMusicRequestSection(8, wedding.features.MUSIC_REQUESTS),
      ],
      wedding: {
        slug: wedding.slug,
        partnerNames: wedding.partnerNames,
      },
    };

    // Add eventDetails to render_config and wedding.* fields if present
    if (wedding.eventDetails) {
      config.eventDetails = wedding.eventDetails;
      config.wedding.date = wedding.eventDetails.date;
      config.wedding.venue = wedding.eventDetails.venue;
      config.wedding.city = wedding.eventDetails.city;
    }

    // Add passcode protection status (never expose the hash)
    if (wedding.passcodeConfig?.enabled && wedding.passcodeConfig?.passcodeHash) {
      config.passcodeProtected = true;
    } else {
      config.passcodeProtected = false;
    }

    // Add meal configuration if present and enabled
    if (wedding.mealConfig?.enabled && wedding.mealConfig.options.length > 0) {
      config.mealConfig = wedding.mealConfig;
    }

    // Add registry configuration if present
    if (wedding.registry && wedding.registry.links.length > 0) {
      config.registry = wedding.registry;
    }

    // Add accommodations configuration if present
    if (wedding.accommodations && (wedding.accommodations.hotels.length > 0 ||
        wedding.accommodations.travelInfo?.airportDirections ||
        wedding.accommodations.travelInfo?.parkingInfo ||
        wedding.accommodations.travelInfo?.mapUrl)) {
      config.accommodations = wedding.accommodations;
    }

    return config;
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
      announcement: { ...DEFAULT_ANNOUNCEMENT },
      faq: { ...DEFAULT_FAQ },
      registry: { ...DEFAULT_REGISTRY },
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

    const hasPhotoSection = existingConfig.sections.some((section) => section.type === 'photo-upload');
    const hasFaqSection = existingConfig.sections.some((section) => section.type === 'faq');
    const hasRegistrySection = existingConfig.sections.some((section) => section.type === 'registry');
    const hasGuestbookSection = existingConfig.sections.some((section) => section.type === 'guestbook');
    const updatedConfig: RenderConfig = {
      ...existingConfig,
      features: updatedFeatures,
      // Also update section enabled states based on features
      sections: existingConfig.sections.map((section) => {
        if (section.type === 'rsvp') {
          return { ...section, enabled: updatedFeatures.RSVP };
        }
        if (section.type === 'photo-upload') {
          return { ...section, enabled: updatedFeatures.PHOTO_UPLOAD };
        }
        if (section.type === 'faq') {
          return { ...section, enabled: updatedFeatures.FAQ_SECTION };
        }
        if (section.type === 'registry') {
          return { ...section, enabled: updatedFeatures.REGISTRY };
        }
        if (section.type === 'accommodations') {
          return { ...section, enabled: updatedFeatures.ACCOMMODATIONS };
        }
        if (section.type === 'guestbook') {
          return { ...section, enabled: updatedFeatures.GUESTBOOK };
        }
        return section;
      }),
    };

    if (!hasPhotoSection) {
      const maxOrder = updatedConfig.sections.reduce((max, section) => Math.max(max, section.order), -1);
      updatedConfig.sections = [
        ...updatedConfig.sections,
        createPhotoUploadSection(maxOrder + 1, updatedFeatures.PHOTO_UPLOAD),
      ];
    }

    if (!hasFaqSection) {
      const maxOrder = updatedConfig.sections.reduce((max, section) => Math.max(max, section.order), -1);
      updatedConfig.sections = [
        ...updatedConfig.sections,
        createFaqSection(maxOrder + 1, updatedFeatures.FAQ_SECTION),
      ];
    }

    if (!hasRegistrySection) {
      const maxOrder = updatedConfig.sections.reduce((max, section) => Math.max(max, section.order), -1);
      updatedConfig.sections = [
        ...updatedConfig.sections,
        createRegistrySection(maxOrder + 1, updatedFeatures.REGISTRY),
      ];
    }

    const hasAccommodationsSection = updatedConfig.sections.some((section) => section.type === 'accommodations');
    if (!hasAccommodationsSection) {
      const maxOrder = updatedConfig.sections.reduce((max, section) => Math.max(max, section.order), -1);
      updatedConfig.sections = [
        ...updatedConfig.sections,
        createAccommodationsSection(maxOrder + 1, updatedFeatures.ACCOMMODATIONS),
      ];
    }

    if (!hasGuestbookSection) {
      const maxOrder = updatedConfig.sections.reduce((max, section) => Math.max(max, section.order), -1);
      updatedConfig.sections = [
        ...updatedConfig.sections,
        createGuestbookSection(maxOrder + 1, updatedFeatures.GUESTBOOK),
      ];
    }

    const hasMusicRequestSection = updatedConfig.sections.some((section) => section.type === 'music-request');
    if (!hasMusicRequestSection) {
      const maxOrder = updatedConfig.sections.reduce((max, section) => Math.max(max, section.order), -1);
      updatedConfig.sections = [
        ...updatedConfig.sections,
        createMusicRequestSection(maxOrder + 1, updatedFeatures.MUSIC_REQUESTS),
      ];
    }

    this.renderConfigs.set(weddingId, updatedConfig);

    this.logger.log(`Updated features for wedding ${weddingId}: ${JSON.stringify(updatedFeatures)}`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update announcement banner for a wedding
   * Updates both the wedding record and render_config announcement content
   */
  updateAnnouncement(
    weddingId: string,
    announcement: Announcement,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.announcement = announcement;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    const existingConfig = this.renderConfigs.get(weddingId);
    if (!existingConfig) {
      return null;
    }

    const updatedConfig: RenderConfig = {
      ...existingConfig,
      announcement,
    };

    this.renderConfigs.set(weddingId, updatedConfig);

    this.logger.log(`Updated announcement banner for wedding ${weddingId}`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update event details for a wedding
   * Updates both the wedding record and render_config event details
   * Supports both single-event (legacy) and multi-event configurations
   */
  updateEventDetails(
    weddingId: string,
    eventDetails: EventDetailsData,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    // If events array is provided, use first event (typically ceremony) for top-level fields
    // This ensures backwards compatibility with calendar invites and legacy rendering
    let normalizedEventDetails = { ...eventDetails };
    if (eventDetails.events && eventDetails.events.length > 0) {
      const primaryEvent = eventDetails.events[0];
      normalizedEventDetails = {
        date: primaryEvent.date,
        startTime: primaryEvent.startTime,
        endTime: primaryEvent.endTime,
        venue: primaryEvent.venue,
        address: primaryEvent.address,
        city: primaryEvent.city,
        timezone: primaryEvent.timezone,
        events: eventDetails.events,
      };
    }

    wedding.eventDetails = normalizedEventDetails;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    const existingConfig = this.renderConfigs.get(weddingId);
    if (!existingConfig) {
      return null;
    }

    // Update render_config with event details
    const updatedConfig: RenderConfig = {
      ...existingConfig,
      eventDetails: normalizedEventDetails,
      wedding: {
        ...existingConfig.wedding,
        date: normalizedEventDetails.date,
        venue: normalizedEventDetails.venue,
        city: normalizedEventDetails.city,
      },
    };

    this.renderConfigs.set(weddingId, updatedConfig);

    const eventCount = normalizedEventDetails.events?.length || 1;
    this.logger.log(`Updated event details for wedding ${weddingId} (${eventCount} event(s))`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update FAQ items for a wedding
   * Updates both the wedding record and render_config FAQ content
   */
  updateFaq(
    weddingId: string,
    faq: FaqConfig,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.faq = faq;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    const existingConfig = this.renderConfigs.get(weddingId);
    if (!existingConfig) {
      return null;
    }

    const updatedConfig: RenderConfig = {
      ...existingConfig,
      faq,
    };

    this.renderConfigs.set(weddingId, updatedConfig);

    this.logger.log(`Updated FAQ for wedding ${weddingId} with ${faq.items.length} items`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update hero section content for a wedding
   * Updates the hero section in render_config with new headline and subheadline
   */
  updateHeroContent(
    weddingId: string,
    heroContent: HeroContentData,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    const existingConfig = this.renderConfigs.get(weddingId);
    if (!existingConfig) {
      return null;
    }

    // Update the hero section data in render_config
    const updatedSections = existingConfig.sections.map((section) => {
      if (section.type === 'hero') {
        return {
          ...section,
          data: {
            ...section.data,
            headline: heroContent.headline,
            ...(heroContent.subheadline && { subheadline: heroContent.subheadline }),
          },
        };
      }
      return section;
    });

    const updatedConfig: RenderConfig = {
      ...existingConfig,
      sections: updatedSections,
    };

    this.renderConfigs.set(weddingId, updatedConfig);

    // Update wedding timestamp
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    this.logger.log(`Updated hero content for wedding ${weddingId}`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update gift registry links for a wedding
   * PRD: "Admin can add gift registry links"
   */
  updateRegistry(
    weddingId: string,
    registry: RegistryConfig,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.registry = registry;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    const existingConfig = this.renderConfigs.get(weddingId);
    if (!existingConfig) {
      return null;
    }

    // Update registry in render_config
    const updatedConfig: RenderConfig = {
      ...existingConfig,
      registry: registry.links.length > 0 ? registry : undefined,
    };

    this.renderConfigs.set(weddingId, updatedConfig);

    this.logger.log(`Updated registry for wedding ${weddingId} with ${registry.links.length} links`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update accommodations and travel info for a wedding
   * PRD: "Admin can add hotel recommendations"
   */
  updateAccommodations(
    weddingId: string,
    accommodations: AccommodationsConfig,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.accommodations = accommodations;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    const existingConfig = this.renderConfigs.get(weddingId);
    if (!existingConfig) {
      return null;
    }

    // Update accommodations in render_config
    const hasContent = accommodations.hotels.length > 0 ||
      accommodations.travelInfo?.airportDirections ||
      accommodations.travelInfo?.parkingInfo ||
      accommodations.travelInfo?.mapUrl;

    const updatedConfig: RenderConfig = {
      ...existingConfig,
      accommodations: hasContent ? accommodations : undefined,
    };

    this.renderConfigs.set(weddingId, updatedConfig);

    this.logger.log(`Updated accommodations for wedding ${weddingId} with ${accommodations.hotels.length} hotels`);

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

  /**
   * Update passcode settings for a wedding
   * If enabled=true and passcode is provided, hash and store the passcode
   * If enabled=false, disable passcode protection
   */
  async updatePasscode(
    weddingId: string,
    enabled: boolean,
    passcode?: string,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    // Build the passcode config
    let passcodeConfig: PasscodeConfigBase;
    if (enabled) {
      // When enabling, we need a passcode to hash
      if (!passcode) {
        // If no new passcode and already has one, keep existing hash
        if (wedding.passcodeConfig?.passcodeHash) {
          passcodeConfig = {
            enabled: true,
            passcodeHash: wedding.passcodeConfig.passcodeHash,
          };
        } else {
          // Cannot enable without a passcode
          return null;
        }
      } else {
        // Hash the new passcode
        const passcodeHash = await hashPasscode(passcode);
        passcodeConfig = {
          enabled: true,
          passcodeHash,
        };
      }
    } else {
      // Disable passcode (keep the hash in case they re-enable)
      passcodeConfig = {
        enabled: false,
        passcodeHash: wedding.passcodeConfig?.passcodeHash,
      };
    }

    wedding.passcodeConfig = passcodeConfig;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    // Regenerate render_config to update passcodeProtected flag
    const updatedConfig = this.generateRenderConfig(wedding);
    this.renderConfigs.set(weddingId, updatedConfig);

    this.logger.log(`Updated passcode settings for wedding ${weddingId}: enabled=${enabled}`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Verify a passcode for a wedding (guest-facing)
   * Returns true if the passcode matches, false otherwise
   * Uses timing-safe comparison to prevent timing attacks
   */
  async verifyWeddingPasscode(slug: string, passcode: string): Promise<boolean> {
    const wedding = this.getWeddingBySlug(slug);
    if (!wedding) {
      return false;
    }

    // If passcode is not enabled or not configured, deny access
    if (!wedding.passcodeConfig?.enabled || !wedding.passcodeConfig?.passcodeHash) {
      return false;
    }

    return verifyPasscode(passcode, wedding.passcodeConfig.passcodeHash);
  }

  /**
   * Check if a wedding requires passcode to access
   */
  isPasscodeRequired(slug: string): boolean {
    const wedding = this.getWeddingBySlug(slug);
    if (!wedding) {
      return false;
    }

    return !!(
      wedding.features.PASSCODE_SITE &&
      wedding.passcodeConfig?.enabled &&
      wedding.passcodeConfig?.passcodeHash
    );
  }

  /**
   * Update meal options configuration for a wedding
   * Updates both the wedding record and regenerates render_config
   */
  updateMealConfig(
    weddingId: string,
    mealConfig: MealConfig,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.mealConfig = mealConfig;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    // Regenerate render_config to include meal options
    const updatedConfig = this.generateRenderConfig(wedding);
    this.renderConfigs.set(weddingId, updatedConfig);

    this.logger.log(
      `Updated meal config for wedding ${weddingId}: enabled=${mealConfig.enabled}, options=${mealConfig.options.length}`,
    );

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Get meal configuration for a wedding
   */
  getMealConfig(weddingId: string): MealConfig | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }
    return wedding.mealConfig || null;
  }

  /**
   * Update guestbook configuration in render_config
   * Called after guestbook messages are moderated
   * PRD: "Guestbook messages display on public site"
   */
  updateGuestbookConfig(
    weddingId: string,
    guestbook: GuestbookConfig,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    const existingConfig = this.renderConfigs.get(weddingId);
    if (!existingConfig) {
      return null;
    }

    // Update guestbook in render_config (only approved messages)
    const updatedConfig: RenderConfig = {
      ...existingConfig,
      guestbook: guestbook.messages.length > 0 ? guestbook : undefined,
    };

    this.renderConfigs.set(weddingId, updatedConfig);

    this.logger.log(
      `Updated guestbook config for wedding ${weddingId}: ${guestbook.messages.length} approved messages`,
    );

    return { wedding, renderConfig: updatedConfig };
  }
}
