# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development (Platform)
- `pnpm dev` - Runs platform UI + platform API + worker in parallel
- `pnpm dev:ui` - Start platform UI (Vite) dev server
- `pnpm dev:api` - Start platform API (NestJS) in watch mode
- `pnpm dev:worker` - Start worker service (BullMQ processors) in watch mode

### Development (Wedding Site)
- `pnpm dev:site` - Start wedding site (Astro) dev server
- `pnpm dev:netlify` - Run wedding site via Netlify dev (functions + site)
  - Recommended when testing guest flows that hit Netlify Functions

### Build & Test
- `pnpm build` - Build all packages/apps
- `pnpm build:ui` - Build platform UI
- `pnpm build:api` - Build platform API
- `pnpm build:worker` - Build worker service
- `pnpm build:site` - Build wedding site
- `pnpm typecheck` - TypeScript typecheck across workspace
- `pnpm test` - Run tests across workspace (Vitest/Jest as configured)

### Lint (if configured)
- `pnpm lint` - Run lint across workspace

### Database
- `pnpm db:migrate` - Apply migrations (Supabase/Postgres)
- `pnpm db:generate` - Generate migration files (if using a generator)
- `pnpm db:seed` - Seed local/dev data (if present)

### Queue / Redis
- `pnpm queue:ui` - Optional: run Bull Board (if configured) for inspecting jobs

## Architecture

This repo is a multi-surface product with a strict separation:

1) **Wedding site (spun-up websites)** must follow a fixed architecture:
   - Astro SSR hosted on Netlify
   - Netlify Functions for guest-facing APIs
   - Supabase Postgres + Supabase Storage
   - SendGrid for transactional emails
   - Renders ONLY from a single `render_config` JSON blob

2) **Platform (admin + guest management)** uses a separate architecture:
   - Platform UI: Vite + React + TanStack Router + TanStack Query + Tailwind
   - Platform API: NestJS (REST)
   - DB: Postgres (Supabase Postgres acceptable)
   - Queue: Redis + BullMQ
   - Worker service: separate process for scheduled and bulk tasks
   - Billing: Stripe platform-only (wedding site never touches Stripe)

## Repo Structure

Recommended layout:
- `apps/platform-ui/` - Vite + React admin platform
- `apps/wedding-site/` - Astro wedding site (guest-facing rendering + pages)
- `services/platform-api/` - NestJS REST API (platform system of record)
- `services/worker/` - Worker process (BullMQ processors, scheduled jobs)
- `packages/shared/` - Shared schemas, types, validators, utilities
- `supabase/migrations/` - SQL migrations for Postgres schema

## Core Product Concepts

### System of Record vs Render Artifact
- The **platform** is the system of record for all weddings.
- The **wedding site** is a render artifact that consumes a precomputed config.

### `render_config` (Critical Contract)
- Wedding site pages MUST render exclusively from `wedding_sites.render_config`.
- The wedding site must not rely on joins or multi-table queries for rendering.
- The platform regenerates `render_config` whenever site content, features, or template changes.

`render_config` includes:
- `template_id`
- `theme` (primary, accent, neutrals)
- `features` (enabled flags)
- `sections` (ordered list with section data)
- `announcement` state (optional)
- wedding basics needed for rendering

### Feature Flags (Per Wedding)
Features are toggles that affect:
- platform UI navigation and available actions
- public site rendering and route visibility
- API endpoint access (must return deterministic FEATURE_DISABLED)

MVP feature flags:
- `RSVP`
- `CALENDAR_INVITE`
- `PHOTO_UPLOAD`
- `ANNOUNCEMENT_BANNER`
- `FAQ_SECTION`
- `PASSCODE_SITE`

Disabling a feature:
- hides it on the site
- disables related routes/endpoints
- does not delete stored data

## Platform (Vite UI + NestJS API)

### Platform UI
- Keep it unbloated: SPA only (no Next.js)
- Use TanStack Query for data fetching/caching and TanStack Router for routing
- Admin nav must not exceed 6 primary items and must auto-hide items for disabled features
- No freeform drag-and-drop editing; section reorder and toggle only

### Platform API (NestJS)
- REST only
- Owns provisioning, plan gating, feature toggles, guest management, segmentation, and analytics
- Stripe runs only here:
  - `POST /billing/checkout-session`
  - `POST /billing/stripe-webhook` (signature verification required)
- Provisioning is triggered on `checkout.session.completed` and must be idempotent

### Queue + Worker
- Redis + BullMQ
- Worker handles:
  - bulk invite sends
  - reminder emails
  - retries with backoff
  - writing results to `email_outbox`
- Prefer deterministic job payloads and idempotent processors

## Wedding Site (Astro + Netlify)

### SSR + Functions
- Guest pages: `/w/{slug}` and subroutes (rsvp, photos)
- Netlify Functions provide guest-facing endpoints:
  - `GET /site-config?slug=...`
  - `GET /rsvp-view?token=...`
  - `POST /rsvp-submit`
  - `POST /photo-upload-token`
  - `POST /photo-metadata`

### Rules
- Enforce feature flags on every route and endpoint.
- Tokens are random (32+ bytes), stored hashed in DB; compare hashed only.
- Storage buckets are private; guests upload only via signed URLs.
- Return deterministic errors:
  - `{ "ok": false, "error": "FEATURE_DISABLED" }`
  - `{ "ok": false, "error": "INVALID_TOKEN" }`

## Design System Rules (Non-Negotiable)

Everbloom must feel calm and ceremonial.

Hard rules:
- No visual noise, no gimmicky animations
- Curated palettes only; no arbitrary hex picker
- No pure black (#000000) or pure white (#FFFFFF) in design tokens
- Typography locked per template; no font uploads or font pickers
- No freeform layout editing; prevent ugly outcomes by design

Guest UI:
- warmer than admin UI
- mobile-first
- large tap targets
- one-question-per-block RSVP layout
- simple photo upload with one primary CTA and clear progress

Tailwind policy (recommended):
- Use design tokens (theme variables) and avoid ad-hoc colors
- Avoid inline styles and arbitrary pixel values in components

## Testing Expectations

- Each iteration should include verification:
  - `pnpm typecheck`
  - `pnpm test`
- For wedding site flows, prefer running via Netlify dev when functions are involved.
- Do not mark features as complete without end-to-end verification.

## Working Style for Long-Running Agent Loops

- Work on exactly one feature per iteration.
- Append notes to `progress.txt`.
- Update `plans/features.json` by flipping a single `passes` flag only.
- Commit every completed feature with a descriptive message.
- Leave the repo in a clean, mergeable state.
