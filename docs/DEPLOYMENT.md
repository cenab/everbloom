# Deployment Guide

This guide covers deploying the Everbloom Wedding Platform to production using managed cloud services.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PRODUCTION ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐  │
│   │  Platform   │     │  Platform   │     │        Worker           │  │
│   │     UI      │────▶│     API     │◀───▶│       Service           │  │
│   │  (Vercel)   │     │  (Railway)  │     │      (Railway)          │  │
│   └─────────────┘     └──────┬──────┘     └───────────┬─────────────┘  │
│                              │                        │                 │
│                              ▼                        ▼                 │
│                       ┌─────────────┐          ┌─────────────┐         │
│                       │   Redis     │          │  SendGrid   │         │
│                       │  (Railway)  │          │   (Email)   │         │
│                       └─────────────┘          └─────────────┘         │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                      Wedding Site (Netlify)                      │  │
│   │  ┌─────────────┐     ┌──────────────────────────────────────┐   │  │
│   │  │   Astro     │     │         Netlify Functions            │   │  │
│   │  │    SSR      │     │  site-config, rsvp-*, photo-*, etc.  │   │  │
│   │  └─────────────┘     └──────────────────────────────────────┘   │  │
│   └──────────────────────────────┬──────────────────────────────────┘  │
│                                  │                                      │
│                                  ▼                                      │
│                           ┌─────────────┐                               │
│                           │  Supabase   │                               │
│                           │  (Postgres  │                               │
│                           │  + Storage) │                               │
│                           └─────────────┘                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Services Required

| Component | Recommended Provider | Alternatives |
|-----------|---------------------|--------------|
| Platform UI | Vercel | Netlify, Cloudflare Pages |
| Platform API | Railway | Render, Fly.io |
| Worker | Railway | Render, Fly.io |
| Redis | Railway (addon) | Upstash, Redis Cloud |
| Database | Supabase | PlanetScale, Neon |
| File Storage | Supabase Storage | Cloudflare R2, S3 |
| Wedding Site | Netlify | - |
| Email | SendGrid | Resend, Postmark |
| Payments | Stripe | - |

---

## Infrastructure as Code

This repository includes IaC configurations for automated deployments.

### Configuration Files

| Service | File | Description |
|---------|------|-------------|
| Platform UI | `apps/platform-ui/vercel.json` | Vercel project settings |
| Platform API | `services/platform-api/railway.toml` | Railway deployment config |
| Worker | `services/worker/railway.toml` | Railway deployment config |
| Wedding Site | `apps/wedding-site/netlify.toml` | Netlify build & functions |
| Infrastructure | `infrastructure/terraform/` | Terraform for Supabase, Redis |

### Terraform Setup

```bash
cd infrastructure/terraform

# Copy and fill in variables
cp terraform.tfvars.example terraform.tfvars

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply infrastructure
terraform apply
```

### GitHub Actions CI/CD

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `ci.yml` | PR & push to main | Lint, typecheck, test, build |
| `deploy-platform-api.yml` | Changes to `services/platform-api/` | Deploy API to Railway |
| `deploy-worker.yml` | Changes to `services/worker/` | Deploy worker to Railway |
| `deploy-wedding-site.yml` | Changes to `apps/wedding-site/` | Deploy site to Netlify |
| `db-migrate.yml` | Changes to `supabase/migrations/` | Run database migrations |

### Required GitHub Secrets

```
# Railway
RAILWAY_TOKEN
RAILWAY_PROJECT_ID

# Netlify
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID

# Supabase
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF

# Application
PUBLIC_PLATFORM_API_URL
PLATFORM_API_URL
```

---

## Manual Deployment Steps

### Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and keys from Settings → API

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link
supabase login
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Step 2: Redis Setup (Railway)

1. In your Railway project, click "New Service" → "Database" → "Redis"
2. Railway provisions Redis automatically
3. Copy `REDIS_URL` from the service's Variables tab
4. Reference it in other services using `${{Redis.REDIS_URL}}`

