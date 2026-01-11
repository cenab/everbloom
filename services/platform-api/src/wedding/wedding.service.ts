import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { verifyDnsRecords, generateVerificationToken } from '../utils/dns-verification';
import { getSupabaseClient, DbWedding, DbWeddingSite } from '../utils/supabase';
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
  FaqItem,
  Section,
  EventDetailsData,
  FaqConfig,
  PasscodeConfigBase,
  HeroContentData,
  MealConfig,
  RegistryLink,
  RegistryConfig,
  Hotel,
  TravelInfo,
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
  CustomDomainConfig,
  CustomDomainStatus,
  DnsRecord,
  PhotoModerationConfig,
} from '../types';

const scryptAsync = promisify(scrypt);

/**
 * Hash a passcode using scrypt
 */
async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(passcode, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a passcode against a stored hash
 */
async function verifyPasscode(passcode: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const derivedKey = (await scryptAsync(passcode, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(hash, 'hex');
  if (derivedKey.length !== storedBuffer.length) return false;
  return timingSafeEqual(derivedKey, storedBuffer);
}

const DEFAULT_THEME: Theme = {
  primary: '#c9826b',
  accent: '#8fac8b',
  neutralLight: '#faf8f5',
  neutralDark: '#2d2d2d',
};

const DEFAULT_ANNOUNCEMENT: Announcement = { enabled: false, title: '', message: '' };
const DEFAULT_FAQ: FaqConfig = { items: [] };
const DEFAULT_REGISTRY: RegistryConfig = { links: [] };
const DEFAULT_GALLERY: GalleryConfig = { photos: [] };
const DEFAULT_VIDEO: VideoConfig = { videos: [] };
const DEFAULT_ACCOMMODATIONS: AccommodationsConfig = { hotels: [], travelInfo: {} };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function parseAnnouncement(value: UnknownRecord | null): Announcement | undefined {
  if (!value) {
    return undefined;
  }

  return {
    enabled: asBoolean(value.enabled) ?? DEFAULT_ANNOUNCEMENT.enabled,
    title: asString(value.title) ?? DEFAULT_ANNOUNCEMENT.title,
    message: asString(value.message) ?? DEFAULT_ANNOUNCEMENT.message,
  };
}

function parseFaqItem(value: unknown): FaqItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const question = asString(value.question);
  const answer = asString(value.answer);
  const order = asNumber(value.order);

  if (!id || !question || !answer || order === undefined) {
    return null;
  }

  return { id, question, answer, order };
}

function parseFaq(value: UnknownRecord | null): FaqConfig | undefined {
  if (!value) {
    return undefined;
  }

  const itemsValue = Array.isArray(value.items) ? value.items : [];
  const items = itemsValue
    .map(parseFaqItem)
    .filter(isPresent);

  return { items };
}

function parseRegistryLink(value: unknown): RegistryLink | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const name = asString(value.name);
  const url = asString(value.url);
  const order = asNumber(value.order);

  if (!id || !name || !url || order === undefined) {
    return null;
  }

  return { id, name, url, order };
}

function parseRegistry(value: UnknownRecord | null): RegistryConfig | undefined {
  if (!value) {
    return undefined;
  }

  const linksValue = Array.isArray(value.links) ? value.links : [];
  const links = linksValue
    .map(parseRegistryLink)
    .filter(isPresent);

  return { links };
}

function parseHotel(value: unknown): Hotel | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const name = asString(value.name);
  const address = asString(value.address);
  const order = asNumber(value.order);

  if (!id || !name || !address || order === undefined) {
    return null;
  }

  const bookingUrl = asString(value.bookingUrl);
  const roomBlockCode = asString(value.roomBlockCode);
  const notes = asString(value.notes);

  return {
    id,
    name,
    address,
    order,
    ...(bookingUrl ? { bookingUrl } : {}),
    ...(roomBlockCode ? { roomBlockCode } : {}),
    ...(notes ? { notes } : {}),
  };
}

function parseTravelInfo(value: unknown): TravelInfo | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const airportDirections = asString(value.airportDirections);
  const parkingInfo = asString(value.parkingInfo);
  const mapUrl = asString(value.mapUrl);

  const info: TravelInfo = {};
  if (airportDirections) {
    info.airportDirections = airportDirections;
  }
  if (parkingInfo) {
    info.parkingInfo = parkingInfo;
  }
  if (mapUrl) {
    info.mapUrl = mapUrl;
  }

  return Object.keys(info).length > 0 ? info : undefined;
}

function parseAccommodations(value: UnknownRecord | null): AccommodationsConfig | undefined {
  if (!value) {
    return undefined;
  }

  const hotelsValue = Array.isArray(value.hotels) ? value.hotels : [];
  const hotels = hotelsValue
    .map(parseHotel)
    .filter(isPresent);
  const travelInfo = parseTravelInfo(value.travelInfo);

  if (travelInfo) {
    return { hotels, travelInfo };
  }

  return { hotels };
}

