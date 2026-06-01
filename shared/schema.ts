import { pgTable, integer, index, unique, uuid, text, jsonb, timestamp, boolean, foreignKey, pgPolicy, numeric, date, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"



export const tenants = pgTable("tenants", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	subscriptionTier: text("subscription_tier").default('free').notNull(),
	subscriptionStatus: text("subscription_status").default('active'),
	apiCreditsRemaining: integer("api_credits_remaining").default(0),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	maxUsers: integer("max_users").default(1),
	maxTrackedProperties: integer("max_tracked_properties").default(5),
	maxSearchesPerMonth: integer("max_searches_per_month").default(10),
	settings: jsonb().default({"branding":{"logo_url":null,"company_name":null,"primary_color":"#3B82F6"},"features":{"api_access":false,"white_label":false,"team_collaboration":false},"notifications":{"default_alert_channels":["email"]}}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	index("idx_tenants_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("idx_tenants_stripe_customer").using("btree", table.stripeCustomerId.asc().nullsLast().op("text_ops")),
	index("idx_tenants_subscription_tier").using("btree", table.subscriptionTier.asc().nullsLast().op("text_ops")),
	unique("tenants_slug_key").on(table.slug),
	unique("tenants_stripe_customer_id_key").on(table.stripeCustomerId),
]);

export const workflowExecutions = pgTable("workflow_executions", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	workflowName: text("workflow_name").notNull(),
	executionStatus: text("execution_status").notNull(),
	propertiesProcessed: integer("properties_processed").default(0),
	propertiesAdded: integer("properties_added").default(0),
	propertiesUpdated: integer("properties_updated").default(0),
	errorsCount: integer("errors_count").default(0),
	executionTimeSeconds: integer("execution_time_seconds"),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	errorDetails: jsonb("error_details").default([]),
}, (table) => [
	index("idx_workflow_executions_started_at").using("btree", table.startedAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_workflow_executions_status").using("btree", table.executionStatus.asc().nullsLast().op("text_ops")),
	index("idx_workflow_executions_workflow_name").using("btree", table.workflowName.asc().nullsLast().op("text_ops")),
]);

export const errorLog = pgTable("error_log", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	zpid: text(),
	workflowName: text("workflow_name").notNull(),
	errorType: text("error_type").notNull(),
	errorMessage: text("error_message"),
	errorData: jsonb("error_data"),
	retryCount: integer("retry_count").default(0),
	resolved: boolean().default(false),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_error_log_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_error_log_resolved").using("btree", table.resolved.asc().nullsLast().op("bool_ops")),
	index("idx_error_log_workflow_name").using("btree", table.workflowName.asc().nullsLast().op("text_ops")),
	index("idx_error_log_zpid").using("btree", table.zpid.asc().nullsLast().op("text_ops")),
]);

export const apiCallLogs = pgTable("api_call_logs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	userId: uuid("user_id"),
	apiName: text("api_name").notNull(),
	endpoint: text(),
	requestMethod: text("request_method"),
	requestParams: jsonb("request_params"),
	responseStatus: integer("response_status"),
	responseTimeMs: integer("response_time_ms"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_api_call_logs_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_api_call_logs_error").using("btree", table.errorMessage.asc().nullsLast().op("text_ops")).where(sql`(error_message IS NOT NULL)`),
	index("idx_api_call_logs_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "api_call_logs_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "api_call_logs_user_id_fkey"
		}).onDelete("set null"),
	pgPolicy("Admins can view api call logs", { as: "permissive", for: "select", to: ["public"], using: sql`((tenant_id = get_user_tenant_id()) AND user_has_role('admin'::text))` }),
]);

export const whitelabelBranding = pgTable("whitelabel_branding", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	companyName: text("company_name"),
	logoUrl: text("logo_url"),
	primaryColor: text("primary_color"),
	secondaryColor: text("secondary_color"),
	fontFamily: text("font_family"),
	reportFooter: text("report_footer"),
	licenseNumber: text("license_number"),
	brokerName: text("broker_name"),
	disclaimerText: text("disclaimer_text"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "whitelabel_branding_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("whitelabel_branding_tenant_unique").on(table.tenantId),
]);

export const apiKeys = pgTable("api_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	userId: uuid("user_id"),
	keyName: text("key_name").notNull(),
	keyHash: text("key_hash").notNull(),
	keyPrefix: text("key_prefix").notNull(),
	permissions: jsonb().default([]),
	rateLimit: integer("rate_limit").default(1000).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastUsed: timestamp("last_used", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("api_keys_tenant_id_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "api_keys_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "api_keys_user_id_fkey"
		}).onDelete("set null"),
	unique("api_keys_key_hash_key").on(table.keyHash),
]);

export const properties = pgTable("properties", {
	zpid: text().primaryKey().notNull(),
	searchMarket: text("search_market").notNull(),
	address: text(),
	addressStreet: text("address_street"),
	addressCity: text("address_city"),
	addressState: text("address_state"),
	addressZip: text("address_zip"),
	fullAddress: text("full_address"),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	county: text(),
	homeStatus: text("home_status"),
	homeType: text("home_type"),
	listingStatus: text("listing_status"),
	daysOnZillow: integer("days_on_zillow"),
	price: numeric({ precision: 12, scale:  2 }),
	listPrice: numeric("list_price", { precision: 12, scale:  2 }),
	zestimate: numeric({ precision: 12, scale:  2 }),
	rentEstimate: numeric("rent_estimate", { precision: 12, scale:  2 }),
	rentZestimate: numeric("rent_zestimate", { precision: 12, scale:  2 }),
	taxAssessed: numeric("tax_assessed", { precision: 12, scale:  2 }),
	taxAssessedValue: numeric("tax_assessed_value", { precision: 12, scale:  2 }),
	sizeSqFt: numeric("size_sq_ft", { precision: 12, scale:  2 }),
	livingAreaSqFt: numeric("living_area_sq_ft", { precision: 12, scale:  2 }),
	pricePerSqFt: numeric("price_per_sq_ft", { precision: 8, scale:  2 }),
	numBeds: integer("num_beds"),
	numBaths: numeric("num_baths", { precision: 3, scale:  1 }),
	yearBuilt: integer("year_built"),
	downPayment: numeric("down_payment", { precision: 12, scale:  2 }),
	closingCosts: numeric("closing_costs", { precision: 12, scale:  2 }),
	totalCashNeeded: numeric("total_cash_needed", { precision: 12, scale:  2 }),
	monthlyMortgage: numeric("monthly_mortgage", { precision: 12, scale:  2 }),
	monthlyTaxes: numeric("monthly_taxes", { precision: 12, scale:  2 }),
	monthlyExpenses: numeric("monthly_expenses", { precision: 12, scale:  2 }),
	monthlyCashFlow: numeric("monthly_cash_flow", { precision: 12, scale:  2 }),
	annualCashFlow: numeric("annual_cash_flow", { precision: 12, scale:  2 }),
	capRatePercent: numeric("cap_rate_percent", { precision: 5, scale:  2 }),
	cashOnCashRoi: numeric("cash_on_cash_roi", { precision: 5, scale:  2 }),
	dscr: numeric({ precision: 4, scale:  2 }),
	fiveYearGain: numeric("five_year_gain", { precision: 12, scale:  2 }),
	equityAtPurchase: numeric("equity_at_purchase", { precision: 12, scale:  2 }),
	investmentScorePercent: numeric("investment_score_percent", { precision: 5, scale:  2 }),
	isCashFlowNegative: boolean("is_cash_flow_negative").default(false),
	isRentEstimateMissing: boolean("is_rent_estimate_missing").default(false),
	isBelowZestimate: boolean("is_below_zestimate"),
	isForeclosure: boolean("is_foreclosure").default(false),
	isNewConstruction: boolean("is_new_construction").default(false),
	url: text(),
	imgMain: text("img_main"),
	fetchCount: integer("fetch_count").default(1),
	lastFetchedAt: timestamp("last_fetched_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_properties_address_search").using("gin", sql`to_tsvector('english'::regconfig`),
	index("idx_properties_cash_flow").using("btree", table.monthlyCashFlow.desc().nullsLast().op("numeric_ops")),
	index("idx_properties_city_state").using("btree", table.addressCity.asc().nullsLast().op("text_ops"), table.addressState.asc().nullsLast().op("text_ops")),
	index("idx_properties_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_properties_days_on_zillow").using("btree", table.daysOnZillow.asc().nullsLast().op("int4_ops")),
	index("idx_properties_home_status").using("btree", table.homeStatus.asc().nullsLast().op("text_ops")),
	index("idx_properties_investment_score").using("btree", table.investmentScorePercent.desc().nullsLast().op("numeric_ops")),
	index("idx_properties_price").using("btree", table.price.asc().nullsLast().op("numeric_ops")),
	index("idx_properties_search_market").using("btree", table.searchMarket.asc().nullsLast().op("text_ops")),
]);

