import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCompactPrice as formatPrice } from '@/lib/format';
import { Plus, Upload, Pencil, Trash2, ShieldCheck, MapPin, Phone, Mail, Users } from 'lucide-react';

interface Buyer {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  buyerType: string | null;
  targetZips: string[] | null;
  targetCities: string[] | null;
  targetStates: string[] | null;
  propertyTypes: string[] | null;
  minBeds: number | null;
  maxBeds: number | null;
  minBaths: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  arvMin: string | null;
  arvMax: string | null;
  conditionTolerance: string | null;
  proofOfFunds: boolean | null;
  proofOfFundsAmount: string | null;
  source: string | null;
  tags: string[] | null;
  notes: string | null;
  isActive: boolean | null;
}

const BUYER_TYPES = ['landlord', 'flipper', 'fund', 'wholesaler', 'other'];
const blankForm = {
  name: '', company: '', email: '', phone: '', buyerType: '',
  targetZips: '', targetCities: '', targetStates: '', propertyTypes: '',
  minBeds: '', maxBeds: '', minBaths: '', minPrice: '', maxPrice: '', arvMin: '', arvMax: '',
  conditionTolerance: '', proofOfFunds: false, proofOfFundsAmount: '', source: '', tags: '', notes: '',
};
type FormState = typeof blankForm;

const splitList = (s: string) => s.split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
const numOrUndef = (s: string) => { const n = parseFloat(s); return s.trim() && !isNaN(n) ? n : undefined; };

function formToPayload(f: FormState) {
  return {
    name: f.name.trim(),
    company: f.company.trim() || undefined,
    email: f.email.trim() || undefined,
    phone: f.phone.trim() || undefined,
    buyerType: f.buyerType || undefined,
    targetZips: splitList(f.targetZips),
    targetCities: splitList(f.targetCities),
    targetStates: splitList(f.targetStates).map((s) => s.toUpperCase()),
    propertyTypes: splitList(f.propertyTypes),
    minBeds: numOrUndef(f.minBeds),
    maxBeds: numOrUndef(f.maxBeds),
    minBaths: numOrUndef(f.minBaths),
    minPrice: numOrUndef(f.minPrice),
    maxPrice: numOrUndef(f.maxPrice),
    arvMin: numOrUndef(f.arvMin),
    arvMax: numOrUndef(f.arvMax),
    conditionTolerance: f.conditionTolerance || undefined,
    proofOfFunds: f.proofOfFunds,
    proofOfFundsAmount: numOrUndef(f.proofOfFundsAmount),
    source: f.source.trim() || undefined,
    tags: splitList(f.tags),
    notes: f.notes.trim() || undefined,
  };
}

function buyerToForm(b: Buyer): FormState {
  return {
    name: b.name || '', company: b.company || '', email: b.email || '', phone: b.phone || '',
    buyerType: b.buyerType || '',
    targetZips: (b.targetZips || []).join(', '),
    targetCities: (b.targetCities || []).join(', '),
    targetStates: (b.targetStates || []).join(', '),
    propertyTypes: (b.propertyTypes || []).join(', '),
    minBeds: b.minBeds?.toString() || '', maxBeds: b.maxBeds?.toString() || '',
    minBaths: b.minBaths || '', minPrice: b.minPrice || '', maxPrice: b.maxPrice || '',
    arvMin: b.arvMin || '', arvMax: b.arvMax || '',
    conditionTolerance: b.conditionTolerance || '',
    proofOfFunds: !!b.proofOfFunds, proofOfFundsAmount: b.proofOfFundsAmount || '',
    source: b.source || '', tags: (b.tags || []).join(', '), notes: b.notes || '',
  };
}

// Minimal CSV parser (handles quoted fields + commas/newlines in quotes).
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
}

