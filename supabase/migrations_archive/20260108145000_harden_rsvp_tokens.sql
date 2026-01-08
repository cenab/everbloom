-- Harden RSVP tokens with expiration and audit fields
-- PRD: "Tokens are high entropy, hashed at rest, scoped to invite_id, expirable"

-- Add expiration and audit fields to guests table
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS rsvp_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rsvp_token_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rsvp_token_last_used_at TIMESTAMPTZ;

-- Index for finding expired tokens
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_token_expires_at
  ON guests(rsvp_token_expires_at)
  WHERE rsvp_token_hash IS NOT NULL;

-- Index for active tokens (expiration checked at query time)
CREATE INDEX IF NOT EXISTS idx_guests_active_rsvp_tokens
  ON guests(rsvp_token_hash, rsvp_token_expires_at)
  WHERE rsvp_token_hash IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN guests.rsvp_token_expires_at IS 'When the RSVP token expires. NULL means no expiration.';
COMMENT ON COLUMN guests.rsvp_token_created_at IS 'When the RSVP token was generated.';
COMMENT ON COLUMN guests.rsvp_token_last_used_at IS 'Last time the token was used to view/submit RSVP.';

-- Function to clean up expired tokens (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_rsvp_tokens()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Clear expired tokens (but don't delete the guest record)
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

COMMENT ON FUNCTION cleanup_expired_rsvp_tokens() IS 'Clears expired RSVP tokens. Returns number of tokens cleared.';
