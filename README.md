# ClearEdge Props — Real Estate Investment Platform

A real estate investment platform with AI-powered property scoring, multi-platform property search, deal pipeline management, and subscription-based access.

## Features

### Core
- **Property Scoring** -- Proprietary algorithm scores properties 0-100 based on market data, cash flow potential, and quality metrics
- **Multi-Platform Search** -- Search Zillow, LoopNet, and Redfin from a single interface via RapidAPI
- **Deal Pipeline** -- Kanban board for tracking deals from analysis through closing
- **AI Analysis** -- GPT-4o powered property commentary, underwriting checklists, offer letters, and LOI generation
- **Watchlist** -- Save and monitor properties with price/status change detection
- **Maps** -- Leaflet-based property map visualization
- **PDF Export** -- Generate property reports with AI commentary

### Admin
- **Bulk Import** -- CSV and Excel upload for properties
- **Property Management** -- Create, edit, publish/unpublish, and archive properties
- **ZIP Code Scraping** -- Automated property discovery by ZIP code
- **Job Scheduling** -- Background job management for bulk operations
- **Scoring Config** -- Adjust scoring algorithm weights

### Monetization
- **Stripe Subscriptions** -- Tiered subscription model with free trials
- **API Access** -- Public API with key management and rate limiting
- **White-Label Branding** -- Customizable branding per user

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** + **Shadcn UI** components
- **TanStack React Query** for server state
- **React Hook Form** + **Zod** for validation
- **Wouter** for routing
- **Recharts** for data visualization
- **Mapbox GL JS** (via `react-map-gl`) for property maps
- **jsPDF** + **html2canvas** for PDF export

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** for type-safe database operations
- **Supabase Auth** (magic link email authentication)
- **Stripe** for payment processing
- **OpenAI** (GPT-4o) for AI features
- **RapidAPI** for Zillow, LoopNet, and Redfin integrations
- **Multer** for file uploads

### Database
- **PostgreSQL** via Neon Serverless
- **Drizzle Kit** for schema management

## Project Structure

```
client/src/
  pages/          23 page components (browse, deals, search, admin, etc.)
  components/     Shared UI components (property card, drawer, table, map)
  hooks/          Custom hooks (auth, toast, mobile detection)
  lib/            Utilities (API client, formatting, auth, deals)

server/
  index.ts        Express server entry point
  routes.ts       API route definitions
  db.ts           Neon Postgres connection
  storage.ts      Database storage layer (IStorage interface)
  lib/            Service modules (scoring, Zillow, OpenAI, Stripe, etc.)
  webhooks/       Stripe webhook handler

shared/
  schema.ts       Drizzle ORM schema (20 tables) and Zod validation
```

## Getting Started

### Prerequisites

- **Node.js** 20+ and npm
- **PostgreSQL** database (Neon, Railway, or local)
- **Supabase** project (for authentication)
- **Stripe** account (for subscriptions)
- **Mapbox** account (for maps) — see [Maps](#maps)

### Local Development

```bash
# Clone and install
git clone <repo-url>
cd clear-edge-properties
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys (see .env.example for all required vars)

# Push database schema
npm run db:push

# Start dev server (http://localhost:5000)
npm run dev
```

### Docker (Local Dev with Postgres)

```bash
cp .env.example .env
# Edit .env with your API keys

docker-compose up
# App at http://localhost:5000, Postgres at localhost:5432
```

### Deploy to Railway

1. Connect your GitHub repo to a new Railway project
2. Add a PostgreSQL service (or use your existing Neon database)
3. Set all environment variables from `.env.example` in Railway dashboard
4. Railway auto-deploys on push to `main`

The app uses a multi-stage Dockerfile -- Railway will detect and build it automatically.

## Maps

All maps use Mapbox GL JS: Browse (split list/map), Dashboard, the property
drawer, the landing-page teaser, and Property Search, where results default to a
split view with cards on the left and a map on the right. Clicking a marker
highlights its card; hovering a card highlights its marker.

- Set `VITE_MAPBOX_ACCESS_TOKEN` to a **public** Mapbox token (`pk.*`). Create one at
  <https://account.mapbox.com/access-tokens/> and add URL restrictions for your
  domains. It's a build-time variable, so set it before `npm run build`.
- Without a token the app still works: in-app maps show a "Map unavailable"
  placeholder and the landing page falls back to a static illustration.
- Styles: `mapbox://styles/mapbox/light-v11` for data maps, `streets-v12` for the
  single-property location map.
- mapbox-gl is lazy-loaded, so pages without a map don't download it.
- Keep the Mapbox attribution control visible (required by Mapbox's terms).

## Security headers & CORS

`helmet` sets security headers on every response. A Content-Security-Policy is
enforced in production only (Vite's dev server needs inline scripts and an HMR
websocket). If you add a new third-party script, API or frame source, add it to
the CSP directives in `server/index.ts`.

`/api` is same-origin only by default. To allow browser calls from other origins,
set `ALLOWED_ORIGINS` to a comma-separated list, e.g.
`ALLOWED_ORIGINS=https://app.example.com,https://partner.example.com`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build frontend (Vite) and backend (esbuild) for production |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema to database |
