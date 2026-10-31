# ClearEdgeProps — Validated Roadmap

> **Superseded:** open work is now tracked in [PUNCH_LIST.md](PUNCH_LIST.md) (reviewed 2026-10-31). This file is kept as a historical record.

**Date:** 2026-05-30
**Author:** Claude (Anthropic) — independent verification of the Grok review against the actual codebase, plus a corrected forward plan.
**Method:** 6 parallel code-auditors read the real files; every Grok claim was checked against source (line counts, grep, file reads). Findings below are evidence-backed, not restated assertions.

---

## Part 1 — Verdict on the Grok Review

**Bottom line: ~40% accurate. Trust the *categories* of debt it named, distrust its specifics and its feature list.** It correctly smelled real problems (no tests, loose typing, no Redis/structured logging, missing security middleware) but its flagship claim is off by 35×, it proposes 5 already-built features as "new," and it missed the one genuinely critical bug in the codebase.

### Scorecard

| Grok claim | Verdict | Reality |
|---|---|---|
| `storage.ts` is **~28k LOC**, monolithic | ❌ **FALSE** | **803 lines**, clean `IStorage` facade. 35× overstatement. |
| Routes were split | ✅ TRUE | 13 route modules. |
| Solid client/server/shared separation | ✅ TRUE | Confirmed. |
| `schema.ts` has 20+ tables | ✅ TRUE | 21 `pgTable` defs. |
| Replit files remain (`.replit`, `replit.md`) | ❌ FALSE | Already removed (only in `.dockerignore`). |
| Unused deps | ⚠️ PARTLY | Only `memoizee` (+types) truly unused; `html2canvas` is dynamic-import only. Most cruft already pruned. |
| Legacy passport + Supabase remnants | ⚠️ PARTLY | Passport **fully removed**. Supabase is the **active** prod auth, not a remnant. Vestigial dev-only `/api/auth/signin`. |
| Duplicate scoring JS in `attached_assets` | ❌ FALSE | Only `.txt`/`.xlsx`/`.png` artifacts. No code. |
| Many `any` types | ✅ TRUE | **328 total** (274 in server). Real debt. |
| Zod validation missing | ⚠️ PARTLY | Zod **exists** (26 schemas) but only ~20% of endpoints validate input. The gap is *coverage*, not absence. |
| Almost no tests | ✅ **TRUE** | **Zero** test files, no test runner, no CI. |
| TypeScript strict mode off | ❌ FALSE | `strict: true` **already on** — `any` is deliberate casting, not config. |
| In-memory rate limiting, no Redis | ✅ TRUE | `Map`-based; fine for single instance, breaks on horizontal scale. |
| console.log + WS logging insufficient | ✅ TRUE | 162 console calls, no pino/winston/Sentry. |
| Docker + Railway-ready | ✅ TRUE | Dockerfile + compose present; Railway auto-deploy not yet wired. |
| Stripe/OpenAI/tiered limits well done | ✅ TRUE | Genuinely solid (hashed API keys, tier middleware, metered usage). |
| Helmet/CORS/sanitization missing | ✅ TRUE | No helmet, no cors package. Real gap. |
| **Crexi** integration is new | ✅ TRUE | Not present (LoopNet covers commercial). The *one* net-new idea worth weighing. |
| **CommercialPropertyScorer** to build | ❌ FALSE | **Already exists** (365 LOC, cap rate / NOI / DSCR / CoC). |
| Multi-platform search to build | ❌ FALSE | **Already exists** (Zillow + LoopNet + Redfin, unified). |
| White-label branding to build | ❌ FALSE | **Already exists** (table + full CRUD routes). |
| Monitoring/watchlist to build | ❌ FALSE | **Already exists** (change detection, history, alerts). |
| Communication tables (agents/messages/tasks/contacts) | ✅ TRUE | Genuinely absent — the only real greenfield in Grok's "Phase 3." |

### What Grok MISSED (and it's the most important thing)

