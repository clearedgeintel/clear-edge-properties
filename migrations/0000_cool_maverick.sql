-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "spatial_ref_sys" (
	"srid" integer NOT NULL,
	"auth_name" varchar(256),
	"auth_srid" integer,
	"srtext" varchar(2048),
	"proj4text" varchar(2048),
	CONSTRAINT "spatial_ref_sys_srid_check" CHECK ((srid > 0) AND (srid <= 998999))
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"subscription_tier" text DEFAULT 'free' NOT NULL,
	"subscription_status" text DEFAULT 'active',
	"api_credits_remaining" integer DEFAULT 0,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"max_users" integer DEFAULT 1,
	"max_tracked_properties" integer DEFAULT 5,
	"max_searches_per_month" integer DEFAULT 10,
	"settings" jsonb DEFAULT '{"branding":{"logo_url":null,"company_name":null,"primary_color":"#3B82F6"},"features":{"api_access":false,"white_label":false,"team_collaboration":false},"notifications":{"default_alert_channels":["email"]}}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "tenants_slug_key" UNIQUE("slug"),
	CONSTRAINT "tenants_stripe_customer_id_key" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"workflow_name" text NOT NULL,
	"execution_status" text NOT NULL,
	"properties_processed" integer DEFAULT 0,
	"properties_added" integer DEFAULT 0,
	"properties_updated" integer DEFAULT 0,
	"errors_count" integer DEFAULT 0,
	"execution_time_seconds" integer,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"error_details" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"zpid" text,
	"workflow_name" text NOT NULL,
	"error_type" text NOT NULL,
	"error_message" text,
	"error_data" jsonb,
	"retry_count" integer DEFAULT 0,
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_call_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"api_name" text NOT NULL,
	"endpoint" text,
	"request_method" text,
	"request_params" jsonb,
	"response_status" integer,
	"response_time_ms" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "api_call_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "whitelabel_branding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_name" text,
	"logo_url" text,
	"primary_color" text,
	"secondary_color" text,
	"font_family" text,
	"report_footer" text,
	"license_number" text,
	"broker_name" text,
	"disclaimer_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whitelabel_branding_tenant_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "whitelabel_branding" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"key_name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"rate_limit" integer DEFAULT 1000 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_key" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "properties" (
	"zpid" text PRIMARY KEY NOT NULL,
	"search_market" text NOT NULL,
	"address" text,
	"address_street" text,
	"address_city" text,
	"address_state" text,
	"address_zip" text,
	"full_address" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"county" text,
	"home_status" text,
	"home_type" text,
	"listing_status" text,
	"days_on_zillow" integer,
	"price" numeric(12, 2),
	"list_price" numeric(12, 2),
	"zestimate" numeric(12, 2),
	"rent_estimate" numeric(12, 2),
	"rent_zestimate" numeric(12, 2),
	"tax_assessed" numeric(12, 2),
	"tax_assessed_value" numeric(12, 2),
	"size_sq_ft" numeric(12, 2),
	"living_area_sq_ft" numeric(12, 2),
	"price_per_sq_ft" numeric(8, 2),
	"num_beds" integer,
	"num_baths" numeric(3, 1),
	"year_built" integer,
	"down_payment" numeric(12, 2),
	"closing_costs" numeric(12, 2),
	"total_cash_needed" numeric(12, 2),
	"monthly_mortgage" numeric(12, 2),
	"monthly_taxes" numeric(12, 2),
	"monthly_expenses" numeric(12, 2),
	"monthly_cash_flow" numeric(12, 2),
	"annual_cash_flow" numeric(12, 2),
	"cap_rate_percent" numeric(5, 2),
	"cash_on_cash_roi" numeric(5, 2),
	"dscr" numeric(4, 2),
	"five_year_gain" numeric(12, 2),
	"equity_at_purchase" numeric(12, 2),
	"investment_score_percent" numeric(5, 2),
	"is_cash_flow_negative" boolean DEFAULT false,
	"is_rent_estimate_missing" boolean DEFAULT false,
	"is_below_zestimate" boolean,
	"is_foreclosure" boolean DEFAULT false,
	"is_new_construction" boolean DEFAULT false,
	"url" text,
	"img_main" text,
	"fetch_count" integer DEFAULT 1,
	"last_fetched_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_details" (
	"zpid" text PRIMARY KEY NOT NULL,
	"mls_id" text,
	"mls_name" text,
	"listing_agent_name" text,
	"listing_agent_phone" text,
	"listing_agent_email" text,
	"co_listing_agent_name" text,
	"co_listing_agent_phone" text,
	"brokerage_name" text,
	"brokerage_phone" text,
	"premier_agent_name" text,
	"premier_agent_business" text,
	"premier_agent_phone" text,
	"property_tax_rate" numeric(5, 4),
	"annual_property_tax" numeric(12, 2),
	"annual_homeowners_insurance" numeric(12, 2),
	"lot_size_acres" numeric(8, 2),
	"frontage_feet" numeric(8, 2),
	"flood_risk_label" text,
	"flood_risk_score" integer,
	"fire_risk_label" text,
	"fire_risk_score" integer,
	"wind_risk_label" text,
	"wind_risk_score" integer,
	"heat_risk_label" text,
	"heat_risk_score" integer,
	"air_risk_label" text,
	"air_risk_score" integer,
	"primary_school_district" text,
	"middle_school_district" text,
	"high_school_district" text,
	"schools_summary" text,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_comparables" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"zpid" text NOT NULL,
	"comp_zpid" text,
	"comp_address" text,
	"comp_city" text,
	"comp_state" text,
	"comp_zip" text,
	"comp_price" numeric(12, 2),
	"comp_price_per_sqft" numeric(8, 2),
	"comp_beds" integer,
	"comp_baths" numeric(3, 1),
	"comp_sqft" integer,
	"comp_lot_sqft" integer,
	"comp_year_built" integer,
	"sale_date" date,
	"distance_miles" numeric(5, 2),
	"similarity_score" numeric(5, 2),
	"comp_source" text DEFAULT 'zillow',
	"comp_url" text,
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "market_analytics" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"market" text NOT NULL,
	"snapshot_date" date NOT NULL,
	"total_listings" integer,
	"new_listings_7d" integer,
	"new_listings_30d" integer,
	"avg_days_on_market" numeric(8, 2),
	"median_days_on_market" integer,
	"median_price" numeric(12, 2),
	"avg_price" numeric(12, 2),
	"min_price" numeric(12, 2),
	"max_price" numeric(12, 2),
	"median_price_per_sqft" numeric(8, 2),
	"price_change_7d_percent" numeric(5, 2),
	"price_change_30d_percent" numeric(5, 2),
	"price_change_90d_percent" numeric(5, 2),
	"avg_investment_score" numeric(5, 2),
	"median_investment_score" numeric(5, 2),
	"properties_positive_cashflow" integer,
	"percent_positive_cashflow" numeric(5, 2),
	"avg_monthly_cash_flow" numeric(12, 2),
	"avg_cap_rate" numeric(5, 2),
	"avg_cash_on_cash_roi" numeric(5, 2),
	"absorption_rate" numeric(5, 2),
	"months_of_inventory" numeric(5, 2),
	"sold_to_list_price_ratio" numeric(5, 2),
	"price_distribution" jsonb DEFAULT '{"100k_200k":0,"200k_300k":0,"300k_400k":0,"400k_500k":0,"over_500k":0,"under_100k":0}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "market_analytics_market_snapshot_date_key" UNIQUE("market","snapshot_date")
);
--> statement-breakpoint
CREATE TABLE "motivated_seller_analysis" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"zpid" text NOT NULL,
	"motivation_score" integer NOT NULL,
	"motivation_level" text NOT NULL,
	"keywords_found" text[],
	"urgent_keywords" text[],
	"moderate_keywords" text[],
	"mild_keywords" text[],
	"negative_keywords" text[],
	"is_fsbo" boolean DEFAULT false,
	"emails_in_description" text[],
	"phones_in_description" text[],
	"analyzed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "motivated_seller_analysis_zpid_analyzed_at_key" UNIQUE("zpid","analyzed_at")
);
--> statement-breakpoint
CREATE TABLE "realtor_enriched_data" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"agent_name" text NOT NULL,
	"email" text,
	"phone" text,
	"website" text,
	"linkedin" text,
	"facebook" text,
	"instagram" text,
	"brokerage_name" text,
	"brokerage_website" text,
	"cities" text,
	"states" text,
	"property_count" integer DEFAULT 0,
	"unique_cities" integer DEFAULT 0,
	"unique_states" integer DEFAULT 0,
	"sources" text[],
	"confidence_score" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "realtor_enriched_data_agent_name_key" UNIQUE("agent_name")
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"zpid" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"price_change" numeric(12, 2),
	"event_type" text,
	"event_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "price_history_zpid_event_date_key" UNIQUE("zpid","event_date")
);
--> statement-breakpoint
CREATE TABLE "property_alerts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"zpid" text NOT NULL,
	"alert_type" text NOT NULL,
	"priority" text DEFAULT 'MEDIUM',
	"message" text,
	"alert_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"supabase_user_id" uuid,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"phone" text,
	"role" text DEFAULT 'member' NOT NULL,
	"notification_preferences" jsonb DEFAULT '{"sms":false,"email":true,"slack":false,"in_app":true,"discord":false}'::jsonb,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_tenant_id_email_key" UNIQUE("tenant_id","email"),
	CONSTRAINT "users_supabase_user_id_key" UNIQUE("supabase_user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_properties" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"zpid" text NOT NULL,
	"status" text DEFAULT 'tracking',
	"pipeline_stage_id" uuid,
	"custom_notes" text,
	"tags" text[],
	"is_favorite" boolean DEFAULT false,
	"user_investment_score" numeric(5, 2),
	"custom_analysis" jsonb DEFAULT '{"cons":[],"pros":[],"custom_assumptions":{}}'::jsonb,
	"added_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_properties_user_id_zpid_key" UNIQUE("user_id","zpid")
);
--> statement-breakpoint
ALTER TABLE "user_properties" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"order_index" integer NOT NULL,
	"color" text DEFAULT '#3B82F6',
	"is_default" boolean DEFAULT false,
	"icon" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pipeline_stages_tenant_id_name_key" UNIQUE("tenant_id","name"),
	CONSTRAINT "pipeline_stages_tenant_id_order_index_key" UNIQUE("tenant_id","order_index")
);
--> statement-breakpoint
ALTER TABLE "pipeline_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "property_activities" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_property_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"title" text,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "property_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_property_id" uuid,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_name" text,
	"contact_type" text,
	"contact_email" text,
	"contact_phone" text,
	"communication_method" text,
	"direction" text NOT NULL,
	"subject" text,
	"message" text,
	"follow_up_date" timestamp,
	"is_completed" boolean DEFAULT false,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "communications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_property_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"notes" text,
	"tags" text[],
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "property_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_property_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scenario_name" text NOT NULL,
	"is_baseline" boolean DEFAULT false,
	"purchase_price" numeric(12, 2),
	"down_payment_percent" numeric(5, 2) DEFAULT '20',
	"interest_rate" numeric(5, 3) DEFAULT '7.0',
	"loan_term_years" integer DEFAULT 30,
	"closing_costs_percent" numeric(5, 2) DEFAULT '3.0',
	"closing_costs_fixed" numeric(12, 2),
	"renovation_budget" numeric(12, 2) DEFAULT '0',
	"renovation_timeline_months" integer DEFAULT 0,
	"monthly_rent" numeric(12, 2),
	"vacancy_rate_percent" numeric(5, 2) DEFAULT '5',
	"annual_rent_increase_percent" numeric(5, 2) DEFAULT '2',
	"other_monthly_income" numeric(12, 2) DEFAULT '0',
	"property_tax_rate_percent" numeric(5, 4),
	"annual_insurance" numeric(12, 2),
	"hoa_monthly" numeric(12, 2) DEFAULT '0',
	"utilities_monthly" numeric(12, 2) DEFAULT '0',
	"maintenance_percent" numeric(5, 2) DEFAULT '1.5',
	"property_management_percent" numeric(5, 2) DEFAULT '10',
	"capex_reserve_monthly" numeric(12, 2) DEFAULT '0',
	"exit_strategy" text DEFAULT 'long_term_rental',
	"hold_period_years" integer DEFAULT 10,
	"appreciation_rate_percent" numeric(5, 2) DEFAULT '3',
	"selling_costs_percent" numeric(5, 2) DEFAULT '6',
	"after_repair_value" numeric(12, 2),
	"total_cash_needed" numeric(12, 2),
	"monthly_mortgage_payment" numeric(12, 2),
	"monthly_cash_flow" numeric(12, 2),
	"annual_cash_flow" numeric(12, 2),
	"cash_on_cash_roi" numeric(5, 2),
	"cap_rate" numeric(5, 2),
	"dscr" numeric(4, 2),
	"total_profit_at_exit" numeric(12, 2),
	"irr" numeric(5, 2),
	"equity_buildup" numeric(12, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "property_scenarios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"search_name" text NOT NULL,
	"markets" text[],
	"filters" jsonb DEFAULT '{"max_beds":null,"min_beds":null,"max_price":null,"min_baths":null,"min_price":null,"home_status":["FOR_SALE"],"max_cap_rate":null,"min_cap_rate":null,"min_cash_flow":null,"property_types":[],"is_below_zestimate":null,"max_investment_score":null,"min_investment_score":null,"exclude_negative_cash_flow":false}'::jsonb NOT NULL,
	"alert_frequency" text DEFAULT 'daily',
	"alert_channels" text[] DEFAULT '{"RAY['email'::tex"}',
	"is_active" boolean DEFAULT true,
	"last_run_at" timestamp,
	"last_match_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "saved_searches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_search_matches" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"saved_search_id" uuid NOT NULL,
	"zpid" text NOT NULL,
	"match_date" timestamp DEFAULT now(),
	"was_notified" boolean DEFAULT false,
	CONSTRAINT "saved_search_matches_saved_search_id_zpid_key" UNIQUE("saved_search_id","zpid")
);
--> statement-breakpoint
ALTER TABLE "saved_search_matches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lender_connections" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lender_name" text NOT NULL,
	"lender_contact_name" text,
	"lender_email" text,
	"lender_phone" text,
	"lender_website" text,
	"lender_type" text,
	"specialty" text[],
	"typical_rates" jsonb DEFAULT '{"max_rate":null,"min_rate":null,"max_ltv_percent":null,"typical_term_years":null,"min_down_payment_percent":null}'::jsonb,
	"notes" text,
	"is_preferred" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "lender_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "prequalifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lender_connection_id" uuid,
	"max_loan_amount" numeric(12, 2),
	"approved_interest_rate" numeric(5, 3),
	"approved_down_payment_percent" numeric(5, 2),
	"loan_term_years" integer,
	"loan_type" text,
	"pre_approval_letter_url" text,
	"status" text DEFAULT 'pending',
	"expiration_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "prequalifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_property_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"offer_amount" numeric(12, 2) NOT NULL,
	"earnest_money" numeric(12, 2),
	"financing_type" text,
	"contingencies" text[],
	"proposed_closing_date" date,
	"inspection_period_days" integer,
	"additional_terms" text,
	"offer_letter_url" text,
	"supporting_documents" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'draft',
	"sent_at" timestamp,
	"response_received_at" timestamp,
	"expiration_date" timestamp,
	"counter_offer_amount" numeric(12, 2),
	"counter_offer_terms" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "offers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "property_alert_notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"property_alert_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_channel" text NOT NULL,
	"was_sent" boolean DEFAULT false,
	"sent_at" timestamp,
	"was_read" boolean DEFAULT false,
	"read_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "property_alert_notifications_property_alert_id_user_id_noti_key" UNIQUE("property_alert_id","user_id","notification_channel")
);
--> statement-breakpoint
ALTER TABLE "property_alert_notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"notification_type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"link_url" text,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_settings_user_id_channel_key" UNIQUE("user_id","channel")
);
--> statement-breakpoint
ALTER TABLE "notification_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid,
	"api_name" text NOT NULL,
	"endpoint" text,
	"request_count" integer DEFAULT 1,
	"success_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"usage_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "api_usage_tenant_id_api_name_usage_date_key" UNIQUE("tenant_id","api_name","usage_date")
);
--> statement-breakpoint
ALTER TABLE "api_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "billing_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD',
	"stripe_transaction_id" text,
	"stripe_invoice_id" text,
	"description" text,
	"credits_added" integer DEFAULT 0,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "billing_transactions_stripe_transaction_id_key" UNIQUE("stripe_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "billing_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "market_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_templates_template_key_key" UNIQUE("template_key")
);
--> statement-breakpoint
CREATE TABLE "market_template_markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"location" text NOT NULL,
	"name" text NOT NULL,
	"min_price" integer,
	"max_price" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "processed_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whitelabel_branding" ADD CONSTRAINT "whitelabel_branding_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_details" ADD CONSTRAINT "property_details_zpid_fkey" FOREIGN KEY ("zpid") REFERENCES "public"."properties"("zpid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_comparables" ADD CONSTRAINT "property_comparables_zpid_fkey" FOREIGN KEY ("zpid") REFERENCES "public"."properties"("zpid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "motivated_seller_analysis" ADD CONSTRAINT "motivated_seller_analysis_zpid_fkey" FOREIGN KEY ("zpid") REFERENCES "public"."properties"("zpid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_zpid_fkey" FOREIGN KEY ("zpid") REFERENCES "public"."properties"("zpid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_alerts" ADD CONSTRAINT "property_alerts_zpid_fkey" FOREIGN KEY ("zpid") REFERENCES "public"."properties"("zpid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_supabase_user_id_fkey" FOREIGN KEY ("supabase_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_properties" ADD CONSTRAINT "fk_user_properties_pipeline_stage" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_properties" ADD CONSTRAINT "user_properties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_properties" ADD CONSTRAINT "user_properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_properties" ADD CONSTRAINT "user_properties_zpid_fkey" FOREIGN KEY ("zpid") REFERENCES "public"."properties"("zpid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_activities" ADD CONSTRAINT "property_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_activities" ADD CONSTRAINT "property_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_activities" ADD CONSTRAINT "property_activities_user_property_id_fkey" FOREIGN KEY ("user_property_id") REFERENCES "public"."user_properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_user_property_id_fkey" FOREIGN KEY ("user_property_id") REFERENCES "public"."user_properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_property_id_fkey" FOREIGN KEY ("user_property_id") REFERENCES "public"."user_properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_scenarios" ADD CONSTRAINT "property_scenarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_scenarios" ADD CONSTRAINT "property_scenarios_user_property_id_fkey" FOREIGN KEY ("user_property_id") REFERENCES "public"."user_properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search_matches" ADD CONSTRAINT "saved_search_matches_saved_search_id_fkey" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search_matches" ADD CONSTRAINT "saved_search_matches_zpid_fkey" FOREIGN KEY ("zpid") REFERENCES "public"."properties"("zpid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_connections" ADD CONSTRAINT "lender_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prequalifications" ADD CONSTRAINT "prequalifications_lender_connection_id_fkey" FOREIGN KEY ("lender_connection_id") REFERENCES "public"."lender_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prequalifications" ADD CONSTRAINT "prequalifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prequalifications" ADD CONSTRAINT "prequalifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_user_property_id_fkey" FOREIGN KEY ("user_property_id") REFERENCES "public"."user_properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_alert_notifications" ADD CONSTRAINT "property_alert_notifications_property_alert_id_fkey" FOREIGN KEY ("property_alert_id") REFERENCES "public"."property_alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_alert_notifications" ADD CONSTRAINT "property_alert_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_template_markets" ADD CONSTRAINT "market_template_markets_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."market_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tenants_slug" ON "tenants" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tenants_stripe_customer" ON "tenants" USING btree ("stripe_customer_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tenants_subscription_tier" ON "tenants" USING btree ("subscription_tier" text_ops);--> statement-breakpoint
CREATE INDEX "idx_workflow_executions_started_at" ON "workflow_executions" USING btree ("started_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_workflow_executions_status" ON "workflow_executions" USING btree ("execution_status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_workflow_executions_workflow_name" ON "workflow_executions" USING btree ("workflow_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_log_created_at" ON "error_log" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_error_log_resolved" ON "error_log" USING btree ("resolved" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_error_log_workflow_name" ON "error_log" USING btree ("workflow_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_log_zpid" ON "error_log" USING btree ("zpid" text_ops);--> statement-breakpoint
CREATE INDEX "idx_api_call_logs_created_at" ON "api_call_logs" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_api_call_logs_error" ON "api_call_logs" USING btree ("error_message" text_ops) WHERE (error_message IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_api_call_logs_tenant_id" ON "api_call_logs" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_properties_address_search" ON "properties" USING gin (to_tsvector('english'::regconfig tsvector_ops);--> statement-breakpoint
CREATE INDEX "idx_properties_cash_flow" ON "properties" USING btree ("monthly_cash_flow" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_properties_city_state" ON "properties" USING btree ("address_city" text_ops,"address_state" text_ops);--> statement-breakpoint
CREATE INDEX "idx_properties_created_at" ON "properties" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_properties_days_on_zillow" ON "properties" USING btree ("days_on_zillow" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_properties_home_status" ON "properties" USING btree ("home_status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_properties_investment_score" ON "properties" USING btree ("investment_score_percent" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_properties_price" ON "properties" USING btree ("price" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_properties_search_market" ON "properties" USING btree ("search_market" text_ops);--> statement-breakpoint
CREATE INDEX "idx_property_details_agent_name" ON "property_details" USING btree ("listing_agent_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_property_details_brokerage" ON "property_details" USING btree ("brokerage_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_property_details_description_search" ON "property_details" USING gin (to_tsvector('english'::regconfig tsvector_ops);--> statement-breakpoint
CREATE INDEX "idx_property_details_mls" ON "property_details" USING btree ("mls_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_property_comparables_comp_zpid" ON "property_comparables" USING btree ("comp_zpid" text_ops);--> statement-breakpoint
CREATE INDEX "idx_property_comparables_sale_date" ON "property_comparables" USING btree ("sale_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_property_comparables_similarity" ON "property_comparables" USING btree ("similarity_score" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_property_comparables_zpid" ON "property_comparables" USING btree ("zpid" text_ops);--> statement-breakpoint
CREATE INDEX "idx_market_analytics_market" ON "market_analytics" USING btree ("market" text_ops);--> statement-breakpoint
CREATE INDEX "idx_market_analytics_market_date" ON "market_analytics" USING btree ("market" text_ops,"snapshot_date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_market_analytics_snapshot_date" ON "market_analytics" USING btree ("snapshot_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_motivated_seller_analyzed_at" ON "motivated_seller_analysis" USING btree ("analyzed_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_motivated_seller_level" ON "motivated_seller_analysis" USING btree ("motivation_level" text_ops);--> statement-breakpoint
CREATE INDEX "idx_motivated_seller_score" ON "motivated_seller_analysis" USING btree ("motivation_score" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_motivated_seller_zpid" ON "motivated_seller_analysis" USING btree ("zpid" text_ops);--> statement-breakpoint
CREATE INDEX "idx_realtor_enriched_data_agent_name" ON "realtor_enriched_data" USING btree ("agent_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_realtor_enriched_data_brokerage" ON "realtor_enriched_data" USING btree ("brokerage_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_realtor_enriched_data_property_count" ON "realtor_enriched_data" USING btree ("property_count" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_price_history_event_date" ON "price_history" USING btree ("event_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_price_history_price_change" ON "price_history" USING btree ("price_change" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_price_history_zpid" ON "price_history" USING btree ("zpid" text_ops);--> statement-breakpoint
CREATE INDEX "idx_property_alerts_created_at" ON "property_alerts" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_property_alerts_priority" ON "property_alerts" USING btree ("priority" text_ops);--> statement-breakpoint
CREATE INDEX "idx_property_alerts_type" ON "property_alerts" USING btree ("alert_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_property_alerts_zpid" ON "property_alerts" USING btree ("zpid" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_supabase_user_id" ON "users" USING btree ("supabase_user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_users_tenant_id" ON "users" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_properties_added_at" ON "user_properties" USING btree ("added_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_user_properties_is_favorite" ON "user_properties" USING btree ("is_favorite" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_user_properties_status" ON "user_properties" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_user_properties_tenant_id" ON "user_properties" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_properties_user_id" ON "user_properties" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_properties_zpid" ON "user_properties" USING btree ("zpid" text_ops);--> statement-breakpoint
CREATE INDEX "idx_pipeline_stages_order" ON "pipeline_stages" USING btree ("order_index" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_pipeline_stages_tenant_id" ON "pipeline_stages" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_property_activities_created_at" ON "property_activities" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_property_activities_tenant_id" ON "property_activities" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_property_activities_type" ON "property_activities" USING btree ("activity_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_property_activities_user_property_id" ON "property_activities" USING btree ("user_property_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_communications_created_at" ON "communications" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_communications_follow_up" ON "communications" USING btree ("follow_up_date" timestamp_ops) WHERE (is_completed = false);--> statement-breakpoint
CREATE INDEX "idx_communications_tenant_id" ON "communications" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_communications_user_id" ON "communications" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_communications_user_property_id" ON "communications" USING btree ("user_property_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_tenant_id" ON "documents" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_type" ON "documents" USING btree ("document_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_uploaded_at" ON "documents" USING btree ("uploaded_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_user_id" ON "documents" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_user_property_id" ON "documents" USING btree ("user_property_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_property_scenarios_is_baseline" ON "property_scenarios" USING btree ("is_baseline" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_property_scenarios_tenant_id" ON "property_scenarios" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_property_scenarios_user_property_id" ON "property_scenarios" USING btree ("user_property_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_saved_searches_alert_frequency" ON "saved_searches" USING btree ("alert_frequency" text_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_saved_searches_is_active" ON "saved_searches" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_saved_searches_tenant_id" ON "saved_searches" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_saved_searches_user_id" ON "saved_searches" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_saved_search_matches_saved_search_id" ON "saved_search_matches" USING btree ("saved_search_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_saved_search_matches_was_notified" ON "saved_search_matches" USING btree ("was_notified" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_saved_search_matches_zpid" ON "saved_search_matches" USING btree ("zpid" text_ops);--> statement-breakpoint
CREATE INDEX "idx_lender_connections_is_preferred" ON "lender_connections" USING btree ("is_preferred" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_lender_connections_lender_type" ON "lender_connections" USING btree ("lender_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_lender_connections_tenant_id" ON "lender_connections" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_prequalifications_expiration" ON "prequalifications" USING btree ("expiration_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_prequalifications_status" ON "prequalifications" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_prequalifications_tenant_id" ON "prequalifications" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_prequalifications_user_id" ON "prequalifications" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_offers_created_at" ON "offers" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_offers_status" ON "offers" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_offers_tenant_id" ON "offers" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_offers_user_id" ON "offers" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_offers_user_property_id" ON "offers" USING btree ("user_property_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_property_alert_notifications_alert_id" ON "property_alert_notifications" USING btree ("property_alert_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_property_alert_notifications_user_id" ON "property_alert_notifications" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_property_alert_notifications_was_read" ON "property_alert_notifications" USING btree ("was_read" bool_ops) WHERE (notification_channel = 'in_app'::text);--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_is_read" ON "notifications" USING btree ("is_read" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_tenant_id" ON "notifications" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_notification_settings_channel" ON "notification_settings" USING btree ("channel" text_ops);--> statement-breakpoint
CREATE INDEX "idx_notification_settings_user_id" ON "notification_settings" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_api_usage_api_name" ON "api_usage" USING btree ("api_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_api_usage_date" ON "api_usage" USING btree ("usage_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_api_usage_tenant_id" ON "api_usage" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_billing_transactions_created_at" ON "billing_transactions" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_billing_transactions_stripe_transaction_id" ON "billing_transactions" USING btree ("stripe_transaction_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_billing_transactions_tenant_id" ON "billing_transactions" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_market_templates_key" ON "market_templates" USING btree ("template_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_market_template_markets_sort" ON "market_template_markets" USING btree ("template_id" int4_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_market_template_markets_template_id" ON "market_template_markets" USING btree ("template_id" uuid_ops);--> statement-breakpoint
CREATE VIEW "public"."geography_columns" AS (SELECT current_database() AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geography_column, postgis_typmod_dims(a.atttypmod) AS coord_dimension, postgis_typmod_srid(a.atttypmod) AS srid, postgis_typmod_type(a.atttypmod) AS type FROM pg_class c, pg_attribute a, pg_type t, pg_namespace n WHERE t.typname = 'geography'::name AND a.attisdropped = false AND a.atttypid = t.oid AND a.attrelid = c.oid AND c.relnamespace = n.oid AND (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text));--> statement-breakpoint
CREATE VIEW "public"."geometry_columns" AS (SELECT current_database()::character varying(256) AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geometry_column, COALESCE(postgis_typmod_dims(a.atttypmod), sn.ndims, 2) AS coord_dimension, COALESCE(NULLIF(postgis_typmod_srid(a.atttypmod), 0), sr.srid, 0) AS srid, replace(replace(COALESCE(NULLIF(upper(postgis_typmod_type(a.atttypmod)), 'GEOMETRY'::text), st.type, 'GEOMETRY'::text), 'ZM'::text, ''::text), 'Z'::text, ''::text)::character varying(30) AS type FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped JOIN pg_namespace n ON c.relnamespace = n.oid JOIN pg_type t ON a.atttypid = t.oid LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ''''::text, 2), ')'::text, ''::text) AS type FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%geometrytype(% = %'::text) st ON st.connamespace = n.oid AND st.conrelid = c.oid AND (a.attnum = ANY (st.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text)::integer AS ndims FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%ndims(% = %'::text) sn ON sn.connamespace = n.oid AND sn.conrelid = c.oid AND (a.attnum = ANY (sn.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text), '('::text, ''::text)::integer AS srid FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%srid(% = %'::text) sr ON sr.connamespace = n.oid AND sr.conrelid = c.oid AND (a.attnum = ANY (sr.conkey)) WHERE (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT c.relname = 'raster_columns'::name AND t.typname = 'geometry'::name AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text));--> statement-breakpoint
CREATE VIEW "public"."user_properties_full" AS (SELECT up.zpid AS userzpid, p.zpid, p.search_market, p.address, p.address_street, p.address_city, p.address_state, p.address_zip, p.full_address, p.latitude, p.longitude, p.county, p.home_status, p.home_type, p.listing_status, p.days_on_zillow, p.price, p.list_price, p.zestimate, p.rent_estimate, p.rent_zestimate, p.tax_assessed, p.tax_assessed_value, p.size_sq_ft, p.living_area_sq_ft, p.price_per_sq_ft, p.num_beds, p.num_baths, p.year_built, p.down_payment, p.closing_costs, p.total_cash_needed, p.monthly_mortgage, p.monthly_taxes, p.monthly_expenses, p.monthly_cash_flow, p.annual_cash_flow, p.cap_rate_percent, p.cash_on_cash_roi, p.dscr, p.five_year_gain, p.equity_at_purchase, p.investment_score_percent, p.is_cash_flow_negative, p.is_rent_estimate_missing, p.is_below_zestimate, p.is_foreclosure, p.is_new_construction, p.url, p.img_main, p.fetch_count, p.last_fetched_at, p.created_at, p.updated_at, pd.listing_agent_name, pd.listing_agent_phone, pd.listing_agent_email, pd.brokerage_name, pd.description, ps.name AS pipeline_stage_name, ps.color AS pipeline_stage_color FROM user_properties up JOIN properties p ON up.zpid = p.zpid LEFT JOIN property_details pd ON p.zpid = pd.zpid LEFT JOIN pipeline_stages ps ON up.pipeline_stage_id = ps.id);--> statement-breakpoint
CREATE VIEW "public"."properties_with_motivation" AS (SELECT p.zpid, p.search_market, p.address, p.address_street, p.address_city, p.address_state, p.address_zip, p.full_address, p.latitude, p.longitude, p.county, p.home_status, p.home_type, p.listing_status, p.days_on_zillow, p.price, p.list_price, p.zestimate, p.rent_estimate, p.rent_zestimate, p.tax_assessed, p.tax_assessed_value, p.size_sq_ft, p.living_area_sq_ft, p.price_per_sq_ft, p.num_beds, p.num_baths, p.year_built, p.down_payment, p.closing_costs, p.total_cash_needed, p.monthly_mortgage, p.monthly_taxes, p.monthly_expenses, p.monthly_cash_flow, p.annual_cash_flow, p.cap_rate_percent, p.cash_on_cash_roi, p.dscr, p.five_year_gain, p.equity_at_purchase, p.investment_score_percent, p.is_cash_flow_negative, p.is_rent_estimate_missing, p.is_below_zestimate, p.is_foreclosure, p.is_new_construction, p.url, p.img_main, p.fetch_count, p.last_fetched_at, p.created_at, p.updated_at, msa.motivation_score, msa.motivation_level, msa.is_fsbo, msa.analyzed_at AS motivation_analyzed_at FROM properties p LEFT JOIN LATERAL ( SELECT motivated_seller_analysis.id, motivated_seller_analysis.zpid, motivated_seller_analysis.motivation_score, motivated_seller_analysis.motivation_level, motivated_seller_analysis.keywords_found, motivated_seller_analysis.urgent_keywords, motivated_seller_analysis.moderate_keywords, motivated_seller_analysis.mild_keywords, motivated_seller_analysis.negative_keywords, motivated_seller_analysis.is_fsbo, motivated_seller_analysis.emails_in_description, motivated_seller_analysis.phones_in_description, motivated_seller_analysis.analyzed_at, motivated_seller_analysis.created_at FROM motivated_seller_analysis WHERE motivated_seller_analysis.zpid = p.zpid ORDER BY motivated_seller_analysis.analyzed_at DESC LIMIT 1) msa ON true);--> statement-breakpoint
CREATE POLICY "Admins can view api call logs" ON "api_call_logs" AS PERMISSIVE FOR SELECT TO public USING (((tenant_id = get_user_tenant_id()) AND user_has_role('admin'::text)));--> statement-breakpoint
CREATE POLICY "Admins can manage users" ON "users" AS PERMISSIVE FOR ALL TO public USING (((tenant_id = get_user_tenant_id()) AND user_has_role('admin'::text)));--> statement-breakpoint
CREATE POLICY "Users can view tenant members" ON "users" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can add properties" ON "user_properties" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid()))));--> statement-breakpoint
CREATE POLICY "Users can delete own properties" ON "user_properties" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Users can update own properties" ON "user_properties" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can view own properties" ON "user_properties" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can manage pipeline stages" ON "pipeline_stages" AS PERMISSIVE FOR ALL TO public USING (((tenant_id = get_user_tenant_id()) AND user_has_role('admin'::text)));--> statement-breakpoint
CREATE POLICY "Users can view tenant pipeline stages" ON "pipeline_stages" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can create property activities" ON "property_activities" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_property_id IN ( SELECT user_properties.id
   FROM user_properties
  WHERE (user_properties.user_id IN ( SELECT users.id
           FROM users
          WHERE (users.supabase_user_id = auth.uid()))))));--> statement-breakpoint
CREATE POLICY "Users can view own property activities" ON "property_activities" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can create communications" ON "communications" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid()))));--> statement-breakpoint
CREATE POLICY "Users can update own communications" ON "communications" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can view own communications" ON "communications" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can delete own documents" ON "documents" AS PERMISSIVE FOR DELETE TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid()))));--> statement-breakpoint
CREATE POLICY "Users can upload documents" ON "documents" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Users can view own documents" ON "documents" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can create scenarios" ON "property_scenarios" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_property_id IN ( SELECT user_properties.id
   FROM user_properties
  WHERE (user_properties.user_id IN ( SELECT users.id
           FROM users
          WHERE (users.supabase_user_id = auth.uid()))))));--> statement-breakpoint
CREATE POLICY "Users can delete own scenarios" ON "property_scenarios" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Users can update own scenarios" ON "property_scenarios" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can view own scenarios" ON "property_scenarios" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can create saved searches" ON "saved_searches" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid()))));--> statement-breakpoint
CREATE POLICY "Users can delete own saved searches" ON "saved_searches" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Users can update own saved searches" ON "saved_searches" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can view own saved searches" ON "saved_searches" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can manage lenders" ON "lender_connections" AS PERMISSIVE FOR ALL TO public USING (((tenant_id = get_user_tenant_id()) AND user_has_role('admin'::text)));--> statement-breakpoint
CREATE POLICY "Users can view tenant lenders" ON "lender_connections" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can create prequalifications" ON "prequalifications" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid()))));--> statement-breakpoint
CREATE POLICY "Users can update own prequalifications" ON "prequalifications" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can view own prequalifications" ON "prequalifications" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can create offers" ON "offers" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_property_id IN ( SELECT user_properties.id
   FROM user_properties
  WHERE (user_properties.user_id IN ( SELECT users.id
           FROM users
          WHERE (users.supabase_user_id = auth.uid()))))));--> statement-breakpoint
CREATE POLICY "Users can update own offers" ON "offers" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can view own offers" ON "offers" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can update own notifications" ON "notifications" AS PERMISSIVE FOR UPDATE TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid()))));--> statement-breakpoint
CREATE POLICY "Users can view own notifications" ON "notifications" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can manage own notification settings" ON "notification_settings" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid()))));--> statement-breakpoint
CREATE POLICY "Users can view own notification settings" ON "notification_settings" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can view tenant api usage" ON "api_usage" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = get_user_tenant_id()));--> statement-breakpoint
CREATE POLICY "Users can view tenant billing" ON "billing_transactions" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = get_user_tenant_id()));
*/