// ==============================================================================
// API Client — Typed fetch wrapper for the Parker OS backend
// ==============================================================================
// Reads NEXT_PUBLIC_API_URL and attaches the JWT from localStorage.
// Automatically retries once with a refreshed token on 401.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('parker_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('parker_refresh');
}

function setTokens(accessToken: string, refreshToken: string, user?: unknown) {
  localStorage.setItem('parker_token', accessToken);
  localStorage.setItem('parker_refresh', refreshToken);
  if (user) localStorage.setItem('parker_user', JSON.stringify(user));
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

type ApiResponse<T> = { data: T; ok: true } | { error: string; ok: false };

async function request<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && !retried) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, true);
    // Token refresh failed — clear storage
    localStorage.removeItem('parker_token');
    localStorage.removeItem('parker_refresh');
    localStorage.removeItem('parker_user');
    window.location.href = '/login';
    return { ok: false, error: 'Session expired' };
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body?.error ?? body?.message ?? `HTTP ${res.status}` };
  return { ok: true, data: body as T };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

export const auth = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string, role?: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),
};

// ─── Driver Agent ─────────────────────────────────────────────────────────────

export interface AgentChatResponse {
  reply: string;
  session_id: string;
}

export const driverAgent = {
  chat: (message: string, session_id?: string) =>
    request<AgentChatResponse>('/api/driver-agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, session_id }),
    }),
};

// ─── Ops Agent ───────────────────────────────────────────────────────────────

export const opsAgent = {
  chat: (message: string, session_id?: string) =>
    request<AgentChatResponse>('/api/ops-agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, session_id }),
    }),
};

// ─── Zones ──────────────────────────────────────────────────────────────────

export interface ZoneMetrics {
  zone_id: string;
  zone_name: string;
  tariff: { base_per_hour: number; currency: string; bounds: { min_pct: number; max_pct: number } };
  occupancy: { total_slots: number; occupied: number; free: number; rate_pct: number };
  bookings_today: number;
  active_bookings: number;
  anomalies_24h: number;
  slots: Array<{ id: string; status: string; vehicle_type: string }>;
}

export const zones = {
  getMetrics: (zoneId: string) =>
    request<ZoneMetrics>(`/api/zones/${zoneId}/metrics`),
};

// ─── Pending Approvals ───────────────────────────────────────────────────────

export interface PendingApproval {
  id: number;
  audit_log_id: number;
  agent: string;
  tool_name: string;
  input: unknown;
  reasoning: string;
  expires_at: string;
  created_at: string;
  expired: boolean;
}

export const approvals = {
  list: () => request<{ approvals: PendingApproval[] }>('/api/pending-approvals'),
  approve: (id: number) =>
    request<{ status: string; result: unknown }>(`/api/pending-approvals/${id}/approve`, { method: 'POST' }),
  reject: (id: number, reason?: string) =>
    request<{ status: string }>(`/api/pending-approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// ─── Audit Log ───────────────────────────────────────────────────────────────

export const auditLog = {
  list: (params?: { agent?: string; tool?: string; outcome?: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ entries: unknown[]; total: number }>(`/api/audit-log${qs ? `?${qs}` : ''}`);
  },
};

export { setTokens };
