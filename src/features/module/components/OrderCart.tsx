// OrderCart — bottom sheet for users to review selected items, add notes,
// and submit their order. Visible as a sticky bar when items are selected,
// expands into a full modal on tap.

import { useState } from 'react';
import { Loader2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { MenuItem, ModuleId, OrderItem } from '@/shared/types';
import { Modal } from '@/shared/components/Modal';
import * as ordersApi from '../api/orders';

interface OrderCartProps {
  moduleId: ModuleId;
  unitId: string;
  cart: Map<string, { item: MenuItem; qty: number }>;
  onUpdateQty: (menuItemId: string, qty: number) => void;
  onClear: () => void;
  onOrderPlaced: () => void;
}

export function OrderCart({
  moduleId,
  unitId,
  cart,
  onUpdateQty,
  onClear,
  onOrderPlaced,
}: OrderCartProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalItems = Array.from(cart.values()).reduce((sum, e) => sum + e.qty, 0);
  if (totalItems === 0) return null;

  async function handleSubmit() {
    if (submitting || totalItems === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const items: OrderItem[] = Array.from(cart.values()).map((e) => ({
        menuItemId: e.item._id,
        name: e.item.name,
        category: e.item.category ?? '',
      }));
      await ordersApi.placeOrder(moduleId, {
        unitId,
        items,
        notes: notes.trim() || undefined,
      });
      setNotes('');
      onClear();
      onOrderPlaced();
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Sticky bottom bar */}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-between rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
      >
        <span className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          {totalItems} item{totalItems === 1 ? '' : 's'} selected
        </span>
        <span>Review Order</span>
      </button>

      {/* Expanded cart modal */}
      <Modal
        open={expanded}
        onClose={() => setExpanded(false)}
        title="Your Order"
        widthClass="max-w-md"
        footer={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                onClear();
                setExpanded(false);
              }}
              disabled={submitting}
            >
              <Trash2 className="h-4 w-4" /> Clear
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting || totalItems === 0}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Place Order ({totalItems})
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {Array.from(cart.entries()).map(([id, { item, qty }]) => (
            <div
              key={id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">{item.name}</p>
                {item.category ? (
                  <p className="truncate text-[10px] text-slate-500">{item.category}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-xs hover:bg-white/10"
                  onClick={() => onUpdateQty(id, qty - 1)}
                >
                  {qty === 1 ? <X className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                </button>
                <span className="w-5 text-center text-xs font-semibold">{qty}</span>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-xs hover:bg-white/10"
                  onClick={() => onUpdateQty(id, qty + 1)}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Notes (optional)
            </label>
            <textarea
              className="input min-h-[56px] resize-none text-xs"
              placeholder="Any dietary requirements, allergies, or special requests…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
