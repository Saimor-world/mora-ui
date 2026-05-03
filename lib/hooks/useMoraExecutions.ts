'use client';

/**
 * useMoraExecutions — subscribes to mora.execution.* realtime events and
 * re-dispatches them on the window event bus so panes can react via
 * useExecutionSubscription without coupling directly to the WebSocket.
 *
 * Mounted once in MoraShell (spec §5.2). Feature-flagged under mora.live.v1.
 *
 * Window event: CustomEvent<MoraExecutionEvent> with type 'mora:execution'
 */

import { useEffect, useCallback } from 'react';
import { realtime } from '@/lib/api/realtimeClient';
import { useOrbStore } from '@/lib/store/orbStore';
import { isMoraLiveV1Enabled } from '@/lib/featureFlags';

// ── Event shapes (spec §5.1) ─────────────────────────────────────────────

export type MoraExecutionEventKind =
  | 'mora.execution.started'
  | 'mora.execution.progress'
  | 'mora.execution.done'
  | 'mora.execution.failed';

export interface MoraExecutionStarted {
  kind: 'mora.execution.started';
  tool: string;
  journal_id: string;
  affected_entities: string[];
  scope: Record<string, unknown>;
  user_id: string;
}

export interface MoraExecutionProgress {
  kind: 'mora.execution.progress';
  journal_id: string;
  phase: string;
  pct?: number;
}

export interface MoraExecutionDone {
  kind: 'mora.execution.done';
  journal_id: string;
  ok: true;
  affected_entities: string[];
  change_summary: string;
}

export interface MoraExecutionFailed {
  kind: 'mora.execution.failed';
  journal_id: string;
  ok: false;
  error: string;
}

export type MoraExecutionEvent =
  | MoraExecutionStarted
  | MoraExecutionProgress
  | MoraExecutionDone
  | MoraExecutionFailed;

// ── Window bus helper ────────────────────────────────────────────────────

export const MORA_EXECUTION_EVENT = 'mora:execution';

export function dispatchMoraExecution(event: MoraExecutionEvent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<MoraExecutionEvent>(MORA_EXECUTION_EVENT, { detail: event }));
}

// ── Hook ─────────────────────────────────────────────────────────────────

const EXEC_EVENT_TYPES = [
  'mora.execution.started',
  'mora.execution.progress',
  'mora.execution.done',
  'mora.execution.failed',
] as const;

export function useMoraExecutions(enabled: boolean): void {
  const setOrbState = useOrbStore((s) => s.setOrbState);

  const handleStarted = useCallback((data: any) => {
    const evt: MoraExecutionStarted = {
      kind: 'mora.execution.started',
      tool: data.tool ?? '',
      journal_id: data.journal_id ?? '',
      affected_entities: data.affected_entities ?? [],
      scope: data.scope ?? {},
      user_id: data.user_id ?? '',
    };
    dispatchMoraExecution(evt);
    // Orb: acting while tool runs (spec §5.3)
    setOrbState('acting' as any);
  }, [setOrbState]);

  const handleProgress = useCallback((data: any) => {
    const evt: MoraExecutionProgress = {
      kind: 'mora.execution.progress',
      journal_id: data.journal_id ?? '',
      phase: data.phase ?? '',
      pct: data.pct,
    };
    dispatchMoraExecution(evt);
  }, []);

  // Debounce 200ms to avoid flicker on fast tools (spec §5.3)
  const handleDone = useCallback((data: any) => {
    const evt: MoraExecutionDone = {
      kind: 'mora.execution.done',
      journal_id: data.journal_id ?? '',
      ok: true,
      affected_entities: data.affected_entities ?? [],
      change_summary: data.change_summary ?? '',
    };
    dispatchMoraExecution(evt);
    const timer = setTimeout(() => setOrbState('idle' as any), 200);
    return () => clearTimeout(timer);
  }, [setOrbState]);

  const handleFailed = useCallback((data: any) => {
    const evt: MoraExecutionFailed = {
      kind: 'mora.execution.failed',
      journal_id: data.journal_id ?? '',
      ok: false,
      error: data.error ?? 'unknown',
    };
    dispatchMoraExecution(evt);
    const timer = setTimeout(() => setOrbState('idle' as any), 200);
    return () => clearTimeout(timer);
  }, [setOrbState]);

  useEffect(() => {
    if (!enabled || !isMoraLiveV1Enabled()) return;

    realtime.on('mora.execution.started', handleStarted);
    realtime.on('mora.execution.progress', handleProgress);
    realtime.on('mora.execution.done', handleDone);
    realtime.on('mora.execution.failed', handleFailed);

    return () => {
      realtime.off('mora.execution.started', handleStarted);
      realtime.off('mora.execution.progress', handleProgress);
      realtime.off('mora.execution.done', handleDone);
      realtime.off('mora.execution.failed', handleFailed);
    };
  }, [enabled, handleStarted, handleProgress, handleDone, handleFailed]);
}
