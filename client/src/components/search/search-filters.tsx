import { useState, type ReactNode } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { ChevronDown, Loader2, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { formatCompactPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { platformInfo } from './platforms';
import { SEARCH_DEFAULTS, type SearchFormData } from './schema';

type Form = UseFormReturn<SearchFormData>;

interface SearchFiltersProps {
  form: Form;
  onSubmit: () => void;
  isSearching: boolean;
}

const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: 'Under $300k', max: 300000 },
  { label: '$300k–$500k', min: 300000, max: 500000 },
  { label: '$500k–$1M', min: 500000, max: 1000000 },
  { label: '$1M+', min: 1000000 },
];

const ROOM_OPTIONS = [undefined, 1, 2, 3, 4] as const;

// ---- Field primitives ----

function NumberField({
  form,
  name,
  placeholder,
  prefix,
  min,
  max,
}: {
  form: Form;
  name: 'priceMin' | 'priceMax' | 'sqftMin' | 'sqftMax' | 'maxResults';
  placeholder: string;
  prefix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {prefix}
            </span>
          )}
          <Input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            placeholder={placeholder}
            className={cn('h-10 tabular-nums', prefix && 'pl-7')}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </div>
      )}
    />
  );
}

function Segmented({
  value,
  onChange,
  label,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1 rounded-lg bg-slate-100 p-1">
      {ROOM_OPTIONS.map((opt) => (
        <button
          key={opt ?? 'any'}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-md py-1.5 text-sm font-medium transition-colors',
            value === opt ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-600 hover:text-foreground',
          )}
        >
          {opt === undefined ? 'Any' : `${opt}+`}
        </button>
      ))}
    </div>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</Label>;
}

// ---- Field groups (shared by the desktop popovers and the mobile sheet) ----

function TypeFields({ form }: { form: Form }) {
  const platform = useWatch({ control: form.control, name: 'platform' });
  const types = platformInfo(platform).propertyTypes;

  if (platform === 'multi') {
    return (
      <Controller
        control={form.control}
        name="propertyType"
        render={({ field }) => (
          <Select value={field.value ?? 'any'} onValueChange={(v) => field.onChange(v === 'any' ? undefined : v)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        )}
      />
    );
  }

  return (
    <Controller
      control={form.control}
      name="propertyTypes"
      render={({ field }) => {
        const selected = field.value ?? [];
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {types.map((type) => (
              <label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(type)}
                  onCheckedChange={(checked) =>
                    field.onChange(checked ? [...selected, type] : selected.filter((t) => t !== type))
                  }
                />
                {type}
              </label>
            ))}
          </div>
        );
      }}
    />
  );
}

function PriceFields({ form }: { form: Form }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField form={form} name="priceMin" placeholder="No min" prefix="$" min={0} />
        <NumberField form={form} name="priceMax" placeholder="No max" prefix="$" min={0} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRICE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              form.setValue('priceMin', p.min);
              form.setValue('priceMax', p.max);
            }}
            className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RoomFields({ form }: { form: Form }) {
  return (
    <div className="space-y-4">
      <div>
        <GroupLabel>Bedrooms</GroupLabel>
        <Controller
          control={form.control}
          name="bedsMin"
          render={({ field }) => <Segmented label="Minimum bedrooms" value={field.value} onChange={field.onChange} />}
        />
      </div>
      <div>
        <GroupLabel>Bathrooms</GroupLabel>
        <Controller
          control={form.control}
          name="bathsMin"
          render={({ field }) => <Segmented label="Minimum bathrooms" value={field.value} onChange={field.onChange} />}
        />
      </div>
    </div>
  );
}

function SizeFields({ form }: { form: Form }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumberField form={form} name="sqftMin" placeholder="Min sq ft" min={0} />
      <NumberField form={form} name="sqftMax" placeholder="Max sq ft" min={0} />
    </div>
  );
}

function MoreFields({ form }: { form: Form }) {
  return (
    <div className="space-y-4">
      <div>
        <GroupLabel>Max results per platform</GroupLabel>
        <NumberField form={form} name="maxResults" placeholder="25" min={1} max={100} />
      </div>
      <Controller
        control={form.control}
        name="saveResults"
        render={({ field }) => (
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-3">
            <span>
              <span className="block text-sm font-medium text-foreground">Save results</span>
              <span className="block text-xs text-muted-foreground">Import scored results into your property feed.</span>
            </span>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </label>
        )}
      />
    </div>
  );
}

// ---- Chip summaries ----

const range = (min?: number, max?: number, fmt: (n: number) => string = String) =>
  min != null && max != null ? `${fmt(min)}–${fmt(max)}` : min != null ? `${fmt(min)}+` : max != null ? `Up to ${fmt(max)}` : null;

