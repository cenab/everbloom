// Types for wedding-site app

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
  | 'SEATING_CHART'
  | 'VIDEO_EMBED';

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

// ============================================================================
// Accommodations Types
// ============================================================================

/**
 * A single hotel/accommodation recommendation
 */
export interface Hotel {
  id: string;
  name: string;
  address: string;
  bookingUrl?: string;
  /** Room block code for group discounts */
  roomBlockCode?: string;
  /** Optional notes (e.g., "10 min walk from venue") */
  notes?: string;
  order: number;
}

/**
 * Travel/transportation directions
 */
export interface TravelInfo {
  /** Directions from airport (e.g., "Take I-95 South...") */
  airportDirections?: string;
  /** Parking information */
  parkingInfo?: string;
  /** Google Maps or embed URL */
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
  /** Accommodations and travel info */
  accommodations?: AccommodationsConfig;
  /** Guestbook messages (approved only) */
  guestbook?: GuestbookConfig;
  /** Seating chart configuration */
  seating?: SeatingConfig;
  /** Admin-curated photo gallery */
  gallery?: GalleryConfig;
  /** Video embeds configuration */
  video?: VideoConfig;
  /** Whether passcode protection is enabled (hash is never exposed) */
  passcodeProtected?: boolean;
  /** Custom OG image URL for social sharing (PRD: "Admin can customize share image") */
  ogImageUrl?: string;
  /** Site language for i18n (PRD: "Admin can set site language") */
  language?: string;
  wedding: {
    slug: string;
    partnerNames: [string, string];
    date?: string;
    venue?: string;
    city?: string;
  };
}

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

// ============================================================================
// RSVP Types
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
 * Guest data for RSVP view (subset of full Guest, excludes sensitive fields)
 */
export interface RsvpGuestView {
  id: string;
  name: string;
  email: string;
  partySize: number;
  rsvpStatus: RsvpStatus;
  dietaryNotes?: string;
  /** Plus-one allowance for this guest (0 = no plus-ones allowed) */
  plusOneAllowance?: number;
  /** Plus-one guest details (if previously submitted) */
  plusOneGuests?: PlusOneGuest[];
  /** Selected meal option ID for the primary guest (if meal selection is enabled) */
  mealOptionId?: string;
  /** Table assignment (if seating chart is enabled and guest is assigned) */
  tableAssignment?: GuestTableAssignment;
  /**
   * Guest has opted out of being shown in photos
   * PRD: "Guest can opt out of photo display"
   */
  photoOptOut?: boolean;
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
  /** Meal configuration if enabled for this wedding */
  mealConfig?: MealConfig;
}

/**
 * Request body for RSVP submission
 */
export interface RsvpSubmitRequest {
  token: string;
  rsvpStatus: RsvpStatus;
  partySize: number;
  dietaryNotes?: string;
  /** Plus-one guest details (names and optional dietary notes) */
  plusOneGuests?: PlusOneGuest[];
  /** Selected meal option ID for the primary guest (if meal selection is enabled) */
  mealOptionId?: string;
  /**
   * Guest opts out of being shown in photos
   * PRD: "Guest can opt out of photo display"
   */
  photoOptOut?: boolean;
}

/**
 * Response from RSVP submission
 */
export interface RsvpSubmitResponse {
  message: string;
  guest: RsvpGuestView;
}

// ============================================================================
// Passcode Types
// ============================================================================

/**
 * Response from passcode verification
 */
export interface VerifyPasscodeResponse {
  valid: boolean;
  /** Token for session persistence (only returned if valid) */
  sessionToken?: string;
}

// ============================================================================
// Guestbook Types
// ============================================================================

/**
 * Status of a guestbook message
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
 * Guestbook configuration for rendering
 */
export interface GuestbookConfig {
  messages: GuestbookMessage[];
}

/**
 * Request body for submitting a guestbook message
 */
export interface SubmitGuestbookMessageRequest {
  guestName: string;
  message: string;
}

/**
 * Response from submitting a guestbook message
 */
export interface SubmitGuestbookMessageResponse {
  message: GuestbookMessage;
}

// ============================================================================
// Music Requests Types
// ============================================================================

/**
 * Request body for submitting a song request
 */
export interface SubmitSongRequestRequest {
  songTitle: string;
  artistName: string;
  requesterName?: string;
}

/**
 * Response from submitting a song request
 */
export interface SubmitSongRequestResponse {
  ok: true;
  message: string;
}

// ============================================================================
// Gallery Types (Admin-curated photos)
// ============================================================================

/**
 * A single curated photo in the gallery
 */
export interface GalleryPhoto {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  caption?: string;
  order: number;
  url?: string;
  uploadedAt: string;
}

/**
 * Gallery configuration for a wedding
 */
export interface GalleryConfig {
  photos: GalleryPhoto[];
}

// ============================================================================
// Video Embed Types
// ============================================================================

/**
 * Video embed platform type
 */
export type VideoEmbedPlatform = 'youtube' | 'vimeo';

/**
 * A single embedded video
 */
export interface VideoEmbed {
  id: string;
  platform: VideoEmbedPlatform;
  videoId: string;
  url: string;
  title?: string;
  order: number;
  addedAt: string;
}

/**
 * Video configuration for a wedding
 */
export interface VideoConfig {
  videos: VideoEmbed[];
}

// ============================================================================
// Seating Chart Types
// ============================================================================

/**
 * Seating configuration for rendering (public display)
 * NOTE: Guest names are NOT included for privacy - guests look up their own table via RSVP token
 */
export interface SeatingConfig {
  tables: SeatingTableDisplay[];
}

/**
 * Table display data for public site (no guest names for privacy)
 */
export interface SeatingTableDisplay {
  id: string;
  name: string;
  capacity: number;
  notes?: string;
  order: number;
  /** Number of guests assigned (not names, for privacy) */
  guestCount: number;
}

/**
 * A guest's table assignment information (returned via RSVP token)
 */
export interface GuestTableAssignment {
  tableName: string;
  tableId: string;
  seatNumber?: number;
  tableNotes?: string;
}
