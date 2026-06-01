import { Router, type Request, type Response } from "express";
import { requireAuth } from "./middleware";
import { requireTierLimit } from "../lib/tier-limits";
import { storage } from "../storage";
import type { Property, PropertyDetail } from "@shared/schema";

const router = Router();

// ---------------------------------------------------------------------------
// AI routes re-pointed onto Supabase. Properties are now loaded server-side by
// zpid via storage.getProperty()/getPropertyDetail() rather than trusting a
// client-supplied property blob. AI output is returned in the response and NOT
// persisted — the legacy property_commentary table is gone. A future
// property_activities / user_properties.custom_notes persistence could be added.
// ---------------------------------------------------------------------------

// Numeric columns on `properties` come back as STRINGS; parse defensively.
function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value: string | number | null | undefined): string {
  const n = num(value);
  return n === null ? "N/A" : `$${n.toLocaleString()}`;
}

function streetOf(p: Property): string {
  return p.addressStreet || p.address || p.fullAddress || "";
}

function fullAddressOf(p: Property): string {
  return (
    p.fullAddress ||
    [streetOf(p), p.addressCity, [p.addressState, p.addressZip].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ")
  );
}

// Resolve a zpid from a request body that may send { zpid } or { property: { zpid } }.
function resolveZpid(body: any): string | undefined {
  const zpid = body?.zpid ?? body?.property?.zpid;
  return zpid != null ? String(zpid) : undefined;
}

// Load a property (+ detail) from Supabase by zpid.
async function loadProperty(
  zpid: string,
): Promise<{ property: Property; detail: PropertyDetail | null } | null> {
  const property = await storage.getProperty(zpid);
  if (!property) return null;
  const detail = (await storage.getPropertyDetail(zpid)) ?? null;
  return { property, detail };
}

// AI Underwriting generation
router.post(
  "/api/ai/generate-underwriting",
  requireAuth,
  requireTierLimit("ai_generation"),
  async (req: Request, res: Response) => {
    try {
      const { investorType, targetReturn, financing, holdPeriod, renovationBudget, notes } = req.body;
      const zpid = resolveZpid(req.body);
      if (!zpid) return res.status(400).json({ error: "property zpid is required" });

      const loaded = await loadProperty(zpid);
      if (!loaded) return res.status(404).json({ error: "Property not found" });
      const { property, detail } = loaded;

      const OpenAI = await import("openai");
      const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

      const livingArea = num(property.livingAreaSqFt) ?? num(property.sizeSqFt);

      const prompt = `You are a professional real estate underwriter preparing to conduct **initial underwriting** on a property. Based on the following details, generate a clear list of required documents, data points, and analysis tasks needed to complete a preliminary underwriting review.

Use bullet points and group requirements under the following categories:
- Property Overview
- Financials & Rent Roll
- Market Data
- Risk Assessment
- Required Documents

Include a short summary at the top explaining what this underwriting will evaluate (e.g. value, cash flow, risk, financing viability).

---
PROPERTY DETAILS:
- Address: ${fullAddressOf(property)}
- Property Type: ${property.homeType || "N/A"}
- Units: ${property.numBeds ? property.numBeds + " bedrooms" : "N/A"}
- Square Footage: ${livingArea !== null ? livingArea.toLocaleString() : "N/A"} sq ft
- Asking Price: ${money(property.listPrice ?? property.price)}
- Year Built: ${property.yearBuilt || "N/A"}
- Investment Score: ${property.investmentScorePercent || "N/A"}/100
- Cap Rate: ${property.capRatePercent || "N/A"}%
- Monthly Cash Flow: ${money(property.monthlyCashFlow)}
- Cash-on-Cash ROI: ${property.cashOnCashRoi || "N/A"}%
${detail?.floodRiskLabel ? `- Flood Risk: ${detail.floodRiskLabel}` : ""}
- Notes: ${notes || "None provided"}

BUYER PROFILE:
- Investor Type: ${investorType}
- Target Return: ${targetReturn}%
- Financing Plan: ${financing}
- Hold Period: ${holdPeriod} years
- Renovation Budget: ${money(renovationBudget)}

Please return a comprehensive checklist formatted for use by an analyst or junior associate doing first-pass underwriting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const checklist = response.choices[0].message.content || "Unable to generate underwriting checklist";

      res.json({ checklist });
    } catch (error) {
      console.error("Underwriting generation error:", error);
      res.status(500).json({ error: "Failed to generate underwriting checklist" });
    }
  },
);

// AI Offer generation
router.post(
  "/api/ai/generate-offer",
  requireAuth,
  requireTierLimit("ai_generation"),
  async (req: Request, res: Response) => {
    try {
      const { property: _ignored, ...offerData } = req.body;
      const zpid = resolveZpid(req.body);
      if (!zpid) return res.status(400).json({ error: "property zpid is required" });

      const loaded = await loadProperty(zpid);
      if (!loaded) return res.status(404).json({ error: "Property not found" });
      const { property } = loaded;

      const OpenAI = await import("openai");
      const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

      const livingArea = num(property.livingAreaSqFt) ?? num(property.sizeSqFt);

      const prompt = `You are a professional real estate investor writing a formal, concise offer letter for a property acquisition.

Property Details:
- Address: ${fullAddressOf(property)}
- Asking Price: ${money(property.listPrice ?? property.price)}
- Your Offer Price: ${money(offerData.offerPrice)}
- Property Type: ${property.homeType || "N/A"}
- Square Footage: ${livingArea !== null ? livingArea.toLocaleString() : "N/A"} sq ft
- Bedrooms: ${property.numBeds ?? "N/A"}
- Bathrooms: ${property.numBaths ?? "N/A"}
- Investment Score: ${property.investmentScorePercent || "N/A"}/100

Buyer Information:
- Buyer Name: ${offerData.buyerName}
- Entity: ${offerData.buyerEntity || "N/A"}
- Email: ${offerData.buyerEmail}
- Phone: ${offerData.buyerPhone}

Offer Terms:
- Earnest Money Deposit: ${money(offerData.earnestMoney)}
- Financing: ${offerData.financing}
- Due Diligence Period: ${offerData.dueDiligence} days
- Closing Timeline: ${offerData.closingTimeline} days
- Contingencies: ${offerData.contingencies}
- Additional Notes: ${offerData.notes || "None"}

Generate a professional business letter format with clear sections: Property Overview, Purchase Offer, Terms and Conditions, and signature block. Use formal language and include all relevant details.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content:
              "You are a professional real estate attorney specializing in investment property acquisitions. Generate concise, legally appropriate offer letters.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const offer = response.choices[0].message.content;
      res.json({ offer });
    } catch (error) {
      console.error("Error generating AI offer:", error);
      res.status(500).json({ error: "Failed to generate offer letter" });
    }
  },
);

// AI Deal Comparison
router.post(
  "/api/ai/compare-deals",
  requireAuth,
  requireTierLimit("ai_generation"),
  async (req: Request, res: Response) => {
    try {
      // Accept either { zpids: [...] } or { properties: [{ zpid }, ...] }.
      const zpids: string[] = Array.isArray(req.body?.zpids)
        ? req.body.zpids.map((z: any) => String(z))
        : Array.isArray(req.body?.properties)
          ? req.body.properties.map((p: any) => String(p?.zpid)).filter(Boolean)
          : [];

      if (zpids.length < 2 || zpids.length > 3) {
        return res.status(400).json({ error: "Must provide 2-3 properties for comparison" });
      }

      const loaded = await Promise.all(zpids.map((z) => loadProperty(z)));
      const found = loaded.filter((l): l is { property: Property; detail: PropertyDetail | null } => !!l);
      if (found.length < 2) {
        return res.status(404).json({ error: "Could not load at least 2 of the requested properties" });
      }

      const OpenAI = await import("openai");
      const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

      const propertyDetails = found
        .map(({ property: p }, index) => {
          const livingArea = num(p.livingAreaSqFt) ?? num(p.sizeSqFt);
          return `
Property ${index + 1} - ${fullAddressOf(p)} (zpid ${p.zpid}):
- Full Address: ${fullAddressOf(p)}
- Price: ${money(p.listPrice ?? p.price)}
- Property Type: ${p.homeType || "N/A"}
- Bedrooms: ${p.numBeds ?? "N/A"}
- Bathrooms: ${p.numBaths ?? "N/A"}
- Square Footage: ${livingArea !== null ? livingArea.toLocaleString() : "N/A"} sq ft
- Investment Score: ${p.investmentScorePercent || "N/A"}/100
- Year Built: ${p.yearBuilt || "N/A"}
- Monthly Rent Estimate: ${money(p.rentZestimate ?? p.rentEstimate)}
- Cap Rate: ${p.capRatePercent || "N/A"}%
- Monthly Cash Flow: ${money(p.monthlyCashFlow)}
- Cash-on-Cash ROI: ${p.cashOnCashRoi || "N/A"}%
- DSCR: ${p.dscr || "N/A"}
      `;
        })
        .join("\n");

      const prompt = `You are a professional real estate investment advisor comparing multiple properties for investment potential. Analyze these properties and provide a comprehensive comparison.

${propertyDetails}

IMPORTANT: When referencing properties in your analysis, always use their actual addresses (e.g., "384 Mooring Line Dr, Naples, FL" or "2319 Viola View Ln NE, Rochester, MN") instead of generic references like "Property 1" or "Property 12". This makes the analysis much more readable and professional.

Provide your analysis in the following JSON format:
{
  "summary": "Executive summary of the comparison (2-3 sentences)",
  "recommendation": "Clear recommendation on which property to prioritize and why",
  "properties": [
    {
      "zpid": "property zpid",
      "rank": 1,
      "pros": ["list of 3-4 key advantages"],
      "cons": ["list of 3-4 key disadvantages or concerns"],
      "exitStrategies": [
        {
          "strategy": "Hold for Cash Flow",
          "timeline": "5-10 years",
          "expectedReturn": "12-15% IRR",
          "riskLevel": "Low"
        }
      ],
      "riskScore": 25,
      "adjustedReturn": 14.2
    }
  ],
  "marketInsights": ["3-4 key market insights relevant to all properties"],
  "riskFactors": ["3-4 major risk factors to consider"]
}

Focus on:
- Investment potential and returns
- Market conditions and location factors
- Cash flow and appreciation potential
- Risk assessment and mitigation
- Exit strategy viability
- Comparative advantages/disadvantages

CRITICAL: In your summary, recommendation, pros/cons, and all text fields, always reference properties by their specific addresses (e.g. "384 Mooring Line Dr in Naples, FL" or "the Rochester, MN property") rather than generic labels like "Property 1", "Property 2", etc. This makes the analysis immediately actionable and easy to follow.

Rank properties from best (#1) to worst investment opportunity.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content:
              "You are a senior real estate investment advisor with expertise in property analysis, market trends, and risk assessment. Provide detailed, actionable investment advice. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.3,
      });

      const comparison = JSON.parse(response.choices[0].message.content || "{}");
      res.json(comparison);
    } catch (error) {
      console.error("Error generating deal comparison:", error);
      res.status(500).json({ error: "Failed to compare deals" });
    }
  },
);

// Letter of Intent generation endpoint
router.post(
  "/api/generate-loi",
  requireAuth,
  requireTierLimit("ai_generation"),
  async (req: Request, res: Response) => {
    try {
      const { generateLetterOfIntent } = await import("../lib/openai");

      const { property: _ignored, ...loiData } = req.body;
      const zpid = resolveZpid(req.body);

      if (!zpid || !loiData.buyerName || !loiData.purchasePrice) {
        return res.status(400).json({
          error: "Missing required fields: property zpid, buyerName, and purchasePrice are required",
        });
      }

      const loaded = await loadProperty(zpid);
      if (!loaded) return res.status(404).json({ error: "Property not found" });

      const letter = await generateLetterOfIntent(loaded.property, loiData, loaded.detail);

      res.json({ letter });
    } catch (error: any) {
      console.error("LOI Generation Error:", error);
      res.status(500).json({
        error: "Failed to generate Letter of Intent",
      });
    }
  },
);

// Investment thesis: why buy or avoid
router.post(
  "/api/ai/investment-thesis",
  requireAuth,
  requireTierLimit("ai_generation"),
  async (req: Request, res: Response) => {
    try {
      const zpid = resolveZpid(req.body);
      if (!zpid) return res.status(400).json({ error: "property zpid is required" });

      const loaded = await loadProperty(zpid);
      if (!loaded) return res.status(404).json({ error: "Property not found" });
      const { property } = loaded;

      const OpenAI = await import("openai");
      const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

      const metrics = {
        monthlyCashFlow: num(property.monthlyCashFlow),
        capRatePercent: num(property.capRatePercent),
        cashOnCashRoi: num(property.cashOnCashRoi),
        dscr: num(property.dscr),
        rentZestimate: num(property.rentZestimate ?? property.rentEstimate),
        zestimate: num(property.zestimate),
        fiveYearGain: num(property.fiveYearGain),
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a senior real estate investment advisor. Provide clear, actionable investment theses backed by specific data points.",
          },
          {
            role: "user",
            content: `Generate an investment thesis for this property. Include a clear BUY or AVOID recommendation with supporting evidence.

Property: ${fullAddressOf(property)}
Price: ${money(property.listPrice ?? property.price)} | Score: ${property.investmentScorePercent || "N/A"}/100
Type: ${property.homeType || "N/A"} | ${property.numBeds ?? "N/A"}bd/${property.numBaths ?? "N/A"}ba | ${num(property.livingAreaSqFt) ?? num(property.sizeSqFt) ?? "N/A"} sqft
Cash-on-Cash ROI: ${property.cashOnCashRoi || "N/A"}%
Metrics: ${JSON.stringify(metrics)}

Return JSON:
{
  "verdict": "BUY" | "AVOID",
  "confidence": "High" | "Medium" | "Low",
  "oneLiner": "Single sentence thesis",
  "bullCase": ["3-4 reasons to buy with specific numbers"],
  "bearCase": ["3-4 risks with specific numbers"],
  "catalysts": ["2-3 events that could increase value"],
  "exitStrategy": "Recommended hold period and exit approach",
  "targetReturn": "Expected annual return range"
}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      res.json(JSON.parse(response.choices[0].message.content || "{}"));
    } catch (error: any) {
      console.error("Investment thesis error:", error);
      res.status(500).json({ error: "Failed to generate investment thesis" });
    }
  },
);

// Risk assessment scoring
router.post(
  "/api/ai/risk-assessment",
  requireAuth,
  requireTierLimit("ai_generation"),
  async (req: Request, res: Response) => {
    try {
      const zpid = resolveZpid(req.body);
      if (!zpid) return res.status(400).json({ error: "property zpid is required" });

      const loaded = await loadProperty(zpid);
      if (!loaded) return res.status(404).json({ error: "Property not found" });
      const { property, detail } = loaded;

      const OpenAI = await import("openai");
      const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

      const metrics = {
        monthlyCashFlow: num(property.monthlyCashFlow),
        capRatePercent: num(property.capRatePercent),
        cashOnCashRoi: num(property.cashOnCashRoi),
        dscr: num(property.dscr),
        floodRisk: detail?.floodRiskLabel ?? null,
        fireRisk: detail?.fireRiskLabel ?? null,
        windRisk: detail?.windRiskLabel ?? null,
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a real estate risk analyst. Evaluate investment risk across multiple dimensions with specific scores.",
          },
          {
            role: "user",
            content: `Assess investment risk for this property across 6 dimensions, each scored 1-10 (1=lowest risk, 10=highest risk).

Property: ${fullAddressOf(property)}
Price: ${money(property.listPrice ?? property.price)} | Score: ${property.investmentScorePercent || "N/A"}/100
Type: ${property.homeType || "N/A"} | ${property.numBeds ?? "N/A"}bd/${property.numBaths ?? "N/A"}ba | ${num(property.livingAreaSqFt) ?? num(property.sizeSqFt) ?? "N/A"} sqft
Metrics: ${JSON.stringify(metrics)}

Return JSON:
{
  "overallRisk": 1-10,
  "riskLevel": "Low" | "Medium" | "High",
  "dimensions": {
    "market": { "score": 1-10, "reasoning": "brief explanation" },
    "financial": { "score": 1-10, "reasoning": "brief explanation" },
    "property": { "score": 1-10, "reasoning": "brief explanation" },
    "location": { "score": 1-10, "reasoning": "brief explanation" },
    "liquidity": { "score": 1-10, "reasoning": "brief explanation" },
    "regulatory": { "score": 1-10, "reasoning": "brief explanation" }
  },
  "mitigations": ["2-3 ways to reduce risk"],
  "worstCase": "Worst case scenario description",
  "bestCase": "Best case scenario description"
}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      res.json(JSON.parse(response.choices[0].message.content || "{}"));
    } catch (error: any) {
      console.error("Risk assessment error:", error);
      res.status(500).json({ error: "Failed to generate risk assessment" });
    }
  },
);

// AI-powered property recommendations based on the user's tracked properties.
router.get("/api/ai/recommendations", requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = (req as any).ctx;

    // The user's tracked properties define their preferences.
    const tracked = await storage.getUserProperties(tenantId, userId);
    const trackedProperties = tracked
      .map((t) => t.property)
      .filter((p): p is Property => !!p);

    // Candidate pool: top-scored properties in the catalog.
    const allProperties = await storage.getProperties({ sortBy: "score-desc", limit: 100 });

    const scoreOf = (p: Property) => num(p.investmentScorePercent) ?? 0;
    const priceOf = (p: Property) => num(p.price) ?? num(p.listPrice) ?? 0;

    if (trackedProperties.length === 0) {
      return res.json({
        recommendations: allProperties.slice(0, 5),
        reasoning:
          "Showing top-scored properties. Track properties to get personalized recommendations.",
        strategy: "top_scored",
      });
    }

    // Analyze tracked-property preferences.
    const trackedZpids = new Set(trackedProperties.map((p) => p.zpid));
    const avgPrice =
      trackedProperties.reduce((sum, p) => sum + priceOf(p), 0) / trackedProperties.length;
    const avgScore =
      trackedProperties.reduce((sum, p) => sum + scoreOf(p), 0) / trackedProperties.length;
    const preferredZips = new Set(trackedProperties.map((p) => p.addressZip).filter(Boolean));
    const preferredTypes = new Set(trackedProperties.map((p) => p.homeType).filter(Boolean));

    // Score candidates by similarity to tracked-property preferences.
    const candidates = allProperties
      .filter((p) => !trackedZpids.has(p.zpid))
      .map((p) => {
        let similarity = 0;
        // Price similarity (within 50% range)
        if (avgPrice > 0) {
          const priceDiff = Math.abs(priceOf(p) - avgPrice) / avgPrice;
          if (priceDiff < 0.5) similarity += (1 - priceDiff) * 30;
        }
        // Score similarity
        const scoreDiff = Math.abs(scoreOf(p) - avgScore) / 100;
        similarity += (1 - scoreDiff) * 25;
        // Same ZIP bonus
        if (p.addressZip && preferredZips.has(p.addressZip)) similarity += 20;
        // Same type bonus
        if (p.homeType && preferredTypes.has(p.homeType)) similarity += 15;
        // High score bonus
        similarity += (scoreOf(p) / 100) * 10;

        return { ...p, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 8);

    // Diversification suggestions (properties in different ZIPs than tracked).
    const diversified = allProperties
      .filter(
        (p) =>
          !trackedZpids.has(p.zpid) &&
          !(p.addressZip && preferredZips.has(p.addressZip)) &&
          scoreOf(p) >= 60,
      )
      .sort((a, b) => scoreOf(b) - scoreOf(a))
      .slice(0, 3);

    res.json({
      recommendations: candidates,
      diversification: diversified,
      reasoning: `Based on your ${trackedProperties.length} tracked properties (avg score ${Math.round(
        avgScore,
      )}, avg price $${Math.round(avgPrice).toLocaleString()}).`,
      strategy: "preference_matching",
      preferences: {
        avgPrice: Math.round(avgPrice),
        avgScore: Math.round(avgScore),
        preferredZips: Array.from(preferredZips),
        preferredTypes: Array.from(preferredTypes),
      },
    });
  } catch (error: any) {
    console.error("Recommendations error:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

export default router;
