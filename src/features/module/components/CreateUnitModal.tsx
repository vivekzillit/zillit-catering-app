// CreateUnitModal — small glass modal for caterers to add a new meal unit
// (e.g. "Snacks", "Late Night") to either Catering or Craft Service.

import { FormEvent, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ModuleId } from '@/shared/types';
import { Modal } from '@/shared/components/Modal';
import { useModuleStore } from '../stores/moduleStore';

interface CreateUnitModalProps {
  moduleId: ModuleId;
  open: boolean;
  onClose: () => void;
}

export function CreateUnitModal({ moduleId, open, onClose }: CreateUnitModalProps) {
  const createUnit = useModuleStore((s) => s.createUnit);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createUnit(moduleId, trimmed);
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create unit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Unit"
      widthClass="max-w-sm"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="create-unit-form"
            className="btn-primary"
            disabled={submitting || name.trim() === ''}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create
          </button>
        </>
      }
    >
      <form id="create-unit-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Unit Name
          </label>
          <input
            className="input"
            placeholder="e.g. Snacks, Late Night, Second Meal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <p className="mt-1 text-[10px] text-slate-500">
            This creates a new meal slot for {moduleId === 'catering' ? 'Catering' : 'Craft Service'}.
          </p>
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