### Step 3: Platform API (Railway)

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select repo, set root directory: `services/platform-api`
4. Railway will auto-detect `railway.toml`

**Environment Variables:**
```bash
NODE_ENV=production
PORT=3001
REDIS_URL=rediss://...
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SENDGRID_API_KEY=SG.xxx
PLATFORM_URL=https://app.yourdomain.com
WEDDING_SITE_URL=https://yourdomain.com
WORKER_TOKEN=xxx
```

### Step 4: Worker Service (Railway)

1. In same Railway project, add another service
2. Set root directory: `services/worker`

**Environment Variables:**
```bash
NODE_ENV=production
REDIS_URL=rediss://...
SENDGRID_API_KEY=SG.xxx
PLATFORM_API_URL=https://api.yourdomain.com/api
WORKER_TOKEN=xxx
```

### Step 5: Platform UI (Vercel)

1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Set root directory: `apps/platform-ui`
4. Vercel auto-detects `vercel.json`

**Environment Variables:**
```bash
VITE_API_URL=https://api.yourdomain.com/api
```

### Step 6: Wedding Site (Netlify)

1. Go to [netlify.com](https://netlify.com)
2. Import from Git
3. Set base directory: `apps/wedding-site`
4. Netlify auto-detects `netlify.toml`

**Environment Variables:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx
```

---

## Stripe Configuration

### Create Products & Prices
1. Stripe Dashboard → Products → Add Product
2. Create "Starter Plan" and "Premium Plan"
3. Copy Price IDs

### Configure Webhooks
1. Developers → Webhooks → Add endpoint
2. URL: `https://your-api.railway.app/api/billing/stripe-webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

---

## SendGrid Configuration

1. Create API key at Settings → API Keys
2. Verify sender domain at Settings → Sender Authentication
3. (Optional) Configure webhook for tracking

---

## Environment Variables Summary

### Platform API
| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `3001` |
| `REDIS_URL` | Yes | Upstash Redis URL |
| `STRIPE_SECRET_KEY` | Yes | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret |
| `STRIPE_PRICE_STARTER` | Yes | Starter plan price ID |
| `STRIPE_PRICE_PREMIUM` | Yes | Premium plan price ID |
| `SENDGRID_API_KEY` | Yes | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Yes | Sender email address |
| `PLATFORM_URL` | Yes | Platform UI URL |
| `WEDDING_SITE_URL` | Yes | Wedding site URL |
| `WORKER_TOKEN` | Yes | Worker auth token |
| `NETLIFY_SITE_DOMAIN` | Yes | For CNAME validation |

### Worker
| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `REDIS_URL` | Yes | Same as API |
| `SENDGRID_API_KEY` | Yes | SendGrid API key |
| `PLATFORM_API_URL` | Yes | API endpoint URL |
| `WORKER_TOKEN` | Yes | Same as API |

### Platform UI (Vercel)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | API endpoint URL |

### Wedding Site (Netlify)
| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |

---

## Generating Secrets

```bash
# Generate secure tokens
openssl rand -hex 32
```

---

## Post-Deployment Checklist

- [ ] Supabase migrations applied
- [ ] Storage buckets with correct RLS policies
- [ ] Platform API health check passing
- [ ] Worker connected to Redis
- [ ] Platform UI loads and authenticates
- [ ] Wedding site renders
- [ ] Netlify Functions responding
- [ ] Stripe webhook receiving events
- [ ] Emails sending successfully
- [ ] Custom domains with SSL

---

## Troubleshooting

### Railway Build Failures
- Check `railway.toml` syntax
- Verify root directory setting
- Check build logs for missing dependencies

### Netlify Function 502 Errors
- Check function logs in Netlify Dashboard
- Verify environment variables are set
- Ensure dependencies are in function's package.json

### Redis Connection Issues
- Verify `REDIS_URL` format (Upstash uses `rediss://` for TLS)
- Check network access/firewall rules
- Verify password is URL-encoded if special characters

### Stripe Webhooks Not Received
- Verify endpoint URL is publicly accessible
- Check signing secret matches
- Review failed events in Stripe Dashboard
