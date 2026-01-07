// Shared types and utilities for wedding-bestie platform

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
 * The render_config contract - wedding site renders exclusively from this
 */
export interface RenderConfig {
  templateId: string;
  theme: Theme;
  features: Record<FeatureFlag, boolean>;
  sections: Section[];
  announcement?: Announcement;
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
}

/**
 * Wedding provisioning response
 */
export interface WeddingProvisionResponse {
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
 */
export interface Guest {
  id: string;
  weddingId: string;
  name: string;
  email: string;
  partySize: number;
  rsvpStatus: RsvpStatus;
  dietaryNotes?: string;
  rsvpToken?: string;
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
 * Email sending failed error code
 */
export const EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED' as const;

/**
 * No guests selected for invitation error code
 */
export const NO_GUESTS_SELECTED = 'NO_GUESTS_SELECTED' as const;
