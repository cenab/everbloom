import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * Create a Supabase client for Netlify Functions
 * Uses environment variables for configuration
 */
export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Hash a token using SHA-256 for secure storage/comparison
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Compare two hashes in constant time to prevent timing attacks
 */
export function compareHashesConstantTime(hash1: string, hash2: string): boolean {
  try {
    const buffer1 = Buffer.from(hash1, 'hex');
    const buffer2 = Buffer.from(hash2, 'hex');

    if (buffer1.length !== buffer2.length) {
      return false;
    }

    return timingSafeEqual(buffer1, buffer2);
  } catch {
    return false;
  }
}

/**
 * Database table types
 */
export interface DbWedding {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  partner_names: [string, string];
  plan_id: string;
  status: string;
  features: Record<string, boolean>;
  announcement: unknown;
  event_details: unknown;
  faq: unknown;
  passcode_config: {
    enabled: boolean;
    passcodeHash?: string;
  } | null;
  meal_config: unknown;
  registry: unknown;
  accommodations: unknown;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface DbWeddingSite {
  id: string;
  wedding_id: string;
  render_config: Record<string, unknown>;
  template_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbGuest {
  id: string;
  wedding_id: string;
  name: string;
  email: string;
  party_size: number;
  rsvp_status: 'pending' | 'attending' | 'not_attending';
  dietary_notes: string | null;
  rsvp_token_hash: string | null;
  tag_ids: string[];
  plus_one_allowance: number;
  plus_one_guests: unknown[];
  meal_option_id: string | null;
  event_rsvps: Record<string, unknown>;
  photo_opt_out: boolean;
  invite_sent_at: string | null;
  rsvp_submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPhoto {
  id: string;
  wedding_id: string;
  file_name: string;
  content_type: string;
  file_size: number;
  storage_path: string;
  moderation_status: 'pending' | 'approved' | 'rejected';
  moderated_at: string | null;
  uploader_name: string | null;
  uploader_email: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface DbGuestbookMessage {
  id: string;
  wedding_id: string;
  guest_name: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  moderated_at: string | null;
  created_at: string;
}

export interface DbSongRequest {
  id: string;
  wedding_id: string;
  song_title: string;
  artist_name: string;
  requester_name: string | null;
  created_at: string;
}

export interface DbSeatingAssignment {
  id: string;
  guest_id: string;
  table_id: string;
  seat_number: number | null;
  assigned_at: string;
}

export interface DbSeatingTable {
  id: string;
  wedding_id: string;
  name: string;
  capacity: number;
  notes: string | null;
  order: number;
  created_at: string;
}
