// OrderDashboard — caterer-facing order management with three tabs:
//   Per Item  — each menu item + count of orders + who ordered it
//   Per Person — each person's order + status + action buttons
//   Stats     — total received / served / remaining / last served time

import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  Check,
  ChefHat,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  Truck,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type { ModuleId, OrderStatus, OrderSummary, OrderStats } from '@/shared/types';
import * as ordersApi from '../api/orders';
import { useModuleState } from '../stores/moduleStore';
import { formatShortTime, humanizeLabel } from '@/shared/utils/date';

type Tab = 'items' | 'orders' | 'stats';

const STATUS_FLOW: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'served'];
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  cancelled: 'Cancelled',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  accepted: <Check className="h-3.5 w-3.5" />,
  preparing: <ChefHat className="h-3.5 w-3.5" />,
  ready: <Package className="h-3.5 w-3.5" />,
  served: <Truck className="h-3.5 w-3.5" />,
  cancelled: <X className="h-3.5 w-3.5" />,
};

interface OrderDashboardProps {
  moduleId: ModuleId;
}

export function OrderDashboard({ moduleId }: OrderDashboardProps) {
  const { activeUnitId, units } = useModuleState(moduleId);
  const [tab, setTab] = useState<Tab>('orders');
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const unitLabel = humanizeLabel(units.find((u) => u._id === activeUnitId)?.unitName);

  const loadData = useCallback(async () => {
    if (!activeUnitId) return;
    setLoading(true);
    try {
      const [s, st] = await Promise.all([
        ordersApi.fetchOrderSummary(moduleId, activeUnitId),
        ordersApi.fetchOrderStats(moduleId, activeUnitId),
      ]);
      setSummary(s);
      setStats(st);
    } catch (err) {
      console.error('loadOrderData failed', err);
    } finally {
      setLoading(false);
    }
  }, [moduleId, activeUnitId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const id = setInterval(loadData, 15_000);
    return () => clearInterval(id);
  }, [loadData]);

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    setUpdatingId(orderId);
    try {
      await ordersApi.updateOrderStatus(moduleId, orderId, newStatus);
      await loadData();
    } catch (err) {
      console.error('updateOrderStatus failed', err);
    } finally {
      setUpdatingId(null);
    }
  }

  function nextStatus(current: OrderStatus): OrderStatus | null {
    const idx = STATUS_FLOW.indexOf(current);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  }

  return (
    <div className="glass flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b hr-soft px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Orders</h2>
          <p className="text-xs text-slate-400">
            {unitLabel} — today
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={loadData}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </header>

      {/* Always-visible stats summary bar */}
      {stats ? (
        <div className="flex items-center justify-around border-b hr-soft px-5 py-2">
          <MiniStat label="Received" value={stats.totalReceived} color="text-blue-300" />
          <MiniStat label="Served" value={stats.totalServed} color="text-green-300" />
          <MiniStat label="Remaining" value={stats.remaining} color={stats.remaining > 0 ? 'text-yellow-300' : 'text-slate-400'} />
          {stats.lastServedAt > 0 ? (
            <div className="text-center">
              <p className="text-xs font-bold text-slate-100">{formatShortTime(stats.lastServedAt)}</p>
              <p className="text-[9px] uppercase tracking-wider text-slate-500">Last Served</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b hr-soft px-5 py-2">
        {(['orders', 'items', 'stats'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={clsx(
              'rounded-lg px-3 py-1 text-xs font-semibold transition',
              tab === t
                ? 'bg-brand-500/20 text-brand-300'
                : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
            )}
            onClick={() => setTab(t)}
          >
            {t === 'orders' ? 'Per Person' : t === 'items' ? 'Per Item' : 'Stats'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && !summary ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading orders…
          </div>
        ) : tab === 'orders' ? (
          <PerPersonTab
            summary={summary}
            updatingId={updatingId}
            onStatusChange={handleStatusChange}
            nextStatus={nextStatus}
          />
        ) : tab === 'items' ? (
          <PerItemTab summary={summary} />
        ) : (
          <StatsTab stats={stats} />
        )}
      </div>
    </div>
  );
}

// ────────── Per Person Tab ──────────

function PerPersonTab({
  summary,
  updatingId,
  onStatusChange,
  nextStatus,
}: {
  summary: OrderSummary | null;
  updatingId: string | null;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  nextStatus: (current: OrderStatus) => OrderStatus | null;
}) {
  const orders = summary?.perPerson ?? [];
  if (orders.length === 0)
    return <Empty text="No orders yet for this unit today." />;

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const next = nextStatus(o.status);
        const isUpdating = updatingId === o._id;
        return (
          <div
            key={o._id}
            className={clsx(
              'glass-subtle space-y-2 p-4',
              o.priority === 'vip' && 'border-brand-400/40 bg-brand-500/5'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">{o.userName}</span>
                  {o.priority === 'vip' ? (
                    <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-300">
                      VIP
                    </span>
                  ) : null}
                </div>
                <p className="text-[10px] text-slate-500">
                  {o.userDepartment || o.userRole} — {o.created ? formatShortTime(o.created) : ''}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <ul className="space-y-0.5 pl-1">
              {o.items.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="h-1 w-1 flex-shrink-0 rounded-full bg-brand-400" />
                  <span className="truncate">{item.name}</span>
                </li>
              ))}
            </ul>
            {o.notes ? (
              <p className="rounded-lg bg-white/5 px-2 py-1 text-[11px] italic text-slate-300">
                {o.notes}
              </p>
            ) : null}
            {next ? (
              <div className="flex items-center justify-end gap-2">
                {o.status !== 'cancelled' ? (
                  <button
                    type="button"
                    className="btn-ghost h-7 px-2 text-xs text-red-400 hover:bg-red-500/10"
                    onClick={() => onStatusChange(o._id, 'cancelled')}
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-primary h-7 px-3 text-xs"
                  onClick={() => onStatusChange(o._id, next)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    STATUS_ICON[next]
                  )}
                  {STATUS_LABEL[next]}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ────────── Per Item Tab ──────────

function PerItemTab({ summary }: { summary: OrderSummary | null }) {
  const items = summary?.perItem ?? [];
  if (items.length === 0)
    return <Empty text="No items ordered yet." />;

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="glass-subtle px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">{item.name}</p>
              {item.category ? (
                <p className="truncate text-[10px] text-slate-500">{item.category}</p>
              ) : null}
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold text-brand-300">
              <Users className="h-3.5 w-3.5" />
              {item.count}
            </span>
          </div>
          {item.users.length > 0 ? (
            <p className="mt-1 text-[10px] text-slate-400">
              {item.users.join(', ')}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ────────── Stats Tab ──────────

function StatsTab({ stats }: { stats: OrderStats | null }) {
  if (!stats) return <Empty text="No stats available yet." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Received" value={stats.totalReceived} icon={<UtensilsCrossed className="h-5 w-5" />} />
        <StatCard label="Served" value={stats.totalServed} accent />
        <StatCard label="Remaining" value={stats.remaining} warn={stats.remaining > 0} />
      </div>
      {stats.lastServedAt > 0 ? (
        <div className="glass-subtle px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Last person served</p>
          <p className="text-sm font-semibold text-slate-100">
            {stats.lastServedUserName} — {formatShortTime(stats.lastServedAt)}
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-400">No orders served yet today.</p>
      )}
    </div>
  );
}

// ────────── Helpers ──────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const colors: Record<OrderStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    accepted: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    preparing: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    ready: 'bg-green-500/20 text-green-300 border-green-500/30',
    served: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        colors[status]
      )}
    >
      {STATUS_ICON[status]}
      {STATUS_LABEL[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  warn,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={clsx(
        'glass-subtle flex flex-col items-center justify-center gap-1 px-3 py-4',
        accent && 'border-green-500/30 bg-green-500/5',
        warn && 'border-yellow-500/30 bg-yellow-500/5'
      )}
    >
      {icon ?? null}
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={clsx('text-lg font-bold', color)}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      {text}
    </div>
  );
}
