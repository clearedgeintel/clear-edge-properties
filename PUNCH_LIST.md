# ClearEdge Props — Master Punch List

**Last reviewed:** 2026-10-31
**This is the single source of truth for open work.** It consolidates and supersedes:
`ROADMAP.md` (Mar 2026), `CLEAREDGE_ROADMAP.md` (May 2026), `REPLATFORM_PLAN.md`,
`SCHEMA_RECONCILIATION.md`, the open items in `EXTERNAL_SOURCES.md`, and follow-ups from
PRs #1–#7. Those files remain as historical records.

Every item below was checked against the code, `.env`, and the Supabase project on the
review date, not copied forward from the older docs. The older docs are stale in places;
for example, `RAILWAY.md` still says the Stripe webhook is broken (fixed in May).

**Legend:** `[ ]` open · `[~]` partly done · 🔑 needs a key/setting from the owner ·
❓ needs an owner decision · Source = where the item came from.

---

## P0 — Security and money (do first)

- [x] **Row-level security (RLS) on the 17 exposed public tables we own.** Done 2026-10-31.
  - Applied as Supabase migration `enable_rls_on_exposed_public_tables`, recorded in
    `SECURITY_RLS.sql`.
  - **Before:** the anon key (shipped in the browser bundle) could read 1,124
    properties, the `tenants` row and every other table, and could write to them.
  - **After:** the anon key reads 0 rows, and updates/deletes affect 0 rows.
  - **App unaffected:** smoke-tested auth/tenant, catalog, property detail, deals,
    stages and a catalog write. The server connects as `postgres`, which bypasses RLS.
  - **The n8n check, resolved by evidence:** there was no REST traffic, only the
    `postgres` role connects, and n8n hasn't run since 2026-03-16. If n8n is
    reactivated it must use the service-role key or a direct DB connection, not the
    anon key.
  - The lakefront STR tables (`lakes`, `listings`, `str_underwriting`, `settings`)
    were locked too. They belong to a separate workflow, dormant since 2026-07-24;
    its data is unchanged.
- [ ] **Remaining Supabase security warnings** (lower severity):
  - `spatial_ref_sys` (PostGIS reference data) is still writable by anon. The
    `postgres` role can't change it, so open a Supabase support ticket or move
    PostGIS out of `public`.
  - Revoke anon `EXECUTE` on the SECURITY DEFINER functions (`st_estimatedextent`).
    Keep `authenticated` on `get_user_tenant_id` and `user_has_role`, because the
    RLS policies call them.
  - Enable leaked-password protection in Supabase Auth (dashboard setting).
  - Move `pg_trgm` and `postgis` out of the `public` schema.

- [ ] 🔑 **Make billing actually live.**
  - Locally, `STRIPE_WEBHOOK_SECRET` and `VITE_STRIPE_PUBLIC_KEY` are placeholders.
    Confirm both are set on Railway.
  - Then run the end-to-end test that has never been done: checkout →
    `subscription.created` → tier upgrade shows → cancel → downgrade shows.
    Use the Stripe CLI (`stripe listen --forward-to …/webhook/stripe`).
  - The webhook code itself is fixed: raw body, plus atomic idempotency in PR #2.
  - Source: CLEAREDGE_ROADMAP P0.3, ROADMAP 5B.

- [ ] 🔑 **Turn on the features that are dark for lack of keys.** Verify on Railway:
  - `OPENAI_API_KEY` (placeholder locally). Without it, AI commentary, underwriting,
    offer helper and LOI don't work.
  - `RESEND_API_KEY` + `ALERT_FROM_EMAIL` (missing). Saved-search alert emails **never
    send** without them.
  - `APP_BASE_URL` (missing). Needed for the "Add to pipeline" links in alert emails.
  - `VITE_MAPBOX_ACCESS_TOKEN`. Confirm maps render on the live site (PR #4 passed it
    into the Docker build).
  - Optional: `WALKSCORE_API_KEY`, `CRIMEOMETER_API_KEY`, `ALLOWED_ORIGINS`.
  - Source: EXTERNAL_SOURCES, PRs #1/#6.

## P1 — Engineering foundation

- [ ] **Tests + CI.** There are none: no test files, no runner, no GitHub Actions.
  - Add Vitest and a workflow that runs `tsc`, build and tests on each PR.
  - Cover the riskiest logic first: `property-scorer`, `commercial-property-scorer`,
    `tier-limits`, the Stripe webhook, `POST /api/deals` stage rules, and stage reorder.
  - Turn the existing smoke scripts into tests, e.g.
    `scripts/smoke-webhook-idempotency.ts`.
  - Source: CLEAREDGE_ROADMAP P1.6, ROADMAP 7A.
