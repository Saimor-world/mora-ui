import { create } from 'zustand';

export type OsContext = 'company' | 'personal';

interface ContextStore {
    osContext: OsContext;
    setOsContext: (ctx: OsContext) => void;
    toggleContext: () => void;

    // Admin mode -- orthogonal to osContext
    isAdminMode: boolean;
    setAdminMode: (active: boolean) => void;

    // Server anchor for this user's private personal space
    // Set from GET /v3/users/me/memberships (personal_space_id)
    // Null until memberships response arrives or if not provisioned
    // NOT for company universe filtering -- that is department_memberships' job
    personalSpaceId: string | null;
    setPersonalSpaceId: (id: string | null) => void;
}

export const useContextStore = create<ContextStore>((set, get) => ({
    osContext: 'company',
    setOsContext: (ctx) => set({ osContext: ctx }),
    toggleContext: () =>
        set({ osContext: get().osContext === 'company' ? 'personal' : 'company' }),

    isAdminMode: false,
    setAdminMode: (active) => set({ isAdminMode: active }),

    personalSpaceId: null,
    setPersonalSpaceId: (id) => set({ personalSpaceId: id }),
}));
