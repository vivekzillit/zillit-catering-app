// UnitTabs — horizontal pill row that switches the active unit within a module.

import clsx from 'clsx';
import type { ModuleId } from '@/shared/types';
import { humanizeLabel } from '@/shared/utils/date';
import { useModuleStore, useModuleState } from '../stores/moduleStore';

interface UnitTabsProps {
  moduleId: ModuleId;
}

export function UnitTabs({ moduleId }: UnitTabsProps) {
  const { units, activeUnitId, loadingUnits } = useModuleState(moduleId);
  const setActiveUnit = useModuleStore((s) => s.setActiveUnit);

  if (loadingUnits && units.length === 0) {
    return (
      <div className="glass flex items-center gap-3 px-4 py-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
        <span className="text-sm text-slate-400">Loading units…</span>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="glass px-4 py-3 text-sm text-slate-400">
        No units configured for this module yet.
      </div>
    );
  }

  return (
    <div className="glass flex items-center gap-2 overflow-x-auto px-3 py-2">
      {units.map((unit) => {
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
      })}
    </div>
  );
}
