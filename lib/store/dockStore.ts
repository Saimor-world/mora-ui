import { create } from 'zustand';

/**
 * DOCK STORE (Skeleton)
 * 
 * Manages the Dock/Chat state for the SAIMÔR/MÔRA OS.
 * 
 * Future functionality:
 * - Track dock expansion state
 * - Manage chat history
 * - Handle AI conversation context
 * - Coordinate with awareness engine
 */

export type DockMode = 'minimized' | 'pill' | 'expanded' | 'fullscreen';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
        context?: string;
        tokens?: number;
        model?: string;
    };
}

interface DockState {
    // Dock UI state
    mode: DockMode;
    isVisible: boolean;
    
    // Chat state
    messages: ChatMessage[];
    isTyping: boolean;
    currentContext: string | null;
    
    // Actions - Dock
    setMode: (mode: DockMode) => void;
    toggleDock: () => void;
    showDock: () => void;
    hideDock: () => void;
    
    // Actions - Chat
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    clearMessages: () => void;
    setTyping: (isTyping: boolean) => void;
    setContext: (context: string | null) => void;
}

export const useDockStore = create<DockState>((set, get) => ({
    // Initial state
    mode: 'pill',
    isVisible: true,
    messages: [],
    isTyping: false,
    currentContext: null,
    
    // Dock actions
    setMode: (mode) => set({ mode }),
    
    toggleDock: () => {
        const currentMode = get().mode;
        const nextMode: DockMode = 
            currentMode === 'minimized' ? 'pill' :
            currentMode === 'pill' ? 'expanded' :
            currentMode === 'expanded' ? 'pill' :
            'pill';
        set({ mode: nextMode });
    },
    
    showDock: () => set({ isVisible: true }),
    
    hideDock: () => set({ isVisible: false }),
    
    // Chat actions
    addMessage: (message) => {
        const newMessage: ChatMessage = {
            ...message,
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: new Date(),
        };
        
        set((state) => ({
            messages: [...state.messages, newMessage],
        }));
    },
    
    clearMessages: () => set({ messages: [] }),
    
    setTyping: (isTyping) => set({ isTyping }),
    
    setContext: (context) => set({ currentContext: context }),
}));

// Selector hooks for common patterns
export const useDockMode = () => useDockStore((state) => state.mode);
export const useDockMessages = () => useDockStore((state) => state.messages);
export const useIsDockTyping = () => useDockStore((state) => state.isTyping);