🔴 **CRITICAL — Stripe webhook signature verification is broken.**
`express.json()` ([server/index.ts:9](server/index.ts#L9)) runs before `setupStripeWebhooks` (called inside `registerRoutes`), and the webhook route never uses `express.raw()`. So `stripe.webhooks.constructEvent(req.body, …)` ([server/webhooks/stripe.ts:17](server/webhooks/stripe.ts#L17)) gets a parsed object instead of the raw Buffer → **every real webhook fails verification and is dropped.** Subscription create/update/cancel and payment events never reach the handler. Paid upgrades and cancellations silently don't apply. There is also **no idempotency** (replays double-process). This is the #1 fix.

---

## Part 2 — The Corrected Roadmap

Priorities re-ranked by *verified impact*, not by Grok's ordering. We do **not** rebuild already-shipped features.

### Phase 0 — Stop the bleeding (days, not weeks)
1. **Fix the Stripe webhook** — register the route with `express.raw({type:'application/json'})` *before* the global JSON parser (or mount the raw parser only on `/webhook/stripe`). Verify with Stripe CLI `stripe listen --forward-to`.
2. **Add webhook idempotency** — dedupe on `event.id` (a `processed_webhook_events` table or check against existing state) so replays/retries don't double-charge or double-provision.
3. **Smoke-test the billing path end-to-end** in test mode: checkout → subscription.created → tier upgrade reflected; cancel → downgrade reflected.

### Phase 1 — Real hardening (1–2 weeks)
4. **Security middleware** — add `helmet` + `cors` (explicit allow-list), in front of `/api`. Low effort, real exposure reduction.
5. **Validation coverage** — extend the *existing* Zod pattern to the ~80% of endpoints that read `req.body`/`query`/`params` unguarded. Worst offenders: `admin.ts`, `ai.ts`, `api-keys.ts`. Make a `validateBody(schema)` middleware so it's one line per route.
6. **Testing foundation** — Vitest + a `test` script + CI (GitHub Actions: build, `tsc`, test). Seed coverage on the highest-risk pure logic first: `property-scorer.ts`, `commercial-property-scorer.ts`, `tier-limits.ts`, and the webhook handler.
7. **Structured logging** — replace 162 `console.*` with `pino` (keep the WS broadcaster as a pino transport if the live console UI is valued). Add request IDs.

### Phase 2 — Scale & observability (1–2 weeks, when traffic justifies)
8. **Sentry** for error tracking (server + client).
9. **Redis** (Upstash/Railway) — only once you run >1 instance; move rate-limiting and search/demographics caching off the in-process `Map`. Until then, in-memory is acceptable — don't over-build.
10. **Railway auto-deploy** — finish the GitHub → Railway pipeline (Docker already done).
11. **Cleanup** — drop `memoizee`/`@types/memoizee`; move `html2canvas` to a lazy chunk; trim the ~328 `any` (start with the 24 `error: any` handlers via a typed error helper).

### Phase 3 — The one genuinely-new feature: Communication / CRM layer (3–4 weeks)
This is the *only* part of Grok's Phase 3 that isn't already built. Everything else (deal status, monitoring, branding) exists.
- New tables: `agents`, `contacts`, `messages`, `tasks` — but **build on** the existing `watchlist.status` enum and `dealEvents` rather than replacing them.
- "Connect with listing agent," activity timeline per deal, task automation, optional in-app messaging over the WS infra that already exists.
- AI assist (draft agent email, comp summary) reuses the existing `openai.ts` + usage-metering plumbing.

### Deliberately deferred / declined
- **Crexi** — legitimately new, but LoopNet already covers commercial. Treat as an *inventory expansion* decision, not a debt item. Revisit after Phase 3.
- **Rebuilding** multi-platform search, commercial scorer, white-label, monitoring — **do not.** They ship today.
- **Splitting `storage.ts`** — unnecessary at 803 lines. Revisit only if it crosses ~1,500–2,000.

---

## Suggested immediate next actions
1. Patch the Stripe webhook raw-body bug + add idempotency (Phase 0).
2. Add `helmet`/`cors` and a `validateBody` middleware (quick wins).
3. Stand up Vitest + CI; write the first scorer/webhook tests.
4. Decide whether the Communication/CRM layer (Phase 3) is the next *product* bet vs. continued hardening.

*This roadmap supersedes `GROK_SUGGESTED_ROADMAP.md`, which should be kept only as a record of the external review.*
