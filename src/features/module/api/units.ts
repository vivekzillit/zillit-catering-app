import { api } from '@/shared/api/client';
import { toCamelCase } from '@/shared/wire';
import type { ModuleId, Unit, User } from '@/shared/types';

interface Envelope<T> {
  status: number;
  message: string;
  data: T;
}

function cc<T>(raw: unknown): T {
  return toCamelCase(raw as never) as unknown as T;
}

export async function fetchUnits(moduleId: ModuleId): Promise<Unit[]> {
  const { data } = await api.get<Envelope<unknown>>(`/${moduleId}/unit`);
  return cc<Unit[]>(data.data) ?? [];
}

export async function createUnit(
  moduleId: ModuleId,
  unitName: string,
  startTime?: string,
  endTime?: string,
  servingLocation?: string
): Promise<Unit> {
  const body: Record<string, string> = {
    unit_name: unitName,
    identifier: unitName.toLowerCase().replace(/\s+/g, '_'),
  };
  if (startTime) body.start_time = startTime;
  if (endTime) body.end_time = endTime;
  if (servingLocation) body.serving_location = servingLocation;
  const { data } = await api.post<Envelope<unknown>>(`/${moduleId}/unit`, body);
  return cc<Unit>(data.data);
}

export async function deleteUnit(
  moduleId: ModuleId,
  unitId: string
): Promise<void> {
  await api.delete(`/${moduleId}/unit/${unitId}`);
}

/**
 * Fetch the team members for a unit (used by the compose UI's
 * "Select User" dropdown when a caterer wants to direct-message someone).
 */
export async function fetchUnitMembers(
  moduleId: ModuleId,
  unitId: string
): Promise<User[]> {
  if (!unitId) return [];
  try {
    const { data } = await api.get<Envelope<unknown>>(
      `/${moduleId}/unit/${unitId}/members`
    );
    return cc<User[]>(data.data) ?? [];
  } catch (err) {
    console.error('fetchUnitMembers failed', err);
    return [];
  }
}
