// Smoke test for atomic Stripe webhook idempotency (storage.processWebhookEventOnce).
// Uses throwaway event ids and deletes them afterwards. Run: npx tsx scripts/smoke-webhook-idempotency.ts
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db, client } from "../server/db";
import { storage } from "../server/storage";
import { processedWebhookEvents } from "../shared/schema";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const suffix = Date.now();
const CONCURRENT = `evt_smoke_concurrent_${suffix}`;
const FAILING = `evt_smoke_failing_${suffix}`;

async function main() {
  let failures = 0;
  const check = (label: string, ok: boolean) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) failures++;
  };

  // 1. Two concurrent deliveries of one event: exactly one handler run.
  let runs = 0;
  const handler = async () => {
    runs++;
    await sleep(500);
  };
  const outcomes = await Promise.all([
    storage.processWebhookEventOnce(CONCURRENT, "smoke.test", handler),
    storage.processWebhookEventOnce(CONCURRENT, "smoke.test", handler),
  ]);
  check("concurrent duplicate runs handler once", runs === 1);
  check("outcomes are one processed + one duplicate", outcomes.sort().join(",") === "duplicate,processed");

  // 2. A later redelivery is a duplicate.
  const again = await storage.processWebhookEventOnce(CONCURRENT, "smoke.test", handler);
  check("redelivery after success is duplicate", again === "duplicate" && runs === 1);

  // 3. A failing handler releases the claim so a retry processes it.
  let threw = false;
  try {
    await storage.processWebhookEventOnce(FAILING, "smoke.test", async () => {
      throw new Error("boom");
    });
  } catch {
    threw = true;
  }
  const [row] = await db.select().from(processedWebhookEvents).where(eq(processedWebhookEvents.id, FAILING));
  check("failing handler rethrows", threw);
  check("failing handler leaves no claim row", !row);
  const retry = await storage.processWebhookEventOnce(FAILING, "smoke.test", async () => {});
  check("retry after failure is processed", retry === "processed");

  await db.delete(processedWebhookEvents).where(inArray(processedWebhookEvents.id, [CONCURRENT, FAILING]));
  await client.end();
  process.exit(failures ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await db.delete(processedWebhookEvents).where(inArray(processedWebhookEvents.id, [CONCURRENT, FAILING]));
  await client.end();
  process.exit(1);
});
