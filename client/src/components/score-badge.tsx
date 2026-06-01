import { Badge } from "@/components/ui/badge";

interface ScoreBadgeProps {
  investmentScorePercent: number | string | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
}

export function ScoreBadge({ investmentScorePercent, className = "", size = 'md', showLabel = false, onClick }: ScoreBadgeProps) {
  // Numeric columns come back as strings from the API; coerce for comparisons/display.
  const score = Number(investmentScorePercent ?? 0);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-600";
    if (score >= 60) return "bg-yellow-600";
    return "bg-red-600";
  };

  const getScoreText = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Fair";
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return "px-2 py-1 text-xs min-w-[2.5rem]";
      case 'lg':
        return "px-4 py-2 text-lg min-w-[4rem] font-bold";
      default:
        return "px-3 py-1.5 text-sm min-w-[3rem] font-semibold";
    }
  };

  const ringColor = score >= 80 ? 'ring-emerald-200' : score >= 60 ? 'ring-amber-200' : 'ring-red-200';

  return (
    <div className={`relative ${className}`}>
      <Badge
        onClick={onClick}
        className={`
          ${getScoreColor(score)}
          text-white shadow-lg hover:shadow-xl transition-all duration-200
          ${getSizeClasses(size)} text-center justify-center
          ring-2 ring-white ${ringColor} ring-opacity-50
          hover:scale-105 transform
          ${onClick ? 'cursor-pointer hover:ring-4' : ''}
        `}
      >
        <span className="drop-shadow-sm">{Math.round(score)}</span>
      </Badge>
      {showLabel && (
        <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2
                        text-xs font-medium text-slate-600 whitespace-nowrap`}>
          {getScoreText(score)}
        </div>
      )}
    </div>
  );
}
