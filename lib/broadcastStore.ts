import { create } from 'zustand';

export interface BroadcastMessage {
  id: string;
  sourceId: string;
  sourceTitle: string;
  targetSpaces: string[];
  message: string;
  timestamp: string;
  status: 'pending' | 'sent' | 'received';
  type: 'share' | 'reference' | 'insight';
}

interface BroadcastStore {
  messages: BroadcastMessage[];
  activeBroadcasts: Set<string>; // Node IDs currently broadcasting
  addMessage: (message: BroadcastMessage) => void;
  startBroadcast: (nodeId: string) => void;
  stopBroadcast: (nodeId: string) => void;
  updateMessage: (id: string, updates: Partial<BroadcastMessage>) => void;
  clearMessages: () => void;
}

export const useBroadcastStore = create<BroadcastStore>((set) => ({
  messages: [
    // Mock messages
    {
      id: 'b1',
      sourceId: 'n1',
      sourceTitle: 'Môra UI',
      targetSpaces: ['Work', 'Projects'],
      message: 'New milestone: Field Mode implemented!',
      timestamp: '2 mins ago',
      status: 'sent',
      type: 'insight',
    },
    {
      id: 'b2',
      sourceId: 'n2',
      sourceTitle: 'README.md',
      targetSpaces: ['Documentation'],
      message: 'Shared for team review',
      timestamp: '1 hour ago',
      status: 'received',
      type: 'share',
    },
  ],
  activeBroadcasts: new Set(),

  addMessage: (message) => set((state) => ({
    messages: [message, ...state.messages],
  })),

  startBroadcast: (nodeId) => set((state) => {
    const newActive = new Set(state.activeBroadcasts);
    newActive.add(nodeId);
    return { activeBroadcasts: newActive };
  }),

  stopBroadcast: (nodeId) => set((state) => {
    const newActive = new Set(state.activeBroadcasts);
    newActive.delete(nodeId);
    return { activeBroadcasts: newActive };
  }),

  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(m => m.id === id ? { ...m, ...updates } : m),
  })),

  clearMessages: () => set({ messages: [], activeBroadcasts: new Set() }),
}));