function parseGalleryPhoto(value: unknown): GalleryPhoto | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const fileName = asString(value.fileName);
  const contentType = asString(value.contentType);
  const fileSize = asNumber(value.fileSize);
  const order = asNumber(value.order);
  const uploadedAt = asString(value.uploadedAt);

  if (!id || !fileName || !contentType || fileSize === undefined || order === undefined || !uploadedAt) {
    return null;
  }

  const caption = asString(value.caption);
  const url = asString(value.url);

  return {
    id,
    fileName,
    contentType,
    fileSize,
    order,
    uploadedAt,
    ...(caption ? { caption } : {}),
    ...(url ? { url } : {}),
  };
}

function parseGallery(value: UnknownRecord | null): GalleryConfig | undefined {
  if (!value) {
    return undefined;
  }

  const photosValue = Array.isArray(value.photos) ? value.photos : [];
  const photos = photosValue
    .map(parseGalleryPhoto)
    .filter(isPresent);

  return { photos };
}

function asVideoPlatform(value: unknown): VideoEmbedPlatform | undefined {
  return value === 'youtube' || value === 'vimeo' ? value : undefined;
}

function parseVideoEmbed(value: unknown): VideoEmbed | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const platform = asVideoPlatform(value.platform);
  const videoId = asString(value.videoId);
  const url = asString(value.url);
  const order = asNumber(value.order);
  const addedAt = asString(value.addedAt);

  if (!id || !platform || !videoId || !url || order === undefined || !addedAt) {
    return null;
  }

  const title = asString(value.title);

  return {
    id,
    platform,
    videoId,
    url,
    order,
    addedAt,
    ...(title ? { title } : {}),
  };
}

function parseVideo(value: UnknownRecord | null): VideoConfig | undefined {
  if (!value) {
    return undefined;
  }

  const videosValue = Array.isArray(value.videos) ? value.videos : [];
  const videos = videosValue
    .map(parseVideoEmbed)
    .filter(isPresent);

  return { videos };
}

function parsePhotoModerationConfig(
  value: UnknownRecord | null,
): PhotoModerationConfig | undefined {
  if (!value) {
    return undefined;
  }

  const moderationRequired = asBoolean(value.moderationRequired);
  if (moderationRequired === undefined) {
    return undefined;
  }

  return { moderationRequired };
}

const PLAN_FEATURES: Record<PlanTier, FeatureFlag[]> = {
  starter: ['RSVP', 'CALENDAR_INVITE'],
  premium: [
    'RSVP', 'CALENDAR_INVITE', 'PHOTO_UPLOAD', 'ANNOUNCEMENT_BANNER',
    'FAQ_SECTION', 'PASSCODE_SITE', 'REGISTRY', 'ACCOMMODATIONS',
    'GUESTBOOK', 'MUSIC_REQUESTS', 'SEATING_CHART', 'VIDEO_EMBED',
  ],
};

const ALL_FEATURES: FeatureFlag[] = [
  'RSVP', 'CALENDAR_INVITE', 'PHOTO_UPLOAD', 'ANNOUNCEMENT_BANNER',
  'FAQ_SECTION', 'PASSCODE_SITE', 'REGISTRY', 'ACCOMMODATIONS',
  'GUESTBOOK', 'MUSIC_REQUESTS', 'SEATING_CHART', 'VIDEO_EMBED',
];

const TEMPLATES: Template[] = [
  {
    id: 'minimal-001', name: 'Serene', category: 'minimal' as TemplateCategory,
    description: 'Clean lines and generous whitespace for a modern, understated elegance.',
    defaultTheme: { primary: '#c9826b', accent: '#8fac8b', neutralLight: '#faf8f5', neutralDark: '#2d2d2d' },
  },
  {
    id: 'minimal-002', name: 'Whisper', category: 'minimal' as TemplateCategory,
    description: 'Soft tones and delicate typography for an intimate, romantic feel.',
    defaultTheme: { primary: '#b8a090', accent: '#c9b8a8', neutralLight: '#fdfcfb', neutralDark: '#3d3d3d' },
  },
  {
    id: 'classic-001', name: 'Heritage', category: 'classic' as TemplateCategory,
    description: 'Timeless design with traditional flourishes and refined details.',
    defaultTheme: { primary: '#8b7355', accent: '#a89078', neutralLight: '#f9f7f4', neutralDark: '#2f2f2f' },
  },
  {
    id: 'modern-001', name: 'Edge', category: 'modern' as TemplateCategory,
    description: 'Bold typography and contemporary layouts for the style-forward couple.',
    defaultTheme: { primary: '#4a5568', accent: '#718096', neutralLight: '#f7fafc', neutralDark: '#1a202c' },
  },
];

@Injectable()
export class WeddingService {
  private readonly logger = new Logger(WeddingService.name);