export const propertyDetails = pgTable("property_details", {
	zpid: text().primaryKey().notNull(),
	mlsId: text("mls_id"),
	mlsName: text("mls_name"),
	listingAgentName: text("listing_agent_name"),
	listingAgentPhone: text("listing_agent_phone"),
	listingAgentEmail: text("listing_agent_email"),
	coListingAgentName: text("co_listing_agent_name"),
	coListingAgentPhone: text("co_listing_agent_phone"),
	brokerageName: text("brokerage_name"),
	brokeragePhone: text("brokerage_phone"),
	premierAgentName: text("premier_agent_name"),
	premierAgentBusiness: text("premier_agent_business"),
	premierAgentPhone: text("premier_agent_phone"),
	propertyTaxRate: numeric("property_tax_rate", { precision: 5, scale:  4 }),
	annualPropertyTax: numeric("annual_property_tax", { precision: 12, scale:  2 }),
	annualHomeownersInsurance: numeric("annual_homeowners_insurance", { precision: 12, scale:  2 }),
	lotSizeAcres: numeric("lot_size_acres", { precision: 8, scale:  2 }),
	frontageFeet: numeric("frontage_feet", { precision: 8, scale:  2 }),
	floodRiskLabel: text("flood_risk_label"),
	floodRiskScore: integer("flood_risk_score"),
	fireRiskLabel: text("fire_risk_label"),
	fireRiskScore: integer("fire_risk_score"),
	windRiskLabel: text("wind_risk_label"),
	windRiskScore: integer("wind_risk_score"),
	heatRiskLabel: text("heat_risk_label"),
	heatRiskScore: integer("heat_risk_score"),
	airRiskLabel: text("air_risk_label"),
	airRiskScore: integer("air_risk_score"),
	primarySchoolDistrict: text("primary_school_district"),
	middleSchoolDistrict: text("middle_school_district"),
	highSchoolDistrict: text("high_school_district"),
	schoolsSummary: text("schools_summary"),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_property_details_agent_name").using("btree", table.listingAgentName.asc().nullsLast().op("text_ops")),
	index("idx_property_details_brokerage").using("btree", table.brokerageName.asc().nullsLast().op("text_ops")),
	index("idx_property_details_description_search").using("gin", sql`to_tsvector('english'::regconfig`),
	index("idx_property_details_mls").using("btree", table.mlsId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.zpid],
			foreignColumns: [properties.zpid],
			name: "property_details_zpid_fkey"
		}).onDelete("cascade"),
]);

export const propertyComparables = pgTable("property_comparables", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	zpid: text().notNull(),
	compZpid: text("comp_zpid"),
	compAddress: text("comp_address"),
	compCity: text("comp_city"),
	compState: text("comp_state"),
	compZip: text("comp_zip"),
	compPrice: numeric("comp_price", { precision: 12, scale:  2 }),
	compPricePerSqft: numeric("comp_price_per_sqft", { precision: 8, scale:  2 }),
	compBeds: integer("comp_beds"),
	compBaths: numeric("comp_baths", { precision: 3, scale:  1 }),
	compSqft: integer("comp_sqft"),
	compLotSqft: integer("comp_lot_sqft"),
	compYearBuilt: integer("comp_year_built"),
	saleDate: date("sale_date"),
	distanceMiles: numeric("distance_miles", { precision: 5, scale:  2 }),
	similarityScore: numeric("similarity_score", { precision: 5, scale:  2 }),
	compSource: text("comp_source").default('zillow'),
	compUrl: text("comp_url"),
	fetchedAt: timestamp("fetched_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_property_comparables_comp_zpid").using("btree", table.compZpid.asc().nullsLast().op("text_ops")),
	index("idx_property_comparables_sale_date").using("btree", table.saleDate.desc().nullsFirst().op("date_ops")),
	index("idx_property_comparables_similarity").using("btree", table.similarityScore.desc().nullsFirst().op("numeric_ops")),
	index("idx_property_comparables_zpid").using("btree", table.zpid.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.zpid],
			foreignColumns: [properties.zpid],
			name: "property_comparables_zpid_fkey"
		}).onDelete("cascade"),
]);