// Map a flexible CSV row to the buyer payload shape.
function csvRowToPayload(r: Record<string, string>) {
  const g = (...keys: string[]) => { for (const k of keys) if (r[k]) return r[k]; return ''; };
  const name = g('name', 'buyer', 'full_name', 'contact');
  if (!name) return null;
  return {
    name,
    company: g('company', 'business', 'brokerage') || undefined,
    email: g('email') || undefined,
    phone: g('phone', 'phone_number', 'mobile') || undefined,
    buyerType: g('type', 'buyer_type') || undefined,
    targetZips: splitList(g('zips', 'target_zips', 'zip', 'zipcodes')),
    targetCities: splitList(g('cities', 'target_cities', 'city')),
    targetStates: splitList(g('states', 'target_states', 'state')).map((s) => s.toUpperCase()),
    propertyTypes: splitList(g('property_types', 'types', 'asset_types')),
    minBeds: numOrUndef(g('min_beds', 'beds_min', 'beds')),
    maxBeds: numOrUndef(g('max_beds', 'beds_max')),
    minBaths: numOrUndef(g('min_baths', 'baths_min', 'baths')),
    minPrice: numOrUndef(g('min_price', 'price_min')),
    maxPrice: numOrUndef(g('max_price', 'price_max', 'max_arv', 'budget')),
    arvMin: numOrUndef(g('arv_min', 'min_arv')),
    arvMax: numOrUndef(g('arv_max', 'max_arv')),
    conditionTolerance: g('condition', 'condition_tolerance') || undefined,
    proofOfFunds: /^(y|yes|true|1)$/i.test(g('proof_of_funds', 'pof', 'verified')),
    proofOfFundsAmount: numOrUndef(g('pof_amount', 'proof_of_funds_amount', 'funds')),
    source: g('source') || 'csv_import',
    tags: splitList(g('tags')),
    notes: g('notes', 'comments') || undefined,
  };
}

function buyBoxSummary(b: Buyer): string {
  const parts: string[] = [];
  const geo = b.targetZips?.length ? `${b.targetZips.length} zip${b.targetZips.length > 1 ? 's' : ''}`
    : b.targetCities?.length ? b.targetCities.join('/')
    : b.targetStates?.length ? b.targetStates.join('/') : null;
  if (geo) parts.push(geo);
  const min = b.minPrice ? formatPrice(Number(b.minPrice)) : null;
  const max = b.maxPrice ? formatPrice(Number(b.maxPrice)) : null;
  if (min || max) parts.push(`${min || '$0'}–${max || 'any'}`);
  if (b.minBeds != null) parts.push(`${b.minBeds}+ bd`);
  if (b.propertyTypes?.length) parts.push(b.propertyTypes.join(', '));
  return parts.join(' · ') || 'Any property';
}

