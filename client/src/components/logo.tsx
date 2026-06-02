// ClearEdge Props brand mark + wordmark. Authored as inline SVG so it scales
// crisply and needs no binary asset. To swap in an official asset later,
// replace BrandMark's SVG body (and/or render an <img>) — call sites are stable.

export function BrandMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 82" className={className} role="img" aria-label="ClearEdge Props">
      <path
        d="M32 1.5C15.5 1.5 2 15 2 31.5c0 21 30 49 30 49s30-28 30-49C62 15 48.5 1.5 32 1.5Z"
        fill="#003C8F"
      />
      <circle cx="32" cy="30" r="21" fill="#FFFFFF" />
      <path d="M17 33 32 19.5 47 33Z" fill="#FF7900" />
      <rect x="23" y="31" width="18" height="13" rx="1" fill="#FFFFFF" />
      <rect x="27.5" y="33.5" width="9" height="9" rx="1" fill="#062B6F" />
      <path d="M32 33.5v9M27.5 38h9" stroke="#FFFFFF" strokeWidth="1.3" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  showTagline?: boolean;
}

export function Logo({
  className = "",
  iconClassName = "w-9 h-9",
  textClassName = "text-lg",
  showText = true,
  showTagline = false,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className={iconClassName} />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className={`font-heading font-bold tracking-tight ${textClassName}`}>
            <span className="text-brand-blue">Clear</span>
            <span className="text-brand-orange">Edge</span>
            <span className="ml-1 text-brand-navy font-semibold">Props</span>
          </span>
          {showTagline && (
            <span className="text-xs text-brand-gray mt-0.5">Smarter property decisions</span>
          )}
        </span>
      )}
    </span>
  );
}
