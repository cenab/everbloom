-- Canonical schema for Wedding Bestie (reset-only).
-- This file defines the full schema from scratch.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- Platform users (wedding admins)
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'premium')),
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- MAGIC LINKS TABLE
-- For passwordless authentication
-- ============================================================================
CREATE TABLE magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_magic_links_token_hash ON magic_links(token_hash);
CREATE INDEX idx_magic_links_email ON magic_links(email);
CREATE INDEX idx_magic_links_expires_at ON magic_links(expires_at);

-- ============================================================================
-- AUTH SESSIONS TABLE
-- Active user sessions
-- ============================================================================
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_token_hash ON auth_sessions(token_hash);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- ============================================================================
-- ADMINS TABLE
-- Maps Supabase Auth users (by sub) to admin roles
-- ============================================================================
CREATE TABLE admins (
    sub TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'readonly')),
    disabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_active ON admins(sub) WHERE disabled_at IS NULL;

-- ============================================================================
-- WEDDINGS TABLE
-- Core wedding records (system of record)
-- ============================================================================
CREATE TABLE weddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    partner_names TEXT[] NOT NULL CHECK (array_length(partner_names, 1) = 2),
    plan_tier TEXT NOT NULL CHECK (plan_tier IN ('starter', 'premium')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'archived')),

    -- Feature flags stored as JSONB
    features JSONB NOT NULL DEFAULT '{
        "RSVP": true,
        "CALENDAR_INVITE": true,
        "PHOTO_UPLOAD": true,
        "ANNOUNCEMENT_BANNER": true,
        "FAQ_SECTION": true,
        "PASSCODE_SITE": false,
        "REGISTRY": true,
        "ACCOMMODATIONS": true,
        "GUESTBOOK": true,
        "MUSIC_REQUESTS": true,
        "SEATING_CHART": true,
        "VIDEO_EMBED": true
    }'::jsonb,

    -- Section configurations stored as JSONB
    announcement JSONB,
    event_details JSONB,
    faq JSONB,
    passcode_config JSONB,
    meal_config JSONB,
    registry JSONB,
    accommodations JSONB,
    email_templates JSONB,
    gallery JSONB,
    photo_moderation_config JSONB,
    video JSONB,
    social_config JSONB,

    -- Site language
    language TEXT DEFAULT 'en',

    -- Custom domain configuration
    custom_domain_config JSONB,

    -- Stripe reference
    stripe_subscription_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_weddings_user_id ON weddings(user_id);
CREATE INDEX idx_weddings_slug ON weddings(slug);
CREATE INDEX idx_weddings_status ON weddings(status);

-- ============================================================================
-- WEDDING SITES TABLE
-- Contains render_config for wedding site rendering
-- ============================================================================
CREATE TABLE wedding_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL UNIQUE REFERENCES weddings(id) ON DELETE CASCADE,

    -- The render_config blob - wedding site renders ONLY from this
    render_config JSONB NOT NULL,

    -- Draft/preview workflow
    draft_render_config JSONB,
    has_draft_changes BOOLEAN NOT NULL DEFAULT FALSE,
    last_published_at TIMESTAMPTZ,
    draft_updated_at TIMESTAMPTZ,

    -- Template
    template_id TEXT NOT NULL DEFAULT 'minimal-001',
    preview_status TEXT NOT NULL DEFAULT 'published',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wedding_sites_wedding_id ON wedding_sites(wedding_id);

-- ============================================================================
-- GUESTS TABLE
-- Wedding invitees and RSVP tracking
-- ============================================================================
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    party_size INTEGER NOT NULL DEFAULT 1,
    rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'attending', 'not_attending')),
    dietary_notes TEXT,

    -- RSVP token (hashed - raw token never stored)
    rsvp_token_hash TEXT UNIQUE,
    rsvp_token_expires_at TIMESTAMPTZ,
    rsvp_token_created_at TIMESTAMPTZ,
    rsvp_token_last_used_at TIMESTAMPTZ,

    -- Tags for segmentation (array of tag IDs)
    tag_ids UUID[] DEFAULT '{}',

    -- Plus-one configuration
    plus_one_allowance INTEGER DEFAULT 0,
    plus_one_guests JSONB DEFAULT '[]'::jsonb,

    -- Meal selection
    meal_option_id TEXT,

    -- Multi-event RSVP responses
    event_rsvps JSONB DEFAULT '{}'::jsonb,

    -- Event invitation restrictions
    invited_event_ids UUID[] DEFAULT NULL,

    -- Photo opt-out
    photo_opt_out BOOLEAN DEFAULT FALSE,

    -- Tracking timestamps
    invite_sent_at TIMESTAMPTZ,
    rsvp_submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint on email per wedding
    UNIQUE(wedding_id, email)
);

CREATE INDEX idx_guests_wedding_id ON guests(wedding_id);
CREATE INDEX idx_guests_rsvp_token_hash ON guests(rsvp_token_hash);
CREATE INDEX idx_guests_rsvp_status ON guests(rsvp_status);
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_rsvp_token_expires_at ON guests(rsvp_token_expires_at) WHERE rsvp_token_hash IS NOT NULL;
CREATE INDEX idx_guests_active_rsvp_tokens ON guests(rsvp_token_hash, rsvp_token_expires_at) WHERE rsvp_token_hash IS NOT NULL;

