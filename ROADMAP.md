# RealDealTracker - Forward Plan

> **Superseded:** open work is now tracked in [PUNCH_LIST.md](PUNCH_LIST.md) (reviewed 2026-10-31). This file is kept as a historical record.

## Current State (Post-Cleanup, March 2026)
- React 18 + Express + PostgreSQL (Neon) + Drizzle ORM
- Supabase Auth, Stripe subscriptions, OpenAI integration
- Zillow/LoopNet/Redfin property search via RapidAPI
- Proprietary 0-100 scoring algorithm
- Pre-launch, migrating from Replit to Railway

---

## Phase 1: Foundation & Deployment (Week 1-2)

### 1A. Railway Deployment Setup
- [x] Create `Dockerfile` for containerized deployment
- [x] Create `docker-compose.yml` for local dev (app + Postgres)
- [x] Create `.env.example` documenting all required env vars
- [x] Remove `.replit` file and `replit.md`
- [x] Update `package.json` (rename, use PORT env var, prune unused deps)
- [ ] Set up Railway project with GitHub auto-deploy
- [ ] Configure Railway Postgres or keep Neon (evaluate cost)

### 1B. Prune Unused Dependencies
Remove packages with zero imports (saves ~2MB from node_modules, cleaner audit):
- [x] `passport`, `passport-local`, `@types/passport`, `@types/passport-local`
- [x] `express-session`, `connect-pg-simple`, `memorystore`, `@types/connect-pg-simple`, `@types/express-session`
- [x] `openid-client`
- [x] `framer-motion`
- [x] `next-themes`
- [x] `react-icons`

### 1C. Update README
- [x] Fix inaccurate claims (SWR -> React Query, remove Vitest mention)
- [x] Add Railway deployment instructions
- [x] Document local development setup with docker-compose
- [x] Add architecture overview section

---

## Phase 2: Code Architecture (Week 2-3)

### 2A. Split routes.ts (2,595 lines -> 14 modules) [DONE]
```
server/
  routes/
    index.ts          -- registers all route modules
    auth.ts           -- /api/auth/*
    properties.ts     -- /api/properties/*, /api/admin/properties/*
    watchlist.ts      -- /api/watchlist/*
    deals.ts          -- /api/deals/*
    search.ts         -- /api/zillow/*, /api/loopnet/*, /api/redfin/*, /api/search/*
    ai.ts             -- /api/ai/*, /api/generate-loi
    admin.ts          -- /api/admin/* (jobs, scraping, bulk, archive, scoring)
    api-v1.ts         -- /api/v1/* (public API)
    subscriptions.ts  -- /api/subscription-packages/*, /api/create-subscription
    branding.ts       -- /api/branding/*
    monitoring.ts     -- /api/property-monitoring/*
```

### 2B. Extract Shared Middleware [DONE]
- [x] `requireAuth`, `requireSubscription`, `requireAdmin` -> `server/routes/middleware.ts`
- [x] `authenticateApiKey` already in `server/lib/api-key-manager.ts`
- [x] Rate limiting already in `server/lib/rate-limit.ts`

### 2C. Consolidate Zillow Files [DONE]
- [x] Merge `zillow-api.ts` + `zillow-integration.ts` + `zillow-photos.ts` into unified `server/lib/zillow.ts`

---

## Phase 3: User-Facing Polish (Week 3-5)

### 3A. Onboarding & Auth [DONE]
- [x] "Getting Started" checklist on dashboard (auto-tracks progress, dismissable)
- [x] Profile settings page (account info, subscription status, display name)
- [ ] Welcome flow after first sign-in (guided tour - future enhancement)

### 3B. Dashboard [DONE]
- [x] Create a real dashboard page (authenticated users redirected from Home)
- [x] Show: watchlist summary, deal pipeline snapshot, top scored properties, stats
- [x] Quick actions: search, browse, deals, compare

### 3C. Mobile UX [DONE]
- [x] Bottom navigation bar for mobile (Dashboard, Browse, Search, Deals, Profile)
- [x] Bottom padding on main content to avoid overlap with bottom nav
- [ ] Audit and fix responsive layouts on property cards, drawer, and pipeline
- [ ] Touch-friendly property image gallery

### 3D. Merge Redundant Search Pages [DONE]
- [x] Removed `zillow-search.tsx` (property-search already supports Zillow via platform toggle)
- [x] Single unified search experience at `/property-search`
- [x] Removed `/zillow-search` route

---

## Phase 4: Data & Analytics (Week 5-7)

