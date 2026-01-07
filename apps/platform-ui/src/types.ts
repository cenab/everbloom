// Types for platform-ui app

/**
 * Feature flags that can be enabled/disabled per wedding
 */
export type FeatureFlag =
  | 'RSVP'
  | 'CALENDAR_INVITE'
  | 'PHOTO_UPLOAD'
  | 'ANNOUNCEMENT_BANNER'
  | 'FAQ_SECTION'
  | 'PASSCODE_SITE';

/**
 * Template categories matching product positioning
 */
export type TemplateCategory =
  | 'minimal'
  | 'classic'
  | 'modern'
  | 'destination'
  | 'cultural';

/**
 * Template definition for wedding site rendering
 */
export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  previewImageUrl?: string;
  defaultTheme: Theme;
}

/**
 * Theme configuration for wedding sites
 */
export interface Theme {
  primary: string;
  accent: string;
  neutralLight: string;
  neutralDark: string;
}

/**
 * Section definition for wedding site rendering
 */
export interface Section {
  id: string;
  type: string;
  enabled: boolean;
  order: number;
  data: Record<string, unknown>;
}

/**
 * Announcement banner configuration
 */
export interface Announcement {
  enabled: boolean;
  title: string;
  message: string;
}

/**
 * A single FAQ item (question and answer)
 */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

/**
 * FAQ section configuration
 */
export interface FaqConfig {
  items: FaqItem[];
}

/**
 * Event details for calendar invites
 */
export interface EventDetailsData {
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  address: string;
  city: string;
  timezone?: string;
}

/**
 * The render_config contract - wedding site renders exclusively from this
 */
export interface RenderConfig {
  templateId: string;
  theme: Theme;
  features: Record<FeatureFlag, boolean>;
  sections: Section[];
  announcement?: Announcement;
  eventDetails?: EventDetailsData;
  faq?: FaqConfig;
  wedding: {
    slug: string;
    partnerNames: [string, string];
    date?: string;
    venue?: string;
    city?: string;
  };
}

/**
 * Wedding status in the platform
 */
export type WeddingStatus = 'pending' | 'active' | 'archived';

/**
 * Standard API error response
 */
export interface ApiError {
  ok: false;
  error: string;
}

/**
 * Standard API success response
 */
export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

/**
 * Invalid or expired magic link error code
 */
export const MAGIC_LINK_INVALID = 'MAGIC_LINK_INVALID' as const;

// ============================================================================
// Auth Types
// ============================================================================

/**
 * User in the platform system
 */
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

/**
 * Auth session returned after successful magic link verification
 */
export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

/**
 * Response for magic link request
 */
export interface MagicLinkRequestResponse {
  message: string;
}

/**
 * Response for magic link verification - returns session
 */
export type MagicLinkVerifyResponse = AuthSession;

// ============================================================================
// Billing Types
// ============================================================================

/**
 * Available plan tiers
 */
export type PlanTier = 'starter' | 'premium';

/**
 * Plan details for display
 */
export interface Plan {
  id: PlanTier;
  name: string;
  priceId: string;
  features: string[];
}

/**
 * Response for checkout session creation
 */
export interface CreateCheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

// ============================================================================
// Wedding Types
// ============================================================================

/**
 * Passcode protection configuration (admin view - no hash exposed)
 */
export interface PasscodeConfig {
  enabled: boolean;
  /** Whether a passcode is currently set (hash exists) */
  hasPasscode?: boolean;
}

/**
 * Wedding record in the platform system
 */
