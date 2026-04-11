// MenuItemForm — 1:1 port of the iOS MenuItemFormView.
// Supports batch creation of menu items with full nutrition, custom fields,
// dietary tags, and allergen warnings. In create mode it also auto-posts a
// poll to the selected unit's chat once all items are saved.

import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import type {
  CreateMenuItemRequest,
  CustomNutritionField,
  DietaryTag,
  MenuImage,
  MenuItem,
  ModuleId,
  NutritionInfo,
} from '@/shared/types';
import { COMMON_ALLERGENS, DIETARY_TAGS } from '@/shared/types';
import { humanizeLabel, safeUUID } from '@/shared/utils/date';
import { Modal } from '@/shared/components/Modal';
import { DietaryTagChip } from '@/shared/components/DietaryTagChip';
import { useModuleStore, useModuleState } from '../stores/moduleStore';
import { uploadFile } from '@/shared/api/upload';
import { resolveAssetUrl } from '@/shared/utils/assetUrl';

interface MenuItemFormProps {
  moduleId: ModuleId;
  open: boolean;
  onClose: () => void;
  editingItem: MenuItem | null;
}

interface Draft {
  localId: string;
  name: string;
  description: string;
  category: string;
  available: boolean;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
  customFields: CustomNutritionField[];
  dietaryTags: DietaryTag[];
  allergens: string[];
  customAllergen: string;
  images: MenuImage[];
  uploadingImage: boolean;
}

function emptyDraft(): Draft {
  return {
    localId: safeUUID(),
    name: '',
    description: '',
    category: '',
    available: true,
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    sodium: '',
    customFields: [],
    dietaryTags: [],
    allergens: [],
    customAllergen: '',
    images: [],
    uploadingImage: false,
  };
}

function draftFromItem(item: MenuItem): Draft {
  const n = item.nutrition ?? {};
  return {
    localId: item._id,
    name: item.name,
    description: item.description ?? '',
    category: item.category ?? '',
    available: item.available,
    calories: n.calories?.toString() ?? '',
    protein: n.protein?.toString() ?? '',
    carbs: n.carbs?.toString() ?? '',
    fat: n.fat?.toString() ?? '',
    fiber: n.fiber?.toString() ?? '',
    sugar: n.sugar?.toString() ?? '',
    sodium: n.sodium?.toString() ?? '',
    customFields: n.customFields ?? [],
    dietaryTags: item.dietaryTags ?? [],
    allergens: item.allergenWarnings ?? [],
    customAllergen: '',
    images: item.images ?? [],
    uploadingImage: false,
  };
}

function buildRequest(draft: Draft, unitId: string): CreateMenuItemRequest {
  const toNum = (s: string): number | undefined => {
    const trimmed = s.trim();
    if (trimmed === '') return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  };

  const nutrition: NutritionInfo = {
    calories: toNum(draft.calories),
    protein: toNum(draft.protein),
    carbs: toNum(draft.carbs),
    fat: toNum(draft.fat),
    fiber: toNum(draft.fiber),
    sugar: toNum(draft.sugar),
    sodium: toNum(draft.sodium),
    customFields: draft.customFields.filter((f) => f.name.trim() !== ''),
  };

  const hasAnyNutrition =
    Object.values(nutrition).some((v) => v !== undefined && (typeof v !== 'object' || (v as unknown[]).length > 0));

  return {
    unitId,
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    category: draft.category.trim() || undefined,
    available: draft.available,
    nutrition: hasAnyNutrition ? nutrition : null,
    dietaryTags: draft.dietaryTags.length > 0 ? draft.dietaryTags : undefined,
    allergenWarnings: draft.allergens.length > 0 ? draft.allergens : undefined,
    images: draft.images.length > 0 ? draft.images : undefined,
  };
}

