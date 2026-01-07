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
  SeatingConfig,
  EmailTemplatesConfig,
  GalleryConfig,
  GalleryPhoto,
  VideoConfig,
  VideoEmbed,
  VideoEmbedPlatform,
  SocialConfig,
  PreviewStatus,
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

const SEATING_SECTION_ID = 'seating';

const DEFAULT_SEATING_SECTION_DATA = {
  title: 'Seating Chart',
  description: 'Find your table assignment for the celebration.',
};

const createSeatingSection = (order: number, enabled: boolean): Section => ({
  id: SEATING_SECTION_ID,
  type: 'seating',
  enabled,
  order,
  data: { ...DEFAULT_SEATING_SECTION_DATA },
});

const GALLERY_SECTION_ID = 'gallery';

const DEFAULT_GALLERY_SECTION_DATA = {
  title: 'Our Story',
  description: 'Moments we cherish from our journey together.',
};

const DEFAULT_GALLERY: GalleryConfig = {
  photos: [],
};

const createGallerySection = (order: number, enabled: boolean): Section => ({
  id: GALLERY_SECTION_ID,
  type: 'gallery',
  enabled,
  order,
  data: { ...DEFAULT_GALLERY_SECTION_DATA },
});

const VIDEO_SECTION_ID = 'video';

const DEFAULT_VIDEO_SECTION_DATA = {
  title: 'Our Videos',
  description: 'Watch our special moments together.',
};

const DEFAULT_VIDEO: VideoConfig = {
  videos: [],
};

