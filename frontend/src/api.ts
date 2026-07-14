const TOKEN_KEY = 'autohistory_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const storedToken = getToken();
  const customHeaders = (options.headers ?? {}) as Record<string, string>;

  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
  };

  // Stored token first, then custom headers override (so callers can pass a fresh token)
  if (storedToken) headers.Authorization = `Bearer ${storedToken}`;
  Object.assign(headers, customHeaders);

  const res = await fetch(path, { ...options, headers });
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & { reason?: string };
    if (data.reason) err.reason = data.reason;
    throw err;
  }
  return data as T;
}

export const api = {
  register: (body: { fullName: string; email: string; password: string; phone?: string }) =>
    request<{ token: string; user: import('./types').User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  registerBuyer: (body: { fullName: string; email: string; password: string; phone?: string }) =>
    request<{ token: string; user: import('./types').User }>('/api/auth/register/buyer', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  registerShop: (body: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    shopName: string;
    address?: string;
  }) =>
    request<{ token: string; user: import('./types').User }>('/api/auth/register/shop', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: import('./types').User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  syncProfile: (
    body: {
      fullName: string;
      role?: 'OWNER' | 'SHOP' | 'BUYER';
      phone?: string;
      shopName?: string;
      address?: string;
    },
    token?: string
  ) =>
    request<{ user: import('./types').User }>('/api/auth/sync-profile', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),

  me: () => request<{ user: import('./types').User }>('/api/auth/me'),

  updateProfile: (body: {
    fullName?: string;
    phone?: string;
    shopName?: string;
    address?: string;
    emailNotifications?: boolean;
    inAppNotifications?: boolean;
  }) =>
    request<{ user: import('./types').User }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  decodeVin: (vin: string) =>
    request<import('./types').VinDecode>(`/api/vin/${encodeURIComponent(vin.trim())}`),

  vehicles: () =>
    request<{ vehicles: import('./types').Vehicle[]; limits: import('./types').VehicleLimits }>(
      '/api/vehicles'
    ),

  vehicle: (id: string) => request<{ vehicle: import('./types').Vehicle }>(`/api/vehicles/${id}`),

  createVehicle: (body: Record<string, unknown> | FormData) =>
    request<{ vehicle: import('./types').Vehicle }>('/api/vehicles', {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  updateVehicle: (id: string, body: FormData) =>
    request<{ vehicle: import('./types').Vehicle }>(`/api/vehicles/${id}`, {
      method: 'PATCH',
      body,
    }),

  vehiclePhotoUrl: (id: string) => `/api/vehicles/${id}/photo`,

  deleteVehicle: (id: string) =>
    request<{ vehicle?: import('./types').Vehicle; archived?: boolean; message?: string } | void>(
      `/api/vehicles/${id}`,
      { method: 'DELETE' }
    ),

  deleteAccount: () =>
    request<{ anonymized?: boolean; message?: string; user?: import('./types').User } | void>(
      '/api/auth/me',
      { method: 'DELETE' }
    ),

  events: (vehicleId: string, params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request<{ events: import('./types').MaintenanceEvent[] }>(
      `/api/vehicles/${vehicleId}/events${qs}`
    );
  },

  createEvent: (vehicleId: string, body: Record<string, unknown>) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value));
      }
    }
    return request<{ event: import('./types').MaintenanceEvent }>(`/api/vehicles/${vehicleId}/events`, {
      method: 'POST',
      body: form,
    });
  },

  updateEvent: (vehicleId: string, eventId: string, body: Record<string, unknown>) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value));
      }
    }
    return request<{ event: import('./types').MaintenanceEvent }>(
      `/api/vehicles/${vehicleId}/events/${eventId}`,
      { method: 'PATCH', body: form }
    );
  },

  deleteEvent: (vehicleId: string, eventId: string) =>
    request<void>(`/api/vehicles/${vehicleId}/events/${eventId}`, { method: 'DELETE' }),

  uploadDocument: (vehicleId: string, eventId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ document: import('./types').Document; ocrResult: import('./types').OCRResult | null }>(
      `/api/vehicles/${vehicleId}/events/${eventId}/documents`,
      { method: 'POST', body: form }
    );
  },

  documentUrl: (vehicleId: string, eventId: string, documentId: string) =>
    `/api/vehicles/${vehicleId}/events/${eventId}/documents/${documentId}/file`,

  notifications: () =>
    request<{ notifications: import('./types').Notification[]; unreadCount: number }>(
      '/api/notifications'
    ),

  markNotificationRead: (id: string) =>
    request<{ notification: import('./types').Notification }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllNotificationsRead: () =>
    request<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' }),

  shopEvents: () =>
    request<{
      events: import('./types').MaintenanceEvent[];
      shopName: string | null;
      connectedOwners?: number;
    }>('/api/shop/events'),

  shopVerifications: () =>
    request<{ verifications: (import('./types').Verification & { event?: import('./types').MaintenanceEvent })[] }>(
      '/api/shop/verifications'
    ),

  shopLookupVehicle: (body: {
    q?: string;
    ownerEmail?: string;
    vin?: string;
    make?: string;
    model?: string;
    year?: string | number;
  }) => {
    const q = (body.q || body.ownerEmail || '').trim();
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return request<import('./types').ShopVehicleLookup>(`/api/shop/vehicles/lookup${qs}`, {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        q: body.q || body.ownerEmail || undefined,
        ownerEmail: body.ownerEmail || (body.q?.includes('@') ? body.q : undefined),
      }),
    });
  },

  shopMonthlyAnalytics: () =>
    request<{ monthly: Array<{ month: string; count: number }> }>('/api/shop/analytics/monthly'),

  shopCreateEvent: (
    body: {
      ownerEmail: string;
      vehicleId?: string;
      vin?: string;
      make?: string;
      model?: string;
      year?: string | number;
      eventType: string;
      date: string;
      mileage: string | number;
      cost?: string | number;
      notes?: string;
      verificationNotes?: string;
    },
    proof?: File
  ) => {
    const form = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== '') form.append(key, String(value));
    });
    if (proof) form.append('proof', proof);
    return request<{ event: import('./types').MaintenanceEvent }>('/api/shop/events', {
      method: 'POST',
      body: form,
    });
  },

  getShareSettings: (vehicleId: string) =>
    request<{ share: import('./types').ShareSettings }>(`/api/vehicles/${vehicleId}/share`),

  sharePreview: (vehicleId: string, level: 'SUMMARY' | 'FULL') =>
    request<import('./types').PublicHistory>(
      `/api/vehicles/${vehicleId}/share/preview?level=${level}`
    ),

  enableSharing: (vehicleId: string, body: { shareLevel?: string; visibility?: string }) =>
    request<{ share: import('./types').ShareSettings }>(`/api/vehicles/${vehicleId}/share/enable`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateSharing: (vehicleId: string, body: { shareLevel?: string; visibility?: string }) =>
    request<{ share: import('./types').ShareSettings }>(`/api/vehicles/${vehicleId}/share`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  regenerateShareToken: (vehicleId: string) =>
    request<{ shareToken: string; shareUrl: string }>(
      `/api/vehicles/${vehicleId}/share/regenerate-token`,
      { method: 'POST' }
    ),

  generateBadge: (vehicleId: string, isAnimated = true) =>
    request<{ badge: import('./types').Badge; shareUrl: string; embedCode: string }>(
      `/api/vehicles/${vehicleId}/share/badge`,
      { method: 'POST', body: JSON.stringify({ isAnimated }) }
    ),

  ownerAnalytics: () => request<{ analytics: import('./types').OwnerAnalytics }>('/api/analytics/owner'),

  shopAnalytics: () => request<{ analytics: import('./types').ShopAnalytics }>('/api/analytics/shop'),

  reminders: () => request<{ reminders: import('./types').ServiceReminder[] }>('/api/reminders'),

  vehicleReminders: (vehicleId: string) =>
    request<{ reminders: import('./types').ServiceReminder[] }>(`/api/reminders/vehicle/${vehicleId}`),

  generateReminders: (vehicleId: string) =>
    request<{ created: import('./types').ServiceReminder[] }>(
      `/api/reminders/vehicle/${vehicleId}/generate`,
      { method: 'POST' }
    ),

  completeReminder: (id: string) =>
    request<{ reminder: import('./types').ServiceReminder }>(`/api/reminders/${id}/complete`, {
      method: 'PATCH',
    }),

  suggestions: (vehicleId: string) =>
    request<{ suggestions: import('./types').MaintenanceSuggestion[] }>(
      `/api/vehicles/${vehicleId}/suggestions`
    ),

  shopCreateReminder: (body: {
    vehicleId: string;
    serviceType: string;
    dueDate?: string;
    dueMileage?: number;
    message?: string;
  }) =>
    request<{ reminder: import('./types').ServiceReminder }>('/api/shop/reminders', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  publicHistory: (token: string, partnerKey?: string) => {
    const qs = partnerKey ? `?partnerKey=${encodeURIComponent(partnerKey)}` : '';
    return request<import('./types').PublicHistory>(`/api/public/history/${token}${qs}`);
  },

  verifyEvent: (eventId: string, file?: File, notes?: string) => {
    const form = new FormData();
    if (file) form.append('proof', file);
    if (notes) form.append('notes', notes);
    return request<{ verification: import('./types').Verification }>(
      `/api/shop/events/${eventId}/verify`,
      { method: 'POST', body: form }
    );
  },

  shopProofUrl: (filename: string) => `/api/shop/proofs/${encodeURIComponent(filename)}`,

  shopDocumentFile: (eventId: string, documentId: string) =>
    request<{ url: string; fileName: string; fileType: string }>(
      `/api/shop/events/${eventId}/documents/${documentId}/file`
    ),

  featuredShops: () =>
    request<{ ads: import('./types').FeaturedShopAd[] }>('/api/partners/featured-shops'),

  contactFeaturedShop: (adId: string, message?: string) =>
    request<{ ok: boolean; message: string }>(`/api/partners/featured-shops/${adId}/contact`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  marketplaceParts: (vehicleId: string) =>
    request<{ vehicle: { make: string; model: string; year: number }; parts: import('./types').SparePart[] }>(
      `/api/marketplace/parts?vehicleId=${encodeURIComponent(vehicleId)}`
    ),

  badgeAnalytics: (partnerKey: string) =>
    request<import('./types').BadgeAnalytics>(
      `/api/partners/badge-analytics?partnerKey=${encodeURIComponent(partnerKey)}`
    ),

  insuranceSummary: (partnerKey: string) =>
    request<{
      fleetSize: number;
      platformVerificationRate: number;
      topMakes: import('./types').InsuranceInsights['byManufacturer'];
      disclaimer: string;
    }>(`/api/insurance/reliability/summary?partnerKey=${encodeURIComponent(partnerKey)}`),

  adminStats: () => request<import('./types').AdminStats>('/api/admin/stats'),

  adminUsers: () => request<{ users: import('./types').AdminUser[] }>('/api/admin/users'),

  adminPendingShops: () =>
    request<{ shops: import('./types').AdminUser[] }>('/api/admin/shops/pending'),

  adminVerifyShop: (id: string, approved: boolean) =>
    request<{ shop: { id: string; shopVerified: boolean; banned: boolean } }>(
      `/api/admin/shops/${id}/verify`,
      {
        method: 'PATCH',
        body: JSON.stringify({ approved }),
      }
    ),

  adminBanUser: (id: string, banned: boolean) =>
    request<{ user: { id: string; banned: boolean } }>(`/api/admin/users/${id}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ banned }),
    }),

  adminFlaggedEvents: () =>
    request<{ events: import('./types').MaintenanceEvent[] }>('/api/admin/events/flagged'),

  adminFlagEvent: (id: string, flagged: boolean) =>
    request<{ event: { id: string; flagged: boolean } }>(`/api/admin/events/${id}/flag`, {
      method: 'PATCH',
      body: JSON.stringify({ flagged }),
    }),

  adminReports: () => request<{ reports: import('./types').ModerationReport[] }>('/api/admin/reports'),

  adminResolveReport: (id: string, status: string, flagTarget?: boolean) =>
    request<{ report: import('./types').ModerationReport }>(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, flagTarget }),
    }),

  adminSeedDemoReport: () =>
    request<{ ok?: boolean; created?: number }>('/api/admin/seed-reports-demo', { method: 'POST' }),

  trackVisit: (body: {
    path: string;
    sessionId: string;
    referrer?: string;
    userAgent?: string;
    userId?: string;
  }) =>
    request<void>('/api/public/visits', {
      method: 'POST',
      body: JSON.stringify(body),
    }).catch(() => undefined),

  adminVisits: (range: '24h' | '7d' | '30d' | '90d' = '7d') =>
    request<import('./types').SiteVisitStats>(`/api/admin/visits?range=${range}`),
};