export function MenuItemForm({ moduleId, open, onClose, editingItem }: MenuItemFormProps) {
  const { units, activeUnitId } = useModuleState(moduleId);
  const createMenuItem = useModuleStore((s) => s.createMenuItem);
  const updateMenuItem = useModuleStore((s) => s.updateMenuItem);
  const postMenuPoll = useModuleStore((s) => s.postMenuPoll);

  const isEditing = !!editingItem;
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    editingItem?.unitId ?? activeUnitId ?? units[0]?._id ?? ''
  );
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    editingItem ? [draftFromItem(editingItem)] : [emptyDraft()]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validCount = useMemo(
    () => drafts.filter((d) => d.name.trim() !== '').length,
    [drafts]
  );

  function updateDraft(localId: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d) => (d.localId === localId ? { ...d, ...patch } : d)));
  }

  function addDraft() {
    setDrafts((prev) => [...prev, emptyDraft()]);
  }

  function removeDraft(localId: string) {
    setDrafts((prev) => (prev.length > 1 ? prev.filter((d) => d.localId !== localId) : prev));
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!selectedUnitId) {
      setError('Pick a unit first.');
      return;
    }
    const valid = drafts.filter((d) => d.name.trim() !== '');
    if (valid.length === 0) {
      setError('Add at least one item with a name.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && editingItem) {
        const req = buildRequest(valid[0], selectedUnitId);
        await updateMenuItem(moduleId, editingItem._id, req);
      } else {
        const created: MenuItem[] = [];
        for (const d of valid) {
          const req = buildRequest(d, selectedUnitId);
          const item = await createMenuItem(moduleId, req);
          created.push(item);
        }
        if (created.length > 0) {
          const unit = units.find((u) => u._id === selectedUnitId);
          try {
            await postMenuPoll(
              moduleId,
              created,
              selectedUnitId,
              unit?.unitName ?? 'menu'
            );
          } catch (err) {
            console.error('auto post poll failed', err);
          }
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu item');
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = isEditing
    ? 'Save Changes'
    : `Post ${validCount} Menu Item${validCount === 1 ? '' : 's'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Menu Item' : 'New Menu Items'}
      widthClass="max-w-3xl"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || validCount === 0}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {!isEditing ? (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Unit
            </label>
            <select
              className="input"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
            >
              {units.map((u) => (
                <option key={u._id} value={u._id}>
                  {humanizeLabel(u.unitName) || u.unitName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {drafts.map((draft, index) => (
          <DraftCard
            key={draft.localId}
            draft={draft}
            index={index}
            total={drafts.length}
            onChange={(patch) => updateDraft(draft.localId, patch)}
            onRemove={() => removeDraft(draft.localId)}
          />
        ))}

        {!isEditing ? (
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={addDraft}
            disabled={submitting}
          >
            <Plus className="h-4 w-4" /> Add Another Item
          </button>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

// ---------------- Draft card ----------------

interface DraftCardProps {
  draft: Draft;
  index: number;
  total: number;
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
}

function DraftCard({ draft, index, total, onChange, onRemove }: DraftCardProps) {
  function toggleTag(tag: DietaryTag) {
    const has = draft.dietaryTags.includes(tag);
    onChange({
      dietaryTags: has
        ? draft.dietaryTags.filter((t) => t !== tag)
        : [...draft.dietaryTags, tag],
    });
  }

  function toggleAllergen(a: string) {
    const has = draft.allergens.includes(a);
    onChange({
      allergens: has ? draft.allergens.filter((x) => x !== a) : [...draft.allergens, a],
    });
  }

  function addCustomAllergen() {
    const trimmed = draft.customAllergen.trim();
    if (!trimmed || draft.allergens.includes(trimmed)) return;
    onChange({
      allergens: [...draft.allergens, trimmed],
      customAllergen: '',
    });
  }

  function addCustomField() {
    onChange({
      customFields: [
        ...draft.customFields,
        { id: safeUUID(), name: '', value: '', unit: '' },
      ],
    });
  }

  function updateCustomField(id: string, patch: Partial<CustomNutritionField>) {
    onChange({
      customFields: draft.customFields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  }

  function removeCustomField(id: string) {
    onChange({ customFields: draft.customFields.filter((f) => f.id !== id) });
  }

  return (
    <div className="glass-subtle relative space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Item {index + 1}
        </h3>
        {total > 1 ? (
          <button
            type="button"
            className="rounded-lg p-1 text-red-400 transition hover:bg-red-500/10"
            onClick={onRemove}
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <FieldPair>
        <Field label="Name *">
          <input
            className="input"
            placeholder="Dish name"
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <input
            className="input"
            placeholder="e.g. Main course"
            value={draft.category}
            onChange={(e) => onChange({ category: e.target.value })}
          />
        </Field>
      </FieldPair>

      <Field label="Description">
        <textarea
          className="input min-h-[72px] resize-y"
          placeholder="Short description"
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>

      <ImagePicker draft={draft} onChange={onChange} />

      <Field label="Availability">
        <label className="flex h-[38px] w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-500"
            checked={draft.available}
            onChange={(e) => onChange({ available: e.target.checked })}
          />
          Available
        </label>
      </Field>

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Nutrition (per serving)
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NutrientInput label="Calories" value={draft.calories} onChange={(v) => onChange({ calories: v })} />
          <NutrientInput label="Protein (g)" value={draft.protein} onChange={(v) => onChange({ protein: v })} />
          <NutrientInput label="Carbs (g)" value={draft.carbs} onChange={(v) => onChange({ carbs: v })} />
          <NutrientInput label="Fat (g)" value={draft.fat} onChange={(v) => onChange({ fat: v })} />
          <NutrientInput label="Fiber (g)" value={draft.fiber} onChange={(v) => onChange({ fiber: v })} />
          <NutrientInput label="Sugar (g)" value={draft.sugar} onChange={(v) => onChange({ sugar: v })} />
          <NutrientInput label="Sodium (mg)" value={draft.sodium} onChange={(v) => onChange({ sodium: v })} />
        </div>

        {draft.customFields.length > 0 ? (
          <div className="space-y-2">
            {draft.customFields.map((f) => (
              <div key={f.id} className="flex items-end gap-2">
                <Field label="Name" className="flex-1">
                  <input
                    className="input"
                    placeholder="Vitamin C"
                    value={f.name}
                    onChange={(e) => updateCustomField(f.id, { name: e.target.value })}
                  />
                </Field>
                <Field label="Value" className="w-24">
                  <input
                    className="input"
                    value={f.value}
                    onChange={(e) => updateCustomField(f.id, { value: e.target.value })}
                  />
                </Field>
                <Field label="Unit" className="w-24">
                  <input
                    className="input"
                    placeholder="mg"
                    value={f.unit}
                    onChange={(e) => updateCustomField(f.id, { unit: e.target.value })}
                  />
                </Field>
                <button
                  type="button"
                  className="mb-1 rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                  onClick={() => removeCustomField(f.id)}
                  aria-label="Remove field"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <button type="button" className="btn-ghost" onClick={addCustomField}>
          <Plus className="h-4 w-4" /> Add Custom Field
        </button>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Dietary Tags
        </h4>
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map((tag) => (
            <DietaryTagChip
              key={tag}
              tag={tag}
              active={draft.dietaryTags.includes(tag)}
              onClick={() => toggleTag(tag)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Allergen Warnings
        </h4>
        <div className="flex flex-wrap gap-2">
          {COMMON_ALLERGENS.map((a) => {
            const active = draft.allergens.includes(a);
            return (
              <button
                type="button"
                key={a}
                className={clsx('chip cursor-pointer', active && 'chip-active')}
                onClick={() => toggleAllergen(a)}
              >
                {a}
              </button>
            );
          })}
        </div>
        {draft.allergens.filter((a) => !COMMON_ALLERGENS.includes(a as typeof COMMON_ALLERGENS[number])).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {draft.allergens
              .filter((a) => !COMMON_ALLERGENS.includes(a as typeof COMMON_ALLERGENS[number]))
              .map((a) => (
                <button
                  key={a}
                  type="button"
                  className="chip chip-active cursor-pointer"
                  onClick={() => toggleAllergen(a)}
                >
                  {a} ×
                </button>
              ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="Custom allergen"
            value={draft.customAllergen}
            onChange={(e) => onChange({ customAllergen: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomAllergen();
              }
            }}
          />
          <button type="button" className="btn-secondary" onClick={addCustomAllergen}>
            Add
          </button>
        </div>
      </section>
    </div>
  );
}

// ---------------- Field helpers ----------------

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-1', className)}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldPair({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

// ---------------- Image picker ----------------

function ImagePicker({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    onChange({ uploadingImage: true });
    try {
      const uploaded: MenuImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const res = await uploadFile(file);
        uploaded.push({
          key: res.key,
          url: res.url,
          thumbnail: res.thumbnail ?? res.url,
          contentType: res.contentType ?? file.type,
          fileSize: res.fileSize ?? String(file.size),
        });
      }
      if (uploaded.length > 0) {
        onChange({ images: [...draft.images, ...uploaded] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      onChange({ uploadingImage: false });
    }
  }

  function removeAt(index: number) {
    onChange({ images: draft.images.filter((_, i) => i !== index) });
  }

  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Photos
      </h4>
      <div className="flex flex-wrap gap-2">
        {draft.images.map((img, i) => (
          <div
            key={img.key ?? img.url ?? i}
            className="group relative h-20 w-20 overflow-hidden rounded-xl border border-white/10"
          >
            <img
              src={resolveAssetUrl(img.thumbnail || img.url)}
              alt={`menu image ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-500/90"
              onClick={() => removeAt(i)}
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 text-slate-400 transition hover:border-brand-400 hover:bg-brand-500/5 hover:text-brand-300 disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={draft.uploadingImage}
        >
          {draft.uploadingImage ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px]">Add</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </section>
  );
}

function NutrientInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="decimal"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
