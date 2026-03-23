import { create } from 'zustand';

export type OsContext = 'company' | 'personal';

interface ContextStore {
    osContext: OsContext;
    setOsContext: (ctx: OsContext) => void;
    toggleContext: () => void;
}

export const useContextStore = create<ContextStore>((set, get) => ({
    osContext: 'company', // Universe is primary -- default opening context
    setOsContext: (ctx) => set({ osContext: ctx }),
    toggleContext: () =>
        set({ osContext: get().osContext === 'company' ? 'personal' : 'company' }),
}));
