'use client';
import { useEffect, useRef, useState } from 'react';
import { IDLE_LIVE, parseLiveEvent, reduceLive, type LiveState } from '@/lib/mora/liveRun';

/** How long MÔRA stays with "Fertig" before she glides back to the centre. */
export const LIVE_RETURN_MS = 2200;

/**
 * Subscribes to MÔRA's real run steps (owner-only SSE via the same-origin CORE proxy).
 * A 401/403 closes the stream for good (EventSource does not retry on HTTP errors).
 */
export function useMoraLive(enabled: boolean): LiveState {
  const [state, setState] = useState<LiveState>(IDLE_LIVE);
  const back = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    const es = new EventSource('/api/core/v3/mora/live', { withCredentials: true });
    const onEvent = (msg: MessageEvent) => {
      const e = parseLiveEvent(String(msg.data));
      if (!e) return;
      clearTimeout(back.current);
      setState((s) => reduceLive(s, e));
      if (e.kind === 'task.done') back.current = setTimeout(() => setState(IDLE_LIVE), LIVE_RETURN_MS);
    };
    es.addEventListener('mora', onEvent as EventListener);
    return () => { clearTimeout(back.current); es.removeEventListener('mora', onEvent as EventListener); es.close(); };
  }, [enabled]);
  return state;
}
