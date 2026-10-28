import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Bookmark, KanbanSquare, Loader2, StickyNote, Undo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { asUtc } from "@/lib/deals";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  activityType: string;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  saved: { icon: Bookmark, tone: "bg-slate-100 text-slate-600" },
  added_to_pipeline: { icon: KanbanSquare, tone: "bg-brand-light text-brand-blue" },
  stage_changed: { icon: ArrowRight, tone: "bg-brand-light text-brand-blue" },
  removed_from_pipeline: { icon: Undo2, tone: "bg-amber-50 text-amber-700" },
  note_updated: { icon: StickyNote, tone: "bg-slate-100 text-slate-600" },
};

/** Timeline of a deal's history (adds, stage moves, notes), newest first. */
export function DealActivity({ dealId }: { dealId: string }) {
  const { data, isLoading, isError } = useQuery<Activity[]>({
    queryKey: [`/api/deals/${dealId}/activities`],
    staleTime: 0,
  });

  return (
    <section>
      <h4 className="mb-3 text-sm font-semibold text-slate-900">Activity</h4>
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </p>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Couldn't load activity.</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">
          No activity recorded yet. Stage moves and notes will show up here.
        </p>
      ) : (
        <ol className="relative space-y-4 border-l border-slate-200 pl-6">
          {data.map((a) => {
            const { icon: Icon, tone } = ICONS[a.activityType] ?? ICONS.saved;
            const when = asUtc(a.createdAt);
            return (
              <li key={a.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[37px] top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white",
                    tone,
                  )}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <p className="text-sm font-medium text-slate-800">{a.title ?? a.activityType.replace(/_/g, " ")}</p>
                {a.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.description}</p>}
                {when && (
                  <time dateTime={when} title={new Date(when).toLocaleString()} className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(when), { addSuffix: true })}
                  </time>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
