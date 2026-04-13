// MenuListView — search, filter, and grid of menu items for the active unit.
//
// Caterers:  CRUD controls (New / Edit / Delete)
// Members:   "Add to Order" button on each card → builds a cart → OrderCart
//            bottom sheet to review + submit

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Loader2, Pencil, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import type { DietaryTag, MenuItem, ModuleId } from '@/shared/types';
import { DIETARY_TAGS, DIETARY_TAG_LABELS } from '@/shared/types';
import { humanizeLabel } from '@/shared/utils/date';
import { useModuleStore, useModuleState } from '../stores/moduleStore';
import { MenuItemForm } from './MenuItemForm';
import { MenuItemDetailSheet } from './MenuItemDetailSheet';
import { OrderCart } from './OrderCart';
import { selectIsAdmin, useAuthStore } from '@/shared/stores/authStore';

interface MenuListViewProps {
  moduleId: ModuleId;
}

export function MenuListView({ moduleId }: MenuListViewProps) {
  const { menuItems, loadingMenu, activeUnitId, units } = useModuleState(moduleId);
  const deleteMenuItem = useModuleStore((s) => s.deleteMenuItem);
  const isAdmin = useAuthStore(selectIsAdmin);

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<DietaryTag | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);

  // Cart state — for members to build an order
  const [cart, setCart] = useState<Map<string, { item: MenuItem; qty: number }>>(new Map());

  const activeUnit = units.find((u) => u._id === activeUnitId);
  const unitLabel = humanizeLabel(activeUnit?.unitName) || 'this unit';

  const filtered = useMemo(() => {
    const lowerQuery = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (lowerQuery && !item.name.toLowerCase().includes(lowerQuery)) {
        const matchesDesc = (item.description || '').toLowerCase().includes(lowerQuery);
        if (!matchesDesc) return false;
      }
      if (tagFilter && !item.dietaryTags?.includes(tagFilter)) return false;
      return true;
    });
  }, [menuItems, search, tagFilter]);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item._id);
      if (existing) {
        next.set(item._id, { ...existing, qty: existing.qty + 1 });
      } else {
        next.set(item._id, { item, qty: 1 });
      }
      return next;
    });
  }

  function updateCartQty(menuItemId: string, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(menuItemId);
      else {
        const existing = next.get(menuItemId);
        if (existing) next.set(menuItemId, { ...existing, qty });
      }
      return next;
    });
  }

  function clearCart() {
    setCart(new Map());
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteMenuItem(moduleId, item._id);
    } catch (err) {
      console.error('deleteMenuItem failed', err);
    }
  }

  return (
    <div className="glass flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-3 border-b hr-soft px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Menu</h2>
            <p className="text-xs text-slate-400">
              {filtered.length} item{filtered.length === 1 ? '' : 's'} for {unitLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setEditingItem(null);
                  setFormOpen(true);
                }}
                disabled={!activeUnitId}
              >
                <Plus className="h-4 w-4" />
                New
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              className="input pl-9"
              placeholder="Search menu items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className={clsx('chip cursor-pointer', tagFilter === null && 'chip-active')}
            onClick={() => setTagFilter(null)}
          >
            All
          </button>
          {DIETARY_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={clsx('chip cursor-pointer', tagFilter === tag && 'chip-active')}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            >
              {DIETARY_TAG_LABELS[tag]}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loadingMenu && menuItems.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading menu…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-slate-400">
              {menuItems.length === 0
                ? 'No menu items yet for this unit.'
                : 'No items match your filters.'}
            </p>
            {isAdmin && menuItems.length === 0 && activeUnitId ? (
              <button
                type="button"
                className="btn-secondary mt-4"
                onClick={() => {
                  setEditingItem(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add the first item
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const cartEntry = cart.get(item._id);
              const inCart = !!cartEntry;
              return (
                <div
                  key={item._id}
                  className={clsx(
                    'glass-subtle group flex flex-col gap-2 p-4 transition',
                    'hover:border-brand-400/40 hover:shadow-lg hover:shadow-brand-500/10',
                    inCart && 'ring-2 ring-brand-400/60'
                  )}
                  onClick={() => setDetailItem(item)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-100">
                        {item.name}
                      </h3>
                      {item.category ? (
                        <p className="truncate text-xs text-slate-400">{item.category}</p>
                      ) : null}
                    </div>
                    {inCart ? (
                      <span className="flex-shrink-0 rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-300">
                        x{cartEntry.qty}
                      </span>
                    ) : null}
                  </div>

                  {item.description ? (
                    <p className="line-clamp-2 text-xs text-slate-400">{item.description}</p>
                  ) : null}

                  {item.dietaryTags && item.dietaryTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.dietaryTags.slice(0, 3).map((t) => (
                        <span key={t} className="chip">
                          {DIETARY_TAG_LABELS[t]}
                        </span>
                      ))}
                      {item.dietaryTags.length > 3 ? (
                        <span className="chip">+{item.dietaryTags.length - 3}</span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Action row */}
                  <div className="mt-auto flex items-center justify-between gap-1 pt-2">
                    {isAdmin ? (
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          className="btn-ghost h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn-ghost h-7 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        {inCart ? 'Add Another' : 'Add to Order'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Member order cart — sticky bottom bar */}
      {!isAdmin && activeUnitId ? (
        <div className="border-t hr-soft px-5 py-3">
          <OrderCart
            moduleId={moduleId}
            unitId={activeUnitId}
            cart={cart}
            onUpdateQty={updateCartQty}
            onClear={clearCart}
            onOrderPlaced={() => {
              // Cart is cleared by the callback; nothing else needed here
            }}
          />
        </div>
      ) : null}

      {formOpen ? (
        <MenuItemForm
          moduleId={moduleId}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          editingItem={editingItem}
        />
      ) : null}

      {detailItem ? (
        <MenuItemDetailSheet item={detailItem} onClose={() => setDetailItem(null)} />
      ) : null}
    </div>
  );
}
