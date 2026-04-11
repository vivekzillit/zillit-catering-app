// Shared axios client. Every request picks up:
//   - Authorization: Bearer <jwt>
//   - moduledata (AES-encrypted user/project/device/timestamp)
//   - bodyhash  (SHA-256 of the virtual wrapper + salt)
//
// POST/PUT bodies are pre-serialised by the caller via stringifyForWire()
// so the bytes that get hashed are exactly the bytes that get sent.

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { generateModuledata, generateBodyhash } from '@/shared/crypto';
import { useAuthStore } from '@/shared/stores/authStore';

const STORAGE_KEY = 'zillit.auth.token';

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v2';

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'device-type': 'Web',
    iosversion: '6.9.3',
    osversion: '6.9.3',
    network: 'WiFi',
  },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);

  const user = useAuthStore.getState().user;

  let moduledataHex = '';
  if (user?.deviceId && user?.projectId) {
    try {
      moduledataHex = await generateModuledata(user._id, user.projectId, user.deviceId);
      config.headers.set('moduledata', moduledataHex);
    } catch {
      /* ignore */
    }
  }

  try {
    const body =
      config.data != null
        ? typeof config.data === 'string'
          ? config.data
          : JSON.stringify(config.data)
        : '';
    config.headers.set('bodyhash', await generateBodyhash(body, moduledataHex));
  } catch {
    /* ignore */
  }

  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      setAuthToken(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);