  /**
   * Convert database wedding to API type
   */
  private dbWeddingToWedding(db: DbWedding): Wedding {
    return {
      id: db.id,
      userId: db.user_id,
      slug: db.slug,
      name: db.name || `${db.partner_names[0]} & ${db.partner_names[1]}`,
      partnerNames: db.partner_names,
      planId: db.plan_tier as PlanTier,
      status: db.status as WeddingStatus,
      features: db.features as Record<FeatureFlag, boolean>,
      announcement: parseAnnouncement(db.announcement),
      eventDetails: db.event_details as unknown as EventDetailsData | undefined,
      faq: parseFaq(db.faq),
      mealConfig: db.meal_config as unknown as MealConfig | undefined,
      passcodeConfig: db.passcode_config as unknown as PasscodeConfigBase | undefined,
      registry: parseRegistry(db.registry),
      accommodations: parseAccommodations(db.accommodations),
      emailTemplates: db.email_templates as EmailTemplatesConfig | undefined,
      gallery: parseGallery(db.gallery),
      customDomain: db.custom_domain_config as unknown as CustomDomainConfig | undefined,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
      photoModerationConfig: parsePhotoModerationConfig(db.photo_moderation_config),
      video: parseVideo(db.video),
      socialConfig: db.social_config as SocialConfig | undefined,
      language: db.language || undefined,
    };
  }

