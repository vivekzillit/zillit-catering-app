// UnitTabs — horizontal pill row that switches the active unit within a
// module. Caterers see edit/delete on hover + a "+" button at the end.

import { useState } from 'react';
import clsx from 'clsx';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ModuleId, Unit } from '@/shared/types';
import { humanizeLabel } from '@/shared/utils/date';
import { useModuleStore, useModuleState } from '../stores/moduleStore';
import { useAuthStore, selectIsAdmin } from '@/shared/stores/authStore';
import { CreateUnitModal } from './CreateUnitModal';
import { EditUnitModal } from './EditUnitModal';

interface UnitTabsProps {
  moduleId: ModuleId;
}

export function UnitTabs({ moduleId }: UnitTabsProps) {
  const { units, activeUnitId, loadingUnits } = useModuleState(moduleId);
  const setActiveUnit = useModuleStore((s) => s.setActiveUnit);
  const deleteUnit = useModuleStore((s) => s.deleteUnit);
  const isAdmin = useAuthStore(selectIsAdmin);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  if (loadingUnits && units.length === 0) {
    return (
      <div className="glass flex items-center gap-3 px-4 py-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
        <span className="text-sm text-slate-400">Loading units…</span>
      </div>
    );
  }

  async function handleDelete(e: React.MouseEvent, unit: Unit) {
    e.stopPropagation();
    if (!confirm(`Delete "${humanizeLabel(unit.unitName) || unit.unitName}"?`)) return;
    try {
      await deleteUnit(moduleId, unit._id);
    } catch (err) {
      console.error('deleteUnit failed', err);
    }
  }

  return (
    <div className="glass flex items-center gap-2 overflow-x-auto px-3 py-2">
      {units.length === 0 ? (
        <span className="px-2 text-sm text-slate-400">
          No units yet.{isAdmin ? ' Tap + to create one.' : ''}
        </span>
      ) : (
        units.map((unit) => {
          const label = humanizeLabel(unit.unitName) || unit.unitName;
          const active = unit._id === activeUnitId;
          const hasTime = unit.startTime || unit.endTime;
          const timeStr = hasTime
            ? `${unit.startTime || '?'}${unit.endTime ? ` – ${unit.endTime}` : ''}`
            : null;
          return (
            <div key={unit._id} className="group relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveUnit(moduleId, unit._id)}
                className={clsx(
                  'flex flex-col items-center whitespace-nowrap rounded-xl px-4 py-1.5 transition',
                  active
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                    : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                )}
              >
                <span className="text-sm font-semibold">{label}</span>
                {timeStr ? (
                  <span className={clsx(
                    'text-[10px]',
                    active ? 'text-white/70' : 'text-slate-500'
                  )}>
                    {timeStr}
                  </span>
                ) : null}
              </button>

              {/* Edit + Delete icons — visible on hover for caterers */}
              {isAdmin ? (
                <div className="absolute -right-1 -top-1 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingUnit(unit); }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-300 shadow hover:bg-brand-500 hover:text-white"
                    title="Edit unit"
                    aria-label="Edit unit"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, unit)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-red-400 shadow hover:bg-red-500 hover:text-white"
                    title="Delete unit"
                    aria-label="Delete unit"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ) : null}
            </div>
          );
        })
      )}

      {isAdmin ? (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-brand-400/40 text-brand-400 transition hover:border-brand-400 hover:bg-brand-500/10 hover:text-brand-300"
          title="Add unit"
          aria-label="Add unit"
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : null}

      {createOpen ? (
        <CreateUnitModal
          moduleId={moduleId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}

      {editingUnit ? (
        <EditUnitModal
          moduleId={moduleId}
          unit={editingUnit}
          open={!!editingUnit}
          onClose={() => setEditingUnit(null)}
        />
      ) : null}
    </div>
  );
}
