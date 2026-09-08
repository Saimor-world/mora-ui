'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTodaySnapshot, type TodaySnapshot } from '@/lib/api/todayClient';
import { CoreError } from '@/lib/api/http';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';

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
};

type SnapshotState = {
  key: string;
  data: TodaySnapshot;
};

export function useScopedToday({ backgroundRefresh = false }: ScopedTodayOptions = {}) {
  const activeCompanyId = useNavStore((state) => state.activeCompanyId);
  const user = useSessionStore((state) => state.user);
  const sessionGeneration = useSessionStore((state) => state.sessionGeneration);
  const userId = user?.id ?? null;
  const tenantId = user?.tenant_id ?? null;
  const contextKey = `${tenantId ?? 'tenant-unknown'}:${userId ?? 'anonymous'}:${sessionGeneration}:${activeCompanyId ?? 'tenant'}`;

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
        setLoadError(null);
        lastSuccessfulRefreshRef.current = Date.now();
      } else {
        setSnapshotState(null);
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
        setLoadError('unavailable');
      }
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeCompanyId, contextKey, userId]);

  useEffect(() => {
    requestGenerationRef.current += 1;
    setSnapshotState(null);
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
  }, [backgroundRefresh, refresh]);

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