### 4A. Market Trends [DONE]
- [x] Score distribution histogram (bar chart with color-coded score buckets)
- [x] Property type breakdown (pie chart)
- [x] ZIP code comparison (dual-axis bar chart: avg score vs avg price + data table)
- [x] 3 new analytics API endpoints (by-zip, score-distribution, by-type)
- [ ] Historical price charts (requires time-series data collection)

### 4B. Portfolio Tracking [DONE]
- [x] Portfolio page: closed deals, active pipeline, stage breakdown
- [x] Pipeline value by stage (bar chart)
- [x] Stage progress bars with deal counts and values
- [x] Closed investments table
- [ ] Current estimated value / equity tracking (requires market data updates)

### 4C. Enhanced Property Details [DONE]
- [x] Comparable properties section in property drawer (same ZIP, sorted by score similarity)
- [ ] Neighborhood data visualization (demographics, crime, walkability)
- [ ] Price history timeline for monitored properties

---

## Phase 5: Monetization (Week 7-9)

### 5A. Subscription Tiers [DONE]
- [x] Define tier limits config: free/basic/pro/enterprise with per-feature quotas
- [x] Tier enforcement middleware (`requireTierLimit`) checking monthly usage against limits
- [x] Applied to all search endpoints (Zillow, LoopNet, Redfin, multi-platform)
- [x] Applied to all AI endpoints (underwriting, offer, compare, LOI)
- [x] Returns 429 with upgrade URL when limits exceeded
- [ ] Upgrade prompts in frontend when 429 received

### 5B. Stripe Integration Hardening [DONE]
- [x] Billing portal endpoint (POST /api/billing-portal) creates Stripe Customer Portal session
- [x] Profile page "Manage Billing" opens portal in new tab
- [x] GET /api/tier-limits endpoint returns current user's tier and limits
- [ ] Test full subscription lifecycle end-to-end
- [ ] Handle payment failures gracefully (dunning emails)
- [ ] Annual billing option

### 5C. API Access Packaging [DONE]
- [x] API documentation page with endpoints, auth, and rate limits tabs
- [x] Tier-based rate limits defined in tier config (50/200/500/2000 req/hr)
- [x] API docs nav link added
- [ ] Usage dashboard improvements for API key holders

---

## Phase 6: AI Capabilities (Week 9-11)

### 6A. Smarter Property Analysis [DONE]
- [x] Investment thesis endpoint (BUY/AVOID with bull/bear cases, catalysts, exit strategy)
- [x] Risk assessment endpoint (6-dimension scoring: market, financial, property, location, liquidity, regulatory)
- [x] AI commentary already includes local market context from demographics service

### 6B. Automated Alerts [DONE]
- [x] Alerts endpoint (GET /api/alerts) aggregates monitoring changes per property
- [x] Monitoring history with change detection already tracks price/status/image changes
- [ ] Push notifications / email delivery (needs email service integration)
- [ ] Weekly market digest email

### 6C. AI-Powered Recommendations [DONE]
- [x] Recommendations endpoint analyzing watchlist preferences (price, score, ZIP, type)
- [x] Similarity scoring with 5 weighted factors
- [x] Portfolio diversification suggestions (different ZIPs/types, score >= 60)
- [x] Recommendations page with preference summary and property cards
- [ ] Deal scoring that learns from closed deals (needs more historical data)

---

## Phase 7: Quality & Scale (Ongoing)

### 7A. Testing
- [ ] Set up Vitest with a few critical path tests first
- [ ] API route integration tests (auth, properties CRUD, search)
- [ ] Frontend component tests for PropertyCard, PropertyDrawer, DealsBoard

### 7B. TypeScript Strictness
- [ ] Gradual `any` reduction (294 occurrences currently)
- [ ] Start with shared types: API response shapes, property metrics
- [ ] Add Zod validation at API boundaries

### 7C. Performance
- [ ] Code-split pages with React.lazy (main bundle is 1.3MB)
- [ ] Image optimization (lazy loading, responsive sizes)
- [ ] Database indexes on frequently queried columns (zipCode, score, published)
- [ ] Persistent rate limiting (Redis or Postgres-backed vs in-memory)

### 7D. Observability
- [ ] Structured logging (replace console.log with pino or winston)
- [ ] Error tracking (Sentry or similar)
- [ ] Basic health check endpoint for Railway monitoring

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-30 | Railway for hosting | Closest to Replit simplicity, good Postgres support, GitHub deploys |
| 2026-03-30 | Incremental cleanup + features | Pre-launch flexibility, but need solid foundation before users |
| 2026-03-30 | Keep Neon Postgres (evaluate) | Already configured, may switch to Railway Postgres for simplicity |
