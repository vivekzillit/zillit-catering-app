// MyOrdersPanel — member-facing view of their own orders for today,
// with live status badges updated via socket events.

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
  X,
} from 'lucide-react';
import type { ModuleId, Order, OrderStatus } from '@/shared/types';
import * as ordersApi from '../api/orders';
import { formatShortTime } from '@/shared/utils/date';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready for pickup!',
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

interface MyOrdersPanelProps {
  moduleId: ModuleId;
}

export function MyOrdersPanel({ moduleId }: MyOrdersPanelProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersApi.fetchMyOrders(moduleId);
      setOrders(data);
    } catch (err) {
      console.error('fetchMyOrders failed', err);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Auto-refresh every 10 seconds for status updates
  useEffect(() => {
    const id = setInterval(loadOrders, 10_000);
    return () => clearInterval(id);
  }, [loadOrders]);

  return (
    <div className="glass flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b hr-soft px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">My Orders</h2>
          <p className="text-xs text-slate-400">Today</p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={loadOrders}
          disabled={loading}
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && orders.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No orders yet today. Select items from the menu to place an order.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderStatusCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderStatusCard({ order }: { order: Order }) {
  const colors: Record<OrderStatus, string> = {
    pending: 'border-yellow-500/30 bg-yellow-500/5',
    accepted: 'border-blue-500/30 bg-blue-500/5',
    preparing: 'border-purple-500/30 bg-purple-500/5',
    ready: 'border-green-500/30 bg-green-500/5 ring-1 ring-green-400/30',
    served: 'border-slate-500/30 bg-slate-500/5',
    cancelled: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <div className={clsx('glass-subtle space-y-2 border p-4', colors[order.status])}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-500">
          {order.created ? formatShortTime(order.created) : ''}
        </span>
        <span
          className={clsx(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            order.status === 'ready'
              ? 'bg-green-500/20 text-green-300'
              : 'bg-white/10 text-slate-300'
          )}
        >
          {STATUS_ICON[order.status]}
          {STATUS_LABEL[order.status]}
        </span>
      </div>
      <ul className="space-y-0.5">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-slate-200">
            <span className="h-1 w-1 flex-shrink-0 rounded-full bg-brand-400" />
            <span className="truncate">{item.name}</span>
          </li>
        ))}
      </ul>
      {order.notes ? (
        <p className="rounded-lg bg-white/5 px-2 py-1 text-[11px] italic text-slate-300">
          {order.notes}
        </p>
      ) : null}
    </div>
  );
}
