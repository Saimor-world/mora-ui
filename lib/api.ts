/**
 * Robust API Client for Môra Core
 * Uses centralized config, handles timeouts, 401s, and provides clear error messages
 */

import { getAuthHeader, getCoreApiUrl, getJwtToken } from './config';
import { showToast } from './toast';
import { announceHealthTransition } from './health';
import { useMoraStore } from './store/moraState'; // Import Store for Demo Mode check

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
 * DEMO MODE FALLBACK RESPONSES
 * Returns minimal data when backend is unavailable in demo mode.
 * NOTE: Real data should come from backend - this is only for graceful degradation.
 */
function getDemoFallbackResponse(endpoint: string): any {
  // Chat / Cognition
  if (endpoint.includes('/chat')) {
    return {
      message: "Backend is offline. Please start the SAIMÔR Core server.",
      sources: []
    };
  }

  if (endpoint.includes('/pulse')) {
    return {
      state: 'offline',
      insights: []
    };
  }

  // Team Collaboration
  if (endpoint.includes('/team/members')) {
    return [];
  }

  if (endpoint.includes('/team/activity')) {
    return [];
  }

  // Core Objects
  if (endpoint.includes('/objects')) {
    return {
      objects: [],
      total: 0
    };
  }

  // Default empty for unknown
  return {};
}

/**
 * Generic authenticated fetch wrapper
 * - Uses centralized config
 * - Handles timeouts
 * - Handles 401s with clear messages
 * - Provides detailed error info
 * - GOD MODE: Intercepts 401s in Demo Mode
 */
export async function authFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  // GOD MODE: Check if we are in Demo Mode
  // If so, and we don't have a token, return valid mock data instead of erroring
  try {
    const isDemo = useMoraStore.getState().viewMode === 'demo';
    const hasToken = !!getJwtToken();

    if (isDemo && !hasToken) {
      // Silent Interception
      return getDemoFallbackResponse(endpoint) as T;
    }
  } catch (e) {
    // Store might not be initialized, ignore
  }

  const baseUrl = getCoreApiUrl();
  const token = getJwtToken();
  const authHeaderName = getAuthHeader() || 'Authorization';

  // DEV LOGGING - Diagnose token/header usage (without leaking full token)
  if (process.env.NODE_ENV === 'development') {
    const describeToken = (value?: string | null) => {
      if (!value) return 'none';
      if (value.length <= 8) return `${value.length} chars`;
      return `${value.slice(0, 4)}...${value.slice(-4)} (${value.length} chars)`;
    };

    const hashToken = (value?: string | null) => {
      if (!value) return 'none';
      let hash = 0;
      for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
      }
      return hash.toString(16).padStart(8, '0').slice(0, 8);
    };

    console.log('[authFetch] Called for endpoint:', endpoint);
    console.log('[authFetch] Base URL:', baseUrl);
    console.log('[authFetch] Auth header name:', authHeaderName);
    console.log('[authFetch] Token preview:', describeToken(token));
    console.log('[authFetch] Token digest:', hashToken(token));
  }

  // Validate config
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_CORE_API_URL is not configured. Check your .env.local file.');
  }

  if (!token) {
    // Silently fail - health check will show Core offline status
    console.warn('[authFetch] No JWT token configured');
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
      // Health check will announce auth state transitions
      console.warn('[authFetch] 401 Unauthorized:', endpoint);
      throw new ApiUnauthorizedError(endpoint);
    }

    if (response.status === 403) {
      console.warn('[authFetch] 403 Forbidden:', endpoint);
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
      console.warn('[authFetch] Timeout:', endpoint);
      throw error;
    }

    if (error instanceof ApiError || error instanceof ApiUnauthorizedError) {
      throw error;
    }

    // GOD MODE: Network Error Interception
    // If we are in Demo Mode and the fetch fails (likely backend offline),
    // we SILENTLY return the mock response instead of throwing an error.
    try {
      const isDemo = useMoraStore.getState().viewMode === 'demo';
      if (isDemo) {
        console.debug(`[God Mode] Backend unreachable for ${endpoint}, using mock.`);
        return getDemoFallbackResponse(endpoint) as T;
      }
    } catch (e) { }

    // Network errors (silently fail - health check handles status)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Suppress network errors in development - this is expected when Core API is offline
      if (process.env.NODE_ENV === 'development') {
        console.debug('[authFetch] Network error (Core API offline):', endpoint);
      }
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
 * However, if a JWT is configured, we send it along
 */
export async function healthCheck(): Promise<{
  status: string;
  timestamp: string;
  db?: { status: string };
  qdrant?: { status: string };
  llm?: { status: string };
}> {
  // GOD MODE: In Demo Mode, always return healthy status for UI continuity
  try {
    const isDemo = useMoraStore.getState().viewMode === 'demo';
    if (isDemo) {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        db: { status: 'mock_connected' },
        llm: { status: 'mock_ready' }
      };
    }
  } catch (e) { }

  const baseUrl = getCoreApiUrl();
  const token = getJwtToken();
  const authHeaderName = getAuthHeader();

  const headers: Record<string, string> = {};
  if (token) {
    headers[authHeaderName] = `Bearer ${token}`;
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/v1/health`,
      { headers },
      5000
    );

    // Handle 401 Unauthorized specifically
    if (response.status === 401) {
      const fallback = {
        status: 'unauthorized',
        timestamp: new Date().toISOString(),
      };
      announceHealthTransition(fallback.status);
      return fallback;
    }

    // Handle other errors
    if (!response.ok) {
      const fallback = {
        status: 'error',
        timestamp: new Date().toISOString(),
      };
      announceHealthTransition(fallback.status);
      return fallback;
    }

    const payload = await response.json();
    announceHealthTransition(payload.status);
    return payload;
  } catch (error) {
    const fallback = {
      status: 'unreachable',
      timestamp: new Date().toISOString(),
    };
    announceHealthTransition(fallback.status);
    return fallback;
  }
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
