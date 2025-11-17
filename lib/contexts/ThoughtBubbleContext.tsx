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

const MAX_BUBBLES = 3;
const AUTO_DISMISS_MS = 5000;

export function ThoughtBubbleProvider({ children }: { children: ReactNode }) {
  const [bubbles, setBubbles] = useState<ThoughtBubble[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissBubble = useCallback((id: string) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const pushBubble = useCallback(
    (bubble: Omit<ThoughtBubble, 'id' | 'timestamp'>) => {
      const id = `bubble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newBubble: ThoughtBubble = {
        ...bubble,
        id,
        timestamp: Date.now(),
      };

      setBubbles((prev) => {
        // Check for duplicates: same message within last 3 seconds
        const isDuplicate = prev.some(
          (b) =>
            b.message === newBubble.message &&
            newBubble.timestamp - b.timestamp < 3000
        );

        if (isDuplicate) {
          return prev; // Skip duplicate
        }

        // Add new bubble and enforce max limit (FIFO)
        const updated = [...prev, newBubble];
        if (updated.length > MAX_BUBBLES) {
          // Remove oldest bubble
          const removed = updated.shift();
          if (removed) {
            const timeout = timeoutsRef.current.get(removed.id);
            if (timeout) {
              clearTimeout(timeout);
              timeoutsRef.current.delete(removed.id);
            }
          }
        }
        return updated;
      });

      // Auto-dismiss after timeout
      const timeout = setTimeout(() => {
        dismissBubble(id);
      }, AUTO_DISMISS_MS);
      timeoutsRef.current.set(id, timeout);
    },
    [dismissBubble]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  return (
    <ThoughtBubbleContext.Provider value={{ bubbles, pushBubble, dismissBubble }}>
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
