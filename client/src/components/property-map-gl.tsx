import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection, Point } from "geojson";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/score-badge";
import { PropertyImageFallback } from "@/components/states";
import { SCORE_THRESHOLDS, SCORE_TIERS } from "@/lib/score";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getMapboxToken, type MapPoint, type PropertyMapProps } from "./property-map";

const STYLES = {
  light: "mapbox://styles/mapbox/light-v11",
  streets: "mapbox://styles/mapbox/streets-v12",
} as const;

const US_CENTER = { longitude: -98.5795, latitude: 39.8283, zoom: 3.2 };
const BRAND_NAVY = "#062B6F";
const SOURCE_ID = "properties";
const POINT_LAYER = "property-points";

type Located = MapPoint & { lat: number; lng: number };

/**
 * Coordinates come from the server (stored on DB properties, and passed through
 * from each platform's search payload), so the map never geocodes in the
 * browser. Points without coordinates are skipped and counted in an overlay.
 */
function useLocatedPoints(points: MapPoint[]): Located[] {
  return useMemo(
    () => points.filter((p): p is Located => p.lat != null && p.lng != null),
    [points],
  );
}

// ---- Layer styles ----

const scoreColor = [
  "step",
  ["coalesce", ["get", "score"], 0],
  SCORE_TIERS.low.hex,
  SCORE_THRESHOLDS.mid,
  SCORE_TIERS.mid.hex,
  SCORE_THRESHOLDS.high,
  SCORE_TIERS.high.hex,
] as any;

function layers(selectedId: string | null, interactive: boolean): LayerProps[] {
  const isSelected = ["==", ["get", "id"], selectedId ?? ""] as any;
  const isHovered = ["boolean", ["feature-state", "hover"], false] as any;
  const base = interactive ? 11 : 7;

  return [
    {
      id: "property-selected-halo",
      type: "circle",
      filter: isSelected,
      paint: {
        "circle-radius": base + 10,
        "circle-color": BRAND_NAVY,
        "circle-opacity": 0.15,
        "circle-stroke-color": BRAND_NAVY,
        "circle-stroke-width": 2,
      },
    },
    {
      id: POINT_LAYER,
      type: "circle",
      paint: {
        "circle-radius": ["case", isSelected, base + 3, isHovered, base + 2, base] as any,
        "circle-color": scoreColor,
        "circle-stroke-color": ["case", isSelected, BRAND_NAVY, "#ffffff"] as any,
        "circle-stroke-width": ["case", isSelected, 3, 2] as any,
        "circle-opacity": 0.95,
      },
    },
    ...(interactive
      ? [
          {
            id: "property-score-labels",
            type: "symbol",
            layout: {
              "text-field": ["to-string", ["get", "scoreLabel"]],
              "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
              "text-size": 10,
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            },
            paint: { "text-color": "#ffffff" },
          } as LayerProps,
        ]
      : []),
  ];
}

// ---- Popup ----

