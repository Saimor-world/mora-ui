import { create } from 'zustand';

interface WorkSessionState {
    activePlanId: string | null;
    activeSessionId: string | null;
    setActiveSession: (session: { planId: string | null; sessionId?: string | null }) => void;
}

export const useWorkSessionStore = create<WorkSessionState>((set) => ({
    activePlanId: null,
    activeSessionId: null,
    setActiveSession: ({ planId, sessionId }) => set({
        activePlanId: planId,
        activeSessionId: sessionId ?? null,
    }),
}));
