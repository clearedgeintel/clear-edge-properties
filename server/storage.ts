import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  tenants,
  users,
  properties,
  propertyDetails,
  userProperties,
  pipelineStages,
  whitelabelBranding,
  apiKeys,
  processedWebhookEvents,
  type Tenant,
  type User,
  type Property,
  type InsertProperty,
  type PropertyDetail,
  type InsertPropertyDetail,
  type UserProperty,
  type PipelineStage,
  type WhitelabelBranding,
  type UpdateWhitelabelBranding,
  type ApiKey,
  type InsertApiKey,
  type PropertySearch,
} from "@shared/schema";

// ---------------------------------------------------------------------------
// Storage layer — re-platformed onto Supabase ClearEdgeProperties (2026-05-31).
// Multi-tenant: every tenant-owned query is scoped by tenantId. Properties are
// read-only (written by n8n). The legacy scraping/job subsystem was retired.
// ---------------------------------------------------------------------------

export interface IStorage {
  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByStripeCustomerId(stripeCustomerId: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(values: { name: string; slug: string }): Promise<Tenant>;
  updateTenantStripeInfo(tenantId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<Tenant>;
  updateTenantSubscriptionStatus(tenantId: string, status: string): Promise<Tenant>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySupabaseId(supabaseUserId: string): Promise<User | undefined>;
  createUser(values: { tenantId: string; supabaseUserId?: string; email: string; fullName?: string; role?: string }): Promise<User>;

  // Properties. n8n bulk-ingests; the app upserts properties a user saves from
  // external (Zillow/LoopNet/Redfin) search. Keyed by zpid.
  getProperties(search: PropertySearch): Promise<Property[]>;
  getProperty(zpid: string): Promise<Property | undefined>;
  getPropertyDetail(zpid: string): Promise<PropertyDetail | undefined>;
  upsertProperty(values: InsertProperty): Promise<Property>;
  upsertProperties(values: InsertProperty[]): Promise<Property[]>;
  upsertPropertyDetail(values: InsertPropertyDetail): Promise<PropertyDetail>;

  // Tracked properties (user_properties replaces the old watchlist)
  getUserProperties(tenantId: string, userId: string): Promise<Array<UserProperty & { property: Property | null }>>;
  addUserProperty(tenantId: string, userId: string, zpid: string): Promise<UserProperty>;
  addUserProperties(tenantId: string, userId: string, zpids: string[]): Promise<UserProperty[]>;
  saveSearchResults(tenantId: string, userId: string, results: InsertProperty[]): Promise<{ saved: number; zpids: string[] }>;
  removeUserProperty(tenantId: string, userId: string, zpid: string): Promise<void>;
  isUserProperty(tenantId: string, userId: string, zpid: string): Promise<boolean>;
  updateUserProperty(tenantId: string, id: string, updates: Partial<UserProperty>): Promise<UserProperty>;

  // Pipeline stages
  getPipelineStages(tenantId: string): Promise<PipelineStage[]>;

  // White-label branding (per tenant)
  getTenantBranding(tenantId: string): Promise<WhitelabelBranding | undefined>;
  upsertTenantBranding(tenantId: string, updates: UpdateWhitelabelBranding): Promise<WhitelabelBranding>;
  deleteTenantBranding(tenantId: string): Promise<void>;

  // API keys (per tenant)
  createApiKey(values: InsertApiKey): Promise<ApiKey>;
  getApiKeysByTenant(tenantId: string): Promise<ApiKey[]>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  touchApiKey(id: string): Promise<void>;
  deleteApiKey(tenantId: string, id: string): Promise<void>;

  // Stripe webhook idempotency
  isWebhookEventProcessed(eventId: string): Promise<boolean>;
  markWebhookEventProcessed(eventId: string, type: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ---- Tenants ----
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [row] = await db.select().from(tenants).where(eq(tenants.id, id));
    return row || undefined;
  }

  async getTenantByStripeCustomerId(stripeCustomerId: string): Promise<Tenant | undefined> {
    const [row] = await db.select().from(tenants).where(eq(tenants.stripeCustomerId, stripeCustomerId));
    return row || undefined;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return row || undefined;
  }

  async createTenant(values: { name: string; slug: string }): Promise<Tenant> {
    const [row] = await db.insert(tenants).values({ name: values.name, slug: values.slug }).returning();
    return row;
  }

  async updateTenantStripeInfo(tenantId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<Tenant> {
    const [row] = await db
      .update(tenants)
      .set({ stripeCustomerId, stripeSubscriptionId, updatedAt: sql`now()` })
      .where(eq(tenants.id, tenantId))
      .returning();
    return row;
  }

  async updateTenantSubscriptionStatus(tenantId: string, status: string): Promise<Tenant> {
    const [row] = await db
      .update(tenants)
      .set({ subscriptionStatus: status, updatedAt: sql`now()` })
      .where(eq(tenants.id, tenantId))
      .returning();
    return row;
  }

  // ---- Users ----
  async getUser(id: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.email, email));
    return row || undefined;
  }

  async getUserBySupabaseId(supabaseUserId: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId));
    return row || undefined;
  }

  async createUser(values: { tenantId: string; supabaseUserId?: string; email: string; fullName?: string; role?: string }): Promise<User> {
    const [row] = await db
      .insert(users)
      .values({
        tenantId: values.tenantId,
        supabaseUserId: values.supabaseUserId ?? null,
        email: values.email,
        fullName: values.fullName ?? null,
        role: values.role ?? "member",
      })
      .returning();
    return row;
  }

  // ---- Properties (read-only) ----
  async getProperties(search: PropertySearch): Promise<Property[]> {
    const conditions = [];
    if (search.market) conditions.push(eq(properties.searchMarket, search.market));
    if (search.city) conditions.push(ilike(properties.addressCity, `%${search.city}%`));
    if (search.state) conditions.push(ilike(properties.addressState, `%${search.state}%`));
    if (search.zip) conditions.push(eq(properties.addressZip, search.zip));
    if (search.priceMin !== undefined) conditions.push(gte(properties.price, String(search.priceMin)));
    if (search.priceMax !== undefined) conditions.push(lte(properties.price, String(search.priceMax)));
    if (search.scoreMin !== undefined) conditions.push(gte(properties.investmentScorePercent, String(search.scoreMin)));
    if (search.scoreMax !== undefined) conditions.push(lte(properties.investmentScorePercent, String(search.scoreMax)));
    if (search.bedsMin !== undefined) conditions.push(gte(properties.numBeds, search.bedsMin));
    if (search.homeType) conditions.push(eq(properties.homeType, search.homeType));
    if (search.query) {
      conditions.push(
        or(
          ilike(properties.fullAddress, `%${search.query}%`),
          ilike(properties.addressCity, `%${search.query}%`),
          ilike(properties.addressZip, `%${search.query}%`),
        ),
      );
    }

    const orderBy = (() => {
      switch (search.sortBy) {
        case "score-asc": return asc(properties.investmentScorePercent);
        case "price-asc": return asc(properties.price);
        case "price-desc": return desc(properties.price);
        case "newest": return desc(properties.createdAt);
        case "oldest": return asc(properties.createdAt);
        case "score-desc":
        default: return desc(properties.investmentScorePercent);
      }
    })();

    let q = db.select().from(properties).$dynamic();
    if (conditions.length) q = q.where(and(...conditions));
    q = q.orderBy(orderBy).limit(search.limit ?? 50).offset(search.offset ?? 0);
    return await q;
  }

  async getProperty(zpid: string): Promise<Property | undefined> {
    const [row] = await db.select().from(properties).where(eq(properties.zpid, zpid));
    return row || undefined;
  }

  async getPropertyDetail(zpid: string): Promise<PropertyDetail | undefined> {
    const [row] = await db.select().from(propertyDetails).where(eq(propertyDetails.zpid, zpid));
    return row || undefined;
  }

  async upsertProperty(values: InsertProperty): Promise<Property> {
    const [row] = await db
      .insert(properties)
      .values(values)
      .onConflictDoUpdate({ target: properties.zpid, set: { ...values, updatedAt: sql`now()` } })
      .returning();
    return row;
  }

  async upsertProperties(values: InsertProperty[]): Promise<Property[]> {
    if (!values.length) return [];
    return await db
      .insert(properties)
      .values(values)
      .onConflictDoUpdate({ target: properties.zpid, set: { updatedAt: sql`now()` } })
      .returning();
  }

  async upsertPropertyDetail(values: InsertPropertyDetail): Promise<PropertyDetail> {
    const [row] = await db
      .insert(propertyDetails)
      .values(values)
      .onConflictDoUpdate({ target: propertyDetails.zpid, set: { ...values, updatedAt: sql`now()` } })
      .returning();
    return row;
  }

  // ---- Tracked properties (user_properties) ----
  async getUserProperties(tenantId: string, userId: string): Promise<Array<UserProperty & { property: Property | null }>> {
    const rows = await db
      .select()
      .from(userProperties)
      .leftJoin(properties, eq(userProperties.zpid, properties.zpid))
      .where(and(eq(userProperties.tenantId, tenantId), eq(userProperties.userId, userId)))
      .orderBy(desc(userProperties.addedAt));
    return rows.map((r) => ({ ...r.user_properties, property: r.properties ?? null }));
  }

  async addUserProperty(tenantId: string, userId: string, zpid: string): Promise<UserProperty> {
    const [row] = await db
      .insert(userProperties)
      .values({ tenantId, userId, zpid })
      .onConflictDoNothing()
      .returning();
    if (row) return row;
    // Already tracked — return the existing row.
    const [existing] = await db
      .select()
      .from(userProperties)
      .where(and(eq(userProperties.tenantId, tenantId), eq(userProperties.userId, userId), eq(userProperties.zpid, zpid)));
    return existing;
  }

  async addUserProperties(tenantId: string, userId: string, zpids: string[]): Promise<UserProperty[]> {
    if (!zpids.length) return [];
    // De-dupe input and insert; ignore ones already tracked.
    const unique = Array.from(new Set(zpids));
    const rows = await db
      .insert(userProperties)
      .values(unique.map((zpid) => ({ tenantId, userId, zpid })))
      .onConflictDoNothing()
      .returning();
    return rows;
  }

  // Save many search results at once: upsert each property, then track them all.
  async saveSearchResults(tenantId: string, userId: string, results: InsertProperty[]): Promise<{ saved: number; zpids: string[] }> {
    const withZpid = results.filter((r) => !!r.zpid);
    if (!withZpid.length) return { saved: 0, zpids: [] };
    await this.upsertProperties(withZpid);
    const zpids = withZpid.map((r) => r.zpid as string);
    await this.addUserProperties(tenantId, userId, zpids);
    return { saved: zpids.length, zpids };
  }

  async removeUserProperty(tenantId: string, userId: string, zpid: string): Promise<void> {
    await db
      .delete(userProperties)
      .where(and(eq(userProperties.tenantId, tenantId), eq(userProperties.userId, userId), eq(userProperties.zpid, zpid)));
  }

  async isUserProperty(tenantId: string, userId: string, zpid: string): Promise<boolean> {
    const [row] = await db
      .select({ id: userProperties.id })
      .from(userProperties)
      .where(and(eq(userProperties.tenantId, tenantId), eq(userProperties.userId, userId), eq(userProperties.zpid, zpid)));
    return !!row;
  }

  async updateUserProperty(tenantId: string, id: string, updates: Partial<UserProperty>): Promise<UserProperty> {
    const [row] = await db
      .update(userProperties)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(and(eq(userProperties.id, id), eq(userProperties.tenantId, tenantId)))
      .returning();
    return row;
  }

  // ---- Pipeline stages ----
  async getPipelineStages(tenantId: string): Promise<PipelineStage[]> {
    return await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.tenantId, tenantId))
      .orderBy(asc(pipelineStages.orderIndex));
  }

  // ---- White-label branding ----
  async getTenantBranding(tenantId: string): Promise<WhitelabelBranding | undefined> {
    const [row] = await db.select().from(whitelabelBranding).where(eq(whitelabelBranding.tenantId, tenantId));
    return row || undefined;
  }

  async upsertTenantBranding(tenantId: string, updates: UpdateWhitelabelBranding): Promise<WhitelabelBranding> {
    const [row] = await db
      .insert(whitelabelBranding)
      .values({ tenantId, ...updates })
      .onConflictDoUpdate({
        target: whitelabelBranding.tenantId,
        set: { ...updates, updatedAt: sql`now()` },
      })
      .returning();
    return row;
  }

  async deleteTenantBranding(tenantId: string): Promise<void> {
    await db.delete(whitelabelBranding).where(eq(whitelabelBranding.tenantId, tenantId));
  }

  // ---- API keys ----
  async createApiKey(values: InsertApiKey): Promise<ApiKey> {
    const [row] = await db.insert(apiKeys).values(values).returning();
    return row;
  }

  async getApiKeysByTenant(tenantId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.tenantId, tenantId)).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [row] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    return row || undefined;
  }

  async touchApiKey(id: string): Promise<void> {
    await db.update(apiKeys).set({ lastUsed: sql`now()` }).where(eq(apiKeys.id, id));
  }

  async deleteApiKey(tenantId: string, id: string): Promise<void> {
    await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId)));
  }

  // ---- Stripe webhook idempotency ----
  async isWebhookEventProcessed(eventId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: processedWebhookEvents.id })
      .from(processedWebhookEvents)
      .where(eq(processedWebhookEvents.id, eventId));
    return !!row;
  }

  async markWebhookEventProcessed(eventId: string, type: string): Promise<void> {
    await db.insert(processedWebhookEvents).values({ id: eventId, type }).onConflictDoNothing();
  }
}

export const storage: IStorage = new DatabaseStorage();
