// API Client for Môra Core
// Base URL: http://localhost:8081 (Core API with /v1/objects, /v1/relations, /v1/snapshots)

const CORE_BASE_URL = process.env.NEXT_PUBLIC_CORE_BASE_URL || 'http://localhost:8081';

// Get auth token from localStorage or env
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('mora_admin_token') ||
           localStorage.getItem('dashboard_auth_token') ||
           process.env.NEXT_PUBLIC_ADMIN_TOKEN || null;
  }
  return process.env.NEXT_PUBLIC_ADMIN_TOKEN || null;
}

// Generic fetch wrapper with auth
async function authFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${CORE_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// API Methods
export const api = {
  // Health check
  health: async () => {
    return authFetch('/v1/health');
  },

  // Objects - NEW Core API Endpoint! ✅
  getObjects: async (params?: { spaceId?: string; type?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return authFetch(`/v1/objects${query ? `?${query}` : ''}`);
  },

  getObject: async (id: string) => {
    // For now, get all objects and filter client-side
    const response = await authFetch('/v1/objects');
    return response.objects?.find((obj: any) => obj.id === id);
  },

  // Relations - NEW Core API Endpoint! ✅
  getRelations: async (objectId?: string) => {
    const query = objectId ? `?objectId=${objectId}` : '';
    return authFetch(`/v1/relations${query}`);
  },

  // Snapshots - NEW Core API Endpoint! ✅
  getSnapshots: async (timestamps?: string[]) => {
    const query = timestamps ? `?ts=${timestamps.join(',')}` : '';
    return authFetch(`/v1/snapshots${query}`);
  },

  // Broadcast (TBD)
  broadcast: async (data: { sourceId: string; targetIds: string[]; message: string }) => {
    return authFetch('/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

};

export default api;
