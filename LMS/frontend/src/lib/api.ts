const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors?: string[]) {
    super(message);
  }
}

export const getToken = (): string | null =>
  typeof window === 'undefined' ? null : localStorage.getItem('lms_token');

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(API + path, {
    method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || 'Request failed', res.status, data.errors);
  return data as T;
}
