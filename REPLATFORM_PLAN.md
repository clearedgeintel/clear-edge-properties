# Re-platform Plan — App → Supabase `ClearEdgeProperties`

**Decision (2026-05-31):** Adopt the Supabase `ClearEdgeProperties` schema as source of truth; re-platform the app's data layer onto it. See [SCHEMA_RECONCILIATION.md](SCHEMA_RECONCILIATION.md).

## Surface area
- **125 `storage.*` call sites** across **18 files**; ~60 distinct methods.
- Driver today: `@neondatabase/serverless` + Drizzle (`server/db.ts`). Target: `postgres-js` + Drizzle against Supabase Postgres (trusted server, tenant scoping enforced in queries).
- Generated types already captured: `shared/database.types.ts` (36 entries incl. views `properties_with_motivation`, `user_properties_full`).

## How each app subsystem maps

| App storage area (call sites) | Supabase target | Disposition |
|---|---|---|
| `users`, `getUserByEmail/StripeCustomerId`, stripe info | `users` (uuid, tenant_id, supabase_user_id) + `tenants` | **Rewrite** — integer→uuid, add tenant context |
| `properties` read (`getProperties`, `getProperty`, `getPublishedProperties`) | `properties` (zpid) + `property_details` + view `properties_with_motivation` | **Rewrite as read** over n8n-populated data |
| `properties` write (`createProperty`, `updateProperty`, `deleteProperty`, `togglePublished`) | — (n8n owns ingestion) | **⚠ FORK A** — retire or keep manual entry? |
| `watchlist` (`addToWatchlist`, `getUserWatchlist`, `isInWatchlist`, `updateWatchlistItem`…) | `user_properties` + `pipeline_stages` + `property_activities` | **Rewrite** (richer model) |
| `subscriptionPackages` (CRUD) | tier/limits live on `tenants`; no catalog table | **Rewrite** — keep a small catalog table or fold into tenants |
| `whitelabelBranding` (CRUD) | **none in Supabase** | **Port** — create `whitelabel_branding` table |
| `apiKeys` / `apiUsage` | `api_usage`, `api_call_logs` exist; no key store | **Port** key store; reuse usage tables |
| Stripe webhook idempotency (`processed_webhook_events`) | **none** | **Port** — create table (Phase 0 work) |
| `searchHistory`, `getSearchHistoryStats` | `saved_searches` + `api_call_logs` + `workflow_executions` | **Rewrite/merge** |
| `propertyMonitoring` + history (10 calls) | `property_alerts` + `saved_searches` + `saved_search_matches` + `notifications` | **Rewrite onto alert model** |
| **Scraping subsystem**: `zipCodeScraping` (22), `scrapingJobs`, `jobSchedules`, `jobScheduleRuns` + libs (`zip-code-scraper`, `bulk-property-updater`, `property-archiver`, `property-import`) | **none — replaced by n8n** (`workflow_executions`, `error_log`) | **⚠ FORK B — retire (recommended)** |

### Two scope forks that change a lot of work
- **FORK A — Property writes:** In Supabase, properties come from n8n and are keyed by `zpid`. The app's `createProperty/updateProperty/deleteProperty` (manual/scraped) don't fit. Options: (a) make properties **read-only** in the app (recommended — n8n is the writer); (b) keep a manual-entry path writing synthetic zpids.
- **FORK B — Scraping/job subsystem (~40% of call sites):** The app's own Zillow/zip scraping + job scheduler is **superseded by n8n**. Options: (a) **retire** it — delete those routes/libs/tables, big simplification (recommended); (b) port it anyway (large, duplicates n8n).

Resolving A=read-only and B=retire removes ~50 of the 125 call sites from the rewrite entirely.

## Auth / tenant model
- App is effectively single-tenant today (Supabase-verified user → integer row). Supabase model is multi-tenant: every row carries `tenant_id`; `users.supabase_user_id` links to Supabase Auth.
- Plan: on auth, resolve `supabase_user_id` → `users` row → `tenant_id`; attach `{ userId, tenantId }` to the request; scope every query by `tenantId`. Seed one tenant for the current org to start.

## Phasing (after forks resolved)
1. **Driver + client**: add `postgres-js`, rewrite `server/db.ts`, env = Supabase connection string. *(needs DB password)*
2. **Schema**: replace `shared/schema.ts` Drizzle tables with definitions mirroring Supabase (uuid/zpid/tenant_id), re-export types from `database.types.ts` where practical.
3. **Port app-only tables** into Supabase via migrations: `whitelabel_branding`, `api_keys`, `processed_webhook_events`.
4. **Storage rewrite**: reimplement the *kept* methods against the new schema with tenant scoping; delete retired ones.
5. **Auth middleware**: tenant resolution + scoping.
6. **Routes/libs**: update call sites; delete retired scraping routes/libs.
7. **RLS**: policies for the 14 exposed tables (server uses service role / direct connection, so RLS protects the anon-key surface).
8. **Wire creds + smoke test**: billing webhook, a property read, a watchlist add.

## Blocked on user
- **Supabase Postgres connection string (with DB password)** for server-side Drizzle — not retrievable via MCP. Direct: `postgresql://postgres:[PASSWORD]@db.oqqmaipbieirijzlscls.supabase.co:5432/postgres` or the pooler URL from the dashboard.
- Non-secret, already captured: URL `https://oqqmaipbieirijzlscls.supabase.co`; anon/publishable keys.
