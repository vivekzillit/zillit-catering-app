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