function useSummaries(form: Form) {
  const v = useWatch({ control: form.control });
  const platform = v.platform ?? 'multi';
  const typeCount = v.propertyTypes?.length ?? 0;
  const rooms = [v.bedsMin != null && `${v.bedsMin}+ bd`, v.bathsMin != null && `${v.bathsMin}+ ba`].filter(Boolean).join(', ');
  return {
    showRooms: !platformInfo(platform).commercial,
    type:
      platform === 'multi'
        ? v.propertyType
          ? v.propertyType.charAt(0).toUpperCase() + v.propertyType.slice(1)
          : null
        : typeCount === 1
          ? v.propertyTypes![0]
          : typeCount > 1
            ? `${typeCount} types`
            : null,
    price: range(v.priceMin, v.priceMax, formatCompactPrice),
    rooms: rooms || null,
    size: range(v.sqftMin, v.sqftMax, (n) => `${n.toLocaleString()} sqft`),
    more: v.saveResults || (v.maxResults != null && v.maxResults !== SEARCH_DEFAULTS.maxResults) ? 'Custom' : null,
  };
}

function FilterChip({ label, active, children, wide }: { label: string; active: string | null; children: ReactNode; wide?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors',
            active
              ? 'border-brand-blue/30 bg-brand-light text-brand-blue'
              : 'border-border bg-white text-slate-700 hover:border-slate-300',
          )}
        >
          {active ?? label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn('p-4', wide ? 'w-80' : 'w-72')}>
        <GroupLabel>{label}</GroupLabel>
        {children}
      </PopoverContent>
    </Popover>
  );
}

// ---- Public component ----

export function SearchFilters({ form, onSubmit, isSearching }: SearchFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const s = useSummaries(form);
  const activeCount = [s.type, s.price, s.showRooms && s.rooms, s.size, s.more].filter(Boolean).length;
  const locationError = form.formState.errors.location?.message;

  const reset = () => {
    const platform = form.getValues('platform');
    const location = form.getValues('location');
    form.reset({ ...SEARCH_DEFAULTS, platform, location });
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setMobileOpen(false);
    onSubmit();
  };

  const searchButton = (className?: string) => (
    <Button type="submit" variant="cta" className={cn('h-10 px-5 font-semibold', className)} disabled={isSearching}>
      {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
      {isSearching ? 'Searching…' : 'Search'}
    </Button>
  );

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-orange" />
          <Input
            {...form.register('location')}
            aria-label="Location"
            aria-invalid={Boolean(locationError)}
            placeholder="City, state, or ZIP — e.g. Austin, TX"
            className={cn('h-10 pl-9 text-base', locationError && 'border-destructive focus-visible:ring-destructive/30')}
          />
        </div>

        {/* Desktop: popover chips */}
        <div className="hidden items-center gap-2 lg:flex">
          <FilterChip label="Property type" active={s.type} wide>
            <TypeFields form={form} />
          </FilterChip>
          <FilterChip label="Price" active={s.price} wide>
            <PriceFields form={form} />
          </FilterChip>
          {s.showRooms && (
            <FilterChip label="Beds & baths" active={s.rooms}>
              <RoomFields form={form} />
            </FilterChip>
          )}
          <FilterChip label="Size" active={s.size}>
            <SizeFields form={form} />
          </FilterChip>
          <FilterChip label="More" active={s.more}>
            <MoreFields form={form} />
          </FilterChip>
          {activeCount > 0 && (
            <button type="button" onClick={reset} className="px-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              Reset
            </button>
          )}
          {searchButton()}
        </div>

        {/* Mobile: filters sheet + search */}
        <div className="flex gap-2 lg:hidden">
          <Button type="button" variant="outline" className="h-10 flex-1" onClick={() => setMobileOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters{activeCount > 0 && ` (${activeCount})`}
          </Button>
          {searchButton('flex-1')}
        </div>
      </div>
      {locationError && <p className="mt-1.5 px-1 text-xs text-destructive">{locationError}</p>}

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-0">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 px-5 py-5">
            <section>
              <GroupLabel>Property type</GroupLabel>
              <TypeFields form={form} />
            </section>
            <section>
              <GroupLabel>Price</GroupLabel>
              <PriceFields form={form} />
            </section>
            {s.showRooms && <RoomFields form={form} />}
            <section>
              <GroupLabel>Size</GroupLabel>
              <SizeFields form={form} />
            </section>
            <MoreFields form={form} />
          </div>
          <div className="sticky bottom-0 flex gap-2 border-t bg-white px-5 py-3">
            <Button type="button" variant="ghost" className="h-10" onClick={reset}>
              Reset
            </Button>
            <Button type="button" variant="cta" className="h-10 flex-1 font-semibold" onClick={() => submit()} disabled={isSearching}>
              {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Show results
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </form>
  );
}
