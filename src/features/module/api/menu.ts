import { api } from '@/shared/api/client';
import { toCamelCase, stringifyForWire } from '@/shared/wire';
import type {
  ModuleId,
  MenuItem,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
} from '@/shared/types';

interface Envelope<T> {
  status: number;
  message: string;
  data: T;
}

function cc<T>(raw: unknown): T {
  return toCamelCase(raw as never) as unknown as T;
}

const WIRE_HEADERS = { headers: { 'Content-Type': 'application/json' } };
const WIRE_TRANSFORM = {
  transformRequest: [(d: unknown) => d],
};

export async function fetchMenuList(
  moduleId: ModuleId,
  unitId: string
): Promise<MenuItem[]> {
  if (!unitId) return [];
  const { data } = await api.get<Envelope<unknown>>(`/${moduleId}/menu/${unitId}`);
  return cc<MenuItem[]>(data.data) ?? [];
}

export async function createMenuItem(
  moduleId: ModuleId,
  body: CreateMenuItemRequest
): Promise<MenuItem> {
  const wireBody = stringifyForWire(body);
  const { data } = await api.post<Envelope<unknown>>(`/${moduleId}/menu`, wireBody, {
    ...WIRE_HEADERS,
    ...WIRE_TRANSFORM,
  });
  return cc<MenuItem>(data.data);
}

export async function updateMenuItem(
  moduleId: ModuleId,
  id: string,
  body: UpdateMenuItemRequest
): Promise<MenuItem> {
  const wireBody = stringifyForWire(body);
  const { data } = await api.put<Envelope<unknown>>(`/${moduleId}/menu/${id}`, wireBody, {
    ...WIRE_HEADERS,
    ...WIRE_TRANSFORM,
  });
  return cc<MenuItem>(data.data);
}

export async function deleteMenuItem(moduleId: ModuleId, id: string): Promise<void> {
  await api.delete(`/${moduleId}/menu/${id}`);
}
