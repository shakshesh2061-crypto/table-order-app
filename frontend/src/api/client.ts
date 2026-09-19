const TOKEN_KEY = "table_order_token";

// Empty string in dev — Vite's proxy (vite.config.ts) forwards /api to
// localhost:4000. In production this is baked in at build time from the
// real API Gateway URL (see .env.production / infra/lib/web-stack.ts).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}/api${path}`, { ...options, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error?.formErrors?.join(", ") ?? data?.error ?? res.statusText;
    throw new ApiError(typeof message === "string" ? message : JSON.stringify(message), res.status);
  }
  return data as T;
}