export const marketAnalytics = pgTable("market_analytics", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	market: text().notNull(),
	snapshotDate: date("snapshot_date").notNull(),
	totalListings: integer("total_listings"),
	newListings7D: integer("new_listings_7d"),
	newListings30D: integer("new_listings_30d"),
	avgDaysOnMarket: numeric("avg_days_on_market", { precision: 8, scale:  2 }),
	medianDaysOnMarket: integer("median_days_on_market"),
	medianPrice: numeric("median_price", { precision: 12, scale:  2 }),
	avgPrice: numeric("avg_price", { precision: 12, scale:  2 }),
	minPrice: numeric("min_price", { precision: 12, scale:  2 }),
	maxPrice: numeric("max_price", { precision: 12, scale:  2 }),
	medianPricePerSqft: numeric("median_price_per_sqft", { precision: 8, scale:  2 }),
	priceChange7DPercent: numeric("price_change_7d_percent", { precision: 5, scale:  2 }),
	priceChange30DPercent: numeric("price_change_30d_percent", { precision: 5, scale:  2 }),
	priceChange90DPercent: numeric("price_change_90d_percent", { precision: 5, scale:  2 }),
	avgInvestmentScore: numeric("avg_investment_score", { precision: 5, scale:  2 }),
	medianInvestmentScore: numeric("median_investment_score", { precision: 5, scale:  2 }),
	propertiesPositiveCashflow: integer("properties_positive_cashflow"),
	percentPositiveCashflow: numeric("percent_positive_cashflow", { precision: 5, scale:  2 }),
	avgMonthlyCashFlow: numeric("avg_monthly_cash_flow", { precision: 12, scale:  2 }),
	avgCapRate: numeric("avg_cap_rate", { precision: 5, scale:  2 }),
	avgCashOnCashRoi: numeric("avg_cash_on_cash_roi", { precision: 5, scale:  2 }),
	absorptionRate: numeric("absorption_rate", { precision: 5, scale:  2 }),
	monthsOfInventory: numeric("months_of_inventory", { precision: 5, scale:  2 }),
	soldToListPriceRatio: numeric("sold_to_list_price_ratio", { precision: 5, scale:  2 }),
	priceDistribution: jsonb("price_distribution").default({"100k_200k":0,"200k_300k":0,"300k_400k":0,"400k_500k":0,"over_500k":0,"under_100k":0}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_market_analytics_market").using("btree", table.market.asc().nullsLast().op("text_ops")),
	index("idx_market_analytics_market_date").using("btree", table.market.asc().nullsLast().op("text_ops"), table.snapshotDate.desc().nullsFirst().op("text_ops")),
	index("idx_market_analytics_snapshot_date").using("btree", table.snapshotDate.desc().nullsFirst().op("date_ops")),
	unique("market_analytics_market_snapshot_date_key").on(table.market, table.snapshotDate),
]);

export const motivatedSellerAnalysis = pgTable("motivated_seller_analysis", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	zpid: text().notNull(),
	motivationScore: integer("motivation_score").notNull(),
	motivationLevel: text("motivation_level").notNull(),
	keywordsFound: text("keywords_found").array(),
	urgentKeywords: text("urgent_keywords").array(),
	moderateKeywords: text("moderate_keywords").array(),
	mildKeywords: text("mild_keywords").array(),
	negativeKeywords: text("negative_keywords").array(),
	isFsbo: boolean("is_fsbo").default(false),
	emailsInDescription: text("emails_in_description").array(),
	phonesInDescription: text("phones_in_description").array(),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_motivated_seller_analyzed_at").using("btree", table.analyzedAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_motivated_seller_level").using("btree", table.motivationLevel.asc().nullsLast().op("text_ops")),
	index("idx_motivated_seller_score").using("btree", table.motivationScore.desc().nullsFirst().op("int4_ops")),
	index("idx_motivated_seller_zpid").using("btree", table.zpid.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.zpid],
			foreignColumns: [properties.zpid],
			name: "motivated_seller_analysis_zpid_fkey"
		}).onDelete("cascade"),
	unique("motivated_seller_analysis_zpid_analyzed_at_key").on(table.zpid, table.analyzedAt),
]);

export const realtorEnrichedData = pgTable("realtor_enriched_data", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	agentName: text("agent_name").notNull(),
	email: text(),
	phone: text(),
	website: text(),
	linkedin: text(),
	facebook: text(),
	instagram: text(),
	brokerageName: text("brokerage_name"),
	brokerageWebsite: text("brokerage_website"),
	cities: text(),
	states: text(),
	propertyCount: integer("property_count").default(0),
	uniqueCities: integer("unique_cities").default(0),
	uniqueStates: integer("unique_states").default(0),
	sources: text().array(),
	confidenceScore: integer("confidence_score"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_realtor_enriched_data_agent_name").using("btree", table.agentName.asc().nullsLast().op("text_ops")),
	index("idx_realtor_enriched_data_brokerage").using("btree", table.brokerageName.asc().nullsLast().op("text_ops")),
	index("idx_realtor_enriched_data_property_count").using("btree", table.propertyCount.desc().nullsFirst().op("int4_ops")),
	unique("realtor_enriched_data_agent_name_key").on(table.agentName),
]);

export const priceHistory = pgTable("price_history", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	zpid: text().notNull(),
	price: numeric({ precision: 12, scale:  2 }).notNull(),
	priceChange: numeric("price_change", { precision: 12, scale:  2 }),
	eventType: text("event_type"),
	eventDate: timestamp("event_date", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_price_history_event_date").using("btree", table.eventDate.desc().nullsFirst().op("timestamp_ops")),
	index("idx_price_history_price_change").using("btree", table.priceChange.asc().nullsLast().op("numeric_ops")),
	index("idx_price_history_zpid").using("btree", table.zpid.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.zpid],
			foreignColumns: [properties.zpid],
			name: "price_history_zpid_fkey"
		}).onDelete("cascade"),
	unique("price_history_zpid_event_date_key").on(table.zpid, table.eventDate),
]);

export const propertyAlerts = pgTable("property_alerts", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	zpid: text().notNull(),
	alertType: text("alert_type").notNull(),
	priority: text().default('MEDIUM'),
	message: text(),
	alertData: jsonb("alert_data").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_property_alerts_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_property_alerts_priority").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("idx_property_alerts_type").using("btree", table.alertType.asc().nullsLast().op("text_ops")),
	index("idx_property_alerts_zpid").using("btree", table.zpid.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.zpid],
			foreignColumns: [properties.zpid],
			name: "property_alerts_zpid_fkey"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	supabaseUserId: uuid("supabase_user_id"),
	email: text().notNull(),
	fullName: text("full_name"),
	avatarUrl: text("avatar_url"),
	phone: text(),
	role: text().default('member').notNull(),
	notificationPreferences: jsonb("notification_preferences").default({"sms":false,"email":true,"slack":false,"in_app":true,"discord":false}),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_users_supabase_user_id").using("btree", table.supabaseUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_users_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.supabaseUserId],
			foreignColumns: [table.id],
			name: "users_supabase_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "users_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("users_tenant_id_email_key").on(table.tenantId, table.email),
	unique("users_supabase_user_id_key").on(table.supabaseUserId),
	pgPolicy("Admins can manage users", { as: "permissive", for: "all", to: ["public"], using: sql`((tenant_id = get_user_tenant_id()) AND user_has_role('admin'::text))` }),
	pgPolicy("Users can view tenant members", { as: "permissive", for: "select", to: ["public"] }),
]);