  private generateSlug(partnerNames: [string, string]): string {
    const baseSlug = partnerNames
      .map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .join('-and-');
    const suffix = randomBytes(3).toString('hex');
    return `${baseSlug}-${suffix}`;
  }

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
      } else if (typeof selection[flag] === 'boolean') {
        features[flag] = selection[flag] as boolean;
      } else {
        features[flag] = true;
      }
    }
    return features;
  }

  private generateRenderConfig(wedding: Wedding): RenderConfig {
    const config: RenderConfig = {
      templateId: 'minimal-001',
      theme: DEFAULT_THEME,
      features: wedding.features,
      announcement: DEFAULT_ANNOUNCEMENT,
      faq: DEFAULT_FAQ,
      sections: [
        {
          id: 'hero',
          type: 'hero',
          enabled: true,
          order: 0,
          data: {
            headline: `${wedding.partnerNames[0]} & ${wedding.partnerNames[1]}`,
            invitationStyle: 'classic',
            invitationMessage: '',
            showDate: true,
          },
        },
        { id: 'details', type: 'event-details', enabled: true, order: 1, data: { title: 'Our Wedding Day', description: "We can't wait to celebrate with you." } },
        { id: 'rsvp', type: 'rsvp', enabled: wedding.features.RSVP, order: 2, data: { title: 'RSVP', description: 'Please let us know if you can join us.' } },
        { id: 'photos', type: 'photo-upload', enabled: wedding.features.PHOTO_UPLOAD, order: 3, data: { title: 'Share Photos', description: 'Add your favorite moments.' } },
        { id: 'faq', type: 'faq', enabled: wedding.features.FAQ_SECTION, order: 4, data: { title: 'FAQ', description: 'Common questions.' } },
        { id: 'registry', type: 'registry', enabled: wedding.features.REGISTRY, order: 5, data: { title: 'Gift Registry' } },
        { id: 'accommodations', type: 'accommodations', enabled: wedding.features.ACCOMMODATIONS, order: 6, data: { title: 'Accommodations' } },
        { id: 'guestbook', type: 'guestbook', enabled: wedding.features.GUESTBOOK, order: 7, data: { title: 'Guestbook' } },
        { id: 'music-request', type: 'music-request', enabled: wedding.features.MUSIC_REQUESTS, order: 8, data: { title: 'Suggest a Song' } },
        { id: 'seating', type: 'seating', enabled: wedding.features.SEATING_CHART, order: 9, data: { title: 'Seating Chart' } },
        { id: 'gallery', type: 'gallery', enabled: false, order: 10, data: { title: 'Our Story' } },
        { id: 'video', type: 'video', enabled: wedding.features.VIDEO_EMBED, order: 11, data: { title: 'Our Videos' } },
      ],
      wedding: { slug: wedding.slug, partnerNames: wedding.partnerNames },
    };

    if (wedding.eventDetails) {
      config.eventDetails = wedding.eventDetails;
      config.wedding.date = wedding.eventDetails.date;
      config.wedding.venue = wedding.eventDetails.venue;
      config.wedding.city = wedding.eventDetails.city;
    }

    config.passcodeProtected = !!(wedding.passcodeConfig?.enabled && wedding.passcodeConfig?.passcodeHash);

    if (wedding.mealConfig?.enabled && wedding.mealConfig.options?.length > 0) {
      config.mealConfig = wedding.mealConfig;
    }

    return config;
  }

  /**
   * Provision a new wedding from checkout completion
   */
  async provisionWedding(payload: CreateWeddingPayload): Promise<{
    wedding: Wedding;
    renderConfig: RenderConfig;
    isNew: boolean;
  }> {
    const supabase = getSupabaseClient();

    // Check for existing wedding by user (idempotency for same checkout session)
    const { data: existingWeddings } = await supabase
      .from('weddings')
      .select('*')
      .eq('user_id', payload.userId)
      .order('created_at', { ascending: false })
      .limit(1);

    // Simple idempotency - if user recently created a wedding, return it
    if (existingWeddings && existingWeddings.length > 0) {
      const recent = existingWeddings[0] as DbWedding;
      const createdAt = new Date(recent.created_at).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

      if (createdAt > fiveMinutesAgo) {
        const wedding = this.dbWeddingToWedding(recent);
        const { data: siteData } = await supabase
          .from('wedding_sites')
          .select('render_config')
          .eq('wedding_id', wedding.id)
          .single();

        return {
          wedding,
          renderConfig: siteData?.render_config as RenderConfig,
          isNew: false,
        };
      }
    }

    const features = this.buildFeatureFlags(payload.planId, payload.features);
    const slug = this.generateSlug(payload.partnerNames);

    // Create wedding
    const { data: newWedding, error: weddingError } = await supabase
      .from('weddings')
      .insert({
        user_id: payload.userId,
        slug,
        name: payload.weddingName,
        partner_names: payload.partnerNames,
        plan_tier: payload.planId,
        status: 'active',
        features,
      })
      .select()
      .single();

    if (weddingError || !newWedding) {
      this.logger.error('Failed to create wedding', weddingError);
      throw new Error('Failed to create wedding');
    }

    const wedding = this.dbWeddingToWedding(newWedding as DbWedding);
    const renderConfig = this.generateRenderConfig(wedding);

    // Create wedding_site with render_config
    const { error: siteError } = await supabase
      .from('wedding_sites')
      .insert({
        wedding_id: wedding.id,
        render_config: renderConfig,
        preview_status: 'published',
      });

    if (siteError) {
      this.logger.error('Failed to create wedding site', siteError);
      throw new Error('Failed to create wedding site');
    }

    this.logger.log(`Provisioned wedding ${wedding.id} with slug ${slug}`);

    return { wedding, renderConfig, isNew: true };
  }

  /**
   * Get a wedding by ID
   */
  async getWedding(id: string): Promise<Wedding | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.dbWeddingToWedding(data as DbWedding);
  }

  /**
   * Get a wedding by slug
   */
  async getWeddingBySlug(slug: string): Promise<Wedding | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return this.dbWeddingToWedding(data as DbWedding);
  }

  /**
   * Get all weddings for a user
   */
  async getWeddingsForUser(userId: string): Promise<Wedding[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((w) => this.dbWeddingToWedding(w as DbWedding));
  }

  /**
   * Get render_config for a wedding
   */
  async getRenderConfig(weddingId: string): Promise<RenderConfig | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('wedding_sites')
      .select('render_config')
      .eq('wedding_id', weddingId)
      .single();

    if (error || !data) return null;
    return data.render_config as RenderConfig;
  }

  /**
   * Get draft render_config for a wedding
   */
  async getDraftRenderConfig(weddingId: string): Promise<RenderConfig | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('wedding_sites')
      .select('draft_render_config, render_config')
      .eq('wedding_id', weddingId)
      .single();

    if (error || !data) return null;

    // Return draft if exists, otherwise return published
    return (data.draft_render_config || data.render_config) as RenderConfig;
  }

  /**
   * Update render_config (saves to draft)
   */
  async updateRenderConfig(weddingId: string, config: RenderConfig): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('wedding_sites')
      .update({
        draft_render_config: config,
        draft_updated_at: new Date().toISOString(),
      })
      .eq('wedding_id', weddingId);

    if (error) {
      this.logger.error('Failed to update render config', error);
      throw new Error('Failed to update render config');
    }
  }

  /**
   * Publish draft changes
   */
  async publishDraft(weddingId: string): Promise<{ wedding: Wedding; renderConfig: RenderConfig; message: string } | null> {
    const supabase = getSupabaseClient();

    const { data: site } = await supabase
      .from('wedding_sites')
      .select('draft_render_config, render_config')
      .eq('wedding_id', weddingId)
      .single();

    if (!site) return null;

    const draftConfig = site.draft_render_config as RenderConfig | null;
    const publishedConfig = site.render_config as RenderConfig;

    const wedding = await this.getWedding(weddingId);
    if (!wedding) return null;

    if (!draftConfig) {
      return { wedding, renderConfig: publishedConfig, message: 'No changes to publish.' };
    }

    // Publish: copy draft to render_config, clear draft
    const { error } = await supabase
      .from('wedding_sites')
      .update({
        render_config: draftConfig,
        draft_render_config: null,
        draft_updated_at: null,
        last_published_at: new Date().toISOString(),
        preview_status: 'published',
      })
      .eq('wedding_id', weddingId);

    if (error) {
      this.logger.error('Failed to publish draft', error);
      throw new Error('Failed to publish draft');
    }

    return { wedding, renderConfig: draftConfig, message: 'Changes published successfully.' };
  }

  /**
   * Discard draft changes
   */
  async discardDraft(weddingId: string): Promise<{ wedding: Wedding; renderConfig: RenderConfig; message: string } | null> {
    const supabase = getSupabaseClient();

    const { data: site } = await supabase
      .from('wedding_sites')
      .select('render_config')
      .eq('wedding_id', weddingId)
      .single();

    if (!site) return null;

    const wedding = await this.getWedding(weddingId);
    if (!wedding) return null;

    // Clear draft
    await supabase
      .from('wedding_sites')
      .update({
        draft_render_config: null,
        draft_updated_at: null,
      })
      .eq('wedding_id', weddingId);

    return {
      wedding,
      renderConfig: site.render_config as RenderConfig,
      message: 'Changes discarded.',
    };
  }

  /**
   * Update wedding features
   */
  async updateFeatures(
    weddingId: string,
    features: Partial<Record<FeatureFlag, boolean>>,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const supabase = getSupabaseClient();

    const wedding = await this.getWedding(weddingId);
    if (!wedding) return null;

    // Merge features
    const updatedFeatures = { ...wedding.features };
    for (const [flag, enabled] of Object.entries(features) as [FeatureFlag, boolean][]) {
      if (ALL_FEATURES.includes(flag)) {
        updatedFeatures[flag] = enabled;
      }
    }

    // Update wedding
    await supabase
      .from('weddings')
      .update({ features: updatedFeatures, updated_at: new Date().toISOString() })
      .eq('id', weddingId);

    // Update render config
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.features = updatedFeatures;
    config.sections = config.sections.map((section) => {
      const featureMap: Record<string, FeatureFlag> = {
        'rsvp': 'RSVP',
        'photo-upload': 'PHOTO_UPLOAD',
        'faq': 'FAQ_SECTION',
        'registry': 'REGISTRY',
        'accommodations': 'ACCOMMODATIONS',
        'guestbook': 'GUESTBOOK',
        'music-request': 'MUSIC_REQUESTS',
        'seating': 'SEATING_CHART',
        'video': 'VIDEO_EMBED',
      };
      const feature = featureMap[section.type];
      if (feature) {
        return { ...section, enabled: updatedFeatures[feature] };
      }
      return section;
    });

    await this.updateRenderConfig(weddingId, config);

    wedding.features = updatedFeatures;
    return { wedding, renderConfig: config };
  }

  /**
   * Update event details
   */
  async updateEventDetails(
    weddingId: string,
    eventDetails: EventDetailsData,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const supabase = getSupabaseClient();

    await supabase
      .from('weddings')
      .update({ event_details: eventDetails, updated_at: new Date().toISOString() })
      .eq('id', weddingId);

    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.eventDetails = eventDetails;
    config.wedding.date = eventDetails.date;
    config.wedding.venue = eventDetails.venue;
    config.wedding.city = eventDetails.city;

    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update announcement
   */
  async updateAnnouncement(
    weddingId: string,
    announcement: Announcement,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.announcement = announcement;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update FAQ
   */
  async updateFaq(
    weddingId: string,
    faq: FaqConfig,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.faq = faq;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update meal config
   */
  async updateMealConfig(
    weddingId: string,
    mealConfig: MealConfig,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const supabase = getSupabaseClient();

    await supabase
      .from('weddings')
      .update({ meal_config: mealConfig, updated_at: new Date().toISOString() })
      .eq('id', weddingId);

    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.mealConfig = mealConfig.enabled ? mealConfig : undefined;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update passcode
   */
  async updatePasscode(
    weddingId: string,
    enabled: boolean,
    passcode?: string,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const supabase = getSupabaseClient();
    const wedding = await this.getWedding(weddingId);
    if (!wedding) return null;

    let passcodeConfig: PasscodeConfigBase;

    if (enabled && passcode) {
      const passcodeHash = await hashPasscode(passcode);
      passcodeConfig = { enabled: true, passcodeHash };
    } else if (enabled && wedding.passcodeConfig?.passcodeHash) {
      passcodeConfig = { enabled: true, passcodeHash: wedding.passcodeConfig.passcodeHash };
    } else {
      passcodeConfig = { enabled: false, passcodeHash: wedding.passcodeConfig?.passcodeHash };
    }

    await supabase
      .from('weddings')
      .update({ passcode_config: passcodeConfig, updated_at: new Date().toISOString() })
      .eq('id', weddingId);

    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.passcodeProtected = enabled && !!passcodeConfig.passcodeHash;
    await this.updateRenderConfig(weddingId, config);

    const updatedWedding = await this.getWedding(weddingId);
    return updatedWedding ? { wedding: updatedWedding, renderConfig: config } : null;
  }

  /**
   * Verify wedding passcode
   */
  async verifyWeddingPasscode(slug: string, passcode: string): Promise<boolean> {
    const wedding = await this.getWeddingBySlug(slug);
    if (!wedding) return false;
    if (!wedding.passcodeConfig?.enabled || !wedding.passcodeConfig?.passcodeHash) return false;
    return verifyPasscode(passcode, wedding.passcodeConfig.passcodeHash);
  }

  /**
   * Check if passcode is required
   */
  async isPasscodeRequired(slug: string): Promise<boolean> {
    const wedding = await this.getWeddingBySlug(slug);
    if (!wedding) return false;
    return !!(
      wedding.features.PASSCODE_SITE &&
      wedding.passcodeConfig?.enabled &&
      wedding.passcodeConfig?.passcodeHash
    );
  }

  // Template methods (no database needed)
  getTemplates(): Template[] {
    return TEMPLATES;
  }

  getTemplate(templateId: string): Template | null {
    return TEMPLATES.find((t) => t.id === templateId) || null;
  }

  async changeTemplate(weddingId: string, templateId: string): Promise<RenderConfig | null> {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.templateId = template.id;
    config.theme = template.defaultTheme;
    await this.updateRenderConfig(weddingId, config);

    return config;
  }

  // Preview status
  async getPreviewStatus(weddingId: string): Promise<PreviewStatus | null> {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('wedding_sites')
      .select('draft_render_config, render_config, draft_updated_at, last_published_at')
      .eq('wedding_id', weddingId)
      .single();

    if (!data) return null;

    const hasDraftChanges = !!data.draft_render_config &&
      JSON.stringify(data.draft_render_config) !== JSON.stringify(data.render_config);

    return {
      hasDraftChanges,
      draftUpdatedAt: data.draft_updated_at,
      lastPublishedAt: data.last_published_at,
    };
  }

  // Language support
  private static readonly SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
  ];

  getSupportedLanguages() {
    return WeddingService.SUPPORTED_LANGUAGES;
  }

  isValidLanguage(language: string): boolean {
    return WeddingService.SUPPORTED_LANGUAGES.some((l) => l.code === language);
  }

  async updateLanguage(weddingId: string, language: string): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    if (!this.isValidLanguage(language)) return null;

    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.language = language;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  // Video parsing helper
  parseVideoUrl(url: string): { platform: VideoEmbedPlatform; videoId: string } | null {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')) {
        let videoId: string | null = null;
        if (parsedUrl.hostname === 'youtu.be') {
          videoId = parsedUrl.pathname.slice(1);
        } else if (parsedUrl.pathname.includes('/watch')) {
          videoId = parsedUrl.searchParams.get('v');
        } else if (parsedUrl.pathname.includes('/embed/')) {
          videoId = parsedUrl.pathname.split('/embed/')[1]?.split('?')[0];
        }
        if (videoId && videoId.length === 11) {
          return { platform: 'youtube', videoId };
        }
      }

      if (parsedUrl.hostname.includes('vimeo.com')) {
        const videoId = parsedUrl.pathname.slice(1).split('/')[0];
        if (videoId && /^\d+$/.test(videoId)) {
          return { platform: 'vimeo', videoId };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  // Custom domain methods
  async getWeddingByCustomDomain(domain: string): Promise<Wedding | null> {
    const supabase = getSupabaseClient();
    const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

    const { data } = await supabase
      .from('weddings')
      .select('*')
      .contains('custom_domain_config', { domain: normalizedDomain, status: 'active' });

    if (!data || data.length === 0) return null;
    return this.dbWeddingToWedding(data[0] as DbWedding);
  }

  // Placeholder for session processing (used by billing webhook)
  private processedSessions = new Set<string>();

  isSessionProcessed(sessionId: string): boolean {
    return this.processedSessions.has(sessionId);
  }

  markSessionProcessed(sessionId: string): void {
    this.processedSessions.add(sessionId);
  }

  /**
   * Update guestbook config in render_config
   */
  async updateGuestbookConfig(
    weddingId: string,
    guestbook: GuestbookConfig,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.guestbook = guestbook;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update photo moderation settings
   */
  async updatePhotoModeration(
    weddingId: string,
    moderationRequired: boolean,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const supabase = getSupabaseClient();

    await supabase
      .from('weddings')
      .update({
        photo_moderation_config: { moderationRequired },
        updated_at: new Date().toISOString(),
      })
      .eq('id', weddingId);

    const wedding = await this.getWedding(weddingId);
    if (!wedding) return null;

    const config = await this.getDraftRenderConfig(weddingId);
    return config ? { wedding, renderConfig: config } : null;
  }

  /**
   * Check if photo moderation is required for a wedding
   */
  async isPhotoModerationRequired(weddingId: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('weddings')
      .select('photo_moderation_config')
      .eq('id', weddingId)
      .single();

    if (!data || !data.photo_moderation_config) return false;
    return (data.photo_moderation_config as { moderationRequired?: boolean }).moderationRequired ?? false;
  }

  /**
   * Update registry config
   */
  async updateRegistry(
    weddingId: string,
    registry: RegistryConfig,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.registry = registry;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update accommodations config
   */
  async updateAccommodations(
    weddingId: string,
    accommodations: AccommodationsConfig,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.accommodations = accommodations;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update gallery config
   */
  async updateGallery(
    weddingId: string,
    gallery: GalleryConfig,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.gallery = gallery;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update video config
   */
  async updateVideo(
    weddingId: string,
    video: VideoConfig,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.video = video;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update hero content
   */
  async updateHeroContent(
    weddingId: string,
    heroContent: HeroContentData,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    // Update hero section in sections array
    config.sections = config.sections.map((section) => {
      if (section.type === 'hero') {
        const nextData: Record<string, unknown> = {
          ...section.data,
          headline: heroContent.headline,
        };

        if ('subheadline' in heroContent) {
          nextData.subheadline = heroContent.subheadline;
        }
        if ('invitationStyle' in heroContent) {
          nextData.invitationStyle = heroContent.invitationStyle;
        }
        if ('invitationMessage' in heroContent) {
          nextData.invitationMessage = heroContent.invitationMessage;
        }
        if ('showDate' in heroContent) {
          nextData.showDate = heroContent.showDate;
        }

        return {
          ...section,
          data: nextData,
        };
      }
      return section;
    });

    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update social/OG image config
   */
  async updateSocialConfig(
    weddingId: string,
    socialConfig: SocialConfig,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.ogImageUrl = socialConfig.ogImageUrl;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update theme
   */
  async updateTheme(
    weddingId: string,
    theme: Theme,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.theme = theme;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update seating config
   */
  async updateSeating(
    weddingId: string,
    seating: SeatingConfig,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.seating = seating;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  // Alias for backwards compatibility
  async updateSeatingConfig(
    weddingId: string,
    seating: SeatingConfig,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    return this.updateSeating(weddingId, seating);
  }

  /**
   * Check if wedding has unpublished draft changes
   */
  async hasDraftChanges(weddingId: string): Promise<boolean> {
    const status = await this.getPreviewStatus(weddingId);
    return status?.hasDraftChanges ?? false;
  }

  /**
   * Update email templates for a wedding
   */
  async updateEmailTemplates(
    weddingId: string,
    emailTemplates: EmailTemplatesConfig,
  ): Promise<{ wedding: Wedding } | null> {
    const supabase = getSupabaseClient();

    await supabase
      .from('weddings')
      .update({
        email_templates: emailTemplates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', weddingId);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding } : null;
  }

  /**
   * Get custom domain config for a wedding
   */
  async getCustomDomain(weddingId: string): Promise<{
    customDomain: CustomDomainConfig | null;
    defaultDomainUrl: string;
    customDomainUrl?: string;
  } | null> {
    const wedding = await this.getWedding(weddingId);
    if (!wedding) return null;

    const baseDomain = process.env.NETLIFY_SITE_DOMAIN || 'wedding-bestie.netlify.app';
    const defaultDomainUrl = `https://${baseDomain}/w/${wedding.slug}`;

    return {
      customDomain: wedding.customDomain ?? null,
      defaultDomainUrl,
      customDomainUrl: wedding.customDomain?.status === 'active'
        ? `https://${wedding.customDomain.domain}`
        : undefined,
    };
  }

  /**
   * Add a custom domain to a wedding
   */
  async addCustomDomain(
    weddingId: string,
    domain: string,
  ): Promise<{ customDomain: CustomDomainConfig; instructions: string } | null> {
    const supabase = getSupabaseClient();
    const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

    const verificationToken = generateVerificationToken(weddingId, normalizedDomain);
    const customDomain: CustomDomainConfig = {
      domain: normalizedDomain,
      status: 'pending',
      verificationToken,
      dnsRecords: [
        { type: 'CNAME', name: normalizedDomain, value: process.env.CUSTOM_DOMAIN_CNAME_TARGET || 'wedding-bestie.netlify.app', verified: false },
        { type: 'TXT', name: `_everbloom.${normalizedDomain}`, value: verificationToken, verified: false },
      ],
      addedAt: new Date().toISOString(),
    };

    await supabase
      .from('weddings')
      .update({
        custom_domain_config: customDomain,
        updated_at: new Date().toISOString(),
      })
      .eq('id', weddingId);

    return {
      customDomain,
      instructions: `Add the following DNS records to verify domain ownership:\n1. CNAME record: ${normalizedDomain} -> ${customDomain.dnsRecords[0].value}\n2. TXT record: _verify.${normalizedDomain} -> ${verificationToken}`,
    };
  }

  /**
   * Verify custom domain DNS records
   */
  async verifyCustomDomain(weddingId: string): Promise<{
    customDomain: CustomDomainConfig;
    allRecordsVerified: boolean;
    message: string;
  } | null> {
    const supabase = getSupabaseClient();
    const wedding = await this.getWedding(weddingId);

    if (!wedding?.customDomain) return null;

    const customDomain = { ...wedding.customDomain };
    const expectedTxtValue = customDomain.verificationToken || generateVerificationToken(weddingId, customDomain.domain);

    // Check DNS records
    const verificationResult = await verifyDnsRecords(customDomain.domain, expectedTxtValue);

    // Update individual record statuses
    customDomain.dnsRecords = customDomain.dnsRecords.map((record) => {
      if (record.type === 'CNAME') {
        return { ...record, verified: verificationResult.cnameVerified };
      }
      if (record.type === 'TXT') {
        return { ...record, verified: verificationResult.txtVerified };
      }
      return record;
    });

    const allVerified = verificationResult.cnameVerified && verificationResult.txtVerified;

    if (allVerified && customDomain.status === 'pending') {
      customDomain.status = 'verifying';
      customDomain.verifiedAt = new Date().toISOString();
    }

    if (allVerified && customDomain.status === 'verifying') {
      customDomain.status = 'active';
      customDomain.sslProvisionedAt = new Date().toISOString();
    }

    await supabase
      .from('weddings')
      .update({
        custom_domain_config: customDomain,
        updated_at: new Date().toISOString(),
      })
      .eq('id', weddingId);

    return {
      customDomain,
      allRecordsVerified: allVerified,
      message: allVerified ? 'Domain verified and active.' : 'DNS records not yet verified. Please check your DNS configuration.',
    };
  }

  /**
   * Remove custom domain from a wedding
   */
  async removeCustomDomain(weddingId: string): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabaseClient();

    await supabase
      .from('weddings')
      .update({
        custom_domain_config: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', weddingId);

    return { success: true, message: 'Custom domain removed.' };
  }

  /**
   * Get gallery config from render_config
   */
  async getGallery(weddingId: string): Promise<GalleryConfig | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    return config?.gallery ?? { photos: [] };
  }

  /**
   * Add a photo to the gallery
   */
  async addGalleryPhoto(
    weddingId: string,
    photo: GalleryPhoto,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    const gallery = config.gallery ?? { photos: [] };
    gallery.photos.push(photo);
    config.gallery = gallery;

    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update a gallery photo
   */
  async updateGalleryPhoto(
    weddingId: string,
    photoId: string,
    updates: Partial<GalleryPhoto>,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    const gallery = config.gallery ?? { photos: [] };
    const photoIndex = gallery.photos.findIndex((p) => p.id === photoId);
    if (photoIndex === -1) return null;

    gallery.photos[photoIndex] = { ...gallery.photos[photoIndex], ...updates };
    config.gallery = gallery;

    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Remove a photo from the gallery
   */
  async removeGalleryPhoto(
    weddingId: string,
    photoId: string,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    const gallery = config.gallery ?? { photos: [] };
    gallery.photos = gallery.photos.filter((p) => p.id !== photoId);
    config.gallery = gallery;

    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Get video config from render_config
   */
  async getVideo(weddingId: string): Promise<VideoConfig | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    return config?.video ?? { videos: [] };
  }

  /**
   * Add a video embed
   */
  async addVideo(
    weddingId: string,
    video: VideoEmbed,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    const videoConfig = config.video ?? { videos: [] };
    videoConfig.videos.push(video);
    config.video = videoConfig;

    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Update a video embed
   */
  async updateVideoEmbed(
    weddingId: string,
    videoId: string,
    updates: Partial<VideoEmbed>,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    const videoConfig = config.video ?? { videos: [] };
    const videoIndex = videoConfig.videos.findIndex((v) => v.id === videoId);
    if (videoIndex === -1) return null;

    videoConfig.videos[videoIndex] = { ...videoConfig.videos[videoIndex], ...updates };
    config.video = videoConfig;

    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Remove a video embed
   */
  async removeVideo(
    weddingId: string,
    videoId: string,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    const videoConfig = config.video ?? { videos: [] };
    videoConfig.videos = videoConfig.videos.filter((v) => v.id !== videoId);
    config.video = videoConfig;

    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Get social/OG config from render_config
   */
  async getSocialConfig(weddingId: string): Promise<SocialConfig | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;
    return { ogImageUrl: config.ogImageUrl };
  }

  /**
   * Remove OG image from social config
   */
  async removeSocialOgImage(
    weddingId: string,
  ): Promise<{ wedding: Wedding; renderConfig: RenderConfig } | null> {
    const config = await this.getDraftRenderConfig(weddingId);
    if (!config) return null;

    config.ogImageUrl = undefined;
    await this.updateRenderConfig(weddingId, config);

    const wedding = await this.getWedding(weddingId);
    return wedding ? { wedding, renderConfig: config } : null;
  }

  /**
   * Get the published (not draft) render_config
   */
  async getPublishedRenderConfig(weddingId: string): Promise<RenderConfig | null> {
    return this.getRenderConfig(weddingId);
  }
}
