# Wedding Site Architecture

## Overview

This is a static single-page application (SPA) built with Vite that renders wedding websites client-side. It eliminates SSR complexity by fetching configuration via API at runtime.

## Tech Stack

- **Build Tool**: Vite 5.x
- **Language**: TypeScript
- **Styling**: Plain CSS with custom properties
- **Hosting**: Netlify (static files + serverless functions)
- **API**: Netlify Functions (serverless)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                       Browser                            │
├─────────────────────────────────────────────────────────┤
│  index.html (static shell)                               │
│      ↓                                                   │
│  main.ts (client-side router)                            │
│      ↓                                                   │
│  /api/site-config?slug=xxx  ←→  Netlify Function         │
│      ↓                                                   │
│  render.ts (generates HTML from config)                  │
│      ↓                                                   │
│  DOM update + event handlers                             │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
apps/wedding-site/
├── index.html              # Static HTML shell with loading spinner
├── package.json            # Vite + TypeScript dependencies
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── netlify.toml            # Netlify build + redirects config
├── public/                 # Static assets (copied as-is)
│   ├── og-image-default.svg
│   └── og-image-default.png
├── src/
│   ├── main.ts             # Entry point + client-side router
│   ├── types.ts            # TypeScript interfaces
│   ├── lib/
│   │   ├── api.ts          # API client (fetch wrappers)
│   │   ├── render.ts       # Section renderers (HTML generators)
│   │   └── i18n.ts         # Internationalization (10 languages)
│   └── styles/
│       └── main.css        # All styles with CSS custom properties
└── netlify/
    └── functions/          # Serverless API endpoints
        ├── site-config.ts  # GET /api/site-config
        ├── rsvp-view.ts    # GET /api/rsvp-view
        ├── rsvp-submit.ts  # POST /api/rsvp-submit
        ├── photo-upload-token.ts  # POST /api/photo-upload-token
        ├── photo-metadata.ts      # POST /api/photo-metadata
        ├── passcode-verify.ts     # POST /api/passcode-verify
        ├── domain-lookup.ts       # GET /api/domain-lookup
        ├── data-export.ts         # GET /api/data-export
        ├── guestbook-submit.ts
        ├── music-request.ts
        └── ...
```

## How It Works

### 1. Initial Load

1. User visits `/w/john-and-jane`
2. Netlify serves static `index.html` (SPA fallback)
3. Browser loads and executes `main.ts`

### 2. Routing

Client-side router in `main.ts` parses the URL:

```typescript
function getRoute(): { page: string; slug?: string; token?: string } {
  const path = window.location.pathname;

  // /w/slug-here/photos → photo upload page
  const photoMatch = path.match(/^\/w\/([^/]+)\/photos\/?$/);
  if (photoMatch) {
    return { page: 'photo-upload', slug: photoMatch[1] };
  }

  // /w/slug-here → wedding page
  const weddingMatch = path.match(/^\/w\/([^/]+)\/?$/);
  if (weddingMatch) {
    return { page: 'wedding', slug: weddingMatch[1] };
  }

  // /rsvp?token=xxx → RSVP page
  if (path === '/rsvp') {
    return { page: 'rsvp', token: params.get('token') };
  }

  // / → home page
  // else → 404
}
```

### 3. Data Fetching

For wedding pages, the app fetches configuration from the API:

```typescript
const config = await fetchSiteConfig(slug);
// GET /api/site-config?slug=john-and-jane
// Returns: { wedding, theme, sections, features, ... }
```

### 4. Rendering

The `render.ts` module generates HTML strings from the config:

```typescript
const html = renderWeddingPage(config);
// Returns complete HTML for all enabled sections
```

If the announcement banner feature is enabled, the render pipeline prepends an
announcement strip before the rest of the sections.

### 5. Interactivity

After rendering, `setupInteractivity()` attaches event handlers:
- Guestbook form submission
- Music request form submission
- Photo gallery lightbox
- Keyboard navigation

The photo upload page has its own handler that requests a signed upload URL,
uploads the file, and then posts metadata to finalize the upload.

### 6. Passcode Protection (Optional)

If `passcodeProtected` is enabled in the render config, the site shows a
passcode gate before rendering the wedding content. Successful verification is
stored in session storage for the current browser session.

### 7. Photo Uploads

The photo upload page (`/w/:slug/photos`) supports multi-file uploads:

1. `POST /api/photo-upload-token` to get a signed upload URL
2. Upload file directly to storage using the signed URL
3. `POST /api/photo-metadata` to finalize and attach uploader info

## Netlify Configuration

### Redirects (netlify.toml)

```toml
# API routes → serverless functions
[[redirects]]
  from = "/api/site-config"
  to = "/.netlify/functions/site-config"
  status = 200

[[redirects]]
  from = "/api/photo-upload-token"
  to = "/.netlify/functions/photo-upload-token"
  status = 200

[[redirects]]
  from = "/api/photo-metadata"
  to = "/.netlify/functions/photo-metadata"
  status = 200

[[redirects]]
  from = "/api/passcode-verify"
  to = "/.netlify/functions/passcode-verify"
  status = 200

[[redirects]]
  from = "/api/domain-lookup"
  to = "/.netlify/functions/domain-lookup"
  status = 200

[[redirects]]
  from = "/api/data-export"
  to = "/.netlify/functions/data-export"
  status = 200

# SPA fallback (must be last)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Key Points

1. API routes are defined BEFORE the SPA fallback
2. SPA fallback returns `index.html` for all unmatched routes
3. Other API routes (RSVP, guestbook, music, photo uploads, passcode) are mapped the same way
4. No SSR function required - everything is client-side
5. Custom domain requests can be routed through `domain-lookup` when configured

## Theming

Themes are applied at runtime by setting CSS custom properties:

```typescript
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-neutral-light', theme.neutralLight);
  root.style.setProperty('--color-neutral-dark', theme.neutralDark);
}
```

## Internationalization

Supports 10 languages with full translations for Spanish, fallback to English for others:
- English (en)
- Spanish (es)
- French (fr)
- Portuguese (pt)
- German (de)
- Italian (it)
- Dutch (nl)
- Japanese (ja)
- Chinese (zh)
- Korean (ko)

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:5173)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check (without building)
pnpm typecheck
```

## Deployment

Push to main branch triggers Netlify deployment:

1. Netlify runs `pnpm build` in `apps/wedding-site/`
2. Static files from `dist/` are deployed to CDN
3. Functions from `netlify/functions/` are deployed as serverless
4. Redirects from `netlify.toml` are applied

## Why This Architecture?

### Previous Approach (Astro SSR)
- Used Astro with `@astrojs/netlify` adapter
- Required SSR function for each page request
- Failed in monorepo due to path resolution issues
- Complex debugging, deployment failures

### Current Approach (Static SPA)
- Simple static HTML + JavaScript
- No server-side complexity
- Works reliably with Netlify's static hosting
- Fast initial load (small bundle)
- All dynamic content fetched client-side

### Trade-offs

| Aspect | SSR | SPA |
|--------|-----|-----|
| SEO | Better (content in HTML) | Requires meta tags |
| Initial Load | Slower (function cold start) | Faster (static CDN) |
| Complexity | Higher | Lower |
| Debugging | Harder | Easier |
| Reliability | Deployment issues | Just works |