export const userProperties = pgTable("user_properties", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tenantId: uuid("tenant_id").notNull(),
	zpid: text().notNull(),
	status: text().default('tracking'),
	pipelineStageId: uuid("pipeline_stage_id"),
	customNotes: text("custom_notes"),
	tags: text().array(),
	isFavorite: boolean("is_favorite").default(false),
	userInvestmentScore: numeric("user_investment_score", { precision: 5, scale:  2 }),
	customAnalysis: jsonb("custom_analysis").default({"cons":[],"pros":[],"custom_assumptions":{}}),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_properties_added_at").using("btree", table.addedAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_user_properties_is_favorite").using("btree", table.isFavorite.asc().nullsLast().op("bool_ops")),
	index("idx_user_properties_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_user_properties_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_properties_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_properties_zpid").using("btree", table.zpid.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.pipelineStageId],
			foreignColumns: [pipelineStages.id],
			name: "fk_user_properties_pipeline_stage"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "user_properties_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_properties_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.zpid],
			foreignColumns: [properties.zpid],
			name: "user_properties_zpid_fkey"
		}).onDelete("cascade"),
	unique("user_properties_user_id_zpid_key").on(table.userId, table.zpid),
	pgPolicy("Users can add properties", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid())))`  }),
	pgPolicy("Users can delete own properties", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Users can update own properties", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view own properties", { as: "permissive", for: "select", to: ["public"] }),
]);

export const pipelineStages = pgTable("pipeline_stages", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	name: text().notNull(),
	orderIndex: integer("order_index").notNull(),
	color: text().default('#3B82F6'),
	isDefault: boolean("is_default").default(false),
	icon: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_pipeline_stages_order").using("btree", table.orderIndex.asc().nullsLast().op("int4_ops")),
	index("idx_pipeline_stages_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "pipeline_stages_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("pipeline_stages_tenant_id_name_key").on(table.tenantId, table.name),
	unique("pipeline_stages_tenant_id_order_index_key").on(table.tenantId, table.orderIndex),
	pgPolicy("Admins can manage pipeline stages", { as: "permissive", for: "all", to: ["public"], using: sql`((tenant_id = get_user_tenant_id()) AND user_has_role('admin'::text))` }),
	pgPolicy("Users can view tenant pipeline stages", { as: "permissive", for: "select", to: ["public"] }),
]);

export const propertyActivities = pgTable("property_activities", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userPropertyId: uuid("user_property_id").notNull(),
	userId: uuid("user_id").notNull(),
	tenantId: uuid("tenant_id").notNull(),
	activityType: text("activity_type").notNull(),
	title: text(),
	description: text(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_property_activities_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_property_activities_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_property_activities_type").using("btree", table.activityType.asc().nullsLast().op("text_ops")),
	index("idx_property_activities_user_property_id").using("btree", table.userPropertyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "property_activities_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "property_activities_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userPropertyId],
			foreignColumns: [userProperties.id],
			name: "property_activities_user_property_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can create property activities", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_property_id IN ( SELECT user_properties.id
   FROM user_properties
  WHERE (user_properties.user_id IN ( SELECT users.id
           FROM users
          WHERE (users.supabase_user_id = auth.uid())))))`  }),
	pgPolicy("Users can view own property activities", { as: "permissive", for: "select", to: ["public"] }),
]);

export const communications = pgTable("communications", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userPropertyId: uuid("user_property_id"),
	userId: uuid("user_id").notNull(),
	tenantId: uuid("tenant_id").notNull(),
	contactName: text("contact_name"),
	contactType: text("contact_type"),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	communicationMethod: text("communication_method"),
	direction: text().notNull(),
	subject: text(),
	message: text(),
	followUpDate: timestamp("follow_up_date", { mode: 'string' }),
	isCompleted: boolean("is_completed").default(false),
	attachments: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_communications_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_communications_follow_up").using("btree", table.followUpDate.asc().nullsLast().op("timestamp_ops")).where(sql`(is_completed = false)`),
	index("idx_communications_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_communications_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_communications_user_property_id").using("btree", table.userPropertyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "communications_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "communications_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userPropertyId],
			foreignColumns: [userProperties.id],
			name: "communications_user_property_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can create communications", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid())))`  }),
	pgPolicy("Users can update own communications", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view own communications", { as: "permissive", for: "select", to: ["public"] }),
]);

export const documents = pgTable("documents", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userPropertyId: uuid("user_property_id").notNull(),
	tenantId: uuid("tenant_id").notNull(),
	userId: uuid("user_id").notNull(),
	documentType: text("document_type").notNull(),
	fileName: text("file_name").notNull(),
	fileUrl: text("file_url").notNull(),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	notes: text(),
	tags: text().array(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_documents_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_documents_type").using("btree", table.documentType.asc().nullsLast().op("text_ops")),
	index("idx_documents_uploaded_at").using("btree", table.uploadedAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_documents_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_documents_user_property_id").using("btree", table.userPropertyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "documents_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "documents_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userPropertyId],
			foreignColumns: [userProperties.id],
			name: "documents_user_property_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can delete own documents", { as: "permissive", for: "delete", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid())))` }),
	pgPolicy("Users can upload documents", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can view own documents", { as: "permissive", for: "select", to: ["public"] }),
]);

