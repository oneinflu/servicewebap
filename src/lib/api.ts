const DEFAULT_API_BASE = 'https://service-app-cqjri.ondigitalocean.app';

export const API_BASE: string =
  import.meta?.env?.VITE_API_BASE_URL ?? DEFAULT_API_BASE;

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
}

class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: {
    method?: string;
    headers?: HeadersInit;
    body?: unknown;
    auth?: boolean; // default true
  } = {}
): Promise<T> {
  const { method = 'GET', headers = {} as HeadersInit, body, auth = true } = options;
  const token = getToken();
  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    let message: string | undefined;
    if (typeof json === 'object' && json !== null && 'message' in json) {
      message = (json as { message?: string }).message;
    }
    const finalMessage = message || `${res.status} ${res.statusText}`;
    throw new ApiError(finalMessage, res.status, json);
  }
  return json as T;
}