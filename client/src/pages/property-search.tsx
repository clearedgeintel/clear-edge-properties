import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Columns2, LayoutGrid, Map as MapIcon, SearchX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, PageHeader } from '@/components/states';
import { PropertyMap } from '@/components/property-map';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { PlatformSelector } from '@/components/search/platform-selector';
import { SearchFilters } from '@/components/search/search-filters';
import { SearchResultCard, SearchResultCardSkeleton } from '@/components/search/search-result-card';
import { PropertyDetailSheet } from '@/components/search/property-detail-sheet';
import { platformInfo, type PlatformKey } from '@/components/search/platforms';
import { searchFormSchema, SEARCH_DEFAULTS, type SearchFormData } from '@/components/search/schema';
import { searchItemToMapPoint, toSearchItems, type SearchItem, type SearchResult } from '@/components/search/adapters';

type ViewMode = 'split' | 'list' | 'map';
type SortKey = 'score' | 'price-asc' | 'price-desc';

const EXAMPLE_LOCATIONS = ['Austin, TX', 'Phoenix, AZ', 'Tampa, FL', 'Charlotte, NC', 'Columbus, OH'];

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: typeof MapIcon; desktopOnly?: boolean }[] = [
  { value: 'split', label: 'Split', icon: Columns2, desktopOnly: true },
  { value: 'list', label: 'List', icon: LayoutGrid },
  { value: 'map', label: 'Map', icon: MapIcon },
];

/** True at Tailwind's lg breakpoint and up, where split view has room. */
function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return matches;
}

