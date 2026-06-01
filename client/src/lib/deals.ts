import { Property } from "@shared/schema";

export interface Deal {
  id: string;
  title: string;
  address: string;
  price: number;
  score: number;
  stage: DealStage;
  notes?: string;
  propertyId?: string; // Link to original property (zpid)
  createdAt: Date;
  updatedAt: Date;
}

export type DealStage = "analyzing" | "loi_sent" | "under_contract" | "closed";

export const DEAL_STAGES: { id: DealStage; title: string; color: string }[] = [
  { id: "analyzing", title: "Analyzing", color: "bg-blue-100 text-blue-800" },
  { id: "loi_sent", title: "LOI Sent", color: "bg-yellow-100 text-yellow-800" },
  { id: "under_contract", title: "Under Contract", color: "bg-orange-100 text-orange-800" },
  { id: "closed", title: "Closed", color: "bg-green-100 text-green-800" },
];

const STORAGE_KEY = "clearedge_deals";

export function getDeals(): Deal[] {
  const savedDeals = localStorage.getItem(STORAGE_KEY);
  if (savedDeals) {
    try {
      return JSON.parse(savedDeals).map((deal: any) => ({
        ...deal,
        createdAt: new Date(deal.createdAt),
        updatedAt: new Date(deal.updatedAt),
      }));
    } catch (error) {
      console.error("Failed to load deals from localStorage:", error);
    }
  }
  return [];
}

export function saveDeals(deals: Deal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

export function addPropertyToPipeline(property: Property, stage: DealStage = "analyzing"): Deal {
  const deals = getDeals();

  // Check if property already exists in pipeline
  const existingDeal = deals.find(deal => deal.propertyId === property.zpid);
  if (existingDeal) {
    throw new Error("Property already exists in pipeline");
  }

  const newDeal: Deal = {
    id: crypto.randomUUID(),
    title: `${property.address ?? ""}`,
    address: `${property.addressCity ?? ""}, ${property.addressState ?? ""}`,
    price: Number(property.price ?? 0),
    score: Number(property.investmentScorePercent ?? 0),
    stage,
    propertyId: property.zpid,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const updatedDeals = [...deals, newDeal];
  saveDeals(updatedDeals);

  return newDeal;
}

export function isPropertyInPipeline(propertyId: string): boolean {
  const deals = getDeals();
  return deals.some(deal => deal.propertyId === propertyId);
}

export function getPropertyDeal(propertyId: string): Deal | undefined {
  const deals = getDeals();
  return deals.find(deal => deal.propertyId === propertyId);
}