function PointPopup({ point, onViewDetails }: { point: Located; onViewDetails?: (id: string) => void }) {
  const [imgError, setImgError] = useState(false);
  const stats = [
    point.beds != null && `${point.beds} bd`,
    point.baths != null && `${point.baths} ba`,
    point.sqft != null && `${point.sqft.toLocaleString()} sqft`,
  ].filter(Boolean);

  return (
    <div className="w-64 font-sans">
      <div className="relative h-28 w-full overflow-hidden bg-slate-100">
        {point.image && !imgError ? (
          <img
            src={point.image}
            alt={point.title}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <PropertyImageFallback compact />
        )}
        {point.score != null && (
          <div className="absolute right-2 top-2">
            <ScoreBadge investmentScorePercent={point.score} size="sm" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div>
          {point.price != null && (
            <p className="text-lg font-bold leading-tight text-brand-navy tabular-nums">{formatCurrency(point.price)}</p>
          )}
          <p className="truncate text-sm font-semibold text-foreground">{point.title}</p>
          {point.subtitle && <p className="truncate text-xs text-muted-foreground">{point.subtitle}</p>}
        </div>
        {stats.length > 0 && <p className="text-xs text-slate-600">{stats.join(" · ")}</p>}
        {(point.capRate != null || point.cashFlow != null) && (
          <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 text-xs">
            {point.capRate != null && (
              <div>
                <p className="text-muted-foreground">Cap rate</p>
                <p className="font-semibold tabular-nums">{point.capRate.toFixed(1)}%</p>
              </div>
            )}
            {point.cashFlow != null && (
              <div>
                <p className="text-muted-foreground">Cash flow</p>
                <p className={cn("font-semibold tabular-nums", point.cashFlow < 0 && "text-red-600")}>
                  {formatCurrency(point.cashFlow)}/mo
                </p>
              </div>
            )}
          </div>
        )}
        {onViewDetails && (
          <Button size="sm" className="w-full" onClick={() => onViewDetails(point.id)}>
            View details
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ScoreLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none rounded-lg border border-border/60 bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur",
        className,
      )}
    >
      <p className="mb-1.5 font-semibold text-brand-navy">Investment score</p>
      <ul className="space-y-1">
        {[
          { tier: SCORE_TIERS.high, range: `${SCORE_THRESHOLDS.high}+` },
          { tier: SCORE_TIERS.mid, range: `${SCORE_THRESHOLDS.mid}–${SCORE_THRESHOLDS.high - 1}` },
          { tier: SCORE_TIERS.low, range: `<${SCORE_THRESHOLDS.mid}` },
        ].map(({ tier, range }) => (
          <li key={tier.key} className="flex items-center gap-2 text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: tier.hex }} />
            <span className="w-10 tabular-nums">{range}</span>
            <span className="text-muted-foreground">{tier.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- Map ----

export default function PropertyMapGL({
  points,
  selectedId = null,
  hoveredId = null,
  onSelect,
  onViewDetails,
  height = "400px",
  className,
  interactive = true,
  showLegend = true,
  styleVariant = "light",
  singlePointZoom = 14,
  introAnimation = false,
}: PropertyMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const [popupId, setPopupId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>("");
  const hoverRef = useRef<string | null>(null);
  const located = useLocatedPoints(points);

  const geojson = useMemo<FeatureCollection<Point>>(
    () => ({
      type: "FeatureCollection",
      features: located.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          score: p.score,
          scoreLabel: p.score != null ? Math.round(p.score) : "–",
        },
      })),
    }),
    [located],
  );

  // Fit to the data whenever the set of located points changes.
  const boundsKey = located.map((p) => p.id).join("|");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !located.length) return;
    if (located.length === 1) {
      map.jumpTo({ center: [located[0].lng, located[0].lat], zoom: singlePointZoom });
      return;
    }
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const p of located) {
      minLng = Math.min(minLng, p.lng);
      minLat = Math.min(minLat, p.lat);
      maxLng = Math.max(maxLng, p.lng);
      maxLat = Math.max(maxLat, p.lat);
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: interactive ? 64 : 32, maxZoom: 14, duration: introAnimation ? 3000 : 600 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey, loaded]);

  // External selection (e.g. clicking a list row) opens its popup and pans to it.
  useEffect(() => {
    if (!interactive) return;
    setPopupId(selectedId);
    const p = selectedId ? located.find((x) => x.id === selectedId) : null;
    const map = mapRef.current;
    if (p && map && loaded) {
      const bounds = map.getBounds();
      if (bounds && !bounds.contains([p.lng, p.lat])) map.easeTo({ center: [p.lng, p.lat], duration: 500 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, loaded]);

  // Hover from outside (list rows) or inside (pointer) drives the same feature-state.
  const setHover = useCallback((id: string | null) => {
    const map = mapRef.current?.getMap();
    if (!map || !map.getSource(SOURCE_ID)) return;
    if (hoverRef.current) map.setFeatureState({ source: SOURCE_ID, id: hoverRef.current }, { hover: false });
    if (id) map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
    hoverRef.current = id;
  }, []);

  useEffect(() => {
    if (loaded) setHover(hoveredId);
  }, [hoveredId, loaded, setHover]);

  const handleClick = (e: MapLayerMouseEvent) => {
    const id = e.features?.[0]?.properties?.id as string | undefined;
    setPopupId(id ?? null);
    onSelect?.(id ?? null);
  };

  const popupPoint = popupId ? located.find((p) => p.id === popupId) : undefined;
  const missingCount = points.length - located.length;

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ height }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={getMapboxToken()!}
        mapStyle={STYLES[styleVariant]}
        initialViewState={US_CENTER}
        style={{ width: "100%", height: "100%" }}
        interactive={interactive}
        interactiveLayerIds={interactive ? [POINT_LAYER] : undefined}
        cursor={cursor}
        onLoad={() => setLoaded(true)}
        onClick={interactive ? handleClick : undefined}
        onMouseMove={
          interactive
            ? (e) => {
                const id = (e.features?.[0]?.properties?.id as string | undefined) ?? null;
                setCursor(id ? "pointer" : "");
                if (id !== hoverRef.current) setHover(id ?? hoveredId);
              }
            : undefined
        }
        onMouseLeave={interactive ? () => setHover(hoveredId) : undefined}
        reuseMaps
        attributionControl
      >
        {interactive && <NavigationControl position="top-right" showCompass={false} />}

        <Source id={SOURCE_ID} type="geojson" data={geojson} promoteId="id">
          {layers(selectedId ?? popupId, interactive).map((layer) => (
            <Layer key={layer.id} {...layer} />
          ))}
        </Source>

        {interactive && popupPoint && (
          <Popup
            longitude={popupPoint.lng}
            latitude={popupPoint.lat}
            anchor="bottom"
            offset={18}
            maxWidth="none"
            closeOnClick={false}
            className="ce-popup"
            onClose={() => {
              setPopupId(null);
              if (selectedId === popupPoint.id) onSelect?.(null);
            }}
          >
            <PointPopup point={popupPoint} onViewDetails={onViewDetails} />
          </Popup>
        )}
      </Map>

      {showLegend && <ScoreLegend className="absolute bottom-8 left-3" />}

      {interactive && missingCount > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
          {missingCount} {missingCount === 1 ? "listing" : "listings"} without a mappable location
        </div>
      )}
    </div>
  );
}
