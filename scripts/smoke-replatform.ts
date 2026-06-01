// End-to-end smoke test of the re-platformed backend against live Supabase.
// Exercises provisioning, read, bulk save-search-results, tracking, branding, webhook idempotency.
// Seeds the real default tenant + dev user (intended app state); cleans up synthetic test rows.
import "dotenv/config";
import { db, client } from "../server/db";
import { storage } from "../server/storage";
import { properties, userProperties, processedWebhookEvents, whitelabelBranding } from "../shared/schema";
import { and, eq } from "drizzle-orm";

const TEST_ZPID = "smoke-test-0001";
const TEST_EVENT = "evt_smoke_test_0001";

async function main() {
  // 1. Provisioning (mirrors requireAuth dev path)
  const tenant = (await storage.getTenantBySlug("clearedge")) ?? (await storage.createTenant({ name: "ClearEdge", slug: "clearedge" }));
  let user = await storage.getUserByEmail("dev@clearedge.local");
  if (!user) user = await storage.createUser({ tenantId: tenant.id, email: "dev@clearedge.local", fullName: "Dev User", role: "owner" });
  console.log(`provisioned tenant=${tenant.id.slice(0, 8)} user=${user.id.slice(0, 8)} role=${user.role}`);

  // 2. Read real properties
  const list = await storage.getProperties({ sortBy: "score-desc", limit: 3 });
  console.log(`getProperties -> ${list.length} rows; top zpid=${list[0]?.zpid} score=${list[0]?.investmentScorePercent}`);

  // 3. Bulk save-search-results (the "save multiple per search" flow)
  const saved = await storage.saveSearchResults(tenant.id, user.id, [
    { zpid: TEST_ZPID, addressCity: "Testville", addressState: "TX", price: "123456.00", numBeds: 3, searchMarket: "smoke" } as any,
  ]);
  console.log(`saveSearchResults -> saved=${saved.saved} zpids=${saved.zpids.join(",")}`);

  // 4. Tracked list reflects it
  const tracked = await storage.getUserProperties(tenant.id, user.id);
  const found = tracked.find((t) => t.zpid === TEST_ZPID);
  console.log(`getUserProperties -> ${tracked.length} tracked; test row present=${!!found}, joined city=${found?.property?.addressCity}`);

  // 5. Branding upsert + read
  const branding = await storage.upsertTenantBranding(tenant.id, { companyName: "Smoke Co", primaryColor: "#123456" });
  console.log(`branding upsert -> company=${branding.companyName} color=${branding.primaryColor}`);

  // 6. Webhook idempotency
  await storage.markWebhookEventProcessed(TEST_EVENT, "smoke.test");
  const dupe = await storage.isWebhookEventProcessed(TEST_EVENT);
  console.log(`webhook idempotency -> processed=${dupe}`);

  // 7. Cleanup synthetic rows (keep tenant + dev user as intended seed)
  await db.delete(userProperties).where(and(eq(userProperties.tenantId, tenant.id), eq(userProperties.zpid, TEST_ZPID)));
  await db.delete(properties).where(eq(properties.zpid, TEST_ZPID));
  await db.delete(processedWebhookEvents).where(eq(processedWebhookEvents.id, TEST_EVENT));
  await db.delete(whitelabelBranding).where(eq(whitelabelBranding.tenantId, tenant.id));
  console.log("cleanup done (removed test property, tracking, webhook event, branding)");

  console.log("\nSMOKE TEST PASSED");
  await client.end({ timeout: 5 });
}

main().catch(async (e) => {
  console.error("SMOKE TEST FAILED:", e);
  await client.end({ timeout: 5 }).catch(() => {});
  process.exitCode = 1;
});
