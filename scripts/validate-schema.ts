// Validate the introspected Drizzle schema against the live Supabase DB via the app's db client.
import { db, client } from "../server/db";
import { properties, userProperties, tenants, whitelabelBranding } from "../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  // Count via Drizzle on the shared properties table
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(properties);
  console.log("properties count (drizzle):", n);

  // Pull one property and check a few mapped columns resolve
  const rows = await db.select().from(properties).limit(1);
  if (rows.length) {
    const p = rows[0];
    console.log("sample property:", {
      zpid: p.zpid,
      city: p.addressCity,
      price: p.price,
      capRate: p.capRatePercent,
      investmentScore: p.investmentScorePercent,
    });
  }

  // Confirm the ported + existing tables are queryable
  const [{ t }] = await db.select({ t: sql<number>`count(*)::int` }).from(tenants);
  const [{ b }] = await db.select({ b: sql<number>`count(*)::int` }).from(whitelabelBranding);
  const [{ u }] = await db.select({ u: sql<number>`count(*)::int` }).from(userProperties);
  console.log(`tenants=${t}, whitelabel_branding=${b}, user_properties=${u}`);

  console.log("SCHEMA VALIDATION OK");
  await client.end({ timeout: 5 });
}

main().catch(async (e) => {
  console.error("SCHEMA VALIDATION FAILED:", e.message);
  await client.end({ timeout: 5 }).catch(() => {});
  process.exitCode = 1;
});