- [ ] **Code-split pages.** All 23 pages are imported eagerly into a ~2.3 MB main bundle.
  Mapbox is already lazy, but the pages aren't. Use `React.lazy` per route in
  `client/src/App.tsx`. Source: ROADMAP 7C.
- [ ] **Health check endpoint** (`/health`) for Railway. It doesn't exist. Source: ROADMAP 7D.
- [ ] **Structured logging.** There are 115 `console.*` calls. Move to `pino` with
  request IDs, and keep the WebSocket console as a transport if it's still useful.
  Source: CLEAREDGE_ROADMAP P1.7, ROADMAP 7D.
- [ ] **Error tracking** (Sentry, server + client). Source: CLEAREDGE_ROADMAP P2.8.
- [~] **Input validation coverage.** Zod is used in many routes now (the newer deals,
  stages and search routes all validate), but there's no shared `validateBody`
  middleware and the older routes (`admin`, `ai`, `api-keys`) still need an audit.
  Source: CLEAREDGE_ROADMAP P1.5.
- [ ] **Upgrade prompt when a plan limit is hit.** The server returns 429 with an upgrade
  URL, but the UI ignores it. Show an upgrade dialog instead of a generic error.
  Source: ROADMAP 5A.
- [ ] **Type cleanup.** 254 `any` usages. Start with a typed error helper for the
  `catch (error: any)` handlers. Source: CLEAREDGE_ROADMAP P2.11, ROADMAP 7B.
- [ ] **Remove the unused `memoizee` and `@types/memoizee`.** Source: CLEAREDGE_ROADMAP P2.11.
- [ ] *(Deferred until there's more than one instance)* Persistent rate limiting (Redis or
  Postgres). Today it's an in-memory `Map`, which is fine on a single Railway instance.
  Source: CLEAREDGE_ROADMAP P2.9, ROADMAP 7C.

## P2 — Product gaps

**Billing and API**
- [ ] Payment-failure (dunning) UX. The webhook already flips accounts to `past_due`;
  users need an in-app banner and an email.
- [ ] Annual billing option.
- [ ] Usage dashboard improvements for API key holders. Source: ROADMAP 5B/5C.

**Deal workflow / CRM.** Already done: documents, activity history, agent lookup, cash
buyers. Still open:
- [ ] Contacts and a communications log per deal. Supabase already has a
  `communications` table, unused.
- [ ] Tasks and follow-up reminders per deal.
- [ ] Track offers and LOIs as records. Supabase has an `offers` table, unused; today the
  LOI is only generated.
- Source: CLEAREDGE_ROADMAP Phase 3, SCHEMA_RECONCILIATION.

**Property intelligence.** Supabase has the data or tables; the app doesn't use them yet.
- [ ] Neighborhood panel (demographics, walkability, crime). The API endpoint exists;
  there's no UI.
- [ ] Price-history timeline. Zillow detail returns the events; the UI shows only a count.
- [ ] What-if scenarios per property (`property_scenarios`: IRR, ARV, exit strategy).
- [ ] Use `property_comparables` and `market_analytics` instead of the ZIP-based comps
  guess in the property drawer.
- [ ] Motivated-seller signals (`motivated_seller_analysis`).
- [ ] Historical price charts on Market Trends, and equity tracking on Portfolio.
  These need time-series data.
- Source: ROADMAP 4A–4C, SCHEMA_RECONCILIATION.

**Alerts and notifications**
- [ ] Weekly market digest email.
- [ ] In-app notifications (the `notifications` and `notification_settings` tables are
  unused).
- Source: ROADMAP 6B.

**Onboarding and mobile**
- [ ] First-run guided tour. Source: ROADMAP 3A.
- [ ] Mobile pass on the pipeline board (drag-and-drop on touch) and a touch-friendly
  photo gallery. Source: ROADMAP 3C.

**Longer term**
- [ ] Scoring that learns from closed deals (needs history). Source: ROADMAP 6C.

## P3 — Search and map enhancements

- [ ] Marker clustering for large result sets.
- [ ] "Search this area" from the map bounds. LoopNet and Crexi support bounding-box
  search; a draw-to-search polygon could use `propertyByPolygon`.
- [ ] Satellite/streets toggle, and a score or cap-rate heatmap layer.
- [ ] Pagination / infinite scroll on search results.
- [ ] Side-by-side compare from search results.
- [ ] Data checks found during testing:
  - The Redfin coordinate field (`latLong`) was never confirmed against a live response.
  - Redfin returned 0 results for Austin, TX.
  - Every Crexi result scored exactly 44, so review the commercial scorer inputs.
