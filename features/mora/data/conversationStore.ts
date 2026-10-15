'use client';
import { create } from 'zustand';

/** Ephemeral MÔRA conversation for the prototype shell (UI state, no persistence). */
export interface MoraTurn {
  id: string;
  role: 'user' | 'mora' | 'system';
  text: string;
  context?: string | null;
  at: number;
}

interface ConversationState {
  turns: MoraTurn[];
  add(turn: Omit<MoraTurn, 'id' | 'at'>): MoraTurn;
  reset(): void;
}

let seq = 0;
export const useMoraConversation = create<ConversationState>((set) => ({
  turns: [],
  add: (turn) => {
    const t: MoraTurn = { ...turn, id: `t-${Date.now()}-${seq++}`, at: Date.now() };
    set((s) => ({ turns: [...s.turns, t].slice(-60) }));
    return t;
  },
  reset: () => set({ turns: [] }),
}));
