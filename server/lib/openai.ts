import OpenAI from "openai";
import type { Property, PropertyDetail } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LoiData {
  purchasePrice: string;
  downPayment: string;
  financingAmount: string;
  inspectionPeriod: string;
  closingDate: string;
  earnestMoney: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  additionalTerms: string;
}

// Numeric columns on the Supabase `properties` table come back as STRINGS. This
// helper safely parses them for display/math; returns null when absent.
function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value: string | number | null | undefined): string {
  const n = num(value);
  return n === null ? "N/A" : `$${n.toLocaleString()}`;
}

export async function generateLetterOfIntent(
  property: Property,
  loiData: LoiData,
  detail?: PropertyDetail | null,
): Promise<string> {
  // Map the NEW Supabase property columns into the prompt. Numeric fields are
  // strings on the wire, so format defensively.
  const street = property.addressStreet || property.address || property.fullAddress || "";
  const city = property.addressCity || "";
  const state = property.addressState || "";
  const askingPrice = num(property.listPrice) ?? num(property.price);
  const offerPrice = num(loiData.purchasePrice);
  const pctOfAsking =
    offerPrice !== null && askingPrice ? ((offerPrice / askingPrice) * 100).toFixed(1) : "N/A";
  const livingArea = num(property.livingAreaSqFt) ?? num(property.sizeSqFt);

  const prompt = `Generate a professional Letter of Intent for a real estate purchase. Use the following details:

PROPERTY INFORMATION:
- Address: ${street}, ${city}, ${state} ${property.addressZip || ""}
- Property Type: ${property.homeType || "N/A"}
- Bedrooms: ${property.numBeds ?? "N/A"}
- Bathrooms: ${property.numBaths ?? "N/A"}
- Square Feet: ${livingArea !== null ? livingArea.toLocaleString() : "N/A"}
- Listed Price: ${money(askingPrice)}
- Price per Sq Ft: $${property.pricePerSqFt || "N/A"}
- Investment Score: ${property.investmentScorePercent || "N/A"}/100
- Estimated Monthly Rent: ${money(property.rentZestimate ?? property.rentEstimate)}
- Cap Rate: ${property.capRatePercent || "N/A"}%
- Monthly Cash Flow: ${money(property.monthlyCashFlow)}
- Cash-on-Cash ROI: ${property.cashOnCashRoi || "N/A"}%
- DSCR: ${property.dscr || "N/A"}
${detail?.description ? `- Description: ${detail.description}` : ""}

BUYER INFORMATION:
- Name: ${loiData.buyerName}
- Email: ${loiData.buyerEmail}
- Phone: ${loiData.buyerPhone}

PURCHASE TERMS:
- Offer Price: ${money(loiData.purchasePrice)}
- Down Payment: ${loiData.downPayment}%
- Financing Amount: ${money(loiData.financingAmount)}
- Earnest Money: ${money(loiData.earnestMoney)}
- Inspection Period: ${loiData.inspectionPeriod} days
- Preferred Closing Date: ${loiData.closingDate}

ADDITIONAL TERMS:
${loiData.additionalTerms || "Standard terms and conditions apply."}

Create a formal, professional Letter of Intent that includes:
1. Proper business letter formatting with date
2. Professional salutation
3. Clear statement of intent to purchase
4. **PRICING JUSTIFICATION SECTION** (MANDATORY): Include a detailed section titled "Offer Price Rationale" that explains the reasoning behind the offer price of ${money(loiData.purchasePrice)}. This section must include:
   - Analysis of the offer vs. listed price of ${money(askingPrice)} (${pctOfAsking}% of asking)
   - Property investment metrics (Cap Rate: ${property.capRatePercent || "TBD"}%, Monthly Cash Flow: ${money(property.monthlyCashFlow)}, ROI: ${property.cashOnCashRoi || "TBD"}%)
   - Market conditions and price per square foot analysis ($${property.pricePerSqFt || "TBD"}/sqft)
   - Investment strategy justification based on the property's score of ${property.investmentScorePercent || "TBD"}/100
5. All financial terms and conditions
6. Timeline for inspections and closing
7. Professional closing
8. Contact information

The letter should be formal, legally appropriate, and ready to present to a seller or their agent.

CRITICAL REQUIREMENT: The letter MUST include a dedicated "Offer Price Rationale" section that thoroughly explains why the offer price is justified. This is not optional - every letter must contain this pricing explanation with specific numbers and analysis.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a professional real estate attorney creating formal Letters of Intent. Generate professional, legally sound documents that clearly communicate purchase intent and terms.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    return response.choices[0].message.content || "Failed to generate letter";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error("Failed to generate Letter of Intent");
  }
}