export default function PropertySearchPage() {
  const { toast } = useToast();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Client-side refinement of returned results (free; no API calls).
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [minScore, setMinScore] = useState(0);
  const [viewModeSetting, setViewMode] = useState<ViewMode>('split');
  const isDesktop = useIsDesktop();
  // Split needs desktop width; on smaller screens it reads as the list.
  const viewMode: ViewMode = viewModeSetting === 'split' && !isDesktop ? 'list' : viewModeSetting;
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());

  // Card ↔ map linkage and the detail sheet.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [sheetItem, setSheetItem] = useState<SearchItem | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: SEARCH_DEFAULTS,
  });
  const platform = form.watch('platform') as PlatformKey;

  // Request/response contract unchanged: multi → /api/search/multi-platform
  // (array of results), single platform → /api/<platform>/search (one result).
  const searchMutation = useMutation({
    mutationFn: async (data: SearchFormData) => {
      if (data.platform === 'multi') {
        const response = await apiRequest('POST', '/api/search/multi-platform', { ...data, platform: undefined });
        return await response.json();
      }
      const response = await apiRequest('POST', `/api/${data.platform}/search`, data);
      return await response.json();
    },
    onSuccess: (data) => {
      const results: SearchResult[] = Array.isArray(data) ? data : [data];
      setSearchResults(results);
      setHasSearched(true);
      setPlatformFilter('all');
      setSelectedKey(null);
      setDismissedErrors(new Set());

      const total = results.reduce((sum, r) => sum + r.properties.length, 0);
      const saved = results.filter((r) => r.saveMessage).map((r) => r.saveMessage);
      toast({
        title: 'Search completed',
        description: [
          Array.isArray(data) ? `Found ${total} properties across ${results.length} platforms` : `Found ${total} properties`,
          ...saved,
        ].join('\n'),
      });
    },
    onError: (error) => {
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  const handlePlatformChange = (next: PlatformKey) => {
    form.setValue('platform', next);
    form.setValue('propertyTypes', []);
    // Clear residential-only fields when switching to a commercial platform.
    if (platformInfo(next).commercial) {
      form.setValue('bedsMin', undefined);
      form.setValue('bedsMax', undefined);
      form.setValue('bathsMin', undefined);
      form.setValue('bathsMax', undefined);
      form.setValue('homeType', undefined);
    }
  };

  const submit = form.handleSubmit((data) => searchMutation.mutate(data));

  // ---- Derived results ----
  const allItems = useMemo(() => toSearchItems(searchResults), [searchResults]);

  const items = useMemo(() => {
    const filtered = allItems.filter(
      (it) => (platformFilter === 'all' || it.platform === platformFilter) && (minScore === 0 || (it.view.score ?? 0) >= minScore),
    );
    const byPrice = (a: SearchItem, b: SearchItem, dir: 1 | -1) =>
      a.view.price == null ? 1 : b.view.price == null ? -1 : (a.view.price - b.view.price) * dir;
    return [...filtered].sort((a, b) =>
      sortKey === 'score'
        ? (b.view.score ?? -1) - (a.view.score ?? -1)
        : byPrice(a, b, sortKey === 'price-asc' ? 1 : -1),
    );
  }, [allItems, platformFilter, minScore, sortKey]);

  const points = useMemo(() => items.map(searchItemToMapPoint), [items]);
  const byKey = useMemo(() => new Map(allItems.map((it) => [it.key, it])), [allItems]);

  const totalFound = searchResults.reduce((sum, r) => sum + (r.totalFound ?? 0), 0);
  const scoredCount = allItems.filter((it) => it.view.score != null).length;
  const platformCounts = searchResults
    .filter((r) => r.properties.length > 0)
    .map((r) => ({ platform: r.platform, count: r.properties.length }));
  const errorResults = searchResults.filter((r) => r.errorMessages?.length && !dismissedErrors.has(r.platform));
  const refined = platformFilter !== 'all' || minScore !== 0;

  // Marker click → scroll the matching card into view.
  useEffect(() => {
    if (!selectedKey) return;
    cardRefs.current.get(selectedKey)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedKey]);

  const openDetails = (key: string) => {
    const item = byKey.get(key);
    if (item) setSheetItem(item);
  };

  const clearRefinements = () => {
    setPlatformFilter('all');
    setMinScore(0);
  };

  const isSearching = searchMutation.isPending;
  const showResults = hasSearched || isSearching;

  // ---- Render helpers ----

  const cards = (gridClass: string) => (
    <div className={cn('grid gap-4', gridClass)}>
      {items.map((item) => (
        <SearchResultCard
          key={item.key}
          ref={(el) => {
            if (el) cardRefs.current.set(item.key, el);
            else cardRefs.current.delete(item.key);
          }}
          item={item}
          selected={selectedKey === item.key}
          onSelect={() => setSelectedKey(item.key)}
          onOpen={() => setSheetItem(item)}
          onHover={(h) => setHoveredKey(h ? item.key : null)}
        />
      ))}
    </div>
  );

  const map = (className: string) => (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-white shadow-sm', className)}>
      <PropertyMap
        points={points}
        selectedId={selectedKey}
        hoveredId={hoveredKey}
        onSelect={setSelectedKey}
        onViewDetails={openDetails}
        height="100%"
      />
    </div>
  );

  const skeletonCards = (gridClass: string) => (
    <div className={cn('grid gap-4', gridClass)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SearchResultCardSkeleton key={i} />
      ))}
    </div>
  );

  const splitGrid = 'sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2';
  const listGrid = 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4';
  const mapHeight = 'h-[calc(100vh-6rem)] min-h-[520px]';

  const resultsBody = () => {
    if (isSearching) {
      return viewMode === 'map' ? (
        <Skeleton className={cn('w-full rounded-xl', mapHeight)} />
      ) : viewMode === 'split' ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
          {skeletonCards(splitGrid)}
          <Skeleton className={cn('hidden w-full rounded-xl lg:block', mapHeight)} />
        </div>
      ) : (
        skeletonCards(listGrid)
      );
    }

    if (items.length === 0) {
      return refined && allItems.length > 0 ? (
        <EmptyState
          title="No results match these refinements"
          description="Lower the minimum score or show all platforms."
          action={<Button variant="outline" onClick={clearRefinements}>Clear refinements</Button>}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No properties found"
          description="Try a nearby city, a wider price range, or searching all platforms."
        />
      );
    }

    if (viewMode === 'map') return map(mapHeight);
    if (viewMode === 'list') return cards(listGrid);
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
        {cards(splitGrid)}
        <div className="hidden lg:block">{map(cn('sticky top-4', mapHeight))}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          className="mb-5"
          title="Property search"
          description="Search Zillow, Redfin, LoopNet and Crexi at once. Every result is scored and mapped."
        />

        <div className="space-y-3">
          <PlatformSelector value={platform} onChange={handlePlatformChange} />
          <SearchFilters form={form} onSubmit={submit} isSearching={isSearching} />
        </div>

        {!showResults ? (
          <EmptyState
            className="mt-8 border-solid py-16"
            icon={MapIcon}
            title="Find your next deal"
            description="Enter a city, state, or ZIP to search live listings across every platform, scored for investment potential."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => form.setValue('location', loc, { shouldValidate: true })}
                    className="rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            }
          />
        ) : (
          <section className="mt-6" aria-live="polite">
            {/* Results toolbar */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  {isSearching ? (
                    'Searching platforms…'
                  ) : (
                    <>
                      <span className="text-base font-semibold text-foreground tabular-nums">{items.length}</span>{' '}
                      {items.length === 1 ? 'property' : 'properties'}
                      {refined && ` of ${allItems.length}`} · {scoredCount} scored
                      {totalFound > allItems.length && ` · ${totalFound} found`}
                    </>
                  )}
                </p>
                {!isSearching && platformCounts.length > 1 && (
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filter results by platform">
                    {[{ platform: 'all', count: allItems.length }, ...platformCounts].map(({ platform: key, count }) => (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={platformFilter === key}
                        onClick={() => setPlatformFilter(key)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          platformFilter === key
                            ? 'border-brand-blue bg-brand-blue text-white'
                            : 'border-border bg-white text-slate-600 hover:border-slate-300',
                        )}
                      >
                        {key === 'all' ? 'All' : platformInfo(key).shortName}{' '}
                        <span className="tabular-nums opacity-75">{count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
                <Select value={String(minScore)} onValueChange={(v) => setMinScore(Number(v))}>
                  <SelectTrigger className="h-9 w-[132px] bg-white" aria-label="Minimum score">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any score</SelectItem>
                    <SelectItem value="60">Score 60+</SelectItem>
                    <SelectItem value="80">Score 80+</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger className="h-9 w-[150px] bg-white" aria-label="Sort results">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Highest score</SelectItem>
                    <SelectItem value="price-asc">Lowest price</SelectItem>
                    <SelectItem value="price-desc">Highest price</SelectItem>
                  </SelectContent>
                </Select>
                <div className="inline-flex rounded-lg border border-border bg-white p-0.5 shadow-sm" role="tablist" aria-label="Results view">
                  {VIEW_OPTIONS.map(({ value, label, icon: Icon, desktopOnly }) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={viewMode === value}
                      onClick={() => setViewMode(value)}
                      className={cn(
                        'items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        desktopOnly ? 'hidden lg:inline-flex' : 'inline-flex',
                        viewMode === value ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Per-platform errors */}
            {!isSearching && errorResults.length > 0 && (
              <div className="mb-4 space-y-2">
                {errorResults.map((r) => (
                  <div
                    key={r.platform}
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold">{platformInfo(r.platform).name}:</span>{' '}
                      {r.errorMessages.slice(0, 2).join(' · ')}
                      {r.errorMessages.length > 2 && ` (+${r.errorMessages.length - 2} more)`}
                    </div>
                    <button
                      type="button"
                      aria-label="Dismiss"
                      onClick={() => setDismissedErrors((prev) => new Set(prev).add(r.platform))}
                      className="rounded p-0.5 text-amber-700 hover:bg-amber-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {resultsBody()}
          </section>
        )}
      </div>

      <PropertyDetailSheet item={sheetItem} open={sheetItem !== null} onOpenChange={(open) => !open && setSheetItem(null)} />
    </div>
  );
}
