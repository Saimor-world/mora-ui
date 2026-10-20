import { useSyncExternalStore } from 'react';
import type { ProactivityInput } from '@/lib/universe/moraProactivity';

const EMPTY: ProactivityInput = {};
let current: ProactivityInput = EMPTY;
const subs = new Set<() => void>();

export function setMoraNudgeFeed(next: ProactivityInput) {
  current = next;
  subs.forEach((f) => f());
}

export function getMoraNudgeFeed() {
  return current;
}

export function useMoraNudgeFeed(): ProactivityInput {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    getMoraNudgeFeed,
    getMoraNudgeFeed,
  );
}