export const propertyScenarios = pgTable("property_scenarios", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userPropertyId: uuid("user_property_id").notNull(),
	tenantId: uuid("tenant_id").notNull(),
	scenarioName: text("scenario_name").notNull(),
	isBaseline: boolean("is_baseline").default(false),
	purchasePrice: numeric("purchase_price", { precision: 12, scale:  2 }),
	downPaymentPercent: numeric("down_payment_percent", { precision: 5, scale:  2 }).default('20'),
	interestRate: numeric("interest_rate", { precision: 5, scale:  3 }).default('7.0'),
	loanTermYears: integer("loan_term_years").default(30),
	closingCostsPercent: numeric("closing_costs_percent", { precision: 5, scale:  2 }).default('3.0'),
	closingCostsFixed: numeric("closing_costs_fixed", { precision: 12, scale:  2 }),
	renovationBudget: numeric("renovation_budget", { precision: 12, scale:  2 }).default('0'),
	renovationTimelineMonths: integer("renovation_timeline_months").default(0),
	monthlyRent: numeric("monthly_rent", { precision: 12, scale:  2 }),
	vacancyRatePercent: numeric("vacancy_rate_percent", { precision: 5, scale:  2 }).default('5'),
	annualRentIncreasePercent: numeric("annual_rent_increase_percent", { precision: 5, scale:  2 }).default('2'),
	otherMonthlyIncome: numeric("other_monthly_income", { precision: 12, scale:  2 }).default('0'),
	propertyTaxRatePercent: numeric("property_tax_rate_percent", { precision: 5, scale:  4 }),
	annualInsurance: numeric("annual_insurance", { precision: 12, scale:  2 }),
	hoaMonthly: numeric("hoa_monthly", { precision: 12, scale:  2 }).default('0'),
	utilitiesMonthly: numeric("utilities_monthly", { precision: 12, scale:  2 }).default('0'),
	maintenancePercent: numeric("maintenance_percent", { precision: 5, scale:  2 }).default('1.5'),
	propertyManagementPercent: numeric("property_management_percent", { precision: 5, scale:  2 }).default('10'),
	capexReserveMonthly: numeric("capex_reserve_monthly", { precision: 12, scale:  2 }).default('0'),
	exitStrategy: text("exit_strategy").default('long_term_rental'),
	holdPeriodYears: integer("hold_period_years").default(10),
	appreciationRatePercent: numeric("appreciation_rate_percent", { precision: 5, scale:  2 }).default('3'),
	sellingCostsPercent: numeric("selling_costs_percent", { precision: 5, scale:  2 }).default('6'),
	afterRepairValue: numeric("after_repair_value", { precision: 12, scale:  2 }),
	totalCashNeeded: numeric("total_cash_needed", { precision: 12, scale:  2 }),
	monthlyMortgagePayment: numeric("monthly_mortgage_payment", { precision: 12, scale:  2 }),
	monthlyCashFlow: numeric("monthly_cash_flow", { precision: 12, scale:  2 }),
	annualCashFlow: numeric("annual_cash_flow", { precision: 12, scale:  2 }),
	cashOnCashRoi: numeric("cash_on_cash_roi", { precision: 5, scale:  2 }),
	capRate: numeric("cap_rate", { precision: 5, scale:  2 }),
	dscr: numeric({ precision: 4, scale:  2 }),
	totalProfitAtExit: numeric("total_profit_at_exit", { precision: 12, scale:  2 }),
	irr: numeric({ precision: 5, scale:  2 }),
	equityBuildup: numeric("equity_buildup", { precision: 12, scale:  2 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_property_scenarios_is_baseline").using("btree", table.isBaseline.asc().nullsLast().op("bool_ops")),
	index("idx_property_scenarios_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_property_scenarios_user_property_id").using("btree", table.userPropertyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "property_scenarios_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userPropertyId],
			foreignColumns: [userProperties.id],
			name: "property_scenarios_user_property_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can create scenarios", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_property_id IN ( SELECT user_properties.id
   FROM user_properties
  WHERE (user_properties.user_id IN ( SELECT users.id
           FROM users
          WHERE (users.supabase_user_id = auth.uid())))))`  }),
	pgPolicy("Users can delete own scenarios", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Users can update own scenarios", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view own scenarios", { as: "permissive", for: "select", to: ["public"] }),
]);

export const savedSearches = pgTable("saved_searches", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tenantId: uuid("tenant_id").notNull(),
	searchName: text("search_name").notNull(),
	markets: text().array(),
	filters: jsonb().default({"max_beds":null,"min_beds":null,"max_price":null,"min_baths":null,"min_price":null,"home_status":["FOR_SALE"],"max_cap_rate":null,"min_cap_rate":null,"min_cash_flow":null,"property_types":[],"is_below_zestimate":null,"max_investment_score":null,"min_investment_score":null,"exclude_negative_cash_flow":false}).notNull(),
	alertFrequency: text("alert_frequency").default('daily'),
	alertChannels: text("alert_channels").array().default(["RAY['email'::tex"]),
	isActive: boolean("is_active").default(true),
	lastRunAt: timestamp("last_run_at", { mode: 'string' }),
	lastMatchCount: integer("last_match_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_saved_searches_alert_frequency").using("btree", table.alertFrequency.asc().nullsLast().op("text_ops")).where(sql`(is_active = true)`),
	index("idx_saved_searches_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_saved_searches_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_saved_searches_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "saved_searches_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "saved_searches_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can create saved searches", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid())))`  }),
	pgPolicy("Users can delete own saved searches", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Users can update own saved searches", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view own saved searches", { as: "permissive", for: "select", to: ["public"] }),
]);

export const savedSearchMatches = pgTable("saved_search_matches", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	savedSearchId: uuid("saved_search_id").notNull(),
	zpid: text().notNull(),
	matchDate: timestamp("match_date", { mode: 'string' }).defaultNow(),
	wasNotified: boolean("was_notified").default(false),
}, (table) => [
	index("idx_saved_search_matches_saved_search_id").using("btree", table.savedSearchId.asc().nullsLast().op("uuid_ops")),
	index("idx_saved_search_matches_was_notified").using("btree", table.wasNotified.asc().nullsLast().op("bool_ops")),
	index("idx_saved_search_matches_zpid").using("btree", table.zpid.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.savedSearchId],
			foreignColumns: [savedSearches.id],
			name: "saved_search_matches_saved_search_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.zpid],
			foreignColumns: [properties.zpid],
			name: "saved_search_matches_zpid_fkey"
		}).onDelete("cascade"),
	unique("saved_search_matches_saved_search_id_zpid_key").on(table.savedSearchId, table.zpid),
]);

export const lenderConnections = pgTable("lender_connections", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	lenderName: text("lender_name").notNull(),
	lenderContactName: text("lender_contact_name"),
	lenderEmail: text("lender_email"),
	lenderPhone: text("lender_phone"),
	lenderWebsite: text("lender_website"),
	lenderType: text("lender_type"),
	specialty: text().array(),
	typicalRates: jsonb("typical_rates").default({"max_rate":null,"min_rate":null,"max_ltv_percent":null,"typical_term_years":null,"min_down_payment_percent":null}),
	notes: text(),
	isPreferred: boolean("is_preferred").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_lender_connections_is_preferred").using("btree", table.isPreferred.asc().nullsLast().op("bool_ops")),
	index("idx_lender_connections_lender_type").using("btree", table.lenderType.asc().nullsLast().op("text_ops")),
	index("idx_lender_connections_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "lender_connections_tenant_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Admins can manage lenders", { as: "permissive", for: "all", to: ["public"], using: sql`((tenant_id = get_user_tenant_id()) AND user_has_role('admin'::text))` }),
	pgPolicy("Users can view tenant lenders", { as: "permissive", for: "select", to: ["public"] }),
]);

export const prequalifications = pgTable("prequalifications", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tenantId: uuid("tenant_id").notNull(),
	lenderConnectionId: uuid("lender_connection_id"),
	maxLoanAmount: numeric("max_loan_amount", { precision: 12, scale:  2 }),
	approvedInterestRate: numeric("approved_interest_rate", { precision: 5, scale:  3 }),
	approvedDownPaymentPercent: numeric("approved_down_payment_percent", { precision: 5, scale:  2 }),
	loanTermYears: integer("loan_term_years"),
	loanType: text("loan_type"),
	preApprovalLetterUrl: text("pre_approval_letter_url"),
	status: text().default('pending'),
	expirationDate: date("expiration_date"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_prequalifications_expiration").using("btree", table.expirationDate.asc().nullsLast().op("date_ops")),
	index("idx_prequalifications_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_prequalifications_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_prequalifications_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.lenderConnectionId],
			foreignColumns: [lenderConnections.id],
			name: "prequalifications_lender_connection_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "prequalifications_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "prequalifications_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can create prequalifications", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid())))`  }),
	pgPolicy("Users can update own prequalifications", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view own prequalifications", { as: "permissive", for: "select", to: ["public"] }),
]);

export const offers = pgTable("offers", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userPropertyId: uuid("user_property_id").notNull(),
	tenantId: uuid("tenant_id").notNull(),
	userId: uuid("user_id").notNull(),
	offerAmount: numeric("offer_amount", { precision: 12, scale:  2 }).notNull(),
	earnestMoney: numeric("earnest_money", { precision: 12, scale:  2 }),
	financingType: text("financing_type"),
	contingencies: text().array(),
	proposedClosingDate: date("proposed_closing_date"),
	inspectionPeriodDays: integer("inspection_period_days"),
	additionalTerms: text("additional_terms"),
	offerLetterUrl: text("offer_letter_url"),
	supportingDocuments: jsonb("supporting_documents").default([]),
	status: text().default('draft'),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	responseReceivedAt: timestamp("response_received_at", { mode: 'string' }),
	expirationDate: timestamp("expiration_date", { mode: 'string' }),
	counterOfferAmount: numeric("counter_offer_amount", { precision: 12, scale:  2 }),
	counterOfferTerms: text("counter_offer_terms"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_offers_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_offers_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_offers_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_offers_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_offers_user_property_id").using("btree", table.userPropertyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "offers_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "offers_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userPropertyId],
			foreignColumns: [userProperties.id],
			name: "offers_user_property_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can create offers", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_property_id IN ( SELECT user_properties.id
   FROM user_properties
  WHERE (user_properties.user_id IN ( SELECT users.id
           FROM users
          WHERE (users.supabase_user_id = auth.uid())))))`  }),
	pgPolicy("Users can update own offers", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view own offers", { as: "permissive", for: "select", to: ["public"] }),
]);

