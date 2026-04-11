// MenuItemDetailSheet — rich read-only detail view for a menu item.

import clsx from 'clsx';
import type { MenuItem } from '@/shared/types';
import { DIETARY_TAG_LABELS } from '@/shared/types';
import { Modal } from '@/shared/components/Modal';
import { resolveAssetUrl } from '@/shared/utils/assetUrl';

interface MenuItemDetailSheetProps {
  item: MenuItem;
  onClose: () => void;
}

export function MenuItemDetailSheet({ item, onClose }: MenuItemDetailSheetProps) {
  const n = item.nutrition ?? {};
  const images = item.images ?? [];

  return (
    <Modal open onClose={onClose} title={item.name} widthClass="max-w-xl">
      <div className="space-y-5">
        {images.length > 0 ? (
          <div
            className={
              images.length === 1
                ? ''
                : 'grid grid-cols-2 gap-2 sm:grid-cols-3'
            }
          >
            {images.map((img, i) => (
              <a
                key={img.key ?? img.url ?? i}
                href={resolveAssetUrl(img.url || img.thumbnail)}
                target="_blank"
                rel="noreferrer noopener"
                className="block overflow-hidden rounded-xl border border-white/10"
              >
                <img
                  src={resolveAssetUrl(img.thumbnail || img.url)}
                  alt={`${item.name} ${i + 1}`}
                  className={clsx(
                    'w-full object-cover',
                    images.length === 1 ? 'max-h-64' : 'h-28'
                  )}
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        ) : null}

        {item.category ? (
          <p className="text-xs uppercase tracking-wider text-brand-400">{item.category}</p>
        ) : null}

        {item.description ? (
          <p className="whitespace-pre-line text-sm text-slate-300">{item.description}</p>
        ) : null}

        {item.dietaryTags && item.dietaryTags.length > 0 ? (
          <Section label="Dietary Tags">
            <div className="flex flex-wrap gap-2">
              {item.dietaryTags.map((t) => (
                <span key={t} className="chip chip-active">
                  {DIETARY_TAG_LABELS[t]}
                </span>
              ))}
            </div>
          </Section>
        ) : null}

        {item.allergenWarnings && item.allergenWarnings.length > 0 ? (
          <Section label="Allergen Warnings">
            <div className="flex flex-wrap gap-2">
              {item.allergenWarnings.map((a) => (
                <span key={a} className="chip border-red-500/30 bg-red-500/10 text-red-300">
                  ⚠ {a}
                </span>
              ))}
            </div>
          </Section>
        ) : null}

        {(n.calories !== undefined ||
          n.protein !== undefined ||
          n.carbs !== undefined ||
          n.fat !== undefined ||
          n.fiber !== undefined ||
          n.sugar !== undefined ||
          n.sodium !== undefined ||
          (n.customFields && n.customFields.length > 0)) ? (
          <Section label="Nutrition">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {n.calories !== undefined ? <NutrientPill label="Calories" value={`${n.calories}`} /> : null}
              {n.protein !== undefined ? <NutrientPill label="Protein" value={`${n.protein} g`} /> : null}
              {n.carbs !== undefined ? <NutrientPill label="Carbs" value={`${n.carbs} g`} /> : null}
              {n.fat !== undefined ? <NutrientPill label="Fat" value={`${n.fat} g`} /> : null}
              {n.fiber !== undefined ? <NutrientPill label="Fiber" value={`${n.fiber} g`} /> : null}
              {n.sugar !== undefined ? <NutrientPill label="Sugar" value={`${n.sugar} g`} /> : null}
              {n.sodium !== undefined ? <NutrientPill label="Sodium" value={`${n.sodium} mg`} /> : null}
              {n.customFields?.map((f) => (
                <NutrientPill key={f.id} label={f.name} value={`${f.value}${f.unit ? ' ' + f.unit : ''}`} />
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</h4>
      {children}
    </section>
  );
}

function NutrientPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-subtle px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
