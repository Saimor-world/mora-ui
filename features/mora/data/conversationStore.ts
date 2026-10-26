'use client';
import { create } from 'zustand';
import { getDataScopeKey } from '@/lib/store/dataScope';

/** Ephemeral MÔRA conversation for the prototype shell (UI state, no persistence). */
export interface MoraTurn {
  id: string;
  role: 'user' | 'mora' | 'system';
  text: string;
  context?: string | null;
  at: number;
}

interface ConversationState {
  scope: string | null;
  turns: MoraTurn[];
  add(turn: Omit<MoraTurn, 'id' | 'at'>, scope?: string): MoraTurn;
  reset(): void;
}

let seq = 0;
export const useMoraConversation = create<ConversationState>((set) => ({
  scope: null,
  turns: [],
  add: (turn, scope = getDataScopeKey()) => {
    const t: MoraTurn = { ...turn, id: `t-${Date.now()}-${seq++}`, at: Date.now() };
    if (scope !== getDataScopeKey()) return t;
    set((s) => ({ scope, turns: [...(s.scope === scope ? s.turns : []), t].slice(-60) }));
    return t;
  },
  reset: () => set({ scope: null, turns: [] }),
}));