export const propertyAlertNotifications = pgTable("property_alert_notifications", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	propertyAlertId: uuid("property_alert_id").notNull(),
	userId: uuid("user_id").notNull(),
	notificationChannel: text("notification_channel").notNull(),
	wasSent: boolean("was_sent").default(false),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	wasRead: boolean("was_read").default(false),
	readAt: timestamp("read_at", { mode: 'string' }),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_property_alert_notifications_alert_id").using("btree", table.propertyAlertId.asc().nullsLast().op("uuid_ops")),
	index("idx_property_alert_notifications_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_property_alert_notifications_was_read").using("btree", table.wasRead.asc().nullsLast().op("bool_ops")).where(sql`(notification_channel = 'in_app'::text)`),
	foreignKey({
			columns: [table.propertyAlertId],
			foreignColumns: [propertyAlerts.id],
			name: "property_alert_notifications_property_alert_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "property_alert_notifications_user_id_fkey"
		}).onDelete("cascade"),
	unique("property_alert_notifications_property_alert_id_user_id_noti_key").on(table.propertyAlertId, table.userId, table.notificationChannel),
]);

export const notifications = pgTable("notifications", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tenantId: uuid("tenant_id").notNull(),
	notificationType: text("notification_type").notNull(),
	title: text().notNull(),
	message: text(),
	linkUrl: text("link_url"),
	isRead: boolean("is_read").default(false),
	readAt: timestamp("read_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_notifications_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_notifications_is_read").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
	index("idx_notifications_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_notifications_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "notifications_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can update own notifications", { as: "permissive", for: "update", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid())))` }),
	pgPolicy("Users can view own notifications", { as: "permissive", for: "select", to: ["public"] }),
]);

