// CallSheetView — upload a call sheet PDF, display parsed catering data,
// and allow manual editing of any field.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Clock,
  FileUp,
  Loader2,
  Pencil,
  Save,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { Glass } from '@/shared/components/Glass';
import { useAuthStore, selectIsAdmin } from '@/shared/stores/authStore';
import * as csApi from './api/callsheet';
import type { CallSheetData, CallSheetMeal } from './api/callsheet';

export default function CallSheetView() {
  const isAdmin = useAuthStore(selectIsAdmin);
  const [cs, setCs] = useState<CallSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await csApi.fetchLatestCallSheet();
      setCs(data);
    } catch (err) {
      console.error('fetchLatestCallSheet failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const data = await csApi.uploadCallSheet(file);
      setCs(data);
    } catch (err) {
      console.error('uploadCallSheet failed', err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Call Sheet</h1>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              Upload PDF
            </button>
            {cs && !editing ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !cs ? (
        <Glass className="p-8 text-center">
          <p className="text-sm text-slate-400">
            No call sheet uploaded yet.
            {isAdmin ? ' Upload a PDF to get started.' : ' Ask a caterer to upload the call sheet.'}
          </p>
        </Glass>
      ) : editing ? (
        <EditMode callSheet={cs} onSave={(updated) => { setCs(updated); setEditing(false); }} onCancel={() => setEditing(false)} />
      ) : (
        <ReadMode callSheet={cs} />
      )}
    </div>
  );
}

// ────────── Read mode ──────────

function ReadMode({ callSheet: cs }: { callSheet: CallSheetData }) {
  return (
    <div className="space-y-4">
      <Glass className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            {cs.productionName ? (
              <h2 className="text-lg font-semibold text-slate-100">{cs.productionName}</h2>
            ) : null}
            <p className="text-sm text-slate-300">
              Day {cs.shootDay || '?'} — {cs.date || 'Date not parsed'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {cs.estimatedHeadcount > 0 ? (
              <StatPill icon={<Users className="h-3.5 w-3.5" />} label={`${cs.estimatedHeadcount} crew`} />
            ) : null}
            {cs.unitCall ? (
              <StatPill icon={<Clock className="h-3.5 w-3.5" />} label={`Call ${cs.unitCall}`} />
            ) : null}
            {cs.wrapTime ? (
              <StatPill icon={<Clock className="h-3.5 w-3.5" />} label={`Wrap ${cs.wrapTime}`} />
            ) : null}
          </div>
        </div>
        {cs.cateringBase ? (
          <p className="text-xs text-slate-400">Base: {cs.cateringBase}</p>
        ) : null}
        <p className="text-[10px] text-slate-500">
          Source: {cs.sourceFileName}
        </p>
      </Glass>

      {cs.meals.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Meal Schedule
          </h3>
          {cs.meals.map((m, i) => (
            <Glass key={i} className="flex items-center gap-4 px-4 py-3">
              <UtensilsCrossed className="h-5 w-5 text-brand-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold capitalize text-slate-100">
                  {m.type.replace('_', ' ')}
                </p>
                <p className="text-xs text-slate-300">
                  {m.startTime}{m.endTime ? ` – ${m.endTime}` : ''}
                  {m.location ? ` · ${m.location}` : ''}
                  {m.notes ? ` (${m.notes})` : ''}
                </p>
              </div>
            </Glass>
          ))}
        </section>
      ) : null}

      {cs.crewContacts.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Crew Contacts ({cs.crewContacts.length})
          </h3>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {cs.crewContacts.map((c, i) => (
              <div key={i} className="glass-subtle flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-200">{c.name}</p>
                  {c.role ? <p className="truncate text-[10px] text-slate-500">{c.role}</p> : null}
                </div>
                {c.phone ? (
                  <a href={`tel:${c.phone}`} className="text-xs text-brand-300 hover:text-brand-200">
                    {c.phone}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ────────── Edit mode ──────────

function EditMode({
  callSheet: cs,
  onSave,
  onCancel,
}: {
  callSheet: CallSheetData;
  onSave: (updated: CallSheetData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    shootDay: cs.shootDay,
    date: cs.date,
    productionName: cs.productionName,
    unitCall: cs.unitCall,
    wrapTime: cs.wrapTime,
    estimatedHeadcount: cs.estimatedHeadcount,
    cateringBase: cs.cateringBase,
    meals: cs.meals.length > 0 ? cs.meals : [{ type: 'breakfast' as const, startTime: '', endTime: '', location: '', notes: '' }],
  });
  const [saving, setSaving] = useState(false);

  function updateMeal(index: number, patch: Partial<CallSheetMeal>) {
    setForm((prev) => ({
      ...prev,
      meals: prev.meals.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await csApi.updateCallSheet(cs._id, form);
      onSave(updated);
    } catch (err) {
      console.error('updateCallSheet failed', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Glass className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Production Name">
          <input className="input" value={form.productionName} onChange={(e) => setForm((f) => ({ ...f, productionName: e.target.value }))} />
        </Field>
        <Field label="Shoot Day">
          <input className="input" type="number" value={form.shootDay} onChange={(e) => setForm((f) => ({ ...f, shootDay: Number(e.target.value) }))} />
        </Field>
        <Field label="Date">
          <input className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </Field>
        <Field label="Headcount">
          <input className="input" type="number" value={form.estimatedHeadcount} onChange={(e) => setForm((f) => ({ ...f, estimatedHeadcount: Number(e.target.value) }))} />
        </Field>
        <Field label="Unit Call">
          <input className="input" placeholder="09:00" value={form.unitCall} onChange={(e) => setForm((f) => ({ ...f, unitCall: e.target.value }))} />
        </Field>
        <Field label="Wrap Time">
          <input className="input" placeholder="20:00" value={form.wrapTime} onChange={(e) => setForm((f) => ({ ...f, wrapTime: e.target.value }))} />
        </Field>
        <div className="col-span-2">
          <Field label="Catering Base">
            <input className="input" value={form.cateringBase} onChange={(e) => setForm((f) => ({ ...f, cateringBase: e.target.value }))} />
          </Field>
        </div>
      </div>

      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meals</h4>
      {form.meals.map((m, i) => (
        <div key={i} className="glass-subtle grid grid-cols-4 gap-2 p-3">
          <Field label="Type">
            <select className="input" value={m.type} onChange={(e) => updateMeal(i, { type: e.target.value as CallSheetMeal['type'] })}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="craft_service">Craft Service</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Start">
            <input className="input" placeholder="08:00" value={m.startTime} onChange={(e) => updateMeal(i, { startTime: e.target.value })} />
          </Field>
          <Field label="End">
            <input className="input" placeholder="09:00" value={m.endTime} onChange={(e) => updateMeal(i, { endTime: e.target.value })} />
          </Field>
          <Field label="Location">
            <input className="input" value={m.location} onChange={(e) => updateMeal(i, { location: e.target.value })} />
          </Field>
        </div>
      ))}

      <div className="flex items-center justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4" /> Cancel
        </button>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>
    </Glass>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
      {icon} {label}
    </span>
  );
}
