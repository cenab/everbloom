// Types for platform-api service

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
 * Request to change a wedding's template
 */
export interface ChangeTemplateRequest {
  templateId: string;
}

/**
 * Response after changing template
 */
export interface ChangeTemplateResponse {
  renderConfig: RenderConfig;
}

/**
 * Response for listing available templates
 */
export interface TemplatesListResponse {
  templates: Template[];
}

/**
 * Template not found error code
 */
export const TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND' as const;

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
  /** Whether passcode protection is enabled (hash is never exposed) */
  passcodeProtected?: boolean;
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
 * Feature disabled error code
 */
export const FEATURE_DISABLED = 'FEATURE_DISABLED' as const;

/**
 * Invalid token error code
 */
export const INVALID_TOKEN = 'INVALID_TOKEN' as const;

/**
 * Invalid or expired magic link error code
 */
export const MAGIC_LINK_INVALID = 'MAGIC_LINK_INVALID' as const;

/**
 * Magic link expired error code
 */
export const MAGIC_LINK_EXPIRED = 'MAGIC_LINK_EXPIRED' as const;

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
 * Request body for magic link request
 */
export interface MagicLinkRequestBody {
  email: string;
}

/**
 * Response for magic link request
 */
export interface MagicLinkRequestResponse {
  message: string;
}

/**
 * Request body for magic link verification
 */
export interface MagicLinkVerifyBody {
  token: string;
}

/**
 * Response for magic link verification - returns session
 */
export type MagicLinkVerifyResponse = AuthSession;

/**
 * Response for current user endpoint
 */
export type MeResponse = User;

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
 * Request body for creating a checkout session
 */
export interface CreateCheckoutSessionRequest {
  planId: PlanTier;
  weddingName: string;
  partnerNames: [string, string];
  features?: Partial<Record<FeatureFlag, boolean>>;
}

/**
 * Response for checkout session creation
 */
export interface CreateCheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

/**
 * Checkout session creation failed error code
 */
export const CHECKOUT_SESSION_FAILED = 'CHECKOUT_SESSION_FAILED' as const;

/**
 * Webhook signature verification failed error code
 */
export const WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID' as const;

// ============================================================================
// Wedding Types
// ============================================================================

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
 * Event details for calendar invites (forward declaration for Wedding)
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
 * Passcode protection configuration for a wedding site (forward declaration)
 */
export interface PasscodeConfigBase {
  enabled: boolean;
  /** bcrypt hash of the passcode - raw passcode is never stored */
  passcodeHash?: string;
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
  passcodeConfig?: PasscodeConfigBase;
  createdAt: string;
  updatedAt: string;
}

/**
 * Wedding creation payload (from checkout metadata)
 */
export interface CreateWeddingPayload {
  userId: string;
  planId: PlanTier;
  weddingName: string;
  partnerNames: [string, string];
  stripeSessionId: string;
  features?: Partial<Record<FeatureFlag, boolean>>;
}

/**
 * Wedding provisioning response
 */
export interface WeddingProvisionResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

/**
 * Request to update feature flags for a wedding
 */
export interface UpdateFeaturesRequest {
  features: Partial<Record<FeatureFlag, boolean>>;
}

/**
 * Response after updating feature flags
 */
export interface UpdateFeaturesResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

/**
 * Request to update announcement banner for a wedding
 */
export interface UpdateAnnouncementRequest {
  announcement: Announcement;
}

/**
 * Response after updating announcement banner
 */
export interface UpdateAnnouncementResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

/**
 * Request to update FAQ items for a wedding
 */
export interface UpdateFaqRequest {
  faq: FaqConfig;
}

/**
 * Response after updating FAQ items
 */
