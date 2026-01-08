import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase client singleton for Platform API
 * Uses service role key for full database access
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

/**
 * Database table types for Platform API
 */
export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  plan_tier: string;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMagicLink {
  id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface DbAuthSession {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface DbWedding {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  partner_names: [string, string];
  status: string;
  plan_tier: string;
  features: Record<string, boolean>;
  announcement: Record<string, unknown> | null;
  event_details: Record<string, unknown> | null;
  faq: Record<string, unknown> | null;
  meal_config: Record<string, unknown> | null;
  passcode_config: Record<string, unknown> | null;
  registry: Record<string, unknown> | null;
  accommodations: Record<string, unknown> | null;
  email_templates: Record<string, unknown> | null;
  gallery: Record<string, unknown> | null;
  custom_domain_config: Record<string, unknown> | null;
  photo_moderation_config: Record<string, unknown> | null;
  video: Record<string, unknown> | null;
  social_config: Record<string, unknown> | null;
  language: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWeddingSite {
  id: string;
  wedding_id: string;
  render_config: Record<string, unknown>;
  draft_render_config: Record<string, unknown> | null;
  has_draft_changes: boolean;
  template_id: string;
  preview_status: string;
  last_published_at: string | null;
  draft_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbGuest {
  id: string;
  wedding_id: string;
  name: string;
  email: string;
  party_size: number;
  plus_one_allowance: number;
  plus_one_guests: Record<string, unknown>[];
  rsvp_status: string;
  rsvp_token_hash: string | null;
  rsvp_token_expires_at: string | null;
  rsvp_token_created_at: string | null;
  rsvp_token_last_used_at: string | null;
  rsvp_submitted_at: string | null;
  dietary_notes: string | null;
  meal_option_id: string | null;
  event_rsvps: Record<string, unknown>;
  invited_event_ids: string[] | null;
  tag_ids: string[];
  photo_opt_out: boolean;
  invite_sent_at: string | null;
  created_at: string;
  updated_at: string;
}
