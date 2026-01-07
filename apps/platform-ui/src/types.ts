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
  | 'PASSCODE_SITE'
  | 'REGISTRY'
  | 'ACCOMMODATIONS'
  | 'GUESTBOOK'
  | 'MUSIC_REQUESTS'
  | 'SEATING_CHART';

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

// ============================================================================
// Registry Types
// ============================================================================

/**
 * A single registry link (e.g., Amazon, Zola)
 */
export interface RegistryLink {
  id: string;
  name: string;
  url: string;
  order: number;
}

/**
 * Registry configuration for the wedding
 */
export interface RegistryConfig {
  links: RegistryLink[];
}

/**
 * Response after updating registry
 */
export interface UpdateRegistryResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

// ============================================================================
// Accommodations Types
// ============================================================================

/**
 * A single hotel recommendation
 */
export interface Hotel {
  id: string;
  name: string;
  address: string;
  bookingUrl?: string;
  roomBlockCode?: string;
  notes?: string;
  order: number;
}

/**
 * Travel information for guests
 */
export interface TravelInfo {
  airportDirections?: string;
  parkingInfo?: string;
  mapUrl?: string;
}

/**
 * Accommodations configuration for the wedding
 */
export interface AccommodationsConfig {
  hotels: Hotel[];
  travelInfo?: TravelInfo;
}

/**
 * Response after updating accommodations
 */
export interface UpdateAccommodationsResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

/**
 * Type of event in a wedding
 */
export type WeddingEventType = 'ceremony' | 'reception' | 'other';

/**
 * A single event within a wedding (ceremony, reception, etc.)
 */
export interface WeddingEvent {
  id: string;
  type: WeddingEventType;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  address: string;
  city: string;
  timezone?: string;
}

/**
 * Event details for calendar invites
 * Supports both single-event (legacy) and multi-event configurations
 */
export interface EventDetailsData {
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  address: string;
  city: string;
  timezone?: string;
  /** Array of individual events (ceremony, reception, etc.) */
  events?: WeddingEvent[];
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
  mealConfig?: MealConfig;
  registry?: RegistryConfig;
  accommodations?: AccommodationsConfig;
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
  mealConfig?: MealConfig;
  registry?: RegistryConfig;
  accommodations?: AccommodationsConfig;
  emailTemplates?: EmailTemplatesConfig;
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
 * Plus-one guest details submitted during RSVP
 */
export interface PlusOneGuest {
  name: string;
  dietaryNotes?: string;
  /** Selected meal option ID (if meal selection is enabled) */
  mealOptionId?: string;
}

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
  /** Plus-one allowance: 0 = no plus-ones, positive number = allowed plus-ones */
  plusOneAllowance?: number;
  /** Plus-one guest details submitted during RSVP */
  plusOneGuests?: PlusOneGuest[];
  /** Selected meal option ID for the primary guest (if meal selection is enabled) */
  mealOptionId?: string;
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
  plusOneAllowance?: number;
}

/**
 * Request body for updating a guest
 */