export default function BuyersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);

  const { data, isLoading } = useQuery<{ buyers: Buyer[] }>({ queryKey: ['/api/buyers'] });
  const list = data?.buyers ?? [];
  const set = (k: keyof FormState, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const invalidate = () => qc.invalidateQueries({ queryKey: ['/api/buyers'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(form);
      if (editingId) {
        return (await apiRequest('PATCH', `/api/buyers/${editingId}`, payload)).json();
      }
      return (await apiRequest('POST', '/api/buyers', payload)).json();
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast({ title: editingId ? 'Buyer updated' : 'Buyer added' });
    },
    onError: (e) => toast({ title: 'Save failed', description: e instanceof Error ? e.message : '', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest('DELETE', `/api/buyers/${id}`)).json(),
    onSuccess: () => { invalidate(); toast({ title: 'Buyer removed' }); },
  });

  const importMutation = useMutation({
    mutationFn: async (rows: any[]) => (await apiRequest('POST', '/api/buyers/import', { buyers: rows })).json(),
    onSuccess: (res: any) => { invalidate(); toast({ title: `Imported ${res.imported} buyers` }); },
    onError: (e) => toast({ title: 'Import failed', description: e instanceof Error ? e.message : '', variant: 'destructive' }),
  });

  const openAdd = () => { setEditingId(null); setForm(blankForm); setDialogOpen(true); };
  const openEdit = (b: Buyer) => { setEditingId(b.id); setForm(buyerToForm(b)); setDialogOpen(true); };

  const onCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text).map(csvRowToPayload).filter(Boolean);
    if (rows.length === 0) {
      toast({ title: 'No rows found', description: 'CSV needs a header row with at least a "name" column.', variant: 'destructive' });
    } else {
      importMutation.mutate(rows);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Cash Buyers</h1>
            <p className="text-slate-600">Your dispo list — match found deals to ready buyers instantly.</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onCsv} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importMutation.isPending}>
              <Upload className="w-4 h-4 mr-2" /> Import CSV
            </Button>
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add buyer</Button>
          </div>
        </div>

        {isLoading ? (
          <Card><CardContent className="py-12 text-center text-slate-500">Loading buyers…</CardContent></Card>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium mb-1">No buyers yet</h3>
              <p className="mb-4">Add buyers manually or import a CSV (e.g. a PropStream / county export).</p>
              <p className="text-xs text-slate-400">CSV needs a header row; recognized columns include name, company, phone, email, zips, states, min_price, max_price, min_beds, property_types, proof_of_funds.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">{list.length} buyer{list.length > 1 ? 's' : ''}</p>
            {list.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{b.name}</span>
                      {b.buyerType && <Badge variant="outline" className="capitalize text-xs">{b.buyerType}</Badge>}
                      {b.proofOfFunds && (
                        <Badge className="bg-green-100 text-green-800 text-xs inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> POF{b.proofOfFundsAmount ? ` ${formatPrice(Number(b.proofOfFundsAmount))}` : ''}
                        </Badge>
                      )}
                      {b.isActive === false && <Badge variant="secondary" className="text-xs">inactive</Badge>}
                    </div>
                    {b.company && <p className="text-sm text-slate-600">{b.company}</p>}
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {buyBoxSummary(b)}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      {b.phone && <a href={`tel:${b.phone}`} className="inline-flex items-center text-blue-600 hover:text-blue-700"><Phone className="w-3 h-3 mr-0.5" />{b.phone}</a>}
                      {b.email && <a href={`mailto:${b.email}`} className="inline-flex items-center text-blue-600 hover:text-blue-700"><Mail className="w-3 h-3 mr-0.5" />{b.email}</a>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Remove ${b.name}?`)) deleteMutation.mutate(b.id); }}>
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
          <DialogHeader><DialogTitle>{editingId ? 'Edit buyer' : 'Add buyer'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Company"><Input value={form.company} onChange={(e) => set('company', e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Buyer type">
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.buyerType} onChange={(e) => set('buyerType', e.target.value)}>
                <option value="">—</option>
                {BUYER_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </Field>
            <Field label="Source"><Input value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="county_records, propstream…" /></Field>

            <div className="col-span-2 pt-1 text-sm font-semibold text-slate-700">Buy box</div>
            <Field label="Target ZIPs (comma-sep)"><Input value={form.targetZips} onChange={(e) => set('targetZips', e.target.value)} placeholder="78704, 78745" /></Field>
            <Field label="Target states"><Input value={form.targetStates} onChange={(e) => set('targetStates', e.target.value)} placeholder="TX, FL" /></Field>
            <Field label="Target cities"><Input value={form.targetCities} onChange={(e) => set('targetCities', e.target.value)} placeholder="Austin" /></Field>
            <Field label="Property types"><Input value={form.propertyTypes} onChange={(e) => set('propertyTypes', e.target.value)} placeholder="Single Family, Multi-Family" /></Field>
            <Field label="Min price"><Input type="number" value={form.minPrice} onChange={(e) => set('minPrice', e.target.value)} /></Field>
            <Field label="Max price"><Input type="number" value={form.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} /></Field>
            <Field label="ARV min"><Input type="number" value={form.arvMin} onChange={(e) => set('arvMin', e.target.value)} /></Field>
            <Field label="ARV max"><Input type="number" value={form.arvMax} onChange={(e) => set('arvMax', e.target.value)} /></Field>
            <Field label="Min beds"><Input type="number" value={form.minBeds} onChange={(e) => set('minBeds', e.target.value)} /></Field>
            <Field label="Min baths"><Input type="number" value={form.minBaths} onChange={(e) => set('minBaths', e.target.value)} /></Field>
            <Field label="Condition tolerance"><Input value={form.conditionTolerance} onChange={(e) => set('conditionTolerance', e.target.value)} placeholder="turnkey, light, heavy…" /></Field>

            <div className="col-span-2 flex items-center gap-2 pt-1">
              <Checkbox checked={form.proofOfFunds} onCheckedChange={(v) => set('proofOfFunds', !!v)} id="pof" />
              <Label htmlFor="pof">Proof of funds verified</Label>
              {form.proofOfFunds && (
                <Input type="number" className="w-40 ml-2" value={form.proofOfFundsAmount} onChange={(e) => set('proofOfFundsAmount', e.target.value)} placeholder="Amount" />
              )}
            </div>
            <Field label="Tags" full><Input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="hot, repeat, brrrr" /></Field>
            <Field label="Notes" full><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} /></Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add buyer'}
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
