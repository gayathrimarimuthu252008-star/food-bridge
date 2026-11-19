import {
  DashboardStatsDTO,
  DonationRequestDTO,
  FoodItemDTO,
  NotificationDTO,
  RaceDemoResultDTO,
  UserSummaryDTO,
} from '../shared/types.ts';

const TOKEN_KEY = 'fb_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  tokenOverride?: string | null,
): Promise<T> {
  const token = tokenOverride !== undefined ? tokenOverride : getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['X-Auth-Token'] = token;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface DemoUsersResponse {
  users: UserSummaryDTO[];
  zones: string[];
  adminHint: { email: string; password: string };
}

export interface AuthResponse {
  token: string;
  user: UserSummaryDTO;
}

export interface DashboardResponse {
  stats: DashboardStatsDTO;
  userSummaries: UserSummaryDTO[];
}

export interface AdminOverviewResponse {
  donations: FoodItemDTO[];
  requests: DonationRequestDTO[];
  volunteers: UserSummaryDTO[];
  users: UserSummaryDTO[];
  threadLogs: string[];
  stats: DashboardStatsDTO;
}

export const foodBridgeApi = {
  getDemoUsers: () => apiFetch<DemoUsersResponse>('/api/demo/users'),
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (payload: Record<string, unknown>) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => apiFetch<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  me: () => apiFetch<{ user: UserSummaryDTO }>('/api/auth/me'),
  getDashboard: (userId?: string, role?: string) =>
    apiFetch<DashboardResponse>(
      `/api/dashboard?userId=${encodeURIComponent(userId || '')}&role=${encodeURIComponent(role || '')}`,
    ),
  getDonations: (params: {
    availableOnly?: boolean;
    q?: string;
    type?: string;
    donorId?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params.availableOnly !== undefined) {
      qs.set('availableOnly', String(params.availableOnly));
    }
    if (params.q) qs.set('q', params.q);
    if (params.type) qs.set('type', params.type);
    if (params.donorId) qs.set('donorId', params.donorId);
    return apiFetch<{ donations: FoodItemDTO[] }>(`/api/donations?${qs.toString()}`);
  },
  createDonation: (payload: Record<string, unknown>) =>
    apiFetch<{ donation: FoodItemDTO; message: string }>('/api/donations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelDonation: (foodId: string) =>
    apiFetch<{ message: string }>(`/api/donations/${encodeURIComponent(foodId)}`, {
      method: 'DELETE',
    }),
  createRequest: (foodId: string, quantity: number) =>
    apiFetch<{ request: DonationRequestDTO; message: string }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify({ foodId, quantity }),
    }),
  getRequests: (params: { ngoId?: string; volunteerId?: string; donorId?: string }) => {
    const qs = new URLSearchParams();
    if (params.ngoId) qs.set('ngoId', params.ngoId);
    if (params.volunteerId) qs.set('volunteerId', params.volunteerId);
    if (params.donorId) qs.set('donorId', params.donorId);
    return apiFetch<{ requests: DonationRequestDTO[] }>(`/api/requests?${qs.toString()}`);
  },
  markPickedUp: (reqId: string) =>
    apiFetch<{ request: DonationRequestDTO; message: string }>(
      `/api/requests/${encodeURIComponent(reqId)}/pickup`,
      { method: 'POST' },
    ),
  markDelivered: (reqId: string) =>
    apiFetch<{ request: DonationRequestDTO; message: string }>(
      `/api/requests/${encodeURIComponent(reqId)}/deliver`,
      { method: 'POST' },
    ),
  getNotifications: (userId?: string) =>
    apiFetch<{ notifications: NotificationDTO[] }>(
      `/api/notifications?userId=${encodeURIComponent(userId || '')}`,
    ),
  getAdminOverview: () => apiFetch<AdminOverviewResponse>('/api/admin/overview'),
  runExpiryCheck: () =>
    apiFetch<{ expiredCount: number; message: string }>('/api/admin/expiry-check', {
      method: 'POST',
    }),
  runRaceDemo: () =>
    apiFetch<RaceDemoResultDTO>('/api/admin/race-demo', {
      method: 'POST',
    }),
};