-- ============================================================================
-- TAGS TABLE
-- Guest segmentation tags
-- ============================================================================
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6B7280',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint on name per wedding
    UNIQUE(wedding_id, name)
);

CREATE INDEX idx_tags_wedding_id ON tags(wedding_id);

-- ============================================================================
-- EMAIL OUTBOX TABLE
-- Tracks all sent emails
-- ============================================================================
CREATE TABLE email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL CHECK (email_type IN ('invitation', 'reminder', 'save_the_date', 'thank_you', 'update')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
    to_email TEXT NOT NULL,
    to_name TEXT NOT NULL,
    subject TEXT NOT NULL,

    -- Delivery tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft')),
    bounce_reason TEXT,
    error_message TEXT,

    -- SendGrid tracking
    message_id TEXT,

    -- Retry tracking
    attempts INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_outbox_wedding_id ON email_outbox(wedding_id);
CREATE INDEX idx_email_outbox_guest_id ON email_outbox(guest_id);
CREATE INDEX idx_email_outbox_status ON email_outbox(status);
CREATE INDEX idx_email_outbox_message_id ON email_outbox(message_id);
CREATE INDEX idx_email_outbox_email_type ON email_outbox(email_type);

-- ============================================================================
-- SCHEDULED EMAILS TABLE
-- Emails scheduled for future sending
-- ============================================================================
CREATE TABLE scheduled_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    guest_ids UUID[] NOT NULL,
    email_type TEXT NOT NULL CHECK (email_type IN ('invitation', 'reminder', 'save_the_date', 'thank_you', 'update')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),

    -- BullMQ job reference
    job_id TEXT,

    -- Results after completion
    results JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_emails_wedding_id ON scheduled_emails(wedding_id);
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX idx_scheduled_emails_scheduled_at ON scheduled_emails(scheduled_at);

-- ============================================================================
-- PHOTOS TABLE
-- Guest-uploaded photos
-- ============================================================================
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,

    -- Moderation
    moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    moderated_at TIMESTAMPTZ,

    -- Optional uploader info
    uploader_name TEXT,
    uploader_email TEXT,

    -- Timestamps
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_wedding_id ON photos(wedding_id);
CREATE INDEX idx_photos_moderation_status ON photos(moderation_status);

-- ============================================================================
-- GUESTBOOK MESSAGES TABLE
-- Guest messages for the couple
-- ============================================================================
CREATE TABLE guestbook_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guestbook_messages_wedding_id ON guestbook_messages(wedding_id);
CREATE INDEX idx_guestbook_messages_status ON guestbook_messages(status);

-- ============================================================================
-- SEATING TABLES TABLE
-- Tables for seating chart
-- ============================================================================
CREATE TABLE seating_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    notes TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint on name per wedding
    UNIQUE(wedding_id, name)
);

CREATE INDEX idx_seating_tables_wedding_id ON seating_tables(wedding_id);

-- ============================================================================
-- SEATING ASSIGNMENTS TABLE
-- Guest table assignments
-- ============================================================================
CREATE TABLE seating_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL UNIQUE REFERENCES guests(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES seating_tables(id) ON DELETE CASCADE,
    seat_number INTEGER,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seating_assignments_table_id ON seating_assignments(table_id);
CREATE INDEX idx_seating_assignments_guest_id ON seating_assignments(guest_id);

-- ============================================================================
-- SONG REQUESTS TABLE
-- Music requests from guests
-- ============================================================================
CREATE TABLE song_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    song_title TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    requester_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_song_requests_wedding_id ON song_requests(wedding_id);

-- ============================================================================
-- EVENT GUEST ASSIGNMENTS TABLE
-- Which guests are invited to which events
-- ============================================================================
CREATE TABLE event_guest_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(guest_id, event_id)
);

CREATE INDEX idx_event_guest_assignments_wedding_id ON event_guest_assignments(wedding_id);
CREATE INDEX idx_event_guest_assignments_guest_id ON event_guest_assignments(guest_id);
CREATE INDEX idx_event_guest_assignments_event_id ON event_guest_assignments(event_id);

-- ============================================================================
-- PHOTO UPLOADS TABLE
-- Tracking pending photo uploads (signed URLs)
-- ============================================================================
CREATE TABLE photo_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photo_uploads_wedding_id ON photo_uploads(wedding_id);
CREATE INDEX idx_photo_uploads_expires_at ON photo_uploads(expires_at);

-- ============================================================================
-- CUSTOM DOMAIN VERIFICATIONS TABLE
-- Track domain verification attempts
-- ============================================================================
CREATE TABLE custom_domain_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    verification_token TEXT NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_domain_verifications_wedding_id ON custom_domain_verifications(wedding_id);
CREATE INDEX idx_custom_domain_verifications_domain ON custom_domain_verifications(domain);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weddings_updated_at
    BEFORE UPDATE ON weddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wedding_sites_updated_at
    BEFORE UPDATE ON wedding_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
    BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_outbox_updated_at
    BEFORE UPDATE ON email_outbox
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_emails_updated_at
    BEFORE UPDATE ON scheduled_emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired RSVP tokens (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_rsvp_tokens()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE guests
  SET
    rsvp_token_hash = NULL,
    rsvp_token_expires_at = NULL
  WHERE rsvp_token_hash IS NOT NULL
    AND rsvp_token_expires_at IS NOT NULL
    AND rsvp_token_expires_at < NOW();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_guest_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domain_verifications ENABLE ROW LEVEL SECURITY;
