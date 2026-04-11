// Upload API — POSTs a multipart form to /upload and returns the backend's
// {key, url, thumbnail, contentType, fileSize} envelope (camelCased).

import axios from 'axios';
import { toCamelCase } from '@/shared/wire';
import { getAuthToken } from './client';
import type { UploadResponse } from '@/shared/types';

interface Envelope<T> {
  status: number;
  message: string;
  data: T;
}

/**
 * Upload a single File / Blob to `/api/v2/upload` and return the uploaded
 * asset metadata. We bypass the shared axios instance because that client
 * mangles non-JSON bodies via its interceptors.
 */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file, file.name);
  const token = getAuthToken();
  const res = await axios.post<Envelope<unknown>>('/api/v2/upload', form, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Let axios set the multipart boundary header automatically.
    },
  });
  return toCamelCase(res.data.data as never) as unknown as UploadResponse;
}
