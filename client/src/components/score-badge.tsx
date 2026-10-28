import { Badge } from "@/components/ui/badge";
import { getScoreTier, toScore } from "@/lib/score";

interface ScoreBadgeProps {
  investmentScorePercent: number | string | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
}

export function ScoreBadge({ investmentScorePercent, className = "", size = 'md', showLabel = false, onClick }: ScoreBadgeProps) {
  // Numeric columns come back as strings from the API; coerce for comparisons/display.
  const score = toScore(investmentScorePercent);
  const tier = getScoreTier(score);

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return "px-2 py-0.5 text-xs min-w-[2.25rem]";
      case 'lg':
        return "px-4 py-2 text-lg min-w-[4rem] font-bold";
      default:
        return "px-3 py-1 text-sm min-w-[3rem] font-semibold";
    }
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      <Badge
        onClick={onClick}
        title={`Investment score: ${Math.round(score)} (${tier.label})`}
        className={`
          ${tier.badgeClass}
          shadow-sm transition-all duration-200 tabular-nums
          ${getSizeClasses(size)} text-center justify-center border-0
          ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}
        `}
      >
        {Math.round(score)}
      </Badge>
      {showLabel && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600 whitespace-nowrap">
          {tier.label}
        </div>
      )}
    </div>
  );
}
