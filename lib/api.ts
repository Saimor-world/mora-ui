/**
 * Robust API Client for Môra Core
 * Uses centralized config, handles timeouts, 401s, and provides clear error messages
 */

import { getAuthHeader, getCoreApiUrl, getJwtToken } from './config';
import { showToast } from './toast';

// API Error types for better error handling
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public endpoint: string,
    message?: string
  ) {
    super(message || `API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

export class ApiTimeoutError extends Error {
  constructor(public endpoint: string, public timeoutMs: number) {
    super(`Request timeout after ${timeoutMs}ms: ${endpoint}`);
    this.name = 'ApiTimeoutError';
  }
}

export class ApiUnauthorizedError extends ApiError {
  constructor(endpoint: string) {
    super(401, 'Unauthorized', endpoint, 'Authentication failed. Please check your JWT token.');
    this.name = 'ApiUnauthorizedError';
  }
}

// Default timeout: 30 seconds
const DEFAULT_TIMEOUT_MS = 30000;
const OFFLINE_HEALTH_STATUSES = new Set(['unreachable', 'error', 'unauthorized']);
let lastHealthStatus: string | null = null;

/**
 * Robust fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiTimeoutError(url, timeoutMs);
    }
    throw error;
  }
}

/**
 * Generic authenticated fetch wrapper
 * - Uses centralized config
 * - Handles timeouts
 * - Handles 401s with clear messages
 * - Provides detailed error info
 */
export async function authFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const baseUrl = getCoreApiUrl();
  const token = getJwtToken();
  const authHeaderName = getAuthHeader() || 'Authorization';

  // DEV LOGGING - Diagnose token in authFetch
  if (process.env.NODE_ENV === 'development') {
    console.log('[authFetch] Called for endpoint:', endpoint);
    console.log('[authFetch] Token available:', !!token);
    console.log('[authFetch] Token length:', token?.length || 0);
  }

  // Validate config
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_CORE_API_URL is not configured. Check your .env.local file.');
  }

  if (!token) {
    showToast({
      message: 'JWT Token fehlt oder ist leer. Bitte .env.local prüfen.',
      variant: 'error',
    });
    return Promise.reject(new ApiUnauthorizedError(endpoint));
  }

  // Build headers
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set(authHeaderName, `Bearer ${token}`);

  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        ...options,
        headers,
      },
      timeoutMs
    );

    // Handle 401 Unauthorized
    if (response.status === 401) {
      showToast({
        message: 'Authentication failed (401). Bitte JWT-Token prüfen.',
        variant: 'error',
      });
      throw new ApiUnauthorizedError(endpoint);
    }

    if (response.status === 403) {
      showToast({
        message: 'Zugriff verweigert (403). Berechtigungen oder Token prüfen.',
        variant: 'error',
      });
      throw new ApiError(response.status, 'Forbidden', endpoint);
    }

    // Handle other errors
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, endpoint);
    }

    // Parse JSON
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof ApiTimeoutError) {
      showToast({
        message: 'Core API Timeout – bitte Verbindung prüfen.',
        variant: 'error',
      });
      throw error;
    }

    if (error instanceof ApiError || error instanceof ApiUnauthorizedError) {
      throw error;
    }

    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showToast({
        message: 'Core API nicht erreichbar – bitte Server starten.',
        variant: 'error',
      });
      throw new Error(
        `Network error: Cannot reach Core API at ${baseUrl}. Is the server running?`
      );
    }

    // Unknown errors
    throw error;
  }
}

/**
 * Health check - special case without auth requirement
 */
export async function healthCheck(): Promise<{
  status: string;
  timestamp: string;
  db?: { status: string };
  qdrant?: { status: string };
  llm?: { status: string };
}> {
  const baseUrl = getCoreApiUrl();

  try {
    const response = await fetchWithTimeout(`${baseUrl}/v1/health`, {}, 5000);

    if (!response.ok) {
      const fallback = {
        status: 'error',
        timestamp: new Date().toISOString(),
      };
      handleHealthStatusToast(fallback.status);
      return fallback;
    }

    const payload = await response.json();
    handleHealthStatusToast(payload.status);
    return payload;
  } catch (error) {
    const fallback = {
      status: 'unreachable',
      timestamp: new Date().toISOString(),
    };
    handleHealthStatusToast(fallback.status);
    return fallback;
  }
}

function handleHealthStatusToast(status?: string) {
  const normalized = (status || '').toLowerCase();
  const isOffline = OFFLINE_HEALTH_STATUSES.has(normalized);
  const wasOffline = OFFLINE_HEALTH_STATUSES.has(lastHealthStatus || '');

  if (typeof window !== 'undefined') {
    if (isOffline && !wasOffline) {
      showToast({
        message: 'Core API offline – bitte Verbindung prüfen.',
        variant: 'error',
      });
    } else if (!isOffline && wasOffline && normalized) {
      showToast({
        message: 'Core API wieder erreichbar.',
        variant: 'info',
      });
    }
  }

  lastHealthStatus = normalized;
}

// API Methods
export const api = {
  /**
   * Health check (no auth required)
   */
  health: healthCheck,

  /**
   * Get all objects with optional filters
   */
  getObjects: async (params?: { spaceId?: string; type?: string; orb?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return authFetch<{ objects: any[]; total: number; spaceId: string | null }>(
      `/v1/objects${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get single object by ID
   */
  getObject: async (id: string) => {
    const response = await authFetch<{ objects: any[] }>('/v1/objects');
    return response.objects?.find((obj: any) => obj.id === id);
  },

  /**
   * Get relations/edges
   */
  getRelations: async (objectId?: string) => {
    const query = objectId ? `?objectId=${objectId}` : '';
    return authFetch(`/v1/relations${query}`);
  },

  /**
   * Get snapshots (timeline data)
   */
  getSnapshots: async (timestamps?: string[]) => {
    const query = timestamps ? `?ts=${timestamps.join(',')}` : '';
    return authFetch<{ snapshots: any[]; total: number }>(
      `/v1/snapshots${query}`
    );
  },

  /**
   * Semantic search (for chat)
   */
  semanticSearch: async (query: string, limit: number = 10) => {
    return authFetch('/v1/semantic/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  },

  /**
   * Suggest broadcasts
   */
  suggestBroadcasts: async (sourceId: string, maxSuggestions: number = 5) => {
    return authFetch('/v1/semantic/suggest-broadcasts', {
      method: 'POST',
      body: JSON.stringify({ sourceId, maxSuggestions }),
    });
  },

  /**
   * Broadcast (TBD)
   */
  broadcast: async (data: { sourceId: string; targetIds: string[]; message: string }) => {
    return authFetch('/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default api;
