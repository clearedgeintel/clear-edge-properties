import OpenAI from "openai";
import type { Property, PropertyDetail } from "@shared/schema";
import { getSocioeconomicData } from "./demographics";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PropertyCommentaryAnalysis {
  summary: string;
  strengths: string[];
  concerns: string[];
  investmentRecommendation: "Strong Buy" | "Buy" | "Hold" | "Avoid";
  riskLevel: "Low" | "Medium" | "High";
  timeToDecision: string;
  keyMetrics: {
    cashFlow: string;
    appreciation: string;
    capRate: string;
    roi: string;
  };
}

// Numeric columns on the Supabase `properties` table arrive as STRINGS.
function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function generatePropertyCommentary(
  property: Property,
  detail?: PropertyDetail | null,
): Promise<PropertyCommentaryAnalysis> {
  try {
    const city = property.addressCity || "";
    const state = property.addressState || "";
    const street = property.addressStreet || property.address || property.fullAddress || "";

    // Get socioeconomic data for enhanced analysis
    const socioeconomicData = await getSocioeconomicData(street, city, state);

    const price = num(property.price) ?? num(property.listPrice);
    const livingArea = num(property.livingAreaSqFt) ?? num(property.sizeSqFt);

    const propertyData = {
      address: street,
      city,
      state,
      zipCode: property.addressZip,
      price,
      bedrooms: property.numBeds,
      bathrooms: property.numBaths,
      sqft: livingArea,
      investmentScore: num(property.investmentScorePercent),
      propertyType: property.homeType,
      pricePerSqft: num(property.pricePerSqFt) ?? (price && livingArea ? Math.round(price / livingArea) : null),
      // Underwriting metrics computed by the n8n pipeline (numeric -> string columns).
      metrics: {
        monthlyCashFlow: num(property.monthlyCashFlow),
        annualCashFlow: num(property.annualCashFlow),
        capRatePercent: num(property.capRatePercent),
        cashOnCashRoi: num(property.cashOnCashRoi),
        dscr: num(property.dscr),
        zestimate: num(property.zestimate),
        rentZestimate: num(property.rentZestimate ?? property.rentEstimate),
        fiveYearGain: num(property.fiveYearGain),
        yearBuilt: property.yearBuilt,
      },
      // Extended detail (risk scores, schools, agent) when available.
      detail: detail
        ? {
            description: detail.description,
            floodRisk: detail.floodRiskLabel,
            fireRisk: detail.fireRiskLabel,
            schoolsSummary: detail.schoolsSummary,
            annualPropertyTax: num(detail.annualPropertyTax),
            annualHomeownersInsurance: num(detail.annualHomeownersInsurance),
          }
        : null,
      // Include socioeconomic context
      neighborhood: socioeconomicData
        ? {
            demographics: socioeconomicData.demographics,
            walkability: socioeconomicData.walkability,
            crime: socioeconomicData.crime,
            location: socioeconomicData.location,
          }
        : null,
    };

    const prompt = `
You are a real estate investment analyst. Given this subject property, return a full AI Investment Analysis with the following advanced sections:

Subject Property Details:
${JSON.stringify(propertyData, null, 2)}

Return analysis in JSON format with this structure:
{
  "summary": "Executive Summary – Brief, persuasive overview of why this property is a compelling investment opportunity",
  "strengths": ["Key investment strengths", "Market advantages", "Property benefits", "Financial upside potential"],
  "concerns": ["Risk factors to consider", "Market concerns", "Property limitations", "Financial challenges"],
  "investmentRecommendation": "Strong Buy|Buy|Hold|Avoid",
  "riskLevel": "Low|Medium|High",
  "timeToDecision": "Recommended decision timeline with market urgency factors",
  "keyMetrics": {
    "cashFlow": "Monthly Cash Flow estimate with detailed income/expense breakdown and financing assumptions",
    "appreciation": "5-Year Appreciation Projection with market analysis and comparable sales trends",
    "capRate": "Cap Rate calculation with market comparison and area average benchmarking",
    "roi": "ROI projection including DSCR, stress-test scenarios, and exit strategy profitability"
  }
}

Your analysis must cover these advanced investment areas with REAL DATA when available:
1. Investment Metrics – Monthly Cash Flow, Cap Rate, 5-Year Appreciation, ROI, DSCR, Price/sqft vs area average
2. Market Comparison – Zestimate vs asking price analysis, local price/sqft comparison, comparable sales data
3. Location & Neighborhood Analysis – Use actual demographic data (median income, education levels, unemployment rate), Walk Score, crime grades, safety index
4. Property Potential – Development opportunities, highest and best use based on zoning
5. Financial Breakdown – Monthly income/expenses, financing assumptions, stress-test alternate scenarios
6. Risk Profile – Market volatility factors, demographic trends, crime rates, neighborhood stability
7. Exit Strategy Options – Flip vs long-term hold vs short-term rental profitability comparison

IMPORTANT: If neighborhood data is provided in the property details, incorporate:
- Median income levels and income trends
- Education levels (% with Bachelor's degree+)
- Crime score/safety index
- Walk Score and walkability assessment
- Unemployment and poverty rates
- Home ownership rates

Make this investor-ready, high-conviction, data-driven analysis using AUTHENTIC demographic and socioeconomic data. Include specific numbers, percentages, and actionable insights throughout.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert real estate investment analyst with 20+ years of experience in property valuation, market analysis, and investment strategy. Provide detailed, data-driven commentary that helps investors make informed decisions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");

    // Validate the response has required fields
    if (!analysis.summary || !analysis.investmentRecommendation) {
      throw new Error("Invalid AI response format");
    }

    return analysis as PropertyCommentaryAnalysis;
  } catch (error) {
    console.error("Error generating property commentary:", error);
    throw new Error("Failed to generate AI commentary for this property");
  }
}

export async function generateMarketInsights(
  zipCode: string,
  propertyType: string,
): Promise<{
  marketTrend: string;
  priceDirection: string;
  investmentClimate: string;
  opportunities: string[];
}> {
  try {
    const prompt = `
Analyze the real estate market for properties in zip code ${zipCode} for ${propertyType} properties.

Provide market insights in JSON format:
{
  "marketTrend": "current market trend analysis",
  "priceDirection": "price direction prediction",
  "investmentClimate": "overall investment climate assessment",
  "opportunities": ["list of current market opportunities"]
}

Focus on investment potential, market dynamics, and actionable insights for real estate investors.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a real estate market analyst specializing in investment property markets. Provide data-driven insights about local market conditions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error generating market insights:", error);
    throw new Error("Failed to generate market insights");
  }
}
