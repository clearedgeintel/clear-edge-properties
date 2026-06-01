import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Pencil, Trash2, Play, Bell, BellOff, MapPin, Search, Loader2 } from 'lucide-react';

interface SavedSearch {
  id: string;
  searchName: string;
  markets: string[] | null;
  filters: Record<string, any> | null;
  alertFrequency: string | null;
  alertChannels: string[] | null;
  isActive: boolean | null;
  lastRunAt: string | null;
  lastMatchCount: number | null;
}

const FREQUENCIES = ['hourly', 'daily', 'weekly'];

const blankForm = {
  searchName: '', markets: '',
  min_price: '', max_price: '', min_beds: '', max_beds: '',
  min_investment_score: '', property_types: '',
  alertFrequency: 'daily', emailAlerts: true, isActive: true,
};
type FormState = typeof blankForm;

const splitList = (s: string) => s.split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
const numOrNull = (s: string) => { const n = parseFloat(s); return s.trim() && !isNaN(n) ? n : null; };

function formToPayload(f: FormState) {
  return {
    searchName: f.searchName.trim(),
    markets: splitList(f.markets),
    filters: {
      min_price: numOrNull(f.min_price),
      max_price: numOrNull(f.max_price),
      min_beds: numOrNull(f.min_beds),
      max_beds: numOrNull(f.max_beds),
      min_investment_score: numOrNull(f.min_investment_score),
      property_types: splitList(f.property_types),
    },
    alertFrequency: f.alertFrequency,
    alertChannels: f.emailAlerts ? ['email'] : [],
    isActive: f.isActive,
  };
}

function searchToForm(s: SavedSearch): FormState {
  const f = s.filters || {};
  return {
    searchName: s.searchName || '',
    markets: (s.markets || []).join(', '),
    min_price: f.min_price != null ? String(f.min_price) : '',
    max_price: f.max_price != null ? String(f.max_price) : '',
    min_beds: f.min_beds != null ? String(f.min_beds) : '',
    max_beds: f.max_beds != null ? String(f.max_beds) : '',
    min_investment_score: f.min_investment_score != null ? String(f.min_investment_score) : '',
    property_types: (f.property_types || []).join(', '),
    alertFrequency: s.alertFrequency || 'daily',
    emailAlerts: (s.alertChannels || []).some((c) => c.toLowerCase().includes('email')),
    isActive: s.isActive !== false,
  };
}

function summary(s: SavedSearch): string {
  const f = s.filters || {};
  const parts: string[] = [];
  if (s.markets?.length) parts.push(s.markets.join(' / '));
  if (f.min_price || f.max_price) {
    const fmt = (n: any) => (n != null ? `$${Number(n).toLocaleString()}` : '');
    parts.push(`${fmt(f.min_price) || '$0'}–${fmt(f.max_price) || 'any'}`);
  }
  if (f.min_beds != null) parts.push(`${f.min_beds}+ bd`);
  if (f.min_investment_score != null) parts.push(`score ≥ ${f.min_investment_score}`);
  if (f.property_types?.length) parts.push(f.property_types.join(', '));
  return parts.join(' · ') || 'Any property';
}

