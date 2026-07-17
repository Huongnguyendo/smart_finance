import { getItem } from './storage';

const DEFAULT_API_URL = 'http://localhost:8080';

export function getApiUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = getApiUrl().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export async function getApiErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  let message = text || response.statusText || `Request failed (${response.status})`;
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.length > 0) {
      message = parsed.error;
    }
  } catch {
    /* use raw text */
  }
  return message;
}

export async function apiJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }
  const text = await response.text();
  if (!text || text.trim() === '') {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON response');
  }
}

/** Like apiJson but adds Bearer token from storage when available */
export async function apiAuthJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getItem('smartwallet_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return apiJson<T>(path, { ...options, headers });
}

/** Authenticated request that doesn't expect JSON (e.g. DELETE). */
export async function apiAuth(
  path: string,
  options: RequestInit = {}
): Promise<void> {
  const token = await getItem('smartwallet_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(buildUrl(path), { ...options, headers });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }
}
