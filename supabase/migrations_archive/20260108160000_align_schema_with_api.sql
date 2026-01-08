-- Align core schema with platform API expectations.
-- This migration updates users, weddings, and wedding_sites to match runtime fields.

-- ============================================================================
-- USERS TABLE
-- ============================================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS plan_tier TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'plan_tier'
  ) THEN
    UPDATE users SET plan_tier = 'free' WHERE plan_tier IS NULL;
    ALTER TABLE users ALTER COLUMN plan_tier SET DEFAULT 'free';
    ALTER TABLE users ALTER COLUMN plan_tier SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'plan_tier'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_plan_tier_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_plan_tier_check
      CHECK (plan_tier IN ('free', 'starter', 'premium'));
  END IF;
END $$;

-- ============================================================================
-- WEDDINGS TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weddings'
      AND column_name = 'plan_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weddings'
      AND column_name = 'plan_tier'
  ) THEN
    ALTER TABLE weddings RENAME COLUMN plan_id TO plan_tier;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weddings'
      AND column_name = 'custom_domain'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weddings'
      AND column_name = 'custom_domain_config'
  ) THEN
    ALTER TABLE weddings RENAME COLUMN custom_domain TO custom_domain_config;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weddings'
      AND column_name = 'stripe_session_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weddings'
      AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE weddings RENAME COLUMN stripe_session_id TO stripe_subscription_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weddings'
      AND column_name = 'plan_tier'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'weddings_plan_tier_check'
      AND conrelid = 'public.weddings'::regclass
  ) THEN
    ALTER TABLE weddings
      ADD CONSTRAINT weddings_plan_tier_check
      CHECK (plan_tier IN ('starter', 'premium'));
  END IF;
END $$;

-- ============================================================================
-- WEDDING SITES TABLE
-- ============================================================================
ALTER TABLE wedding_sites
  ADD COLUMN IF NOT EXISTS preview_status TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wedding_sites'
      AND column_name = 'preview_status'
  ) THEN
    UPDATE wedding_sites SET preview_status = 'published' WHERE preview_status IS NULL;
    ALTER TABLE wedding_sites ALTER COLUMN preview_status SET DEFAULT 'published';
    ALTER TABLE wedding_sites ALTER COLUMN preview_status SET NOT NULL;
  END IF;
END $$;
