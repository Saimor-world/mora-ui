'use client';

/**
 * useExecutionSubscription — pane-level hook for reacting to mora.execution events.
 *
 * Usage (e.g. FinderPane):
 *   useExecutionSubscription({
 *     entity_ids: [folderId],
 *     on_done: (evt) => queryClient.invalidateQueries(queryKeys.folders(folderId)),
 *   });
 *
 * Deduplicates by entity_id: only fires when affected_entities overlaps the
 * declared set, or when entity_ids is empty (matches everything).
 *
 * Per spec §5.2.
 */

import { useEffect, useCallback } from 'react';
import {
  MORA_EXECUTION_EVENT,
  type MoraExecutionDone,
  type MoraExecutionFailed,
  type MoraExecutionStarted,
  type MoraExecutionProgress,
  type MoraExecutionEvent,
} from './useMoraExecutions';
import { isMoraLiveV1Enabled } from '@/lib/featureFlags';

interface UseExecutionSubscriptionOptions {
  /** Entity IDs this pane cares about. Empty = respond to all executions. */
  entity_ids?: string[];
  on_started?: (evt: MoraExecutionStarted) => void;
  on_progress?: (evt: MoraExecutionProgress) => void;
  on_done?: (evt: MoraExecutionDone) => void;
  on_failed?: (evt: MoraExecutionFailed) => void;
}

function matchesEntities(affected: string[], watched: string[]): boolean {
  if (!watched || watched.length === 0) return true;
  return affected.some((id) => watched.includes(id));
}

export function useExecutionSubscription({
  entity_ids = [],
  on_started,
  on_progress,
  on_done,
  on_failed,
}: UseExecutionSubscriptionOptions): void {
  const handler = useCallback((e: Event) => {
    if (!isMoraLiveV1Enabled()) return;
    const evt = (e as CustomEvent<MoraExecutionEvent>).detail;
    if (!evt) return;

    switch (evt.kind) {
      case 'mora.execution.started':
        if (on_started && matchesEntities(evt.affected_entities, entity_ids)) {
          on_started(evt);
        }
        break;
      case 'mora.execution.progress':
        if (on_progress) on_progress(evt);
        break;
      case 'mora.execution.done':
        if (on_done && matchesEntities(evt.affected_entities, entity_ids)) {
          on_done(evt);
        }
        break;
      case 'mora.execution.failed':
        if (on_failed) on_failed(evt);
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on_started, on_progress, on_done, on_failed, entity_ids.join(',')]);

  useEffect(() => {
    window.addEventListener(MORA_EXECUTION_EVENT, handler);
    return () => window.removeEventListener(MORA_EXECUTION_EVENT, handler);
  }, [handler]);
}
