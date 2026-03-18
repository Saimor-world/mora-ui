import { create } from 'zustand';

interface WorkSessionState {
    activePlanId: string | null;
    setActivePlanId: (planId: string | null) => void;
}

export const useWorkSessionStore = create<WorkSessionState>((set) => ({
    activePlanId: null,
    setActivePlanId: (planId) => set({ activePlanId: planId }),
}));
