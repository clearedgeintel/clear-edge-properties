# Schema Reconciliation — App (Drizzle/Neon) vs Supabase `ClearEdgeProperties`

**Date:** 2026-05-31
**Purpose:** Decide how the RealDealTracker app code relates to the existing Supabase `ClearEdgeProperties` project (`oqqmaipbieirijzlscls`) before any DB move.

## TL;DR
These are **not the same schema with drift** — they are **two generations** of the same product. The Supabase project is **newer, richer, multi-tenant, and already holds real data**; the app's Drizzle schema is the **older single-tenant Replit-era model with no data**. "Moving to Supabase" = **re-platforming the app's data layer onto the Supabase schema**, not a `db:push`.

## Side-by-side

| Dimension | App (Drizzle, Neon target) | Supabase `ClearEdgeProperties` |
|---|---|---|
| Tables | 21 (+1 I added) | 32 |
| Primary keys | `serial` integers | `uuid` + natural `zpid` for properties |
| Tenancy | **Single-tenant** (user-owned rows) | **Multi-tenant** (`tenant_id` on nearly every table; `tenants` root) |
| Auth model | `users.id` integer, own auth + Supabase verify | `users.uuid` ↔ `supabase_user_id` + `tenant_id` (native Supabase Auth) |
| Properties | ~20 cols, integer id, `externalId` | **~50 cols**, `zpid`-keyed, full Zillow + computed metrics (cap_rate, CoC ROI, DSCR, cash flow, investment_score) |
| Property detail | folded into one table | separate `property_details` (MLS, listing agents, flood/fire/wind/heat/air risk, school districts) |
| Data ingestion | app server libs (`zillow.ts`, `scrapingJobs`, `jobSchedules`) | **n8n workflows** (`workflow_executions`, `error_log`) |
| Deal tracking | `watchlist` (status enum) + `dealEvents` | `user_properties` + `pipeline_stages` + `property_activities` (richer Kanban + timeline) |
| Live data | **0 rows** (never connected) | **1,108** properties, **601** details, **177** workflow runs, 18 market markets |

## Capabilities Supabase already has that the app does NOT
- Multi-tenancy (`tenants`, per-tenant limits/credits)
- **The entire "communication platform" Grok proposed as future Phase 3**: `communications`, `documents`, `property_activities`, `offers`, `lender_connections`, `prequalifications`
- `property_scenarios` — multiple what-if financial models per property (IRR, exit strategy, ARV…)
- `property_comparables`, `motivated_seller_analysis` (FSBO/NLP), `realtor_enriched_data`
- `market_analytics` (absorption rate, months of inventory, sold-to-list ratio), `market_templates`
- `saved_searches` + `saved_search_matches`, layered `notifications`/`notification_settings`
- Billing as `billing_transactions` + credits on `tenants`

## Capabilities the app has that Supabase does NOT (yet)
- `whitelabel_branding` (white-label) — **no equivalent table in Supabase**
- `subscription_packages` catalog (Supabase encodes tier/limits on `tenants` instead)
- `api_keys` (hashed external API keys) — Supabase has `api_usage`/`api_call_logs` but no key store
- The Stripe **webhook idempotency** + fix just added (Phase 0) — lives in the app/Drizzle layer

## Conflict if we naively `db:push` the Drizzle schema into Supabase
It would create a **second** `properties` table (integer-keyed, empty) colliding conceptually with the existing `zpid`-keyed table that has 1,108 rows, plus duplicate `users`, `property_alerts`, `api_usage` with different shapes. **Do not do this.**

## Options
1. **Adopt Supabase as source of truth (recommended).** Re-platform the app: regenerate types from Supabase, rewrite `storage.ts`/`schema.ts` to the Supabase model, switch driver `@neondatabase/serverless → postgres-js`, wire auth to the `tenants`/`users` model. Port the 3 app-only pieces (white-label, api_keys, webhook idempotency) into Supabase as new tables. Largest effort, best outcome — keeps the better system + real data.
2. **App schema as source of truth.** Push the 21 tables to a *clean* Supabase project; abandon the existing ClearEdgeProperties data/n8n pipeline. Smaller code change, but throws away the more advanced backend and 1,108 properties.
3. **Keep them separate.** App stays on its own DB (needs a real Neon/Supabase connection string); ClearEdgeProperties remains a separate n8n data product. Defer integration.

## Impact on Phase 0
The Stripe webhook fix targets the app's Drizzle layer. If we adopt Supabase (option 1), billing re-platforms onto `billing_transactions`/`tenants`, and the idempotency table moves there too. The *fix is still correct*; its final home depends on this decision.
