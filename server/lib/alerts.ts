import { consoleLogger } from "./console-logger";

// ---------------------------------------------------------------------------
// Email alerts (saved-search new-match notifications). Implemented against
// Resend's HTTP API so there's no SDK dependency. If RESEND_API_KEY /
// ALERT_FROM_EMAIL are unset, sending is a no-op (logged) — matches the
// codebase pattern of degrading gracefully when an integration key is absent.
// ---------------------------------------------------------------------------

export interface AlertEmail {
  to: string;
  subject: string;
  html: string;
}

export function alertsConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.ALERT_FROM_EMAIL);
}

// Returns true if the email was accepted by the provider.
export async function sendAlertEmail(email: AlertEmail): Promise<boolean> {
  if (!alertsConfigured()) {
    consoleLogger.logInfo(
      `Alert email skipped (RESEND_API_KEY/ALERT_FROM_EMAIL unset): "${email.subject}" → ${email.to}`,
    );
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL,
        to: email.to,
        subject: email.subject,
        html: email.html,
      }),
    });
    if (!res.ok) {
      console.error(`Resend send failed (${res.status}): ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send error:", err);
    return false;
  }
}

// Build the HTML body for a saved-search new-match alert.
export function buildMatchAlertHtml(
  searchName: string,
  matches: Array<{ address: string | null; city: string | null; state: string | null; price: string | null; score: string | null }>,
): string {
  const rows = matches
    .map((m) => {
      const loc = [m.address, m.city, m.state].filter(Boolean).join(", ") || "(address unavailable)";
      const price = m.price ? `$${Number(m.price).toLocaleString()}` : "—";
      const score = m.score != null ? `${Math.round(Number(m.score))}` : "—";
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${loc}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${price}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${score}</td></tr>`;
    })
    .join("");
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#0f172a">${matches.length} new match${matches.length === 1 ? "" : "es"} for "${searchName}"</h2>
      <p style="color:#475569">New properties matching your saved search criteria:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr>
          <th style="text-align:left;padding:8px 12px;color:#64748b">Property</th>
          <th style="text-align:right;padding:8px 12px;color:#64748b">Price</th>
          <th style="text-align:right;padding:8px 12px;color:#64748b">Score</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">ClearEdge Props — saved search alert</p>
    </div>`;
}