- [ ] ❓ Show real listings in the landing-page map teaser? That needs a public endpoint
  exposing only rough locations and scores. Today it uses labelled sample data.
- Source: PRs #1, #3, #5 follow-ups.

## P4 — Housekeeping and docs

- [ ] **Fix `RAILWAY.md`:**
  - Remove the stale "webhook is broken" warning.
  - Remove `SESSION_SECRET` (nothing reads it).
  - Add `VITE_MAPBOX_ACCESS_TOKEN` (build arg), `APP_BASE_URL`, `ALLOWED_ORIGINS`,
    `RESEND_API_KEY` and `ALERT_FROM_EMAIL`.
- [ ] **Clean up the local `.env`.** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` each appear twice; the last one wins.
- [ ] ❓ **Archive or delete** the old `RealDealTracker-main/` copy and
  `RealDealTracker-main.zip` in the parent folder. Their docs match this repo, so nothing
  would be lost.
- [ ] Rename the `realdealtracker` local database in `docker-compose.yml` and
  `.env.example`. Breaks existing local volumes, so announce it.
- [ ] ❓ Pick the canonical API domain for the API docs. Today they show the app's own
  origin.
- [ ] Rename the `/property-details` route. It's the "Financial Analysis" table, not a
  single-property page.

---

## Already done (verified 2026-10-31)

Kept so nobody re-plans finished work. "Source" is the doc that asked for it.

| Item | Source | Where |
|---|---|---|
| Stripe webhook raw body + atomic `event.id` idempotency | CLEAREDGE P0.1–2 | PRs (May), #1, #2 |
| `helmet` (CSP in prod) + `cors` allow-list | CLEAREDGE P1.4 | PR #1 |
| Railway deploy from GitHub (merges to `main` deploy) | ROADMAP 1A, CLEAREDGE P2.10 | live |
| Re-platform onto Supabase; properties read-only, scraping retired (forks A + B) | REPLATFORM_PLAN | May 2026 |
| Supabase Auth pointed at the right project (`oqqmai…`) | EXTERNAL_SOURCES | `.env` |
| Zillow repointed to the subscribed `us-housing-market-data1` host | EXTERNAL_SOURCES | `server/lib/zillow.ts` |
| Crexi integration | CLEAREDGE (deferred), EXTERNAL_SOURCES | `server/lib/crexi-api.ts` |
| Realtor enrichment: contact on results, full detail, agent analytics | product direction | search + Agent Lookup |
| Branding unified to ClearEdge Props | PR #1 | |
| Mapbox maps (Browse, Dashboard, Search, drawer, landing) | PR #1, #3 | |
| Visual system, nav restructure, landing page rebuild | PR #1 | |
| Browse filters reach the server; URL-synced filters | PR #1, #2 | |
| Property Search redesign (split map, image cards, compact filters) | PR #3 | |
| Search → pipeline in one click; bulk add; `DealControl` everywhere | PR #5 | |
| PATCH can't change a deal's tenant/user/property | PR #5 | |
| Deal activity history | CLEAREDGE Phase 3 (partial) | PR #7 |
| Saved-search matches → pipeline (page + email links) | PR #7 | |
| Pipeline stage management | PR #7 | |
| Deal documents (LOIs, contracts) | CLEAREDGE Phase 3 (partial) | `documents.ts` |
| Dashboard, Portfolio, Market Trends, recommendations, AI thesis/risk | ROADMAP 3–6 | |
| Tier limits + billing portal + API docs | ROADMAP 5A–5C | |

## Obsolete (no longer applies)

- "Configure Railway Postgres or keep Neon" (ROADMAP 1A): replaced by Supabase.
- "Split `storage.ts`" (Grok review): unnecessary at its current size.
- Rebuilding multi-platform search, the commercial scorer, white-label or monitoring
  (Grok review): already built. App-side monitoring was retired in favour of n8n.
- `GROK_SUGGESTED_ROADMAP.md`: no longer in the folder or git history. Its verdict is
  recorded at the top of `CLEAREDGE_ROADMAP.md`.

## Owner decisions needed

1. The lakefront STR tables (`lakes`, `listings`, `str_underwriting`, `settings`)
   share the ClearEdge database. Keep them here, or move them to their own project?
   (They're now locked to the service role either way.)
2. Next product bet: the CRM layer (contacts, communications, tasks) or property
   intelligence (scenarios, comps, neighborhood)?
3. A public listing teaser on the landing page: yes or no?
4. Delete the old `RealDealTracker-main` copy?
5. The canonical API domain.
