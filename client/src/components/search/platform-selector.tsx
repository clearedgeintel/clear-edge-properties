import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PLATFORMS, PLATFORM_ORDER, type PlatformKey } from './platforms';

interface PlatformSelectorProps {
  value: PlatformKey;
  onChange: (value: PlatformKey) => void;
  className?: string;
}

/** Compact segmented pill control; scrolls horizontally on narrow screens. */
export function PlatformSelector({ value, onChange, className }: PlatformSelectorProps) {
  return (
    <div className={cn('-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <div
        role="radiogroup"
        aria-label="Search platform"
        className="inline-flex min-w-max items-center gap-1 rounded-full border border-border bg-white p-1 shadow-sm"
      >
        {PLATFORM_ORDER.map((key) => {
          const info = PLATFORMS[key];
          const Icon = info.icon;
          const selected = value === key;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40',
                    selected
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-brand-navy',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {info.name}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{info.description}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