export default function SavedSearchesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [runningId, setRunningId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ savedSearches: SavedSearch[] }>({ queryKey: ['/api/saved-searches'] });
  const list = data?.savedSearches ?? [];
  const set = (k: keyof FormState, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const invalidate = () => qc.invalidateQueries({ queryKey: ['/api/saved-searches'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(form);
      if (editingId) return (await apiRequest('PATCH', `/api/saved-searches/${editingId}`, payload)).json();
      return (await apiRequest('POST', '/api/saved-searches', payload)).json();
    },
    onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: editingId ? 'Saved search updated' : 'Saved search created' }); },
    onError: (e) => toast({ title: 'Save failed', description: e instanceof Error ? e.message : '', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest('DELETE', `/api/saved-searches/${id}`)).json(),
    onSuccess: () => { invalidate(); toast({ title: 'Saved search removed' }); },
  });

  const runMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest('POST', `/api/saved-searches/${id}/run`)).json(),
    onMutate: (id: string) => setRunningId(id),
    onSuccess: (res: any) => {
      invalidate();
      toast({
        title: `Found ${res.matched} match${res.matched === 1 ? '' : 'es'}`,
        description: `${res.newMatches} new · ${res.enriched} enriched${res.notified ? ' · alert sent' : ''}`,
      });
    },
    onError: (e) => toast({ title: 'Run failed', description: e instanceof Error ? e.message : '', variant: 'destructive' }),
    onSettled: () => setRunningId(null),
  });

  const openAdd = () => { setEditingId(null); setForm(blankForm); setDialogOpen(true); };
  const openEdit = (s: SavedSearch) => { setEditingId(s.id); setForm(searchToForm(s)); setDialogOpen(true); };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Saved Searches</h1>
            <p className="text-slate-600">Run criteria automatically and get alerted on new matches.</p>
          </div>
          <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> New saved search</Button>
        </div>

        {isLoading ? (
          <Card><CardContent className="py-12 text-center text-slate-500">Loading…</CardContent></Card>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium mb-1">No saved searches yet</h3>
              <p className="mb-4">Save a set of markets + criteria and we'll watch for new matching properties.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">{list.length} saved search{list.length > 1 ? 'es' : ''}</p>
            {list.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{s.searchName}</span>
                      <Badge variant="outline" className="text-xs capitalize">{s.alertFrequency || 'daily'}</Badge>
                      {(s.alertChannels || []).some((c) => c.toLowerCase().includes('email'))
                        ? <Badge className="bg-blue-100 text-blue-800 text-xs inline-flex items-center gap-1"><Bell className="w-3 h-3" /> email</Badge>
                        : <Badge variant="secondary" className="text-xs inline-flex items-center gap-1"><BellOff className="w-3 h-3" /> no alerts</Badge>}
                      {s.isActive === false && <Badge variant="secondary" className="text-xs">paused</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {summary(s)}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {s.lastRunAt ? `Last run ${new Date(s.lastRunAt).toLocaleString()} · ${s.lastMatchCount ?? 0} matches` : 'Never run'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => runMutation.mutate(s.id)} disabled={runningId === s.id} title="Run now">
                      {runningId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-green-600" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Delete "${s.searchName}"?`)) deleteMutation.mutate(s.id); }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit saved search' : 'New saved search'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *" full><Input value={form.searchName} onChange={(e) => set('searchName', e.target.value)} placeholder="Austin SFH under 400k" /></Field>
            <Field label="Markets (comma-sep) *" full><Input value={form.markets} onChange={(e) => set('markets', e.target.value)} placeholder="Austin, TX; 78745" /></Field>

            <div className="col-span-2 pt-1 text-sm font-semibold text-slate-700">Criteria</div>
            <Field label="Min price"><Input type="number" value={form.min_price} onChange={(e) => set('min_price', e.target.value)} /></Field>
            <Field label="Max price"><Input type="number" value={form.max_price} onChange={(e) => set('max_price', e.target.value)} /></Field>
            <Field label="Min beds"><Input type="number" value={form.min_beds} onChange={(e) => set('min_beds', e.target.value)} /></Field>
            <Field label="Max beds"><Input type="number" value={form.max_beds} onChange={(e) => set('max_beds', e.target.value)} /></Field>
            <Field label="Min investment score"><Input type="number" value={form.min_investment_score} onChange={(e) => set('min_investment_score', e.target.value)} placeholder="50" /></Field>
            <Field label="Property types"><Input value={form.property_types} onChange={(e) => set('property_types', e.target.value)} placeholder="Single Family" /></Field>

            <div className="col-span-2 pt-1 text-sm font-semibold text-slate-700">Alerts</div>
            <Field label="Frequency">
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.alertFrequency} onChange={(e) => set('alertFrequency', e.target.value)}>
                {FREQUENCIES.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </Field>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2"><Checkbox checked={form.emailAlerts} onCheckedChange={(v) => set('emailAlerts', !!v)} /> <span className="text-sm">Email alerts</span></label>
              <label className="flex items-center gap-2"><Checkbox checked={form.isActive} onCheckedChange={(v) => set('isActive', !!v)} /> <span className="text-sm">Active</span></label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.searchName.trim() || !form.markets.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
