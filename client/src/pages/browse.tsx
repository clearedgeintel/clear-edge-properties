import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PropertyCard } from "@/components/property-card";
import { PropertyDrawer } from "@/components/property-drawer";
import { PropertyMap, propertyToMapPoint } from "@/components/property-map";
import { PropertyTable } from "@/components/property-table";
import { ScoreBadge } from "@/components/score-badge";
import { EmptyState, ErrorState, PageHeader, PropertyGridSkeleton, PropertyImageFallback } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Search, Grid3X3, Map as MapIcon, Table2, Lock, X, List } from "lucide-react";
import type { Property, PropertySearch } from "@shared/schema";
import { HOME_TYPES, formatHomeType, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "map" | "table";

const PAGE_SIZE = 20;
// The API caps a single page at 100 rows (propertySearchSchema).
const MAX_LIMIT = 100;
const DEFAULT_SEARCH: PropertySearch = { sortBy: "score-desc", limit: PAGE_SIZE };

const PRICE_RANGES = [
  { value: "0-300000", label: "Under $300k" },
  { value: "300000-500000", label: "$300k – $500k" },
  { value: "500000-750000", label: "$500k – $750k" },
  { value: "750000-1000000", label: "$750k – $1M" },
  { value: "1000000-", label: "$1M+" },
];

const SCORE_RANGES = [
  { value: "80-100", label: "Excellent (80+)" },
  { value: "60-79", label: "Good (60–79)" },
  { value: "0-59", label: "Fair (under 60)" },
];

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: typeof Grid3X3 }[] = [
  { value: "grid", label: "Grid", icon: Grid3X3 },
  { value: "table", label: "Table", icon: Table2 },
  { value: "map", label: "Map", icon: MapIcon },
];

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Compact row for the list beside the map. */
function MapListItem({
  property,
  active,
  onSelect,
  onHover,
  onOpen,
}: {
  property: Property;
  active: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  onOpen: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn(
        "flex cursor-pointer gap-3 rounded-xl border bg-card p-2.5 transition-all",
        active
          ? "border-brand-blue ring-2 ring-brand-blue/20 shadow-md"
          : "border-border hover:border-brand-blue/40 hover:shadow-sm",
      )}
    >
      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {property.imgMain && !imgError ? (
          <img
            src={property.imgMain}
            alt={property.address ?? ""}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <PropertyImageFallback compact />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-bold tabular-nums text-brand-navy">{formatPrice(property.price ?? 0)}</p>
          <ScoreBadge investmentScorePercent={property.investmentScorePercent} size="sm" />
        </div>
        <p className="truncate text-sm font-medium text-foreground">{property.address}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[
            property.numBeds != null && `${property.numBeds} bd`,
            property.numBaths != null && `${Number(property.numBaths)} ba`,
            formatHomeType(property.homeType),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="mt-1 text-xs font-semibold text-brand-blue hover:underline"
        >
          View details
        </button>
      </div>
    </div>
  );
}

export default function Browse() {
  const { hasActiveSubscription } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mobileMapList, setMobileMapList] = useState(false);

  const [searchParams, setSearchParams] = useState<PropertySearch>(DEFAULT_SEARCH);
  const [queryInput, setQueryInput] = useState("");
  const debouncedQuery = useDebounced(queryInput.trim());

  const effectiveParams = useMemo<PropertySearch>(
    () => ({ ...searchParams, query: debouncedQuery || undefined }),
    [searchParams, debouncedQuery],
  );

  const {
    data: properties = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<Property[]>({
    queryKey: ["/api/properties", effectiveParams],
    enabled: hasActiveSubscription,
    placeholderData: keepPreviousData,
  });

  const points = useMemo(() => properties.map(propertyToMapPoint), [properties]);
  const byId = useMemo(() => new Map(properties.map((p) => [p.zpid, p])), [properties]);

  const openProperty = (property: Property) => {
    setSelectedProperty(property);
    setDrawerOpen(true);
  };

  const updateSearchParam = <K extends keyof PropertySearch>(key: K, value: PropertySearch[K]) => {
    // Any filter change resets paging; "limit" itself overrides the reset.
    setSearchParams((prev) => ({ ...prev, limit: PAGE_SIZE, [key]: value }));
  };

  const setRange = (minKey: "priceMin" | "scoreMin", maxKey: "priceMax" | "scoreMax", value: string) => {
    setSearchParams((prev) => {
      if (value === "any") return { ...prev, [minKey]: undefined, [maxKey]: undefined, limit: PAGE_SIZE };
      const [min, max] = value.split("-");
      return {
        ...prev,
        [minKey]: min ? Number(min) : undefined,
        [maxKey]: max ? Number(max) : undefined,
        limit: PAGE_SIZE,
      };
    });
  };

  const rangeValue = (min?: number, max?: number) =>
    min === undefined && max === undefined ? "any" : `${min ?? ""}-${max ?? ""}`;

  const hasFilters =
    Boolean(debouncedQuery) ||
    searchParams.priceMin !== undefined ||
    searchParams.priceMax !== undefined ||
    searchParams.scoreMin !== undefined ||
    searchParams.scoreMax !== undefined ||
    Boolean(searchParams.homeType);

  const handleClearFilters = () => {
    setQueryInput("");
    setSearchParams(DEFAULT_SEARCH);
  };

  const limit = searchParams.limit ?? PAGE_SIZE;
  const canLoadMore = properties.length >= limit && limit < MAX_LIMIT;

  if (!hasActiveSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <EmptyState
          icon={Lock}
          className="max-w-md border-solid shadow-sm"
          title="Unlock the full property feed"
          description="Browse every scored listing, filter by score, price and type, and explore deals on the map with an active subscription."
          action={
            <Button variant="cta" asChild>
              <Link href="/subscribe">Start free trial</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const selectClass = "h-10 bg-white";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={cn("mx-auto px-4 py-8 sm:px-6 lg:px-8", viewMode === "map" ? "max-w-[1600px]" : "max-w-7xl")}>
        <PageHeader
          title="Browse properties"
          description="Every listing scored and underwritten. Filter to your buy box, then dig into the numbers."
          actions={
            <div className="inline-flex rounded-lg border border-border bg-white p-1 shadow-sm" role="tablist">
              {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={viewMode === value}
                  onClick={() => setViewMode(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    viewMode === value
                      ? "bg-brand-blue text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          }
        />

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
            <div className="relative md:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search location"
                placeholder="Address, city, or ZIP"
                className="h-10 bg-white pl-9"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
              />
            </div>

            <Select
              value={rangeValue(searchParams.priceMin, searchParams.priceMax)}
              onValueChange={(v) => setRange("priceMin", "priceMax", v)}
            >
              <SelectTrigger className={selectClass} aria-label="Price range">
                <SelectValue placeholder="Any price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any price</SelectItem>
                {PRICE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={rangeValue(searchParams.scoreMin, searchParams.scoreMax)}
              onValueChange={(v) => setRange("scoreMin", "scoreMax", v)}
            >
              <SelectTrigger className={selectClass} aria-label="Investment score">
                <SelectValue placeholder="Any score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any score</SelectItem>
                {SCORE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={searchParams.homeType ?? "any"}
              onValueChange={(v) => updateSearchParam("homeType", v === "any" ? undefined : v)}
            >
              <SelectTrigger className={selectClass} aria-label="Property type">
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any type</SelectItem>
                {HOME_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={searchParams.sortBy ?? "score-desc"}
              onValueChange={(v) => updateSearchParam("sortBy", v as PropertySearch["sortBy"])}
            >
              <SelectTrigger className={selectClass} aria-label="Sort by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score-desc">Highest score</SelectItem>
                <SelectItem value="price-asc">Lowest price</SelectItem>
                <SelectItem value="price-desc">Highest price</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex min-h-[1.75rem] items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              {isLoading ? (
                "Loading listings…"
              ) : (
                <>
                  <span className="font-semibold text-foreground tabular-nums">{properties.length}</span>
                  {properties.length === 1 ? "property" : "properties"}
                  {hasFilters && " match your filters"}
                </>
              )}
              {isFetching && !isLoading && (
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-brand-blue" aria-label="Updating" />
              )}
            </span>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 text-muted-foreground">
                <X className="mr-1 h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        {isError ? (
          <ErrorState onRetry={() => refetch()} description="We couldn't load listings. Try again in a moment." />
        ) : isLoading ? (
          viewMode === "map" ? (
            <Skeleton className="h-[640px] w-full rounded-xl" />
          ) : viewMode === "table" ? (
            <div className="space-y-3 rounded-xl border border-border bg-white p-6 shadow-sm">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-16" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <PropertyGridSkeleton />
          )
        ) : properties.length === 0 ? (
          <EmptyState
            title="No properties match these filters"
            description="Try widening the price or score range, or clearing the property type."
            action={
              hasFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {properties.map((property) => (
                  <PropertyCard key={property.zpid} property={property} onClick={() => openProperty(property)} />
                ))}
              </div>
            )}

            {viewMode === "table" && <PropertyTable properties={properties} onPropertyClick={openProperty} />}

            {viewMode === "map" && (
              <>
                {/* Mobile: toggle between map and list */}
                <div className="mb-3 flex justify-end lg:hidden">
                  <Button variant="outline" size="sm" onClick={() => setMobileMapList((v) => !v)}>
                    {mobileMapList ? <MapIcon className="mr-1.5 h-4 w-4" /> : <List className="mr-1.5 h-4 w-4" />}
                    {mobileMapList ? "Show map" : "Show list"}
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(340px,2fr)_minmax(0,3fr)]">
                  <div
                    className={cn(
                      "space-y-2.5 lg:block lg:h-[calc(100vh-15rem)] lg:min-h-[560px] lg:overflow-y-auto lg:pr-1",
                      mobileMapList ? "block" : "hidden",
                    )}
                  >
                    {properties.map((property) => (
                      <MapListItem
                        key={property.zpid}
                        property={property}
                        active={mapSelectedId === property.zpid}
                        onSelect={() => setMapSelectedId(property.zpid)}
                        onHover={(h) => setHoveredId(h ? property.zpid : null)}
                        onOpen={() => openProperty(property)}
                      />
                    ))}
                    {canLoadMore && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => updateSearchParam("limit", Math.min(limit + PAGE_SIZE, MAX_LIMIT))}
                      >
                        Load more
                      </Button>
                    )}
                  </div>
                  <div
                    className={cn(
                      "overflow-hidden rounded-xl border border-border bg-white shadow-sm lg:sticky lg:top-4 lg:block",
                      mobileMapList ? "hidden" : "block",
                    )}
                  >
                    <PropertyMap
                      points={points}
                      selectedId={mapSelectedId}
                      hoveredId={hoveredId}
                      onSelect={setMapSelectedId}
                      onViewDetails={(id) => {
                        const p = byId.get(id);
                        if (p) openProperty(p);
                      }}
                      height="calc(100vh - 15rem)"
                      className="min-h-[560px]"
                    />
                  </div>
                </div>
              </>
            )}

            {viewMode !== "map" && canLoadMore && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => updateSearchParam("limit", Math.min(limit + PAGE_SIZE, MAX_LIMIT))}
                >
                  Load more properties
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <PropertyDrawer property={selectedProperty} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
