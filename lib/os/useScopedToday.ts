'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTodaySnapshot, type TodaySnapshot } from '@/lib/api/todayClient';
import { CoreError } from '@/lib/api/http';
import { useScopeCompanyId } from '@/lib/demo/demoStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { demoTodaySnapshot } from '@/lib/demo/morgenrot/demoToday';

const CACHE_PREFIX = 'saimor.today.last.v1:';
/** Letzter echter Stand je Mandant/Person/Firma: Kacheln werden nie leer, wenn CORE kurz nicht antwortet. */
export function readCachedToday(key: string): TodaySnapshot | null {
  try { const raw = localStorage.getItem(CACHE_PREFIX + key); return raw ? (JSON.parse(raw) as TodaySnapshot) : null; } catch { return null; }
}
function writeCachedToday(key: string, data: TodaySnapshot): void {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data)); } catch { /* privat */ }
}
/** Ersatzstand: Demo-Scope bekommt den fiktiven Datensatz, eigener Scope den letzten echten Stand. */
export function fallbackToday(cacheKey: string, companyId: string | null, userId: string | null, tenantId: string | null): TodaySnapshot | null {
  if (companyId?.startsWith('demo-')) return demoTodaySnapshot(companyId, userId ?? 'demo', tenantId ?? 'tenant-demo');
  return readCachedToday(cacheKey);
}

export type TodayLoadError = 'unauthorized' | 'forbidden' | 'unavailable' | null;

export const TODAY_INVALIDATE_EVENT = 'saimor:today-invalidate';
const BACKGROUND_REFRESH_MS = 5 * 60_000;
const FOCUS_REFRESH_MIN_AGE_MS = 2 * 60_000;

export function invalidateToday(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(TODAY_INVALIDATE_EVENT));
}

type ScopedTodayOptions = {
  backgroundRefresh?: boolean;
  enabled?: boolean;
};

type SnapshotState = {
  key: string;
  data: TodaySnapshot;
};

export function useScopedToday({ backgroundRefresh = false, enabled = true }: ScopedTodayOptions = {}) {
  const activeCompanyId = useScopeCompanyId();
  const user = useSessionStore((state) => state.user);
  const sessionGeneration = useSessionStore((state) => state.sessionGeneration);
  const userId = user?.id ?? null;
  const tenantId = user?.tenant_id ?? null;
  const contextKey = `${tenantId ?? 'tenant-unknown'}:${userId ?? 'anonymous'}:${sessionGeneration}:${activeCompanyId ?? 'tenant'}`;

  const cacheKey = `${tenantId ?? 'tenant-unknown'}:${userId ?? 'anonymous'}:${activeCompanyId ?? 'tenant'}`;
  const [snapshotState, setSnapshotState] = useState<SnapshotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<TodayLoadError>(null);
  const requestGenerationRef = useRef(0);
  const lastSuccessfulRefreshRef = useRef(0);

  const snapshot = snapshotState?.key === contextKey ? snapshotState.data : null;

  const refresh = useCallback(async (showLoading = false) => {
    const requestGeneration = ++requestGenerationRef.current;
    if (showLoading) setLoading(true);
    setRefreshing(true);

    try {
      const data = await fetchTodaySnapshot(activeCompanyId, userId);
      if (requestGeneration !== requestGenerationRef.current) return;

      if (data) {
        setSnapshotState({ key: contextKey, data });
        if (!activeCompanyId?.startsWith('demo-')) writeCachedToday(cacheKey, data);
        setLoadError(null);
        lastSuccessfulRefreshRef.current = Date.now();
      } else {
        const fb = userId ? fallbackToday(cacheKey, activeCompanyId, userId, tenantId) : null;
        setSnapshotState(fb ? { key: contextKey, data: fb } : null);
        setLoadError('unavailable');
      }
    } catch (error) {
      if (requestGeneration !== requestGenerationRef.current) return;
      setSnapshotState(null);
      if (error instanceof CoreError && error.status === 401) {
        setLoadError('unauthorized');
      } else if (error instanceof CoreError && error.status === 403) {
        setLoadError('forbidden');
      } else {
        const fb = userId ? fallbackToday(cacheKey, activeCompanyId, userId, tenantId) : null;
        if (fb) setSnapshotState({ key: contextKey, data: fb });
        setLoadError('unavailable');
      }
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeCompanyId, cacheKey, contextKey, tenantId, userId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRefreshing(false);
      return undefined;
    }
    requestGenerationRef.current += 1;
    // Sofort mit dem letzten Stand füllen statt leer zu starten; der Live-Abruf ersetzt ihn.
    const seed = userId ? (activeCompanyId?.startsWith('demo-') ? null : readCachedToday(cacheKey)) : null;
    setSnapshotState(seed ? { key: contextKey, data: seed } : null);
    setLoadError(null);
    setLoading(true);
    setRefreshing(false);
    lastSuccessfulRefreshRef.current = 0;
    void refresh(true);

    const refreshIfUseful = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (Date.now() - lastSuccessfulRefreshRef.current < FOCUS_REFRESH_MIN_AGE_MS) return;
      void refresh(false);
    };
    const refreshAfterMutation = () => void refresh(false);

    window.addEventListener(TODAY_INVALIDATE_EVENT, refreshAfterMutation);
    let timer: number | undefined;
    if (backgroundRefresh) {
      timer = window.setInterval(refreshIfUseful, BACKGROUND_REFRESH_MS);
      window.addEventListener('focus', refreshIfUseful);
      document.addEventListener('visibilitychange', refreshIfUseful);
    }

    return () => {
      requestGenerationRef.current += 1;
      if (timer !== undefined) window.clearInterval(timer);
      window.removeEventListener(TODAY_INVALIDATE_EVENT, refreshAfterMutation);
      if (backgroundRefresh) {
        window.removeEventListener('focus', refreshIfUseful);
        document.removeEventListener('visibilitychange', refreshIfUseful);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundRefresh, enabled, refresh]);

  return {
    snapshot,
    loading,
    refreshing,
    loadError,
    refresh,
    contextKey,
    activeCompanyId,
    userId,
    tenantId,
    sessionGeneration,
  };
}
