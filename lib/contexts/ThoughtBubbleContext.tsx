'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';

export interface ThoughtBubble {
  id: string;
  title?: string;
  message: string;
  source?: 'mindloop' | 'semantic' | 'awareness' | 'system';
  timestamp: number;
}

interface ThoughtBubbleContextType {
  bubbles: ThoughtBubble[];
  pushBubble: (bubble: Omit<ThoughtBubble, 'id' | 'timestamp'>) => void;
  dismissBubble: (id: string) => void;
}

const ThoughtBubbleContext = createContext<ThoughtBubbleContextType | undefined>(undefined);

const MAX_QUEUE = 3;
const AUTO_DISMISS_MS = 5000;
const RATE_LIMIT_MS = 30000; // ensure calm cadence – max one bubble per 30s

export function ThoughtBubbleProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ThoughtBubble[]>([]);
  const [activeBubble, setActiveBubble] = useState<ThoughtBubble | null>(null);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShownRef = useRef<number>(0);

  const dismissBubble = useCallback((id: string) => {
    setActiveBubble((prev) => (prev?.id === id ? null : prev));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const clearNextTimer = useCallback(() => {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
  }, []);

  // Show next bubble when cadence allows
  const showNext = useCallback(() => {
    clearNextTimer();
    setQueue((prev) => {
      if (!prev.length || activeBubble) return prev;
      const now = Date.now();
      const sinceLast = now - lastShownRef.current;
      if (sinceLast < RATE_LIMIT_MS) {
        // schedule when rate-limit expires
        nextTimerRef.current = setTimeout(showNext, RATE_LIMIT_MS - sinceLast);
        return prev;
      }
      const [next, ...rest] = prev;
      setActiveBubble(next);
      lastShownRef.current = now;
      const timeout = setTimeout(() => dismissBubble(next.id), AUTO_DISMISS_MS);
      timeoutsRef.current.set(next.id, timeout);
      return rest;
    });
  }, [activeBubble, clearNextTimer, dismissBubble]);

  const pushBubble = useCallback(
    (bubble: Omit<ThoughtBubble, 'id' | 'timestamp'>) => {
      const id = `bubble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newBubble: ThoughtBubble = {
        ...bubble,
        id,
        timestamp: Date.now(),
      };

      setQueue((prev) => {
        // Ignore near-duplicates (same message in last 3s in queue or active)
        const isDuplicate =
          (activeBubble && newBubble.message === activeBubble.message && newBubble.timestamp - activeBubble.timestamp < 3000) ||
          prev.some((b) => b.message === newBubble.message && newBubble.timestamp - b.timestamp < 3000);
        if (isDuplicate) return prev;

        const updated = [...prev, newBubble];
        // Keep only latest entries to avoid spamming
        return updated.slice(-MAX_QUEUE);
      });

      showNext();
    },
    [activeBubble, showNext]
  );

  // Cleanup on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
      clearNextTimer();
    };
  }, [clearNextTimer]);

  // When active is cleared, try to show the next queued bubble in a calm cadence
  useEffect(() => {
    if (!activeBubble && queue.length) {
      showNext();
    }
  }, [activeBubble, queue.length, showNext]);

  return (
    <ThoughtBubbleContext.Provider
      value={{
        bubbles: activeBubble ? [activeBubble] : [],
        pushBubble,
        dismissBubble,
      }}
    >
      {children}
    </ThoughtBubbleContext.Provider>
  );
}

export function useThoughtBubbles() {
  const context = useContext(ThoughtBubbleContext);
  if (!context) {
    throw new Error('useThoughtBubbles must be used within ThoughtBubbleProvider');
  }
  return context;
}
