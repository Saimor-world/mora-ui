// lib/store/chatStore.ts
// Chat scope state — purely synchronous, populated by useMoraStream from SSE preamble.

import { create } from 'zustand';
import type { LastChatScopeState } from '@/lib/types/mora';

interface ChatState {
  lastChatScope: LastChatScopeState | null;
  setLastChatScope(scope: LastChatScopeState | null): void;
}

export const useChatStore = create<ChatState>((set) => ({
  lastChatScope: null,
  setLastChatScope: (scope) =>
    set({ lastChatScope: scope ? { ...scope, updatedAt: new Date().toISOString() } : null }),
}));
