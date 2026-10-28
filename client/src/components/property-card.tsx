import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalculationBreakdown } from "./calculation-breakdown";
import { DealControl } from "./deal-control";
import { PropertyImageFallback } from "./states";
import { Lock, MapPin } from "lucide-react";
import type { Property } from "@shared/schema";
import { formatCurrency, formatHomeType, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  property: Property;
  isBlurred?: boolean;
  onClick?: () => void;
}

const NEW_LISTING_MS = 3 * 24 * 60 * 60 * 1000;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "truncate text-sm font-semibold tabular-nums text-foreground",
          tone === "positive" && "text-emerald-700",
          tone === "negative" && "text-red-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PropertyCard({ property, isBlurred = false, onClick }: PropertyCardProps) {
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(property.imgMain) && !imageError;

  const beds = num(property.numBeds);
  const baths = num(property.numBaths);
  const sqft = num(property.sizeSqFt ?? property.livingAreaSqFt);
  const capRate = num(property.capRatePercent);
  const cashFlow = num(property.monthlyCashFlow);
  const coc = num(property.cashOnCashRoi);
  const isNew = property.createdAt && new Date(property.createdAt).getTime() > Date.now() - NEW_LISTING_MS;

  const specs = [
    beds != null && `${beds} bd`,
    baths != null && `${baths} ba`,
    sqft != null && sqft > 0 && `${sqft.toLocaleString()} sqft`,
  ].filter(Boolean);

  const cityLine = [property.addressCity, property.addressState].filter(Boolean).join(", ");

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-navy/5"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {hasImage ? (
          <img
            src={property.imgMain!}
            alt={property.address ?? "Property"}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setImageError(true)}
          />
        ) : (
          <PropertyImageFallback />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Single status slot so badges never stack over each other */}
        {(isNew || property.homeType) && (
          <div className="absolute left-3 top-3 flex gap-1.5">
            {isNew && <Badge className="border-0 bg-brand-orange text-white shadow-sm hover:bg-brand-orange">New</Badge>}
            {property.homeType && (
              <Badge className="border-0 bg-white/90 text-slate-700 shadow-sm backdrop-blur hover:bg-white/90">
                {formatHomeType(property.homeType)}
              </Badge>
            )}
          </div>
        )}

        {/* Investment score (opens the calculation breakdown) */}
        <div className="absolute right-3 top-3" onClick={(e) => e.stopPropagation()}>
          <CalculationBreakdown property={property} />
        </div>

        {isBlurred && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div className="text-center">
              <Lock className="mx-auto mb-2 h-7 w-7 text-brand-navy/60" />
              <p className="text-sm font-semibold text-brand-navy">Subscribe to view</p>
            </div>
          </div>
        )}
      </div>

      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-2xl font-bold leading-tight tracking-tight text-brand-navy tabular-nums">
            {formatPrice(property.price ?? 0)}
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold text-foreground">
            {isBlurred ? `${cityLine} ${property.addressZip ?? ""}` : property.address}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            {!isBlurred && cityLine && (
              <>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{cityLine}</span>
                {specs.length > 0 && <span className="text-border">|</span>}
              </>
            )}
            {specs.join(" · ")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Cap rate" value={capRate != null ? `${capRate.toFixed(1)}%` : "—"} />
          <Stat
            label="Cash flow"
            value={cashFlow != null ? `${formatCurrency(cashFlow)}` : "—"}
            tone={cashFlow == null ? undefined : cashFlow >= 0 ? "positive" : "negative"}
          />
          <Stat label="CoC ROI" value={coc != null ? `${coc.toFixed(1)}%` : "—"} />
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DealControl zpid={property.zpid} source={{ zpid: property.zpid }} block listingUrl={property.url} />
        </div>
      </CardContent>
    </Card>
  );
}
