// UnitTabs — horizontal pill row that switches the active unit within a
// module. Caterers see a "+" button at the end to create new units.

import { useState } from 'react';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import type { ModuleId } from '@/shared/types';
import { humanizeLabel } from '@/shared/utils/date';
import { useModuleStore, useModuleState } from '../stores/moduleStore';
import { useAuthStore, selectIsAdmin } from '@/shared/stores/authStore';
import { CreateUnitModal } from './CreateUnitModal';

interface UnitTabsProps {
  moduleId: ModuleId;
}

export function UnitTabs({ moduleId }: UnitTabsProps) {
  const { units, activeUnitId, loadingUnits } = useModuleState(moduleId);
  const setActiveUnit = useModuleStore((s) => s.setActiveUnit);
  const isAdmin = useAuthStore(selectIsAdmin);
  const [createOpen, setCreateOpen] = useState(false);

  if (loadingUnits && units.length === 0) {
    return (
      <div className="glass flex items-center gap-3 px-4 py-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
        <span className="text-sm text-slate-400">Loading units…</span>
      </div>
    );
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
          return (
            <button
              key={unit._id}
              type="button"
              onClick={() => setActiveUnit(moduleId, unit._id)}
              className={clsx(
                'whitespace-nowrap rounded-xl px-4 py-1.5 text-sm font-semibold transition',
                active
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
              )}
            >
              {label}
            </button>
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
    </div>
  );
}
