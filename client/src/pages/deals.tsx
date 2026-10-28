import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, MoreVertical, FileText, Trash2, Calendar, Loader2, Upload, Download, ExternalLink, Eye, MapPin, Search,
  Bookmark, BookmarkX,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useDealActions, useDeals, type PipelineDeal, type PipelineStage } from "@/lib/deals";
import { EmptyState, ErrorState, PageHeader, PropertyImageFallback } from "@/components/states";
import { ScoreBadge } from "@/components/score-badge";
import { PropertyDrawer } from "@/components/property-drawer";
import { platformInfo } from "@/components/search/platforms";
import type { Property } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const DEALS_KEY = ["/api/deals"];

export default function DealsPage() {
  const { stages, staged, unstaged, isLoading, isError, refetch } = useDeals();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [notesDeal, setNotesDeal] = useState<PipelineDeal | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);
  const [drawerProperty, setDrawerProperty] = useState<Property | null>(null);

  // Deep link from "View pipeline" (/deals?deal=<id>): scroll to and briefly
  // highlight the card once deals have loaded.
  const [highlightId, setHighlightId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("deal"),
  );
  useEffect(() => {
    if (!highlightId || isLoading) return;
    const el = document.querySelector(`[data-deal-id="${highlightId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightId, isLoading]);

  const viewProperty = (deal: PipelineDeal) => deal.property && setDrawerProperty(deal.property);

  // All board mutations are PATCH /api/deals/:id (user_properties). Optimistic so
  // drag-and-drop feels instant; rolls back on error.
  const patch = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, any> }) =>
      (await apiRequest("PATCH", `/api/deals/${id}`, body)).json(),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: DEALS_KEY });
      const prev = qc.getQueryData<any[]>(DEALS_KEY);
      qc.setQueryData<any[]>(DEALS_KEY, (old = []) =>
        old.map((it) => (it.id === id ? { ...it, ...body } : it)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(DEALS_KEY, ctx.prev);
      toast({ title: "Update failed", description: "Could not save the change.", variant: "destructive" });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: DEALS_KEY }),
  });

  const move = (id: string, stageId: string | null) => patch.mutate({ id, body: { pipelineStageId: stageId } });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;
    move(draggableId, destination.droppableId);
    const stageName = stages.find((s) => s.id === destination.droppableId)?.name;
    toast({ title: "Deal moved", description: stageName ? `Moved to ${stageName}` : undefined });
  };

  const dealsByStage = (stageId: string) => staged.filter((d) => d.stageId === stageId);

  return (
    <div className="min-h-screen max-w-full overflow-x-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Deal pipeline"
        description="Track properties from first look to close. Add them from Search or Browse in one click."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/property-search">
                <Search className="mr-1.5 h-4 w-4" /> Find deals
              </Link>
            </Button>
            <Button className="flex items-center gap-2" onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4" />
              Add deal
            </Button>
          </>
        }
      />

      {isError ? (
        <ErrorState onRetry={refetch} description="We couldn't load your pipeline. Try again in a moment." />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="Loading pipeline">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl opacity-60" />
            </div>
          ))}
        </div>
      ) : stages.length === 0 ? (
        <EmptyState
          title="No pipeline stages yet"
          description="Pipeline stages are created with your workspace. Contact support if this persists."
        />
      ) : (
        <>
        {staged.length === 0 && (
          <EmptyState
            className="mb-6 border-solid py-10"
            icon={Search}
            title={unstaged.length ? "Nothing on the board yet" : "Your pipeline is empty"}
            description={
              unstaged.length
                ? "Move a saved property onto the board below, or find new deals."
                : "Add properties from Search or Browse — they land here in your first stage."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="cta" asChild>
                  <Link href="/property-search"><Search className="mr-1.5 h-4 w-4" /> Search properties</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/browse"><MapPin className="mr-1.5 h-4 w-4" /> Browse & map</Link>
                </Button>
              </div>
            }
          />
        )}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-h-[600px]">
            {stages.map((stage) => (
              <div key={stage.id} className="flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                    {stage.icon && <span>{stage.icon}</span>}
                    {stage.name}
                  </h2>
                  <Badge
                    variant="outline"
                    style={{ borderColor: stage.color || undefined, color: stage.color || undefined }}
                  >
                    {dealsByStage(stage.id).length}
                  </Badge>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 rounded-lg border-2 border-dashed transition-colors ${
                        snapshot.isDraggingOver ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      {dealsByStage(stage.id).map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-2 transition-transform ${snapshot.isDragging ? "rotate-1 scale-105" : ""}`}
                            >
                              <DealCard
                                deal={deal}
                                highlighted={highlightId === deal.id}
                                onClick={setSelectedDeal}
                                onViewProperty={viewProperty}
                                onEditNotes={setNotesDeal}
                                onRemove={(id) => {
                                  move(id, null);
                                  toast({ title: "Removed from pipeline", description: "Still saved in your tracked properties." });
                                }}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>

        <SavedSection
          deals={unstaged}
          stages={stages}
          highlightId={highlightId}
          onMove={(deal, stageId) => {
            move(deal.id, stageId);
            toast({ title: `Added to ${stages.find((s) => s.id === stageId)?.name ?? "pipeline"}` });
          }}
          onView={viewProperty}
        />
        </>
      )}

      <AddDealDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        unstaged={unstaged}
        stages={stages}
        onAdd={(id, stageId) => {
          patch.mutate({ id, body: { pipelineStageId: stageId } });
          setIsAddOpen(false);
          toast({ title: "Deal added", description: "Property added to your pipeline." });
        }}
      />

      <NotesDialog
        deal={notesDeal}
        onClose={() => setNotesDeal(null)}
        onSave={(id, notes) => {
          patch.mutate({ id, body: { customNotes: notes } });
          setNotesDeal(null);
          toast({ title: "Notes saved" });
        }}
      />

      <Dialog open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Deal Details</DialogTitle></DialogHeader>
          {selectedDeal && (
            <DealDetails
              deal={selectedDeal}
              stages={stages}
              onViewProperty={(d) => {
                setSelectedDeal(null);
                viewProperty(d);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <PropertyDrawer
        property={drawerProperty}
        open={drawerProperty !== null}
        onOpenChange={(o) => !o && setDrawerProperty(null)}
      />
    </div>
  );
}

function scoreBadgeColor(score: number) {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function PlatformChip({ platform }: { platform: string }) {
  const info = platformInfo(platform);
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-sm", info.badgeClass)}>
      {info.shortName}
    </span>
  );
}

function DealThumb({ deal, className }: { deal: PipelineDeal; className?: string }) {
  const [error, setError] = useState(false);
  return (
    <div className={cn("overflow-hidden bg-slate-100", className)}>
      {deal.image && !error ? (
        <img src={deal.image} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setError(true)} />
      ) : (
        <PropertyImageFallback compact />
      )}
    </div>
  );
}

function DealCard({
  deal,
  highlighted,
  onClick,
  onViewProperty,
  onEditNotes,
  onRemove,
}: {
  deal: PipelineDeal;
  highlighted?: boolean;
  onClick: (d: PipelineDeal) => void;
  onViewProperty: (d: PipelineDeal) => void;
  onEditNotes: (d: PipelineDeal) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card
      data-deal-id={deal.id}
      className={cn(
        "cursor-grab overflow-hidden bg-white transition-all hover:shadow-md active:cursor-grabbing",
        highlighted && "ring-2 ring-brand-orange ring-offset-2 animate-pulse",
      )}
      onClick={() => onClick(deal)}
    >
      <div className="relative">
        <DealThumb deal={deal} className="h-24 w-full" />
        <div className="absolute left-2 top-2"><PlatformChip platform={deal.platform} /></div>
        {deal.score > 0 && (
          <div className="absolute right-2 top-2"><ScoreBadge investmentScorePercent={deal.score} size="sm" /></div>
        )}
      </div>
      <CardHeader className="pb-1.5 px-3 pt-2.5">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold tabular-nums text-brand-navy">
              {deal.price ? `$${deal.price.toLocaleString()}` : "Contact for price"}
            </p>
            <CardTitle className="truncate text-xs font-medium text-slate-700" title={deal.title}>{deal.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Deal actions"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {deal.property && (
                <DropdownMenuItem onClick={() => onViewProperty(deal)}>
                  <Eye className="w-4 h-4 mr-2" /> View property
                </DropdownMenuItem>
              )}
              {deal.url && (
                <DropdownMenuItem asChild>
                  <a href={deal.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> View original listing
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEditNotes(deal)}>
                <FileText className="w-4 h-4 mr-2" /> Edit notes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRemove(deal.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Remove from pipeline
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-1.5">
          {deal.notes && <p className="text-xs text-gray-600 line-clamp-2">{deal.notes}</p>}
          {deal.updatedAt && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Tracked properties that aren't on the board yet, with one-click stage chips.
function SavedSection({
  deals,
  stages,
  highlightId,
  onMove,
  onView,
}: {
  deals: PipelineDeal[];
  stages: PipelineStage[];
  highlightId: string | null;
  onMove: (deal: PipelineDeal, stageId: string) => void;
  onView: (deal: PipelineDeal) => void;
}) {
  const { removeDeal } = useDealActions();
  if (deals.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-brand-navy">
          <Bookmark className="h-4 w-4" /> Saved — not in pipeline yet
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">{deals.length}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {deals.map((deal) => (
          <div
            key={deal.id}
            data-deal-id={deal.id}
            className={cn(
              "flex gap-3 rounded-xl border border-border bg-white p-2.5 shadow-sm",
              highlightId === deal.id && "ring-2 ring-brand-orange ring-offset-2",
            )}
          >
            <button type="button" onClick={() => onView(deal)} className="shrink-0" aria-label="View property">
              <DealThumb deal={deal} className="h-20 w-24 rounded-lg" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold tabular-nums text-brand-navy">
                    {deal.price ? `$${deal.price.toLocaleString()}` : "Contact for price"}
                  </p>
                  <p className="truncate text-xs text-slate-600" title={deal.title}>{deal.title}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <PlatformChip platform={deal.platform} />
                  {deal.score > 0 && <ScoreBadge investmentScorePercent={deal.score} size="sm" />}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                    aria-label="Remove from saved"
                    title="Remove from saved"
                    onClick={() => removeDeal.mutate(deal.zpid)}
                  >
                    <BookmarkX className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onMove(deal, s.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-transparent hover:text-white"
                    onMouseEnter={(e) => (e.currentTarget.style.background = s.color || "#3B82F6")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <Plus className="h-3 w-3" /> {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AddDealDialog({
  open,
  onOpenChange,
  unstaged,
  stages,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unstaged: PipelineDeal[];
  stages: PipelineStage[];
  onAdd: (id: string, stageId: string) => void;
}) {
  const [stageId, setStageId] = useState<string>("");
  const target = stageId || stages[0]?.id || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add a deal from saved properties</DialogTitle></DialogHeader>
        {unstaged.length === 0 ? (
          <div className="space-y-3 py-2 text-sm text-slate-500">
            <p>Every saved property is already in your pipeline.</p>
            <p>
              Find new deals in{" "}
              <Link href="/property-search" className="font-medium text-brand-blue hover:underline" onClick={() => onOpenChange(false)}>
                Property Search
              </Link>{" "}
              or{" "}
              <Link href="/browse" className="font-medium text-brand-blue hover:underline" onClick={() => onOpenChange(false)}>
                Browse
              </Link>
              {" "}— use “Add to pipeline” on any property.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Add to stage:</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={target}
                onChange={(e) => setStageId(e.target.value)}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ""}{s.name}</option>
                ))}
              </select>
            </div>
            <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
              {unstaged.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onAdd(d.id, target)}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800 truncate">{d.title}</span>
                    <span className="block text-xs text-slate-500 truncate">{d.address}</span>
                  </span>
                  <span className="text-xs text-slate-500 whitespace-nowrap flex items-center gap-2">
                    {d.price ? `$${d.price.toLocaleString()}` : "—"}
                    <Badge className={scoreBadgeColor(d.score)}>{d.score || "—"}</Badge>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NotesDialog({
  deal,
  onClose,
  onSave,
}: {
  deal: PipelineDeal | null;
  onClose: () => void;
  onSave: (id: string, notes: string) => void;
}) {
  return (
    <Dialog open={!!deal} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Deal notes</DialogTitle></DialogHeader>
        {deal && <NotesForm key={deal.id} deal={deal} onClose={onClose} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function NotesForm({
  deal,
  onClose,
  onSave,
}: {
  deal: PipelineDeal;
  onClose: () => void;
  onSave: (id: string, notes: string) => void;
}) {
  const [notes, setNotes] = useState(deal.notes || "");
  return (
    <>
      <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes about this deal…" />
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(deal.id, notes)}>Save notes</Button>
      </DialogFooter>
    </>
  );
}

function DealDetails({
  deal,
  stages,
  onViewProperty,
}: {
  deal: PipelineDeal;
  stages: PipelineStage[];
  onViewProperty: (deal: PipelineDeal) => void;
}) {
  const stage = stages.find((s) => s.id === deal.stageId);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{deal.title}</h3>
          <p className="text-slate-600 text-sm">{deal.address}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-slate-900">{deal.price ? `$${deal.price.toLocaleString()}` : "—"}</div>
          <div className="text-sm text-slate-500">Score: {deal.score || "N/A"}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Stage</div>
          <div className="text-sm font-semibold text-slate-900">{stage ? `${stage.icon || ""} ${stage.name}` : "—"}</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Updated</div>
          <div className="text-sm font-semibold text-slate-900">
            {deal.updatedAt ? new Date(deal.updatedAt).toLocaleDateString() : "—"}
          </div>
        </div>
      </div>
      {deal.notes && (
        <div>
          <h4 className="font-semibold text-slate-900 mb-1 text-sm">Notes</h4>
          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{deal.notes}</p>
        </div>
      )}

      <DocumentsSection dealId={deal.id} />

      <div className="flex flex-wrap gap-2">
        {deal.property && (
          <Button variant="outline" size="sm" onClick={() => onViewProperty(deal)}>
            <Eye className="mr-1.5 h-4 w-4" /> View full property
          </Button>
        )}
        {deal.url && (
          <Button variant="ghost" size="sm" asChild>
            <a href={deal.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" /> Original listing
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

interface DealDocument {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  documentType: string;
  uploadedAt: string | null;
  downloadUrl: string | null;
}

// Deal documents (LOIs, etc.). Upload uses a server-issued signed URL so bytes
// go straight to Supabase Storage; the server records + signs downloads.
function DocumentsSection({ dealId }: { dealId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const key = ["/api/deals", dealId, "documents"];

  const { data, isLoading } = useQuery<{ documents: DealDocument[] }>({
    queryKey: key,
    queryFn: async () => (await apiRequest("GET", `/api/deals/${dealId}/documents`)).json(),
  });
  const docs = data?.documents ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const sign = await (
        await apiRequest("POST", `/api/deals/${dealId}/documents/sign`, { fileName: file.name, mimeType: file.type })
      ).json();
      if (!supabase) throw new Error("Storage not configured");
      const { error } = await supabase.storage.from("deal-documents").uploadToSignedUrl(sign.path, sign.token, file);
      if (error) throw error;
      return (
        await apiRequest("POST", `/api/deals/${dealId}/documents`, {
          path: sign.path,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          documentType: "loi",
        })
      ).json();
    },
    onSuccess: () => { invalidate(); toast({ title: "Document uploaded" }); },
    onError: (e) => toast({ title: "Upload failed", description: e instanceof Error ? e.message : "", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (docId: string) => (await apiRequest("DELETE", `/api/deals/${dealId}/documents/${docId}`)).json(),
    onSuccess: () => { invalidate(); toast({ title: "Document removed" }); },
  });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-slate-900 text-sm">Documents</h4>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={onFile} />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Upload LOI / doc
        </Button>
      </div>
      {isLoading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-slate-400">No documents yet. Upload an LOI, contract, or photo.</p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm text-slate-800 truncate">{doc.fileName}</span>
                  <span className="block text-xs text-slate-400">
                    {doc.documentType?.toUpperCase()}
                    {doc.fileSize ? ` · ${(doc.fileSize / 1024 / 1024).toFixed(2)} MB` : ""}
                    {doc.uploadedAt ? ` · ${new Date(doc.uploadedAt).toLocaleDateString()}` : ""}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-1 flex-shrink-0">
                {doc.downloadUrl && (
                  <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" title="Download">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Download className="w-4 h-4 text-slate-600" /></Button>
                  </a>
                )}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => del.mutate(doc.id)} disabled={del.isPending}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
