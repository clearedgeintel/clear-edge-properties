import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isDealsQuery, useDeals, type PipelineStage } from "@/lib/deals";
import { apiErrorMessage, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const PALETTE = ["#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#F59E0B", "#FF7900", "#EF4444", "#64748B"];
const SAVED = "__saved__";

function ColorPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="h-8 w-8 shrink-0 rounded-md border border-border shadow-sm transition-transform hover:scale-105"
          style={{ background: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-4 gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => onChange(c)}
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: c }}
            >
              {c.toLowerCase() === value.toLowerCase() && <Check className="h-4 w-4 text-white" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StageRow({
  stage,
  index,
  count,
  dealCount,
  stages,
  busy,
  onSave,
  onMove,
  onDelete,
}: {
  stage: PipelineStage;
  index: number;
  count: number;
  dealCount: number;
  stages: PipelineStage[];
  busy: boolean;
  onSave: (values: { name?: string; color?: string }) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: (moveTo: string | null) => void;
}) {
  const [name, setName] = useState(stage.name);
  const [confirming, setConfirming] = useState(false);
  const others = stages.filter((s) => s.id !== stage.id);
  const [moveTo, setMoveTo] = useState<string>(others[0]?.id ?? SAVED);

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed) return setName(stage.name);
    if (trimmed !== stage.name) onSave({ name: trimmed });
  };

  return (
    <li className="rounded-lg border border-border bg-white p-2.5">
      <div className="flex items-center gap-2">
        <ColorPicker value={stage.color || "#3B82F6"} onChange={(color) => onSave({ color })} label={`Color for ${stage.name}`} />
        <Input
          value={name}
          aria-label="Stage name"
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className="h-8"
        />
        <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {dealCount} {dealCount === 1 ? "deal" : "deals"}
        </span>
        <div className="flex shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy || index === 0} onClick={() => onMove(-1)} aria-label="Move up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy || index === count - 1} onClick={() => onMove(1)} aria-label="Move down">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600"
            disabled={busy || count <= 1}
            onClick={() => (dealCount > 0 ? setConfirming((v) => !v) : onDelete(null))}
            aria-label={`Delete ${stage.name}`}
            title={count <= 1 ? "Your pipeline needs at least one stage" : "Delete stage"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {confirming && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-md bg-red-50 p-2.5 text-sm text-red-900">
          <span>
            Move {dealCount} {dealCount === 1 ? "deal" : "deals"} to
          </span>
          <Select value={moveTo} onValueChange={setMoveTo}>
            <SelectTrigger className="h-8 w-44 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {others.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
              <SelectItem value={SAVED}>Saved (off the board)</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => onDelete(moveTo === SAVED ? null : moveTo)}>
            Delete stage
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      )}
    </li>
  );
}

/** Add, rename, recolor, reorder and delete the tenant's pipeline stages. */
export function StageManager({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { stages, deals } = useDeals();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PALETTE[1]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
    qc.invalidateQueries({ predicate: isDealsQuery });
  };
  const onError = (e: unknown) => toast({ title: "Couldn't update stages", description: apiErrorMessage(e), variant: "destructive" });

  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/pipeline-stages", { name: newName.trim(), color: newColor })).json(),
    onSuccess: () => {
      setNewName("");
      refresh();
    },
    onError,
  });
  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, string> }) =>
      (await apiRequest("PATCH", `/api/pipeline-stages/${id}`, values)).json(),
    onSuccess: refresh,
    onError: (e) => {
      onError(e);
      refresh(); // restore the server's name in the input
    },
  });
  const reorder = useMutation({
    mutationFn: async (ids: string[]) => (await apiRequest("PUT", "/api/pipeline-stages/order", { ids })).json(),
    onMutate: async (ids) => {
      // Optimistic reorder so the arrows feel instant.
      await qc.cancelQueries({ queryKey: ["/api/pipeline-stages"] });
      const prev = qc.getQueryData<PipelineStage[]>(["/api/pipeline-stages"]);
      qc.setQueryData<PipelineStage[]>(["/api/pipeline-stages"], (old = []) =>
        ids.map((id, i) => ({ ...old.find((s) => s.id === id)!, orderIndex: i + 1 })),
      );
      return { prev };
    },
    onError: (e, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(["/api/pipeline-stages"], ctx.prev);
      onError(e);
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async ({ id, moveTo }: { id: string; moveTo: string | null }) =>
      (await apiRequest("DELETE", `/api/pipeline-stages/${id}${moveTo ? `?moveTo=${moveTo}` : ""}`)).json(),
    onSuccess: (r: { moved: number }) => {
      toast({ title: "Stage deleted", description: r.moved ? `${r.moved} deal${r.moved === 1 ? "" : "s"} moved.` : undefined });
      refresh();
    },
    onError,
  });

  const busy = create.isPending || update.isPending || reorder.isPending || remove.isPending;
  const move = (index: number, dir: -1 | 1) => {
    const ids = stages.map((s) => s.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    reorder.mutate(ids);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pipeline stages</DialogTitle>
          <DialogDescription>
            Rename, recolor and reorder your board columns. Stages with “Closed” in the name count toward your Portfolio.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-2">
          {stages.map((stage, i) => (
            <StageRow
              key={`${stage.id}:${stage.name}`}
              stage={stage}
              index={i}
              count={stages.length}
              dealCount={deals.filter((d) => d.stageId === stage.id).length}
              stages={stages}
              busy={busy}
              onSave={(values) => update.mutate({ id: stage.id, values })}
              onMove={(dir) => move(i, dir)}
              onDelete={(moveTo) => remove.mutate({ id: stage.id, moveTo })}
            />
          ))}
        </ol>

        <form
          className="mt-2 flex items-center gap-2 border-t border-border pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) create.mutate();
          }}
        >
          <ColorPicker value={newColor} onChange={setNewColor} label="Color for new stage" />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New stage name, e.g. Due Diligence"
            maxLength={40}
            className="h-8"
            aria-label="New stage name"
          />
          <Button type="submit" size="sm" disabled={!newName.trim() || busy} className={cn("shrink-0")}>
            {create.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            Add stage
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