export interface UpdateGuestRequest {
  name?: string;
  email?: string;
  partySize?: number;
  dietaryNotes?: string;
  plusOneAllowance?: number;
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
 * Email delivery status
 * - pending: Email queued but not yet sent
 * - sent: Email accepted by SendGrid (may not yet be delivered)
 * - delivered: Email confirmed delivered to recipient's mailbox
 * - bounced: Email bounced (hard or soft bounce)
 * - failed: Email send failed (API error or rejected)
 */
export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';

/**
 * Type of email sent
 */
export type EmailType = 'invitation' | 'reminder' | 'save_the_date' | 'thank_you' | 'update';

/**
 * Bounce type from email provider webhooks
 */
export type BounceType = 'hard' | 'soft';

/**
 * Email outbox record for tracking email delivery
 */
export interface EmailOutbox {
  id: string;
  weddingId: string;
  guestId: string;
  emailType: EmailType;
  status: EmailStatus;
  toEmail: string;
  toName: string;
  subject: string;
  sentAt?: string;
  /** Timestamp when email was delivered (from webhook) */
  deliveredAt?: string;
  /** Timestamp when bounce occurred (from webhook) */
  bouncedAt?: string;
  /** Type of bounce (hard = permanent, soft = temporary) */
  bounceType?: BounceType;
  /** Bounce reason (e.g., "invalid_email", "mailbox_unavailable") */
  bounceReason?: string;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response from email outbox endpoint
 */
export interface EmailOutboxResponse {
  emails: EmailOutbox[];
}

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
// Save-the-Date Email Types
// ============================================================================

/**
 * Request to send save-the-date emails
 */
export interface SendSaveTheDateRequest {
  guestIds: string[];
}

/**
 * Result of sending a single save-the-date email
 */
export interface SendSaveTheDateResult {
  guestId: string;
  guestName: string;
  email: string;
  success: boolean;
  error?: string;
}

/**
 * Response from send save-the-date endpoint
 */
export interface SendSaveTheDateResponse {
  sent: number;
  failed: number;
  total: number;
  results: SendSaveTheDateResult[];
}

// ============================================================================
// Thank-You Email Types
// ============================================================================

/**
 * Request to send thank-you emails
 */
export interface SendThankYouRequest {
  guestIds: string[];
}

/**
 * Result of sending a single thank-you email
 */
export interface SendThankYouResult {
  guestId: string;
  guestName: string;
  email: string;
  success: boolean;
  error?: string;
}

/**
 * Response from send thank-you endpoint
 */
export interface SendThankYouResponse {
  sent: number;
  failed: number;
  total: number;
  results: SendThankYouResult[];
}

// ============================================================================
// Email Statistics Types (Admin Dashboard)
// ============================================================================

/**
 * Email delivery statistics for admin dashboard
 * PRD: "Dashboard shows email delivery statistics"
 */
export interface EmailStatistics {
  totalSent: number;
  delivered: number;
  failed: number;
  pending: number;
  /** Open rate - percentage of delivered emails that were opened (if tracking enabled) */
  openRate?: number;
  /** Breakdown by email type */
  byType: {
    invitation: { sent: number; delivered: number; failed: number };
    reminder: { sent: number; delivered: number; failed: number };
    save_the_date: { sent: number; delivered: number; failed: number };
    thank_you: { sent: number; delivered: number; failed: number };
  };
}

/**
 * Response from email statistics endpoint
 */
export interface EmailStatisticsResponse {
  statistics: EmailStatistics;
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

/**
 * Photo summary statistics for admin dashboard
 * PRD: "Dashboard shows photo upload count"
 */
export interface PhotoSummary {
  /** Total number of photos uploaded */
  totalPhotos: number;
  /** Total size of all photos in bytes */
  totalSizeBytes: number;
  /** ISO timestamp of the most recent upload, if any */
  lastUploadedAt?: string;
  /** Recent uploads (last 5) for dashboard preview */
  recentUploads: PhotoMetadata[];
}

/**
 * Response from photo summary endpoint
 */
export interface PhotoSummaryResponse {
  summary: PhotoSummary;
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
// Meal Options Types
// ============================================================================

/**
 * A single meal option for RSVP selection
 */
export interface MealOption {
  id: string;
  name: string;
  description?: string;
  order: number;
}

/**
 * Meal configuration for a wedding
 */
export interface MealConfig {
  enabled: boolean;
  options: MealOption[];
}

/**
 * Meal counts breakdown by option
 */
export interface MealCounts {
  byOption: Record<string, number>;
  total: number;
  noSelection: number;
}

/**
 * Meal summary for admin dashboard
 */
export interface MealSummary {
  counts: MealCounts;
  dietaryNotes: Array<{ guestName: string; notes: string }>;
}

/**
 * Response from meal summary endpoint
 */
export interface MealSummaryResponse {
  summary: MealSummary;
}

/**
 * Request to update meal options configuration
 */
export interface UpdateMealOptionsRequest {
  mealConfig: MealConfig;
}

/**
 * Response after updating meal options
 */
export interface UpdateMealOptionsResponse {
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

// ============================================================================
// Guestbook Types
// ============================================================================

/**
 * Guestbook message status
 */
export type GuestbookMessageStatus = 'pending' | 'approved' | 'rejected';

/**
 * A single guestbook message from a guest
 */
export interface GuestbookMessage {
  id: string;
  weddingId: string;
  guestName: string;
  message: string;
  status: GuestbookMessageStatus;
  createdAt: string;
  moderatedAt?: string;
}

/**
 * Response from guestbook messages list
 */
export interface GuestbookMessagesResponse {
  messages: GuestbookMessage[];
}

/**
 * Guestbook summary for dashboard
 */
export interface GuestbookSummaryResponse {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// ============================================================================
// Music Requests Types
// ============================================================================

/**
 * A single song request from a guest
 */
export interface SongRequest {
  id: string;
  weddingId: string;
  songTitle: string;
  artistName: string;
  requesterName?: string;
  createdAt: string;
}

/**
 * Response from listing song requests
 */
export interface SongRequestListResponse {
  songRequests: SongRequest[];
  total: number;
}

// ============================================================================
// Seating Management Types
// ============================================================================

/**
 * A table in the seating arrangement
 */
export interface SeatingTable {
  id: string;
  weddingId: string;
  name: string;
  capacity: number;
  notes?: string;
  order: number;
  createdAt: string;
}

/**
 * Seating configuration for display
 */
export interface SeatingConfig {
  tables: Array<{
    id: string;
    name: string;
    capacity: number;
    notes?: string;
    order: number;
    guests: Array<{
      name: string;
      seatNumber?: number;
    }>;
  }>;
}

/**
 * Request to create a new table
 */
export interface CreateTableRequest {
  name: string;
  capacity: number;
  notes?: string;
}

/**
 * Request to update a table
 */
export interface UpdateTableRequest {
  name?: string;
  capacity?: number;
  notes?: string;
}

/**
 * Request to assign guests to a table
 */
export interface AssignGuestsToTableRequest {
  guestIds: string[];
  tableId: string;
}

/**
 * Response containing table list
 */
export interface TableListResponse {
  tables: SeatingTable[];
}

/**
 * Response containing all tables with their guests
 */
export interface SeatingOverviewResponse {
  tables: Array<{
    table: SeatingTable;
    guests: Array<{
      id: string;
      name: string;
      seatNumber?: number;
    }>;
    availableSeats: number;
  }>;
  unassignedGuests: Array<{
    id: string;
    name: string;
  }>;
  summary: {
    totalTables: number;
    totalCapacity: number;
    totalAssigned: number;
    totalUnassigned: number;
  };
}

// ============================================================================
// Email Template Types (Customization)
// PRD: "Admin can customize invitation email content"
// ============================================================================

/**
 * A single email template for a specific email type
 */
export interface EmailTemplateContent {
  /** Custom subject line (supports merge fields) */
  subject: string;
  /** Custom body text (supports merge fields, used for plain text email) */
  bodyText: string;
  /** Custom greeting (e.g., "Dear {{guest_name}}," or "Hi {{guest_name}},") */
  greeting?: string;
  /** Custom closing (e.g., "With love," or "Warmly,") */
  closing?: string;
}

/**
 * Email templates configuration for a wedding
 * Each email type can have its own customized template
 */
export interface EmailTemplatesConfig {
  /** Custom invitation email template */
  invitation?: EmailTemplateContent;
  /** Custom reminder email template */
  reminder?: EmailTemplateContent;
  /** Custom save-the-date email template */
  saveTheDate?: EmailTemplateContent;
  /** Custom thank-you email template (for attendees) */
  thankYouAttended?: EmailTemplateContent;
  /** Custom thank-you email template (for non-attendees) */
  thankYouNotAttended?: EmailTemplateContent;
}

/**
 * Response after updating email templates
 */
export interface UpdateEmailTemplatesResponse {
  wedding: Wedding;
}