const createVideoSection = (order: number, enabled: boolean): Section => ({
  id: VIDEO_SECTION_ID,
  type: 'video',
  enabled,
  order,
  data: { ...DEFAULT_VIDEO_SECTION_DATA },
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
    'SEATING_CHART',
    'VIDEO_EMBED',
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
  'SEATING_CHART',
  'VIDEO_EMBED',
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
  private renderConfigs: Map<string, RenderConfig> = new Map(); // Published configs
  private draftRenderConfigs: Map<string, RenderConfig> = new Map(); // Draft configs (unpublished changes)
  private draftUpdatedAt: Map<string, string> = new Map(); // Track when drafts were last modified
  private lastPublishedAt: Map<string, string> = new Map(); // Track when configs were last published
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
        createSeatingSection(9, wedding.features.SEATING_CHART),
        // Gallery section - enabled when there are curated photos (admin-controlled, not feature-gated)
        createGallerySection(10, (wedding.gallery?.photos.length ?? 0) > 0),
        // Video section - enabled when VIDEO_EMBED feature is enabled and videos exist
        createVideoSection(11, wedding.features.VIDEO_EMBED && (wedding.video?.videos.length ?? 0) > 0),
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

    // Add gallery configuration if present (admin curated photos)
    if (wedding.gallery && wedding.gallery.photos.length > 0) {
      config.gallery = wedding.gallery;
    }

    // Add video configuration if present and feature enabled
    if (wedding.features.VIDEO_EMBED && wedding.video && wedding.video.videos.length > 0) {
      config.video = wedding.video;
    }

    // Add custom OG image URL if uploaded
    if (wedding.socialConfig?.ogImageUrl) {
      config.ogImageUrl = wedding.socialConfig.ogImageUrl;
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
      gallery: { ...DEFAULT_GALLERY },
      video: { ...DEFAULT_VIDEO },
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

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    const hasPhotoSection = draftConfig.sections.some((section) => section.type === 'photo-upload');
    const hasFaqSection = draftConfig.sections.some((section) => section.type === 'faq');
    const hasRegistrySection = draftConfig.sections.some((section) => section.type === 'registry');
    const hasGuestbookSection = draftConfig.sections.some((section) => section.type === 'guestbook');
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      features: updatedFeatures,
      // Also update section enabled states based on features
      sections: draftConfig.sections.map((section) => {
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
        if (section.type === 'music-request') {
          return { ...section, enabled: updatedFeatures.MUSIC_REQUESTS };
        }
        if (section.type === 'seating') {
          return { ...section, enabled: updatedFeatures.SEATING_CHART };
        }
        if (section.type === 'video') {
          // Video section is enabled only when feature is enabled AND videos exist
          const hasVideos = (wedding.video?.videos.length ?? 0) > 0;
          return { ...section, enabled: updatedFeatures.VIDEO_EMBED && hasVideos };
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

    const hasSeatingSection = updatedConfig.sections.some((section) => section.type === 'seating');
    if (!hasSeatingSection) {
      const maxOrder = updatedConfig.sections.reduce((max, section) => Math.max(max, section.order), -1);
      updatedConfig.sections = [
        ...updatedConfig.sections,
        createSeatingSection(maxOrder + 1, updatedFeatures.SEATING_CHART),
      ];
    }

    const hasVideoSection = updatedConfig.sections.some((section) => section.type === 'video');
    if (!hasVideoSection) {
      const maxOrder = updatedConfig.sections.reduce((max, section) => Math.max(max, section.order), -1);
      const hasVideos = (wedding.video?.videos.length ?? 0) > 0;
      updatedConfig.sections = [
        ...updatedConfig.sections,
        createVideoSection(maxOrder + 1, updatedFeatures.VIDEO_EMBED && hasVideos),
      ];
    }

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(`Updated features for wedding ${weddingId} (draft): ${JSON.stringify(updatedFeatures)}`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update announcement banner for a wedding
   * Updates both the wedding record and DRAFT render_config announcement content
   * Changes go to draft; call publishDraft() to make them live
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

    // Get or create draft config
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    const updatedConfig: RenderConfig = {
      ...draftConfig,
      announcement,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(`Updated announcement banner for wedding ${weddingId} (draft)`);

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

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update draft render_config with event details
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      eventDetails: normalizedEventDetails,
      wedding: {
        ...draftConfig.wedding,
        date: normalizedEventDetails.date,
        venue: normalizedEventDetails.venue,
        city: normalizedEventDetails.city,
      },
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    const eventCount = normalizedEventDetails.events?.length || 1;
    this.logger.log(`Updated event details for wedding ${weddingId} (draft, ${eventCount} event(s))`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update FAQ items for a wedding
   * Updates both the wedding record and DRAFT render_config FAQ content
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

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    const updatedConfig: RenderConfig = {
      ...draftConfig,
      faq,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(`Updated FAQ for wedding ${weddingId} (draft, ${faq.items.length} items)`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update hero section content for a wedding
   * Updates the hero section in DRAFT render_config with new headline and subheadline
   */
  updateHeroContent(
    weddingId: string,
    heroContent: HeroContentData,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update the hero section data in draft render_config
    const updatedSections = draftConfig.sections.map((section) => {
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
      ...draftConfig,
      sections: updatedSections,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    // Update wedding timestamp
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    this.logger.log(`Updated hero content for wedding ${weddingId} (draft)`);

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

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update registry in draft render_config
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      registry: registry.links.length > 0 ? registry : undefined,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(`Updated registry for wedding ${weddingId} (draft, ${registry.links.length} links)`);

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

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update accommodations in draft render_config
    const hasContent = accommodations.hotels.length > 0 ||
      accommodations.travelInfo?.airportDirections ||
      accommodations.travelInfo?.parkingInfo ||
      accommodations.travelInfo?.mapUrl;

    const updatedConfig: RenderConfig = {
      ...draftConfig,
      accommodations: hasContent ? accommodations : undefined,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(`Updated accommodations for wedding ${weddingId} (draft, ${accommodations.hotels.length} hotels)`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update email templates for a wedding
   * PRD: "Admin can customize invitation email content"
   * PRD: "Email templates support merge fields"
   */
  updateEmailTemplates(
    weddingId: string,
    emailTemplates: EmailTemplatesConfig,
  ): Wedding | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.emailTemplates = emailTemplates;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    const templateCount = [
      emailTemplates.invitation,
      emailTemplates.reminder,
      emailTemplates.saveTheDate,
      emailTemplates.thankYouAttended,
      emailTemplates.thankYouNotAttended,
    ].filter(Boolean).length;

    this.logger.log(`Updated email templates for wedding ${weddingId}: ${templateCount} templates configured`);

    return wedding;
  }

  /**
   * Update photo moderation settings for a wedding
   * PRD: "Admin can enable photo moderation"
   */
  updatePhotoModeration(
    weddingId: string,
    moderationRequired: boolean,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.photoModerationConfig = { moderationRequired };
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    const existingConfig = this.renderConfigs.get(weddingId);
    if (!existingConfig) {
      return null;
    }

    // Render config doesn't need moderation config - it's admin-only setting
    this.logger.log(
      `Updated photo moderation for wedding ${weddingId}: moderationRequired=${moderationRequired}`,
    );

    return { wedding, renderConfig: existingConfig };
  }

  /**
   * Check if photo moderation is required for a wedding
   */
  isPhotoModerationRequired(weddingId: string): boolean {
    const wedding = this.weddings.get(weddingId);
    return wedding?.photoModerationConfig?.moderationRequired ?? false;
  }

  /**
   * Change a wedding's template while preserving content
   * This updates the DRAFT render_config with the new template and its theme,
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

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update draft render_config with new template while preserving content
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      templateId: template.id,
      theme: template.defaultTheme,
      // Sections (content) are preserved - only visual presentation changes
    };

    // Store updated draft config
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    // Update wedding timestamp
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    this.logger.log(`Changed template for wedding ${weddingId} to ${templateId} (draft)`);

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

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update draft render_config with passcode protection status
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      passcodeProtected: enabled && !!passcodeConfig.passcodeHash,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(`Updated passcode settings for wedding ${weddingId} (draft): enabled=${enabled}`);

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

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update draft render_config with meal options
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      mealConfig: mealConfig.enabled && mealConfig.options.length > 0 ? mealConfig : undefined,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(
      `Updated meal config for wedding ${weddingId} (draft): enabled=${mealConfig.enabled}, options=${mealConfig.options.length}`,
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

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update guestbook in draft render_config (only approved messages)
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      guestbook: guestbook.messages.length > 0 ? guestbook : undefined,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(
      `Updated guestbook config for wedding ${weddingId} (draft): ${guestbook.messages.length} approved messages`,
    );

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update seating config in render_config
   * Called after seating assignments are modified
   * PRD: "Seating chart can be displayed on public site"
   */
  updateSeatingConfig(
    weddingId: string,
    seating: SeatingConfig,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update seating in draft render_config
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      seating: seating.tables.length > 0 ? seating : undefined,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(
      `Updated seating config for wedding ${weddingId} (draft): ${seating.tables.length} tables`,
    );

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Update gallery configuration for a wedding (admin curated photos)
   * Updates both the wedding record and DRAFT render_config
   * PRD: "Admin can upload curated photos"
   */
  updateGallery(
    weddingId: string,
    gallery: GalleryConfig,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.gallery = gallery;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update gallery in draft render_config
    const hasPhotos = gallery.photos.length > 0;

    // Update the gallery section enabled state
    const updatedSections = draftConfig.sections.map((section) => {
      if (section.type === 'gallery') {
        return { ...section, enabled: hasPhotos };
      }
      return section;
    });

    // Ensure gallery section exists
    const hasGallerySection = updatedSections.some((s) => s.type === 'gallery');
    if (!hasGallerySection) {
      const maxOrder = updatedSections.reduce((max, s) => Math.max(max, s.order), -1);
      updatedSections.push(createGallerySection(maxOrder + 1, hasPhotos));
    }

    const updatedConfig: RenderConfig = {
      ...draftConfig,
      sections: updatedSections,
      gallery: hasPhotos ? gallery : undefined,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(
      `Updated gallery for wedding ${weddingId} (draft): ${gallery.photos.length} photos`,
    );

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Add a single photo to the gallery
   * Returns the updated gallery configuration
   */
  addGalleryPhoto(
    weddingId: string,
    photo: GalleryPhoto,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    const gallery = wedding.gallery ?? { ...DEFAULT_GALLERY };

    // Set order to be last if not specified
    const photoWithOrder: GalleryPhoto = {
      ...photo,
      order: photo.order ?? gallery.photos.length,
    };

    gallery.photos.push(photoWithOrder);

    return this.updateGallery(weddingId, gallery);
  }

  /**
   * Remove a photo from the gallery by ID
   */
  removeGalleryPhoto(
    weddingId: string,
    photoId: string,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    if (!wedding.gallery) {
      return null;
    }

    const updatedPhotos = wedding.gallery.photos.filter((p) => p.id !== photoId);

    // Re-order remaining photos
    const reorderedPhotos = updatedPhotos.map((p, index) => ({
      ...p,
      order: index,
    }));

    return this.updateGallery(weddingId, { photos: reorderedPhotos });
  }

  /**
   * Update a photo's caption or order
   */
  updateGalleryPhoto(
    weddingId: string,
    photoId: string,
    updates: { caption?: string; order?: number },
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding || !wedding.gallery) {
      return null;
    }

    const photoIndex = wedding.gallery.photos.findIndex((p) => p.id === photoId);
    if (photoIndex === -1) {
      return null;
    }

    const updatedPhotos = [...wedding.gallery.photos];
    updatedPhotos[photoIndex] = {
      ...updatedPhotos[photoIndex],
      ...updates,
    };

    // If order changed, re-sort and re-number
    if (updates.order !== undefined) {
      updatedPhotos.sort((a, b) => a.order - b.order);
      updatedPhotos.forEach((p, index) => {
        p.order = index;
      });
    }

    return this.updateGallery(weddingId, { photos: updatedPhotos });
  }

  /**
   * Get the gallery configuration for a wedding
   */
  getGallery(weddingId: string): GalleryConfig | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }
    return wedding.gallery ?? { ...DEFAULT_GALLERY };
  }

  // ============================================================================
  // Video Embed Methods
  // ============================================================================

  /**
   * Parse a YouTube or Vimeo URL and extract the video ID
   * Supports various URL formats:
   * - YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
   * - Vimeo: vimeo.com/ID, player.vimeo.com/video/ID
   */
  parseVideoUrl(url: string): { platform: VideoEmbedPlatform; videoId: string } | null {
    try {
      const parsedUrl = new URL(url);

      // YouTube URL patterns
      if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')) {
        let videoId: string | null = null;

        if (parsedUrl.hostname === 'youtu.be') {
          // Short format: youtu.be/VIDEO_ID
          videoId = parsedUrl.pathname.slice(1);
        } else if (parsedUrl.pathname.includes('/watch')) {
          // Standard format: youtube.com/watch?v=VIDEO_ID
          videoId = parsedUrl.searchParams.get('v');
        } else if (parsedUrl.pathname.includes('/embed/')) {
          // Embed format: youtube.com/embed/VIDEO_ID
          videoId = parsedUrl.pathname.split('/embed/')[1]?.split('?')[0];
        }

        if (videoId && videoId.length === 11) {
          return { platform: 'youtube', videoId };
        }
      }

      // Vimeo URL patterns
      if (parsedUrl.hostname.includes('vimeo.com') || parsedUrl.hostname.includes('player.vimeo.com')) {
        let videoId: string | null = null;

        if (parsedUrl.hostname === 'player.vimeo.com') {
          // Player format: player.vimeo.com/video/VIDEO_ID
          videoId = parsedUrl.pathname.split('/video/')[1]?.split('?')[0];
        } else {
          // Standard format: vimeo.com/VIDEO_ID
          videoId = parsedUrl.pathname.slice(1).split('/')[0];
        }

        // Vimeo IDs are numeric
        if (videoId && /^\d+$/.test(videoId)) {
          return { platform: 'vimeo', videoId };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Update video configuration for a wedding
   * Updates both the wedding record and regenerates render_config
   * PRD: "Admin can embed videos"
   */
  updateVideo(
    weddingId: string,
    video: VideoConfig,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.video = video;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update video in render_config
    const hasVideos = video.videos.length > 0;
    const featureEnabled = wedding.features.VIDEO_EMBED;

    // Update the video section enabled state
    const updatedSections = draftConfig.sections.map((section) => {
      if (section.type === 'video') {
        return { ...section, enabled: featureEnabled && hasVideos };
      }
      return section;
    });

    // Ensure video section exists
    const hasVideoSection = updatedSections.some((s) => s.type === 'video');
    if (!hasVideoSection) {
      const maxOrder = updatedSections.reduce((max, s) => Math.max(max, s.order), -1);
      updatedSections.push(createVideoSection(maxOrder + 1, featureEnabled && hasVideos));
    }

    const updatedConfig: RenderConfig = {
      ...draftConfig,
      sections: updatedSections,
      video: (featureEnabled && hasVideos) ? video : undefined,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(
      `Updated video for wedding ${weddingId}: ${video.videos.length} videos`,
    );

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Add a single video embed to the wedding
   * Validates the URL and extracts the platform/videoId
   */
  addVideo(
    weddingId: string,
    url: string,
    title?: string,
  ): { wedding: Wedding; renderConfig: RenderConfig; video: VideoEmbed } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    // Parse and validate the URL
    const parsed = this.parseVideoUrl(url);
    if (!parsed) {
      return null;
    }

    const video = wedding.video ?? { ...DEFAULT_VIDEO };

    // Create the new video embed
    const newVideo: VideoEmbed = {
      id: randomBytes(8).toString('hex'),
      platform: parsed.platform,
      videoId: parsed.videoId,
      url,
      title,
      order: video.videos.length,
      addedAt: new Date().toISOString(),
    };

    video.videos.push(newVideo);

    const result = this.updateVideo(weddingId, video);
    if (!result) {
      return null;
    }

    return { ...result, video: newVideo };
  }

  /**
   * Remove a video from the wedding by ID
   */
  removeVideo(
    weddingId: string,
    videoId: string,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding || !wedding.video) {
      return null;
    }

    const updatedVideos = wedding.video.videos.filter((v) => v.id !== videoId);

    // Re-order remaining videos
    const reorderedVideos = updatedVideos.map((v, index) => ({
      ...v,
      order: index,
    }));

    return this.updateVideo(weddingId, { videos: reorderedVideos });
  }

  /**
   * Update a video's title or order
   */
  updateVideoEmbed(
    weddingId: string,
    videoId: string,
    updates: { title?: string; order?: number },
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding || !wedding.video) {
      return null;
    }

    const videoIndex = wedding.video.videos.findIndex((v) => v.id === videoId);
    if (videoIndex === -1) {
      return null;
    }

    const updatedVideos = [...wedding.video.videos];
    updatedVideos[videoIndex] = {
      ...updatedVideos[videoIndex],
      ...updates,
    };

    // If order changed, re-sort and re-number
    if (updates.order !== undefined) {
      updatedVideos.sort((a, b) => a.order - b.order);
      updatedVideos.forEach((v, index) => {
        v.order = index;
      });
    }

    return this.updateVideo(weddingId, { videos: updatedVideos });
  }

  /**
   * Get the video configuration for a wedding
   */
  getVideo(weddingId: string): VideoConfig | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }
    return wedding.video ?? { ...DEFAULT_VIDEO };
  }

  // ============================================================================
  // Social Config / OG Image Methods
  // ============================================================================

  /**
   * Update social sharing configuration for a wedding (custom OG image)
   * Updates both the wedding record and regenerates render_config
   * PRD: "Admin can customize share image"
   */
  updateSocialConfig(
    weddingId: string,
    socialConfig: SocialConfig,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    wedding.socialConfig = socialConfig;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update draft with new OG image URL
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      ogImageUrl: socialConfig.ogImageUrl,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(
      `Updated social config for wedding ${weddingId}: ogImageUrl=${socialConfig.ogImageUrl ?? 'none'}`,
    );

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Get social config for a wedding
   */
  getSocialConfig(weddingId: string): SocialConfig | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }
    return wedding.socialConfig ?? {};
  }

// ============================================================================
  // Language / i18n Methods
  // PRD: "Admin can set site language"
  // ============================================================================

  /**
   * Supported languages for wedding sites
   */
  private static readonly SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
  ] as const;

  /**
   * Get list of supported languages for admin UI
   */
  getSupportedLanguages(): { code: string; name: string; nativeName: string }[] {
    return [...WeddingService.SUPPORTED_LANGUAGES];
  }

  /**
   * Check if a language code is valid/supported
   */
  isValidLanguage(language: string): boolean {
    return WeddingService.SUPPORTED_LANGUAGES.some((l) => l.code === language);
  }

  /**
   * Update site language for a wedding
   * Updates both the wedding record and DRAFT render_config language setting
   * PRD: "Admin can set site language"
   */
  updateLanguage(
    weddingId: string,
    language: string,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    // Validate language code
    if (!this.isValidLanguage(language)) {
      return null;
    }

    wedding.language = language;
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update draft with new language
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      language,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(`Updated language for wedding ${weddingId} (draft): ${language}`);

    return { wedding, renderConfig: updatedConfig };
  }

  /**
   * Get current language for a wedding (defaults to 'en')
   */
  getLanguage(weddingId: string): string {
    const wedding = this.weddings.get(weddingId);
    return wedding?.language ?? 'en';
  }

  /**
   * Remove the custom OG image from a wedding
   */
  removeSocialOgImage(
    weddingId: string,
  ): { wedding: Wedding; renderConfig: RenderConfig } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    // Clear the OG image fields but keep other social config
    wedding.socialConfig = {
      ...wedding.socialConfig,
      ogImageUrl: undefined,
      ogImageFileName: undefined,
      ogImageContentType: undefined,
      ogImageUploadedAt: undefined,
    };
    wedding.updatedAt = new Date().toISOString();
    this.weddings.set(weddingId, wedding);

    // Get or create draft config for updates
    const draftConfig = this.getOrCreateDraft(weddingId);
    if (!draftConfig) {
      return null;
    }

    // Update draft without OG image
    const updatedConfig: RenderConfig = {
      ...draftConfig,
      ogImageUrl: undefined,
    };

    // Update draft, not published
    this.updateDraftRenderConfig(weddingId, updatedConfig);

    this.logger.log(`Removed OG image for wedding ${weddingId}`);

    return { wedding, renderConfig: updatedConfig };
  }

  // ============================================================================
  // Preview / Draft Workflow Methods
  // PRD: "Admin can preview site before publishing"
  // PRD: "Admin can publish or discard changes"
  // ============================================================================

  /**
   * Get the draft render_config for a wedding (creates one if doesn't exist)
   * The draft starts as a copy of the published config
   */
  getDraftRenderConfig(weddingId: string): RenderConfig | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    // If no draft exists, return a copy of the published config
    if (!this.draftRenderConfigs.has(weddingId)) {
      const publishedConfig = this.renderConfigs.get(weddingId);
      if (publishedConfig) {
        // Deep clone the published config as the initial draft
        const draftConfig = JSON.parse(JSON.stringify(publishedConfig)) as RenderConfig;
        this.draftRenderConfigs.set(weddingId, draftConfig);
        this.draftUpdatedAt.set(weddingId, new Date().toISOString());
      }
    }

    return this.draftRenderConfigs.get(weddingId) ?? null;
  }

  /**
   * Get the published render_config for a wedding
   * This is what the public wedding site renders from
   */
  getPublishedRenderConfig(weddingId: string): RenderConfig | null {
    return this.renderConfigs.get(weddingId) ?? null;
  }

  /**
   * Check if a wedding has unpublished draft changes
   */
  hasDraftChanges(weddingId: string): boolean {
    const draftConfig = this.draftRenderConfigs.get(weddingId);
    const publishedConfig = this.renderConfigs.get(weddingId);

    if (!draftConfig || !publishedConfig) {
      return false;
    }

    // Compare by JSON serialization (simple but effective for this use case)
    return JSON.stringify(draftConfig) !== JSON.stringify(publishedConfig);
  }

  /**
   * Get preview status for a wedding
   */
  getPreviewStatus(weddingId: string): PreviewStatus | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    return {
      hasDraftChanges: this.hasDraftChanges(weddingId),
      draftUpdatedAt: this.draftUpdatedAt.get(weddingId),
      lastPublishedAt: this.lastPublishedAt.get(weddingId),
    };
  }

  /**
   * Update the draft render_config for a wedding
   * This is called by all content update methods to update draft instead of published
   */
  private updateDraftRenderConfig(weddingId: string, config: RenderConfig): void {
    this.draftRenderConfigs.set(weddingId, config);
    this.draftUpdatedAt.set(weddingId, new Date().toISOString());
  }

  /**
   * Publish draft changes - copy draft to published
   * Returns the updated wedding and render_config
   */
  publishDraft(weddingId: string): { wedding: Wedding; renderConfig: RenderConfig; message: string } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    const draftConfig = this.draftRenderConfigs.get(weddingId);
    if (!draftConfig) {
      // No draft exists, return current published config
      const publishedConfig = this.renderConfigs.get(weddingId);
      if (!publishedConfig) {
        return null;
      }
      return {
        wedding,
        renderConfig: publishedConfig,
        message: 'No changes to publish.',
      };
    }

    // Check if there are actual changes
    if (!this.hasDraftChanges(weddingId)) {
      const publishedConfig = this.renderConfigs.get(weddingId);
      if (!publishedConfig) {
        return null;
      }
      return {
        wedding,
        renderConfig: publishedConfig,
        message: 'No changes to publish.',
      };
    }

    // Copy draft to published
    const publishedConfig = JSON.parse(JSON.stringify(draftConfig)) as RenderConfig;
    this.renderConfigs.set(weddingId, publishedConfig);

    // Update timestamps
    const now = new Date().toISOString();
    this.lastPublishedAt.set(weddingId, now);
    wedding.updatedAt = now;
    this.weddings.set(weddingId, wedding);

    // Clear the draft (it now matches published)
    this.draftRenderConfigs.delete(weddingId);
    this.draftUpdatedAt.delete(weddingId);

    this.logger.log(`Published draft for wedding ${weddingId}`);

    return {
      wedding,
      renderConfig: publishedConfig,
      message: 'Changes published successfully. Your site is now updated.',
    };
  }

  /**
   * Discard draft changes - delete draft and revert to published
   * Returns the wedding and published render_config
   */
  discardDraft(weddingId: string): { wedding: Wedding; renderConfig: RenderConfig; message: string } | null {
    const wedding = this.weddings.get(weddingId);
    if (!wedding) {
      return null;
    }

    const publishedConfig = this.renderConfigs.get(weddingId);
    if (!publishedConfig) {
      return null;
    }

    // Check if there was a draft
    const hadDraft = this.hasDraftChanges(weddingId);

    // Delete the draft
    this.draftRenderConfigs.delete(weddingId);
    this.draftUpdatedAt.delete(weddingId);

    this.logger.log(`Discarded draft for wedding ${weddingId}`);

    return {
      wedding,
      renderConfig: publishedConfig,
      message: hadDraft
        ? 'Changes discarded. Your site has been reverted to the published version.'
        : 'No changes to discard.',
    };
  }

  /**
   * Helper method to get the working config for updates
   * Returns draft if exists, otherwise creates a draft from published
   * All content update methods should update draft, not published directly
   */
  private getOrCreateDraft(weddingId: string): RenderConfig | null {
    // Get existing draft or create from published
    let draftConfig = this.draftRenderConfigs.get(weddingId);

    if (!draftConfig) {
      const publishedConfig = this.renderConfigs.get(weddingId);
      if (!publishedConfig) {
        return null;
      }
      // Clone published as initial draft
      draftConfig = JSON.parse(JSON.stringify(publishedConfig)) as RenderConfig;
      this.draftRenderConfigs.set(weddingId, draftConfig);
      this.draftUpdatedAt.set(weddingId, new Date().toISOString());
    }

    return draftConfig;
  }
}
