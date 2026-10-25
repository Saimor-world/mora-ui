'use client';
import { useEffect, useReducer, useState } from 'react';
import { realtime } from '@/lib/api/realtimeClient';
import { useOrbStore } from '@/lib/store/orbStore';
import { actionInput, executionInput, initialCharacter, reduceCharacter, resolveCharacter, type CharacterSnapshot } from './engine';

/** Subscribes to the existing connection. Never opens a second socket or changes OS state. */
export function useCharacter(live: boolean): CharacterSnapshot {
  const [engine, dispatch] = useReducer(reduceCharacter, initialCharacter);
  const [now, setNow] = useState(0);
  const presence = useOrbStore(s => s.moraPresence.state);
  useEffect(() => { dispatch({ type: 'interaction', state: presence === 'listening' || presence === 'thinking' ? presence : 'idle' }); }, [presence]);
  useEffect(() => {
    if (!live) return;
    dispatch({ type: 'connection', connected: realtime.isConnected() });
    const connected = () => dispatch({ type: 'connection', connected: true });
    const disconnected = () => dispatch({ type: 'connection', connected: false });
    const kinds = ['mora.execution.started', 'mora.execution.progress', 'mora.execution.done', 'mora.execution.failed'];
    const handlers = kinds.map(kind => (data: unknown) => { const input = executionInput(kind, data, Date.now()); if (input) dispatch(input); });
    const action = (data: unknown) => { const input = actionInput(data, Date.now()); if (input) dispatch(input); };
    realtime.on('connected', connected); realtime.on('disconnected', disconnected); realtime.on('action_status', action);
    kinds.forEach((kind, i) => realtime.on(kind, handlers[i]));
    return () => {
      realtime.off('connected', connected); realtime.off('disconnected', disconnected); realtime.off('action_status', action);
      kinds.forEach((kind, i) => realtime.off(kind, handlers[i]));
    };
  }, [live]);
  useEffect(() => {
    const tick = () => setNow(Date.now()); tick();
    const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, []);
  const hour = now ? new Date(now).getHours() : 12;
  return live ? resolveCharacter(engine, now, hour < 6 || hour >= 23) : { state: 'idle', source: 'preview' };
}
