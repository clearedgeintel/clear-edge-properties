import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, FileText, Trash2, Calendar, DollarSign, Home, Loader2, Upload, Download } from "lucide-react";
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
import { useDeals, type PipelineDeal, type PipelineStage } from "@/lib/deals";

const DEALS_KEY = ["/api/deals"];

export default function DealsPage() {
  const { stages, staged, unstaged, isLoading } = useDeals();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [notesDeal, setNotesDeal] = useState<PipelineDeal | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);

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
    <div className="p-6 max-w-full overflow-x-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-gray-600 mt-1">Track your saved properties through each stage</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Deal
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-slate-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading pipeline…
        </div>
      ) : stages.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No pipeline stages configured.</CardContent></Card>
      ) : (
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
                                onClick={setSelectedDeal}
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
          {selectedDeal && <DealDetails deal={selectedDeal} stages={stages} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function scoreBadgeColor(score: number) {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function DealCard({
  deal,
  onClick,
  onEditNotes,
  onRemove,
}: {
  deal: PipelineDeal;
  onClick: (d: PipelineDeal) => void;
  onEditNotes: (d: PipelineDeal) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-white" onClick={() => onClick(deal)}>
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium text-gray-900 truncate">{deal.title}</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Home className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{deal.address}</span>
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm font-medium">
              <DollarSign className="w-3.5 h-3.5 text-green-600" />
              {deal.price ? deal.price.toLocaleString() : "—"}
            </span>
            <Badge className={scoreBadgeColor(deal.score)}>{deal.score || "—"}</Badge>
          </div>
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
          <p className="text-sm text-slate-500 py-4">
            Every saved property is already in your pipeline. Save more properties from search to add new deals.
          </p>
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

function DealDetails({ deal, stages }: { deal: PipelineDeal; stages: PipelineStage[] }) {
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

      <a
        href={`/property-details?zpid=${encodeURIComponent(deal.zpid)}`}
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        View full property →
      </a>
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