export interface Wedding {
  id: string;
  userId: string;
  slug: string;
  name: string;
  partnerNames: [string, string];
  planId: PlanTier;
  status: WeddingStatus;
  features: Record<FeatureFlag, boolean>;
  announcement?: Announcement;
  eventDetails?: EventDetailsData;
  faq?: FaqConfig;
  passcodeConfig?: PasscodeConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response after updating feature flags
 */
export interface UpdateFeaturesResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

/**
 * Response after updating announcement banner
 */
export interface UpdateAnnouncementResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

/**
 * Response after updating FAQ
 */
export interface UpdateFaqResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

// ============================================================================
// Hero Content Types
// ============================================================================

/**
 * Hero section content data
 */
export interface HeroContentData {
  /** Main headline (typically partner names) */
  headline: string;
  /** Optional subheadline (e.g., "We're getting married!") */
  subheadline?: string;
}

/**
 * Response after updating hero content
 */
export interface UpdateHeroContentResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

// ============================================================================
// Guest Types
// ============================================================================

/**
 * RSVP status for a guest
 */
export type RsvpStatus = 'pending' | 'attending' | 'not_attending';

/**
 * Guest/invitee record in the platform system
 * Note: The RSVP token hash is never exposed to the UI for security reasons.
 * Raw tokens are only available ephemerally when sending emails.
 */
export interface Guest {
  id: string;
  weddingId: string;
  name: string;
  email: string;
  partySize: number;
  rsvpStatus: RsvpStatus;
  dietaryNotes?: string;
  /** Array of tag IDs assigned to this guest */
  tagIds?: string[];
  inviteSentAt?: string;
  rsvpSubmittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body for creating a guest
 */
export interface CreateGuestRequest {
  name: string;
  email: string;
  partySize?: number;
}

/**
 * Guest list response
 */
export interface GuestListResponse {
  guests: Guest[];
  total: number;
}

// ============================================================================
// RSVP Summary Types (Admin Dashboard)
// ============================================================================

/**
 * RSVP summary counts for admin dashboard
 */
export interface RsvpSummary {
  total: number;
  attending: number;
  notAttending: number;
  pending: number;
  totalPartySize: number;
}

/**
 * Response from RSVP summary endpoint
 */
export interface RsvpSummaryResponse {
  summary: RsvpSummary;
  guests: Guest[];
}

// ============================================================================
// CSV Import Types
// ============================================================================

/**
 * A single row from a CSV file to be imported
 */
export interface CsvGuestRow {
  name: string;
  email: string;
  partySize?: number;
}

/**
 * Result of importing a single guest
 */
export interface CsvImportRowResult {
  row: number;
  name: string;
  email: string;
  success: boolean;
  error?: string;
  guest?: Guest;
}

/**
 * Response from CSV import endpoint
 */
export interface CsvImportResponse {
  imported: number;
  skipped: number;
  total: number;
  results: CsvImportRowResult[];
}

// ============================================================================
// Invitation Types
// ============================================================================

/**
 * Result of sending a single invitation
 */
export interface SendInvitationResult {
  guestId: string;
  guestName: string;
  email: string;
  success: boolean;
  error?: string;
}

/**
 * Response from send invitations endpoint
 */
export interface SendInvitationsResponse {
  sent: number;
  failed: number;
  total: number;
  results: SendInvitationResult[];
}

// ============================================================================
// Photo Metadata Types (Admin)
// ============================================================================

/**
 * Metadata for an uploaded photo
 */
export interface PhotoMetadata {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
}

/**
 * Response from listing uploaded photos
 */
export interface PhotoListResponse {
  photos: PhotoMetadata[];
}

// ============================================================================
// Passcode Types
// ============================================================================

/**
 * Response after updating passcode settings
 */
export interface UpdatePasscodeResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

// ============================================================================
// Guest Tag Types (Segmentation)
// ============================================================================

/**
 * A tag for organizing and segmenting guests
 */
export interface GuestTag {
  id: string;
  weddingId: string;
  name: string;
  color: string;
  createdAt: string;
}

/**
 * Response containing tag list
 */
export interface TagListResponse {
  tags: GuestTag[];
}

/**
 * Request to assign/remove tags from guests
 */
export interface AssignTagsRequest {
  guestIds: string[];
  tagIds: string[];
}
