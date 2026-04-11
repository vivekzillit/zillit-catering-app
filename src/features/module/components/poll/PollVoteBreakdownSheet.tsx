// PollVoteBreakdownSheet — aggregated tallies for a poll: totals per item +
// per-voter breakdown. Admin-facing view reached from MenuPollCard.

import { useMemo } from 'react';
import type { MenuPollPayload, ModuleId, PollVotePayload } from '@/shared/types';
import { formatShortTime } from '@/shared/utils/date';
import { Modal } from '@/shared/components/Modal';
import { useModuleStore } from '../../stores/moduleStore';

interface PollVoteBreakdownSheetProps {
  moduleId: ModuleId;
  payload: MenuPollPayload;
  votes: PollVotePayload[];
  onClose: () => void;
}

export function PollVoteBreakdownSheet({
  moduleId,
  payload,
  votes,
  onClose,
}: PollVoteBreakdownSheetProps) {
  const findMenuItem = useModuleStore((s) => s.findMenuItem);

  // Count how many orders include each item (quantities no longer matter —
  // production-count isn't tracked; we just need to know who wants what).
  const itemOrderCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of payload.items) counts[item.menuItemId] = 0;
    for (const order of votes) {
      for (const id of Object.keys(order.selections)) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
    return counts;
  }, [payload.items, votes]);

  const totalOrders = votes.length;

  return (
    <Modal open onClose={onClose} title={`${payload.title} — Breakdown`} widthClass="max-w-xl">
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Per Item ({payload.items.length} total)
          </h3>
          <ul className="space-y-1">
            {payload.items.map((item) => {
              const menuItem = findMenuItem(moduleId, item.menuItemId);
              const name = menuItem?.name ?? item.name;
              const count = itemOrderCount[item.menuItemId] ?? 0;
              return (
                <li
                  key={item.menuItemId}
                  className="glass-subtle flex items-center justify-between px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name}</p>
                    {item.category ? (
                      <p className="truncate text-[10px] text-slate-500">{item.category}</p>
                    ) : null}
                  </div>
                  <span className="text-xs font-semibold text-brand-300">
                    {count} order{count === 1 ? '' : 's'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Per Order ({totalOrders})
          </h3>
          {votes.length === 0 ? (
            <p className="text-sm text-slate-400">No orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {votes.map((v) => {
                const ids = Object.keys(v.selections);
                return (
                  <li key={`${v.voterUserId}-${v.votedAt}`} className="glass-subtle p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-100">{v.voterName}</span>
                      <span className="text-[10px] text-slate-500">
                        {formatShortTime(v.votedAt)} • {ids.length} item{ids.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <ul className="space-y-0.5 pl-1 text-xs">
                      {ids.map((id) => {
                        const menuItem = findMenuItem(moduleId, id);
                        const fallback = payload.items.find((i) => i.menuItemId === id);
                        const name = menuItem?.name ?? fallback?.name ?? 'Item';
                        return (
                          <li key={id} className="flex items-center gap-2 text-slate-300">
                            <span className="h-1 w-1 flex-shrink-0 rounded-full bg-brand-400" />
                            <span className="truncate">{name}</span>
                          </li>
                        );
                      })}
                    </ul>
                    {v.notes ? (
                      <p className="mt-2 rounded-lg bg-white/5 px-2 py-1 text-[11px] italic text-slate-300">
                        “{v.notes}”
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
