// MenuListView — search, filter, and grid of menu items for the active unit.
// Supports a "select mode" for posting a multi-item poll to the unit's chat.

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Plus, Search, CheckSquare, Square, Send, Loader2, Trash2, Pencil } from 'lucide-react';
import type { DietaryTag, MenuItem, ModuleId } from '@/shared/types';
import { DIETARY_TAGS, DIETARY_TAG_LABELS } from '@/shared/types';
import { humanizeLabel } from '@/shared/utils/date';
import { resolveAssetUrl } from '@/shared/utils/assetUrl';
import { useModuleStore, useModuleState } from '../stores/moduleStore';
import { MenuItemForm } from './MenuItemForm';
import { MenuItemDetailSheet } from './MenuItemDetailSheet';
import { selectIsAdmin } from '@/shared/stores/authStore';
import { useAuthStore } from '@/shared/stores/authStore';

interface MenuListViewProps {
  moduleId: ModuleId;
}

export function MenuListView({ moduleId }: MenuListViewProps) {
  const { menuItems, loadingMenu, activeUnitId, units } = useModuleState(moduleId);
  const postMenuPoll = useModuleStore((s) => s.postMenuPoll);
  const deleteMenuItem = useModuleStore((s) => s.deleteMenuItem);
  const isAdmin = useAuthStore(selectIsAdmin);

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<DietaryTag | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [postingPoll, setPostingPoll] = useState(false);

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handlePostPoll() {
    if (selectedIds.size === 0 || !activeUnitId) return;
    const itemsToPost = menuItems.filter((m) => selectedIds.has(m._id));
    setPostingPoll(true);
    try {
      await postMenuPoll(moduleId, itemsToPost, activeUnitId, activeUnit?.unitName ?? 'menu');
      exitSelectMode();
    } catch (err) {
      console.error('postMenuPoll failed', err);
    } finally {
      setPostingPoll(false);
    }
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Delete “${item.name}”?`)) return;
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
              <>
                <button
                  type="button"
                  className={clsx('btn-ghost', selectMode && 'bg-white/10 text-slate-100')}
                  onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                  disabled={menuItems.length === 0}
                >
                  {selectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  {selectMode ? 'Cancel' : 'Select'}
                </button>
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
              </>
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
              const selected = selectedIds.has(item._id);
              const firstImage = item.images?.[0];
              return (
                <div
                  key={item._id}
                  className={clsx(
                    'glass-subtle group flex flex-col gap-2 overflow-hidden p-0 transition',
                    'hover:border-brand-400/40 hover:shadow-lg hover:shadow-brand-500/10',
                    selected && 'ring-2 ring-brand-400/60'
                  )}
                  onClick={() => {
                    if (selectMode) toggleSelect(item._id);
                    else setDetailItem(item);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {firstImage?.url || firstImage?.thumbnail ? (
                    <div className="relative h-32 w-full overflow-hidden bg-slate-900">
                      <img
                        src={resolveAssetUrl(firstImage.thumbnail || firstImage.url)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {selectMode ? (
                        <div className="absolute right-2 top-2">
                          {selected ? (
                            <CheckSquare className="h-5 w-5 text-brand-400 drop-shadow-md" />
                          ) : (
                            <Square className="h-5 w-5 text-white drop-shadow-md" />
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 px-4 pt-4 last:pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-100">{item.name}</h3>
                      {item.category ? (
                        <p className="truncate text-xs text-slate-400">{item.category}</p>
                      ) : null}
                    </div>
                    {selectMode && !firstImage ? (
                      selected ? (
                        <CheckSquare className="h-5 w-5 flex-shrink-0 text-brand-400" />
                      ) : (
                        <Square className="h-5 w-5 flex-shrink-0 text-slate-500" />
                      )
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

                  {isAdmin && !selectMode ? (
                    <div className="mt-auto flex items-center gap-1 pb-4 pt-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        className="btn-ghost h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-ghost h-7 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  ) : (
                    <div className="pb-4" />
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectMode ? (
        <footer className="flex items-center justify-between border-t hr-soft px-5 py-3">
          <span className="text-xs text-slate-400">
            {selectedIds.size} selected • will post a poll to {unitLabel}
          </span>
          <button
            type="button"
            className="btn-primary"
            disabled={selectedIds.size === 0 || postingPoll}
            onClick={handlePostPoll}
          >
            {postingPoll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Post {selectedIds.size} as Poll
          </button>
        </footer>
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
