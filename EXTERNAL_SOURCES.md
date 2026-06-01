# External Sources & Integrations — ClearEdge (post-Supabase re-platform)

**Updated:** 2026-05-31. Status reflects the current `.env`.

## Summary of what works right now

| Capability | Backing source | Needs key? | Status today |
|---|---|---|---|
| Browse / search the property catalog | **Supabase** `properties` (1,108 rows, n8n-fed) | DB only | ✅ **Works** |
| Property details + financial metrics | Supabase `properties` + `property_details` | DB only | ✅ Works |
| Save / track properties (pipeline) | Supabase `user_properties` | DB only | ✅ Works |
| Save **multiple** results per search | Supabase upsert + track | DB only | ✅ Works |
| White-label branding | Supabase `whitelabel_branding` | DB only | ✅ Works |
| Deals / dashboard / recommendations | Supabase data | DB only | ✅ Works |
| Dev login (auto dev user) | local fallback | none | ✅ Works |
| **Live external search** (Zillow/LoopNet/Redfin) | RapidAPI | `RAPIDAPI_KEY` | ⚠️ **Needs key** (placeholder) |
| **AI** commentary / underwriting / offer / LOI | OpenAI | `OPENAI_API_KEY` | ⚠️ Needs key |
| Demographics / walk score / crime enrichment | Walk Score, Crimeometer | `WALKSCORE_API_KEY`, `CRIMEOMETER_API_KEY` | ⚠️ Needs keys (optional) |
| Subscriptions / checkout / billing webhook | Stripe | `STRIPE_*` | ⚠️ Needs keys |
| **Real** (non-dev) Supabase Auth login | Supabase Auth | `SUPABASE_URL` + service-role + anon | ❌ **Wrong project** (points at inactive `uvtzu…`, not ClearEdgeProperties) |

> Net: everything backed by the **Supabase database works today**. Everything backed by a **third-party API is dark** because those keys are placeholders.

## The sources in detail

### 1. Supabase (database) — ✅ configured
- **Powers:** all property data, tracking, branding, tenants/users. Project `ClearEdgeProperties` (`oqqmaipbieirijzlscls`).
- **Env:** `DATABASE_URL` (transaction pooler, `postgres.<ref>` user). Active and validated.
- **Files:** `server/db.ts`, `server/storage.ts`.

### 2. Supabase (auth) — ❌ misconfigured
- **Powers:** real user login (`verifySupabaseUser`). Dev mode bypasses it.
- **Env:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server verify), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client).
- **Problem:** these point at project `uvtzuotplwilmwoaewzh` (inactive) — DNS fails (`ENOTFOUND ...supabase.co`). Repoint all four at `oqqmaipbieirijzlscls`. Anon/publishable key for that project: `sb_publishable_4K2SL756Bj1khESZMV8MBA_Uu0OiISN`. **Service-role key must come from you** (Supabase dashboard → Project Settings → API).
- **Files:** `server/lib/supabase.ts`, `client/src/lib/supabase.ts`.

### 3. RapidAPI — ✅ key set; subscription verified per source (2026-05-31)
- **Powers:** live on-demand property search (the "way to find new properties").
- **Env:** `RAPIDAPI_KEY` (single account-level key — now set to the n8n key).
- **Verified subscription status for this key** (probed live):

  | RapidAPI host | App lib | Subscribed? |
  |---|---|---|
  | `redfin-com-data.p.rapidapi.com` | `server/lib/redfin-api.ts` | ✅ yes (returns data) |
  | `us-housing-market-data1.p.rapidapi.com` | *(none yet — n8n's source)* | ✅ yes (PRO plan) |
  | `unofficial-crexi-data.p.rapidapi.com` | *(none yet — commercial)* | ✅ yes |
  | `loopnet-api.p.rapidapi.com` | `server/lib/loopnet-api.ts` | ✅ yes |
  | `zillow-com1.p.rapidapi.com` | `server/lib/zillow.ts` | ❌ **NOT subscribed** |

- **Key correction:** the app's `zillow.ts` targets `zillow-com1`, which this account is **not** subscribed to. The account's actual housing source is **`us-housing-market-data1`**. Action: repoint `zillow.ts` → `us-housing-market-data1` (needs its endpoint/response mapping), OR subscribe to `zillow-com1`.
- **Crexi** (`unofficial-crexi-data`) is subscribed but has **no app lib yet** — this is the commercial-RE source Grok's roadmap proposed (Phase 2). Worth adding a `server/lib/crexi.ts`.
- **Endpoint discovery:** the four RapidAPI MCP servers in `/.mcp.json` (root) expose each API's real endpoints/params via the RapidAPI MCP gateway. Load them (new session) to map exact endpoints and wire/repoint the libs precisely.
- **Live test status:** key authenticates against the app (no 401); Redfin endpoint reachable but its location→regionId resolution returned 0 for a test query — needs endpoint mapping (do via MCP).

### 4. OpenAI — ⚠️ needs key
- **Powers:** AI commentary, underwriting, offer generation, letter-of-intent.
- **Env:** `OPENAI_API_KEY`. **Files:** `server/lib/openai.ts`, `server/lib/ai-commentary.ts`, `server/routes/ai.ts`.

### 5. Walk Score + Crimeometer — ⚠️ optional enrichment
- **Powers:** neighborhood walk score, crime/demographics overlays.
- **Env:** `WALKSCORE_API_KEY`, `CRIMEOMETER_API_KEY`. **File:** `server/lib/demographics.ts`.

### 6. Stripe — ⚠️ needs keys
- **Powers:** subscription checkout + billing webhook (now tenant-scoped).
- **Env:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLIC_KEY`.
- **Files:** `server/lib/stripe.ts`, `server/webhooks/stripe.ts`, `server/routes/subscriptions.ts`.

## Removed integrations (retired in re-platform)
The app's own zip-scraper / job-scheduler / bulk-import / property-monitoring are gone — **n8n owns bulk ingestion** into Supabase now. The app only does *live, user-initiated* search via RapidAPI and *saves* chosen results.

## To go fully live, fill these in `.env`
1. `RAPIDAPI_KEY` — from the n8n RapidAPI account (verify it's subscribed to the 3 hosts above).
2. `OPENAI_API_KEY`.
3. `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → ClearEdgeProperties.
4. `STRIPE_*` (only if enabling billing).
5. `WALKSCORE_API_KEY` / `CRIMEOMETER_API_KEY` (optional).