export interface UpdateFaqResponse {
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
 *
 * Security: rsvpTokenHash stores the SHA-256 hash of the RSVP token.
 * The raw token is only returned at creation time and when sending emails.
 * It is never stored in plaintext - only the hash is persisted.
 */
export interface Guest {
  id: string;
  weddingId: string;
  name: string;
  email: string;
  partySize: number;
  rsvpStatus: RsvpStatus;
  dietaryNotes?: string;
  /** SHA-256 hash of the RSVP token - raw token is never stored */
  rsvpTokenHash?: string;
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
 * Request body for updating a guest
 */
export interface UpdateGuestRequest {
  name?: string;
  email?: string;
  partySize?: number;
  dietaryNotes?: string;
}

/**
 * Guest list response
 */
export interface GuestListResponse {
  guests: Guest[];
  total: number;
}

/**
 * Guest not found error code
 */
export const GUEST_NOT_FOUND = 'GUEST_NOT_FOUND' as const;

/**
 * Guest already exists (duplicate email) error code
 */
export const GUEST_ALREADY_EXISTS = 'GUEST_ALREADY_EXISTS' as const;

/**
 * Wedding not found error code
 */
export const WEDDING_NOT_FOUND = 'WEDDING_NOT_FOUND' as const;

// ============================================================================
// RSVP View Types (Guest-Facing)
// ============================================================================

/**
 * Guest data for RSVP view (subset of full Guest, excludes sensitive fields)
 */
export interface RsvpGuestView {
  id: string;
  name: string;
  email: string;
  partySize: number;
  rsvpStatus: RsvpStatus;
  dietaryNotes?: string;
}

/**
 * Wedding data for RSVP view (minimal needed for display)
 */
export interface RsvpWeddingView {
  slug: string;
  partnerNames: [string, string];
  date?: string;
  venue?: string;
  city?: string;
}

/**
 * Response from RSVP view endpoint
 */
export interface RsvpViewData {
  guest: RsvpGuestView;
  wedding: RsvpWeddingView;
  theme: Theme;
}

/**
 * Request body for RSVP submission
 */
export interface RsvpSubmitRequest {
  token: string;
  rsvpStatus: RsvpStatus;
  partySize: number;
  dietaryNotes?: string;
}

/**
 * Response from RSVP submission
 */
export interface RsvpSubmitResponse {
  message: string;
  guest: RsvpGuestView;
}

// ============================================================================
// Photo Upload Types (Guest-Facing)
// ============================================================================

/**
 * Request body for creating a signed upload URL
 */
export interface PhotoUploadUrlRequest {
  slug: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

/**
 * Response containing a signed upload URL for photo upload
 */
export interface PhotoUploadUrlResponse {
  uploadId: string;
  uploadUrl: string;
  expiresAt: string;
}

/**
 * Response after uploading a photo to the signed URL
 */
export interface PhotoUploadResponse {
  uploadId: string;
}

/**
 * Photo upload validation error code
 */
export const PHOTO_UPLOAD_VALIDATION_ERROR = 'PHOTO_UPLOAD_VALIDATION_ERROR' as const;

/**
 * Invalid or expired photo upload URL
 */
export const PHOTO_UPLOAD_INVALID = 'PHOTO_UPLOAD_INVALID' as const;

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
 * Request body for CSV import
 */
export interface CsvImportRequest {
  guests: CsvGuestRow[];
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

/**
 * CSV import validation error code
 */
export const CSV_IMPORT_VALIDATION_ERROR = 'CSV_IMPORT_VALIDATION_ERROR' as const;

// ============================================================================
// Invitation/Email Types
// ============================================================================

/**
 * Email status in the email_outbox
 */
export type EmailStatus = 'pending' | 'sent' | 'failed';

/**
 * Email type identifier
 */
export type EmailType = 'invitation' | 'reminder' | 'update';

/**
 * Email outbox record for tracking sent emails
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
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body for sending invitations
 */
export interface SendInvitationsRequest {
  guestIds: string[];
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

/**
 * Request body for sending RSVP reminders
 */
export interface SendRemindersRequest {
  guestIds?: string[];
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
  };
}

/**
 * Response from email statistics endpoint
 */
export interface EmailStatisticsResponse {
  statistics: EmailStatistics;
}

/**
 * Response from send reminders endpoint
 */
export interface SendRemindersResponse {
  queued: number;
  total: number;
  guestIds: string[];
  jobIds: string[];
}

/**
 * Reminder job payload for the worker queue
 */
export interface ReminderJobData {
  outboxId: string;
  weddingId: string;
  guestId: string;
  toEmail: string;
  toName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Outbox status update payload (worker -> platform API)
 */
export interface UpdateOutboxStatusRequest {
  status: EmailStatus;
  errorMessage?: string;
}

/**
 * Email sending failed error code
 */
export const EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED' as const;

/**
 * No guests selected for invitation error code
 */
export const NO_GUESTS_SELECTED = 'NO_GUESTS_SELECTED' as const;

/**
 * Reminder queue enqueue failed error code
 */
export const REMINDER_QUEUE_FAILED = 'REMINDER_QUEUE_FAILED' as const;

/**
 * Queue name for reminder emails
 */
export const REMINDER_QUEUE_NAME = 'email-reminders' as const;

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
 * Request to update hero section content
 */
export interface UpdateHeroContentRequest {
  heroContent: HeroContentData;
}

/**
 * Response after updating hero content
 */
export interface UpdateHeroContentResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

// ============================================================================
// Calendar Invite Types
// ============================================================================

/**
 * Request to update event details for a wedding
 */
export interface UpdateEventDetailsRequest {
  eventDetails: EventDetailsData;
}

/**
 * Response after updating event details
 */
export interface UpdateEventDetailsResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

/**
 * Response for ICS calendar file download
 */
export interface CalendarIcsResponse {
  icsContent: string;
  filename: string;
}

/**
 * Calendar invite feature disabled error code
 */
export const CALENDAR_INVITE_DISABLED = 'CALENDAR_INVITE_DISABLED' as const;

/**
 * Event details not configured error code
 */
export const EVENT_DETAILS_NOT_CONFIGURED = 'EVENT_DETAILS_NOT_CONFIGURED' as const;

// ============================================================================
// Passcode Site Protection Types
// ============================================================================

/**
 * Request to update passcode settings for a wedding
 */
export interface UpdatePasscodeRequest {
  enabled: boolean;
  /** Raw passcode to set (will be hashed before storage) */
  passcode?: string;
}

/**
 * Response after updating passcode settings
 */
export interface UpdatePasscodeResponse {
  wedding: Wedding;
  renderConfig: RenderConfig;
}

/**
 * Request body for verifying a site passcode (guest-facing)
 */
export interface VerifyPasscodeRequest {
  slug: string;
  passcode: string;
}

/**
 * Response from passcode verification
 */
export interface VerifyPasscodeResponse {
  valid: boolean;
  /** Token for session persistence (only returned if valid) */
  sessionToken?: string;
}

/**
 * Invalid passcode error code
 */
export const INVALID_PASSCODE = 'INVALID_PASSCODE' as const;

/**
 * Passcode not configured error code
 */
export const PASSCODE_NOT_CONFIGURED = 'PASSCODE_NOT_CONFIGURED' as const;

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
 * Request body for creating a tag
 */
export interface CreateTagRequest {
  name: string;
  color?: string;
}

/**
 * Request body for updating a tag
 */
export interface UpdateTagRequest {
  name?: string;
  color?: string;
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

/**
 * Tag not found error code
 */
export const TAG_NOT_FOUND = 'TAG_NOT_FOUND' as const;

/**
 * Tag already exists error code
 */
export const TAG_ALREADY_EXISTS = 'TAG_ALREADY_EXISTS' as const;

// ============================================================================
// Generic Error Codes
// ============================================================================

/**
 * Validation error code (invalid input data)
 */
export const VALIDATION_ERROR = 'VALIDATION_ERROR' as const;

/**
 * Unauthorized error code (authentication required)
 */
export const UNAUTHORIZED = 'UNAUTHORIZED' as const;

/**
 * Forbidden error code (authenticated but not authorized)
 */
export const FORBIDDEN = 'FORBIDDEN' as const;

/**
 * Not found error code (resource doesn't exist)
 */
export const NOT_FOUND = 'NOT_FOUND' as const;

/**
 * Internal server error code (unexpected errors)
 */
export const INTERNAL_ERROR = 'INTERNAL_ERROR' as const;

/**
 * All error codes as a union type for documentation
 */
export type ErrorCode =
  | typeof TEMPLATE_NOT_FOUND
  | typeof FEATURE_DISABLED
  | typeof INVALID_TOKEN
  | typeof MAGIC_LINK_INVALID
  | typeof MAGIC_LINK_EXPIRED
  | typeof CHECKOUT_SESSION_FAILED
  | typeof WEBHOOK_SIGNATURE_INVALID
  | typeof GUEST_NOT_FOUND
  | typeof GUEST_ALREADY_EXISTS
  | typeof WEDDING_NOT_FOUND
  | typeof PHOTO_UPLOAD_VALIDATION_ERROR
  | typeof PHOTO_UPLOAD_INVALID
  | typeof CSV_IMPORT_VALIDATION_ERROR
  | typeof EMAIL_SEND_FAILED
  | typeof NO_GUESTS_SELECTED
  | typeof REMINDER_QUEUE_FAILED
  | typeof CALENDAR_INVITE_DISABLED
  | typeof EVENT_DETAILS_NOT_CONFIGURED
  | typeof INVALID_PASSCODE
  | typeof PASSCODE_NOT_CONFIGURED
  | typeof TAG_NOT_FOUND
  | typeof TAG_ALREADY_EXISTS
  | typeof VALIDATION_ERROR
  | typeof UNAUTHORIZED
  | typeof FORBIDDEN
  | typeof NOT_FOUND
  | typeof INTERNAL_ERROR;
