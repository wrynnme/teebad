import { getLiffIdToken } from './liff';
import type { ApiResponse } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

async function getHeaders(): Promise<HeadersInit> {
  const idToken = getLiffIdToken();
  return {
    'Content-Type': 'application/json',
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    const data = await res.json() as ApiResponse<T> | T;

    if (!res.ok) {
      const errData = data as ApiResponse<T>;
      return { error: true, message: errData.message ?? `HTTP ${res.status}` };
    }

    // ถ้า server คืน { data, error, message } ใช้ format นั้น
    if (data !== null && typeof data === 'object' && ('error' in data || 'data' in data)) {
      return data as ApiResponse<T>;
    }

    return { data: data as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { error: true, message };
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
