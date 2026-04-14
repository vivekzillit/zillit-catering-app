// EditUnitModal — caterers can edit a unit's name, times, location, or
// delete it entirely (soft-delete via enabled=false).

import { FormEvent, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import type { ModuleId, Unit } from '@/shared/types';
import { Modal } from '@/shared/components/Modal';
import { api } from '@/shared/api/client';
import { useModuleStore } from '../stores/moduleStore';

interface EditUnitModalProps {
  moduleId: ModuleId;
  unit: Unit;
  open: boolean;
  onClose: () => void;
}

export function EditUnitModal({ moduleId, unit, open, onClose }: EditUnitModalProps) {
  const loadUnits = useModuleStore((s) => s.loadUnits);
  const deleteUnit = useModuleStore((s) => s.deleteUnit);
  const [name, setName] = useState(unit.unitName);
  const [startTime, setStartTime] = useState(unit.startTime ?? '');
  const [endTime, setEndTime] = useState(unit.endTime ?? '');
  const [location, setLocation] = useState(unit.servingLocation ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/${moduleId}/unit/${unit._id}`, {
        unit_name: name.trim(),
        start_time: startTime.trim(),
        end_time: endTime.trim(),
        serving_location: location.trim(),
      });
      await loadUnits(moduleId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update unit');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? All menu items and orders for this unit will become inaccessible.`)) return;
    setSubmitting(true);
    try {
      await deleteUnit(moduleId, unit._id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete unit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Unit"
      widthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            className="btn-ghost text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={handleDelete}
            disabled={submitting}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <div className="flex-1" />
          <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="edit-unit-form"
            className="btn-primary"
            disabled={submitting || name.trim() === ''}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </button>
        </>
      }
    >
      <form id="edit-unit-form" onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Unit Name
          </label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Start Time
            </label>
            <input
              className="input"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              End Time
            </label>
            <input
              className="input"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Serving Location
          </label>
          <input
            className="input"
            placeholder="e.g. Car/Catering Base, On Set"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
