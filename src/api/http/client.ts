import { ApiError } from '../errors';

/*
 * Cliente HTTP para el backend real (ASP.NET Core, rutas "api/[controller]").
 * Todavía no se usa: queda listo para cuando se integre el back (ver api/index.ts).
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://localhost:7001/api';

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(path.replace(/^\//, ''), BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      // El binder de ASP.NET Core es case-insensitive: se envían en PascalCase como el DTO.
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k.charAt(0).toUpperCase() + k.slice(1), String(v));
    }
  }
  return url.toString();
}

export async function http<T>(method: string, path: string, options: { body?: unknown; query?: Query } = {}): Promise<T> {
  const res = await fetch(buildUrl(path, options.query), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const message =
      (typeof data === 'object' && data && ('message' in data || 'title' in data)
        ? String((data as { message?: string; title?: string }).message ?? (data as { title?: string }).title)
        : typeof data === 'string'
          ? data
          : null) ?? `Error ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
