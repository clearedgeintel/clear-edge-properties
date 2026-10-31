-- ===========================================================================
-- Supabase RLS remediation for ClearEdgeProperties (oqqmaipbieirijzlscls)
-- Drafted 2026-05-31 during the re-platform.
-- APPLIED 2026-10-31 as Supabase migration `enable_rls_on_exposed_public_tables`
-- (this file + the 4 STR tables below). Verified: anon key reads 0 rows and
-- writes affect 0 rows; the app server (postgres role) is unaffected.
-- The n8n check below was resolved by evidence: no PostgREST traffic, only the
-- `postgres` role connects, and n8n has not run since 2026-03-16.
-- ===========================================================================
--
-- WHY: 13 public tables (incl. `properties`, 1,108 rows) have RLS DISABLED, so
-- anyone with the anon/publishable key can read/modify every row via PostgREST.
--
-- HOW THIS IS SAFE FOR THE APP: the Express backend connects with a direct
-- Postgres role (transaction pooler, user `postgres.<ref>`) that BYPASSES RLS.
-- Enabling RLS with NO policies therefore locks out the anon key WITHOUT
-- affecting the server (verified: the re-platform smoke test wrote/read these
-- tables fine while whitelabel_branding/api_keys already had RLS on).
--
-- ⚠ BEFORE YOU RUN THIS — ONE CHECK:
--   Confirm the n8n workflows that ingest properties write using the SERVICE
--   ROLE key (which bypasses RLS). If n8n uses the ANON key, the statements
--   below WILL break ingestion. (Service role is the Supabase default for
--   server-to-server automation, so this is very likely already the case.)
--
-- spatial_ref_sys is intentionally omitted — it is owned by the PostGIS
-- extension (supabase_admin). A REVOKE of anon writes was attempted on
-- 2026-10-31 but is a no-op for the postgres role; fixing it needs Supabase
-- support or moving PostGIS out of `public`.
-- ---------------------------------------------------------------------------

-- Shared reference data (read by the server; written by n8n via service role)
ALTER TABLE public.properties                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_details           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_comparables       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_analytics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivated_seller_analysis  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtor_enriched_data      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_template_markets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_alerts            ENABLE ROW LEVEL SECURITY;

-- Tenant / operational tables
ALTER TABLE public.tenants                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_log                  ENABLE ROW LEVEL SECURITY;

-- Lakefront STR underwriting tables (separate workflow sharing this DB;
-- dormant since 2026-07-24). Added when applied on 2026-10-31.
ALTER TABLE public.listings                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.str_underwriting           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lakes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings                   ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- OPTIONAL (only if you later let the browser read Supabase directly with the
-- anon key instead of going through the Express API). Until then, leave these
-- out — the no-policy lock above is correct for the current architecture.
--
-- Example: allow authenticated users to read the shared property catalog:
--   CREATE POLICY "auth read properties" ON public.properties
--     FOR SELECT TO authenticated USING (true);
--
-- Example: scope a tenant-owned table to the caller's tenant:
--   CREATE POLICY "tenant isolation" ON public.property_alerts
--     FOR ALL TO authenticated
--     USING (tenant_id = public.get_user_tenant_id());
-- ---------------------------------------------------------------------------
