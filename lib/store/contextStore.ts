import { create } from 'zustand';

interface ContextStore {
    // Admin mode -- orthogonal to normal OS usage.
    // Entering admin mode fully replaces the main content area.
    // Exiting restores normal Universe view.
    isAdminMode: boolean;
    setAdminMode: (active: boolean) => void;

    // Server anchor for this user's private personal space.
    // Set from GET /v3/users/me/memberships response (personal_space_id).
    // Null until memberships response arrives or if not yet provisioned.
    personalSpaceId: string | null;
    setPersonalSpaceId: (id: string | null) => void;
}

export const useContextStore = create<ContextStore>((set) => ({
    isAdminMode: false,
    setAdminMode: (active) => set({ isAdminMode: active }),

    personalSpaceId: null,
    setPersonalSpaceId: (id) => set({ personalSpaceId: id }),
}));
