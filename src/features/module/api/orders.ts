// Order API — place, list, update status, get summaries + stats.

import { api } from '@/shared/api/client';
import { toCamelCase } from '@/shared/wire';
import type {
  ModuleId,
  Order,
  PlaceOrderRequest,
  OrderSummary,
  OrderStats,
  OrderStatus,
} from '@/shared/types';

interface Envelope<T> {
  status: number;
  message: string;
  data: T;
}

function cc<T>(raw: unknown): T {
  return toCamelCase(raw as never) as unknown as T;
}

export async function placeOrder(
  moduleId: ModuleId,
  req: PlaceOrderRequest
): Promise<Order> {
  const { data } = await api.post<Envelope<unknown>>(`/${moduleId}/order`, {
    unit_id: req.unitId,
    items: req.items.map((i) => ({
      menu_item_id: i.menuItemId,
      name: i.name,
      category: i.category ?? '',
    })),
    notes: req.notes ?? '',
  });
  return cc<Order>(data.data);
}

export async function fetchOrders(
  moduleId: ModuleId,
  unitId?: string,
  status?: OrderStatus
): Promise<Order[]> {
  const params = new URLSearchParams();
  if (unitId) params.set('unit_id', unitId);
  if (status) params.set('status', status);
  const { data } = await api.get<Envelope<unknown>>(
    `/${moduleId}/order?${params.toString()}`
  );
  return cc<Order[]>(data.data) ?? [];
}

export async function fetchMyOrders(moduleId: ModuleId): Promise<Order[]> {
  const { data } = await api.get<Envelope<unknown>>(`/${moduleId}/order/my`);
  return cc<Order[]>(data.data) ?? [];
}

export async function updateOrderStatus(
  moduleId: ModuleId,
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  const { data } = await api.put<Envelope<unknown>>(
    `/${moduleId}/order/${orderId}/status`,
    { status }
  );
  return cc<Order>(data.data);
}

export async function fetchOrderSummary(
  moduleId: ModuleId,
  unitId: string
): Promise<OrderSummary> {
  const { data } = await api.get<Envelope<unknown>>(
    `/${moduleId}/order/summary/${unitId}`
  );
  return cc<OrderSummary>(data.data);
}

export async function fetchOrderStats(
  moduleId: ModuleId,
  unitId: string
): Promise<OrderStats> {
  const { data } = await api.get<Envelope<unknown>>(
    `/${moduleId}/order/stats/${unitId}`
  );
  return cc<OrderStats>(data.data);
}
