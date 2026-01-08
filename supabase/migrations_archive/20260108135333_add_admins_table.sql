-- Add admins table for authorization
-- This table maps Supabase Auth users (by sub) to admin roles

CREATE TABLE IF NOT EXISTS admins (
  sub TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'readonly')),
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Index for active admins
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(sub) WHERE disabled_at IS NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_admins_updated_at();

-- Comment for documentation
COMMENT ON TABLE admins IS 'Admin users authorized to access the platform. Maps Supabase Auth sub to admin roles.';
COMMENT ON COLUMN admins.sub IS 'Supabase Auth user ID (from JWT sub claim)';
COMMENT ON COLUMN admins.role IS 'Admin role: owner (full access), admin (manage weddings), readonly (view only)';
COMMENT ON COLUMN admins.disabled_at IS 'When set, admin access is revoked';
