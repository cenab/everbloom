// Types for wedding-site app

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

export interface Theme {
  primary: string;
  accent: string;
  neutralLight: string;
  neutralDark: string;
}

export interface Section {
  id: string;
  type: string;
  enabled: boolean;
  order: number;
  data: Record<string, unknown>;
}

export interface Announcement {
  enabled: boolean;
  title: string;
  message: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface FaqConfig {
  items: FaqItem[];
}

export interface RegistryLink {
  id: string;
  name: string;
  url: string;
  order: number;
}

export interface RegistryConfig {
  links: RegistryLink[];
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  bookingUrl?: string;
  roomBlockCode?: string;
  notes?: string;
  order: number;
}

export interface TravelInfo {
  airportDirections?: string;
  parkingInfo?: string;
  mapUrl?: string;
}

export interface AccommodationsConfig {
  hotels: Hotel[];
  travelInfo?: TravelInfo;
}

export type WeddingEventType = 'ceremony' | 'reception' | 'other';

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

export interface EventDetailsData {
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  address: string;
  city: string;
  timezone?: string;
  events?: WeddingEvent[];
}

export interface MealOption {
  id: string;
  name: string;
  description?: string;
  order: number;
}

export interface MealConfig {
  enabled: boolean;
  options: MealOption[];
}

export interface GuestbookMessage {
  id: string;
  weddingId: string;
  guestName: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  moderatedAt?: string;
}

export interface GuestbookConfig {
  messages: GuestbookMessage[];
}

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

export interface GalleryConfig {
  photos: GalleryPhoto[];
}

export type VideoEmbedPlatform = 'youtube' | 'vimeo';

export interface VideoEmbed {
  id: string;
  platform: VideoEmbedPlatform;
  videoId: string;
  url: string;
  title?: string;
  order: number;
  addedAt: string;
}

export interface VideoConfig {
  videos: VideoEmbed[];
}

export interface SeatingTableDisplay {
  id: string;
  name: string;
  capacity: number;
  notes?: string;
  order: number;
  guestCount: number;
}

export interface SeatingConfig {
  tables: SeatingTableDisplay[];
}

export interface GuestTableAssignment {
  tableName: string;
  tableId: string;
  seatNumber?: number;
  tableNotes?: string;
}

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
  guestbook?: GuestbookConfig;
  seating?: SeatingConfig;
  gallery?: GalleryConfig;
  video?: VideoConfig;
  passcodeProtected?: boolean;
  ogImageUrl?: string;
  language?: string;
  wedding: {
    slug: string;
    partnerNames: [string, string];
    date?: string;
    venue?: string;
    city?: string;
  };
}

// RSVP Types
export type RsvpStatus = 'pending' | 'attending' | 'not_attending';

export interface PlusOneGuest {
  name: string;
  dietaryNotes?: string;
  mealOptionId?: string;
}

export interface RsvpGuestView {
  id: string;
  name: string;
  email: string;
  partySize: number;
  rsvpStatus: RsvpStatus;
  dietaryNotes?: string;
  plusOneAllowance?: number;
  plusOneGuests?: PlusOneGuest[];
  mealOptionId?: string;
  tableAssignment?: GuestTableAssignment;
  photoOptOut?: boolean;
}

export interface RsvpWeddingView {
  slug: string;
  partnerNames: [string, string];
  date?: string;
  venue?: string;
  city?: string;
}

export interface RsvpViewData {
  guest: RsvpGuestView;
  wedding: RsvpWeddingView;
  theme: Theme;
  mealConfig?: MealConfig;
}

export interface RsvpSubmitRequest {
  token: string;
  rsvpStatus: RsvpStatus;
  partySize: number;
  dietaryNotes?: string;
  plusOneGuests?: PlusOneGuest[];
  mealOptionId?: string;
  photoOptOut?: boolean;
}

// API Types
export interface ApiError {
  ok: false;
  error: string;
}

export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