export const notificationSettings = pgTable("notification_settings", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	channel: text().notNull(),
	isEnabled: boolean("is_enabled").default(true),
	settings: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_notification_settings_channel").using("btree", table.channel.asc().nullsLast().op("text_ops")),
	index("idx_notification_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notification_settings_user_id_fkey"
		}).onDelete("cascade"),
	unique("notification_settings_user_id_channel_key").on(table.userId, table.channel),
	pgPolicy("Users can manage own notification settings", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.supabase_user_id = auth.uid())))` }),
	pgPolicy("Users can view own notification settings", { as: "permissive", for: "select", to: ["public"] }),
]);

export const apiUsage = pgTable("api_usage", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	apiName: text("api_name").notNull(),
	endpoint: text(),
	requestCount: integer("request_count").default(1),
	successCount: integer("success_count").default(0),
	errorCount: integer("error_count").default(0),
	usageDate: date("usage_date").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_api_usage_api_name").using("btree", table.apiName.asc().nullsLast().op("text_ops")),
	index("idx_api_usage_date").using("btree", table.usageDate.desc().nullsFirst().op("date_ops")),
	index("idx_api_usage_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "api_usage_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("api_usage_tenant_id_api_name_usage_date_key").on(table.tenantId, table.apiName, table.usageDate),
	pgPolicy("Users can view tenant api usage", { as: "permissive", for: "select", to: ["public"], using: sql`(tenant_id = get_user_tenant_id())` }),
]);

export const billingTransactions = pgTable("billing_transactions", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	transactionType: text("transaction_type").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('USD'),
	stripeTransactionId: text("stripe_transaction_id"),
	stripeInvoiceId: text("stripe_invoice_id"),
	description: text(),
	creditsAdded: integer("credits_added").default(0),
	status: text().default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_billing_transactions_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_billing_transactions_stripe_transaction_id").using("btree", table.stripeTransactionId.asc().nullsLast().op("text_ops")),
	index("idx_billing_transactions_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "billing_transactions_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("billing_transactions_stripe_transaction_id_key").on(table.stripeTransactionId),
	pgPolicy("Users can view tenant billing", { as: "permissive", for: "select", to: ["public"], using: sql`(tenant_id = get_user_tenant_id())` }),
]);

export const marketTemplates = pgTable("market_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	templateKey: text("template_key").notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_market_templates_key").using("btree", table.templateKey.asc().nullsLast().op("text_ops")),
	unique("market_templates_template_key_key").on(table.templateKey),
]);

export const marketTemplateMarkets = pgTable("market_template_markets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	templateId: uuid("template_id").notNull(),
	location: text().notNull(),
	name: text().notNull(),
	minPrice: integer("min_price"),
	maxPrice: integer("max_price"),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_market_template_markets_sort").using("btree", table.templateId.asc().nullsLast().op("int4_ops"), table.sortOrder.asc().nullsLast().op("int4_ops")),
	index("idx_market_template_markets_template_id").using("btree", table.templateId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [marketTemplates.id],
			name: "market_template_markets_template_id_fkey"
		}).onDelete("cascade"),
]);

export const processedWebhookEvents = pgTable("processed_webhook_events", {
	id: text().primaryKey().notNull(),
	type: text().notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
export const userPropertiesFull = pgView("user_properties_full", {	userzpid: text(),
	zpid: text(),
	searchMarket: text("search_market"),
	address: text(),
	addressStreet: text("address_street"),
	addressCity: text("address_city"),
	addressState: text("address_state"),
	addressZip: text("address_zip"),
	fullAddress: text("full_address"),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	county: text(),
	homeStatus: text("home_status"),
	homeType: text("home_type"),
	listingStatus: text("listing_status"),
	daysOnZillow: integer("days_on_zillow"),
	price: numeric({ precision: 12, scale:  2 }),
	listPrice: numeric("list_price", { precision: 12, scale:  2 }),
	zestimate: numeric({ precision: 12, scale:  2 }),
	rentEstimate: numeric("rent_estimate", { precision: 12, scale:  2 }),
	rentZestimate: numeric("rent_zestimate", { precision: 12, scale:  2 }),
	taxAssessed: numeric("tax_assessed", { precision: 12, scale:  2 }),
	taxAssessedValue: numeric("tax_assessed_value", { precision: 12, scale:  2 }),
	sizeSqFt: numeric("size_sq_ft", { precision: 12, scale:  2 }),
	livingAreaSqFt: numeric("living_area_sq_ft", { precision: 12, scale:  2 }),
	pricePerSqFt: numeric("price_per_sq_ft", { precision: 8, scale:  2 }),
	numBeds: integer("num_beds"),
	numBaths: numeric("num_baths", { precision: 3, scale:  1 }),
	yearBuilt: integer("year_built"),
	downPayment: numeric("down_payment", { precision: 12, scale:  2 }),
	closingCosts: numeric("closing_costs", { precision: 12, scale:  2 }),
	totalCashNeeded: numeric("total_cash_needed", { precision: 12, scale:  2 }),
	monthlyMortgage: numeric("monthly_mortgage", { precision: 12, scale:  2 }),
	monthlyTaxes: numeric("monthly_taxes", { precision: 12, scale:  2 }),
	monthlyExpenses: numeric("monthly_expenses", { precision: 12, scale:  2 }),
	monthlyCashFlow: numeric("monthly_cash_flow", { precision: 12, scale:  2 }),
	annualCashFlow: numeric("annual_cash_flow", { precision: 12, scale:  2 }),
	capRatePercent: numeric("cap_rate_percent", { precision: 5, scale:  2 }),
	cashOnCashRoi: numeric("cash_on_cash_roi", { precision: 5, scale:  2 }),
	dscr: numeric({ precision: 4, scale:  2 }),
	fiveYearGain: numeric("five_year_gain", { precision: 12, scale:  2 }),
	equityAtPurchase: numeric("equity_at_purchase", { precision: 12, scale:  2 }),
	investmentScorePercent: numeric("investment_score_percent", { precision: 5, scale:  2 }),
	isCashFlowNegative: boolean("is_cash_flow_negative"),
	isRentEstimateMissing: boolean("is_rent_estimate_missing"),
	isBelowZestimate: boolean("is_below_zestimate"),
	isForeclosure: boolean("is_foreclosure"),
	isNewConstruction: boolean("is_new_construction"),
	url: text(),
	imgMain: text("img_main"),
	fetchCount: integer("fetch_count"),
	lastFetchedAt: timestamp("last_fetched_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	listingAgentName: text("listing_agent_name"),
	listingAgentPhone: text("listing_agent_phone"),
	listingAgentEmail: text("listing_agent_email"),
	brokerageName: text("brokerage_name"),
	description: text(),
	pipelineStageName: text("pipeline_stage_name"),
	pipelineStageColor: text("pipeline_stage_color"),
}).as(sql`SELECT up.zpid AS userzpid, p.zpid, p.search_market, p.address, p.address_street, p.address_city, p.address_state, p.address_zip, p.full_address, p.latitude, p.longitude, p.county, p.home_status, p.home_type, p.listing_status, p.days_on_zillow, p.price, p.list_price, p.zestimate, p.rent_estimate, p.rent_zestimate, p.tax_assessed, p.tax_assessed_value, p.size_sq_ft, p.living_area_sq_ft, p.price_per_sq_ft, p.num_beds, p.num_baths, p.year_built, p.down_payment, p.closing_costs, p.total_cash_needed, p.monthly_mortgage, p.monthly_taxes, p.monthly_expenses, p.monthly_cash_flow, p.annual_cash_flow, p.cap_rate_percent, p.cash_on_cash_roi, p.dscr, p.five_year_gain, p.equity_at_purchase, p.investment_score_percent, p.is_cash_flow_negative, p.is_rent_estimate_missing, p.is_below_zestimate, p.is_foreclosure, p.is_new_construction, p.url, p.img_main, p.fetch_count, p.last_fetched_at, p.created_at, p.updated_at, pd.listing_agent_name, pd.listing_agent_phone, pd.listing_agent_email, pd.brokerage_name, pd.description, ps.name AS pipeline_stage_name, ps.color AS pipeline_stage_color FROM user_properties up JOIN properties p ON up.zpid = p.zpid LEFT JOIN property_details pd ON p.zpid = pd.zpid LEFT JOIN pipeline_stages ps ON up.pipeline_stage_id = ps.id`);

export const propertiesWithMotivation = pgView("properties_with_motivation", {	zpid: text(),
	searchMarket: text("search_market"),
	address: text(),
	addressStreet: text("address_street"),
	addressCity: text("address_city"),
	addressState: text("address_state"),
	addressZip: text("address_zip"),
	fullAddress: text("full_address"),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	county: text(),
	homeStatus: text("home_status"),
	homeType: text("home_type"),
	listingStatus: text("listing_status"),
	daysOnZillow: integer("days_on_zillow"),
	price: numeric({ precision: 12, scale:  2 }),
	listPrice: numeric("list_price", { precision: 12, scale:  2 }),
	zestimate: numeric({ precision: 12, scale:  2 }),
	rentEstimate: numeric("rent_estimate", { precision: 12, scale:  2 }),
	rentZestimate: numeric("rent_zestimate", { precision: 12, scale:  2 }),
	taxAssessed: numeric("tax_assessed", { precision: 12, scale:  2 }),
	taxAssessedValue: numeric("tax_assessed_value", { precision: 12, scale:  2 }),
	sizeSqFt: numeric("size_sq_ft", { precision: 12, scale:  2 }),
	livingAreaSqFt: numeric("living_area_sq_ft", { precision: 12, scale:  2 }),
	pricePerSqFt: numeric("price_per_sq_ft", { precision: 8, scale:  2 }),
	numBeds: integer("num_beds"),
	numBaths: numeric("num_baths", { precision: 3, scale:  1 }),
	yearBuilt: integer("year_built"),
	downPayment: numeric("down_payment", { precision: 12, scale:  2 }),
	closingCosts: numeric("closing_costs", { precision: 12, scale:  2 }),
	totalCashNeeded: numeric("total_cash_needed", { precision: 12, scale:  2 }),
	monthlyMortgage: numeric("monthly_mortgage", { precision: 12, scale:  2 }),
	monthlyTaxes: numeric("monthly_taxes", { precision: 12, scale:  2 }),
	monthlyExpenses: numeric("monthly_expenses", { precision: 12, scale:  2 }),
	monthlyCashFlow: numeric("monthly_cash_flow", { precision: 12, scale:  2 }),
	annualCashFlow: numeric("annual_cash_flow", { precision: 12, scale:  2 }),
	capRatePercent: numeric("cap_rate_percent", { precision: 5, scale:  2 }),
	cashOnCashRoi: numeric("cash_on_cash_roi", { precision: 5, scale:  2 }),
	dscr: numeric({ precision: 4, scale:  2 }),
	fiveYearGain: numeric("five_year_gain", { precision: 12, scale:  2 }),
	equityAtPurchase: numeric("equity_at_purchase", { precision: 12, scale:  2 }),
	investmentScorePercent: numeric("investment_score_percent", { precision: 5, scale:  2 }),
	isCashFlowNegative: boolean("is_cash_flow_negative"),
	isRentEstimateMissing: boolean("is_rent_estimate_missing"),
	isBelowZestimate: boolean("is_below_zestimate"),
	isForeclosure: boolean("is_foreclosure"),
	isNewConstruction: boolean("is_new_construction"),
	url: text(),
	imgMain: text("img_main"),
	fetchCount: integer("fetch_count"),
	lastFetchedAt: timestamp("last_fetched_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	motivationScore: integer("motivation_score"),
	motivationLevel: text("motivation_level"),
	isFsbo: boolean("is_fsbo"),
	motivationAnalyzedAt: timestamp("motivation_analyzed_at", { mode: 'string' }),
}).as(sql`SELECT p.zpid, p.search_market, p.address, p.address_street, p.address_city, p.address_state, p.address_zip, p.full_address, p.latitude, p.longitude, p.county, p.home_status, p.home_type, p.listing_status, p.days_on_zillow, p.price, p.list_price, p.zestimate, p.rent_estimate, p.rent_zestimate, p.tax_assessed, p.tax_assessed_value, p.size_sq_ft, p.living_area_sq_ft, p.price_per_sq_ft, p.num_beds, p.num_baths, p.year_built, p.down_payment, p.closing_costs, p.total_cash_needed, p.monthly_mortgage, p.monthly_taxes, p.monthly_expenses, p.monthly_cash_flow, p.annual_cash_flow, p.cap_rate_percent, p.cash_on_cash_roi, p.dscr, p.five_year_gain, p.equity_at_purchase, p.investment_score_percent, p.is_cash_flow_negative, p.is_rent_estimate_missing, p.is_below_zestimate, p.is_foreclosure, p.is_new_construction, p.url, p.img_main, p.fetch_count, p.last_fetched_at, p.created_at, p.updated_at, msa.motivation_score, msa.motivation_level, msa.is_fsbo, msa.analyzed_at AS motivation_analyzed_at FROM properties p LEFT JOIN LATERAL ( SELECT motivated_seller_analysis.id, motivated_seller_analysis.zpid, motivated_seller_analysis.motivation_score, motivated_seller_analysis.motivation_level, motivated_seller_analysis.keywords_found, motivated_seller_analysis.urgent_keywords, motivated_seller_analysis.moderate_keywords, motivated_seller_analysis.mild_keywords, motivated_seller_analysis.negative_keywords, motivated_seller_analysis.is_fsbo, motivated_seller_analysis.emails_in_description, motivated_seller_analysis.phones_in_description, motivated_seller_analysis.analyzed_at, motivated_seller_analysis.created_at FROM motivated_seller_analysis WHERE motivated_seller_analysis.zpid = p.zpid ORDER BY motivated_seller_analysis.analyzed_at DESC LIMIT 1) msa ON true`);

// ---------------------------------------------------------------------------
// App-facing types & validation (added for the Supabase re-platform 2026-05-31)
// ---------------------------------------------------------------------------

// Select types
export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type PropertyDetail = typeof propertyDetails.$inferSelect;
export type UserProperty = typeof userProperties.$inferSelect;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type WhitelabelBranding = typeof whitelabelBranding.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ProcessedWebhookEvent = typeof processedWebhookEvents.$inferSelect;
export type BillingTransaction = typeof billingTransactions.$inferSelect;
export type SavedSearch = typeof savedSearches.$inferSelect;
export type PropertyAlertRow = typeof propertyAlerts.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type PropertyWithMotivation = typeof propertiesWithMotivation.$inferSelect;
export type UserPropertyFull = typeof userPropertiesFull.$inferSelect;

// Insert/update types
export type InsertProperty = typeof properties.$inferInsert;
export type InsertPropertyDetail = typeof propertyDetails.$inferInsert;
export type InsertUserProperty = typeof userProperties.$inferInsert;
export type InsertWhitelabelBranding = typeof whitelabelBranding.$inferInsert;
export type UpdateWhitelabelBranding = Partial<Omit<InsertWhitelabelBranding, "id" | "tenantId" | "createdAt" | "updatedAt">>;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// Read-only property search/filter (properties are written by n8n, not the app)
export const propertySearchSchema = z.object({
  query: z.string().optional(),
  market: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  scoreMin: z.number().min(0).max(100).optional(),
  scoreMax: z.number().min(0).max(100).optional(),
  bedsMin: z.number().optional(),
  homeType: z.string().optional(),
  sortBy: z.enum(["score-desc", "score-asc", "price-asc", "price-desc", "newest", "oldest"]).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});
export type PropertySearch = z.infer<typeof propertySearchSchema>;

// Validation: tracking a property (user_properties)
export const insertUserPropertySchema = createInsertSchema(userProperties).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});
export const updateUserPropertySchema = insertUserPropertySchema.partial();

// Validation: white-label branding upsert (tenant_id supplied server-side)
export const upsertBrandingSchema = createInsertSchema(whitelabelBranding)
  .omit({ id: true, tenantId: true, createdAt: true, updatedAt: true })
  .partial();

// ---------------------------------------------------------------------------
// Cash-buyer list. The dispo-side asset: investors (landlords/flippers/funds)
// with a buy box, so found deals can be matched to ready buyers instantly.
// Sourced externally (county records, PropStream, REIA, etc.) and stored here.
// ---------------------------------------------------------------------------
export const buyers = pgTable("buyers", {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id"),
  name: text().notNull(),
  company: text(),
  email: text(),
  phone: text(),
  buyerType: text("buyer_type"), // landlord | flipper | fund | wholesaler | other
  // Buy box
  targetZips: text("target_zips").array(),
  targetCities: text("target_cities").array(),
  targetStates: text("target_states").array(),
  propertyTypes: text("property_types").array(),
  minBeds: integer("min_beds"),
  maxBeds: integer("max_beds"),
  minBaths: numeric("min_baths", { precision: 3, scale: 1 }),
  minPrice: numeric("min_price", { precision: 12, scale: 2 }),
  maxPrice: numeric("max_price", { precision: 12, scale: 2 }),
  arvMin: numeric("arv_min", { precision: 12, scale: 2 }),
  arvMax: numeric("arv_max", { precision: 12, scale: 2 }),
  conditionTolerance: text("condition_tolerance"), // turnkey | light | moderate | heavy | teardown
  // Proof of funds
  proofOfFunds: boolean("proof_of_funds").default(false),
  proofOfFundsAmount: numeric("proof_of_funds_amount", { precision: 12, scale: 2 }),
  proofOfFundsVerifiedAt: date("proof_of_funds_verified_at"),
  // Meta
  source: text(), // county_records | propstream | reia | facebook | referral | other
  tags: text().array(),
  notes: text(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_buyers_tenant_id").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
  index("idx_buyers_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "buyers_tenant_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "buyers_user_id_fkey",
  }).onDelete("set null"),
]);

export type Buyer = typeof buyers.$inferSelect;
export type InsertBuyer = typeof buyers.$inferInsert;
