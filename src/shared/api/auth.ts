import { api, setAuthToken } from './client';
import type { LoginResponse, User } from '@/shared/types';
import { toCamelCase } from '@/shared/wire';

interface ApiEnvelope<T> {
  status: number;
  message: string;
  data: T;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<ApiEnvelope<unknown>>('/auth/login', { email, password });
  const camel = toCamelCase(data.data as never) as unknown as LoginResponse;
  setAuthToken(camel.token);
  return camel;
}

export async function me(): Promise<User> {
  const { data } = await api.get<ApiEnvelope<unknown>>('/auth/me');
  const camel = toCamelCase(data.data as never) as unknown as { user: User };
  return camel.user;
}

export function logout(): void {
  setAuthToken(null);
}
