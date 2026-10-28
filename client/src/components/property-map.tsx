import { lazy, Suspense, type ReactNode } from "react";
import { MapPinOff } from "lucide-react";
import type { Property } from "@shared/schema";
import { toScore } from "@/lib/score";
import { cn } from "@/lib/utils";

/**
 * Public entry point for maps. The Mapbox implementation lives in
 * property-map-gl.tsx and is lazy-loaded so mapbox-gl (~200KB gz) only downloads
 * on screens that actually render a map.
 */

/** Minimal shape the map needs; adapters below convert app data into it. */
export interface MapPoint {
  id: string;
  /** null when the source has no coordinates; such points are skipped. */
  lat: number | null;
  lng: number | null;
  score: number | null;
  price?: number | null;
  title: string;
  subtitle?: string;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  capRate?: number | null;
  cashFlow?: number | null;
  image?: string | null;
}

export interface PropertyMapProps {
  points: MapPoint[];
  selectedId?: string | null;
  hoveredId?: string | null;
  /** Marker clicked: select it (the map opens its popup). */
  onSelect?: (id: string | null) => void;
  /** "View details" in the popup. */
  onViewDetails?: (id: string) => void;
  /** Extra action rendered in the popup (e.g. the pipeline control). */
  renderAction?: (id: string) => ReactNode;
  height?: string;
  className?: string;
  /** false renders a static, non-interactive map (teasers, mini-maps). */
  interactive?: boolean;
  showLegend?: boolean;
  styleVariant?: "light" | "streets";
  /** Single-point maps zoom to this level instead of fitting bounds. */
  singlePointZoom?: number;
  /** Slow fly-in on first load (landing teaser). */
  introAnimation?: boolean;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function propertyToMapPoint(p: Property): MapPoint {
  const cityLine = [p.addressCity, p.addressState].filter(Boolean).join(", ");
  return {
    id: p.zpid,
    lat: num(p.latitude),
    lng: num(p.longitude),
    score: p.investmentScorePercent != null ? toScore(p.investmentScorePercent) : null,
    price: num(p.price),
    title: p.addressStreet || p.address || p.fullAddress || "Property",
    subtitle: [cityLine, p.addressZip].filter(Boolean).join(" "),
    beds: num(p.numBeds),
    baths: num(p.numBaths),
    sqft: num(p.sizeSqFt),
    capRate: num(p.capRatePercent),
    cashFlow: num(p.monthlyCashFlow),
    image: p.imgMain,
  };
}

export function getMapboxToken(): string | null {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
  // Treat the .env.example placeholder as unset.
  if (!token || token.includes("your-")) return null;
  return token;
}

const MapboxMap = lazy(() => import("./property-map-gl"));

export function MapLoading({ height, className }: { height: string; className?: string }) {
  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden bg-slate-100", className)}
      style={{ height }}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 via-slate-50 to-brand-light/60" />
      <div className="relative flex items-center gap-2 text-sm font-medium text-brand-gray">
        <span className="h-2 w-2 animate-ping rounded-full bg-brand-blue" />
        Loading map…
      </div>
    </div>
  );
}

function MapUnavailable({ height, className }: { height: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-brand-light/50 px-6 text-center",
        className,
      )}
      style={{ height }}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-blue shadow-sm">
        <MapPinOff className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-brand-navy">Map unavailable</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Set <code className="rounded bg-white px-1 py-0.5">VITE_MAPBOX_ACCESS_TOKEN</code> to enable interactive maps.
      </p>
    </div>
  );
}

export function PropertyMap(props: PropertyMapProps) {
  const height = props.height ?? "400px";
  if (!getMapboxToken()) return <MapUnavailable height={height} className={props.className} />;
  return (
    <Suspense fallback={<MapLoading height={height} className={props.className} />}>
      <MapboxMap {...props} height={height} />
    </Suspense>
  );
}
