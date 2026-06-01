-- ===========================================================================
-- Supabase RLS remediation for ClearEdgeProperties (oqqmaipbieirijzlscls)
-- Drafted 2026-05-31 during the re-platform. REVIEW BEFORE APPLYING.
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
-- extension and enabling RLS on it is a known false-positive.
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
