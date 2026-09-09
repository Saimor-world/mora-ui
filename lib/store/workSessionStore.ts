import { create } from 'zustand';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';

interface WorkSessionState {
    activePlanId: string | null;
    activeSessionId: string | null;
    identityKey: string | null;
    companyId: string | null;
    setActiveSession: (session: { planId: string | null; sessionId?: string | null }) => void;
    clearActiveSession: () => void;
}

function currentIdentityKey(): string {
    const session = useSessionStore.getState();
    return `${session.user?.tenant_id ?? 'tenant-unknown'}:${session.user?.id ?? 'anonymous'}:${session.sessionGeneration}`;
}

function currentCompanyId(): string | null {
    return useNavStore.getState().activeCompanyId ?? null;
}

export const useWorkSessionStore = create<WorkSessionState>((set) => ({
    activePlanId: null,
    activeSessionId: null,
    identityKey: null,
    companyId: null,
    setActiveSession: ({ planId, sessionId }) => set({
        activePlanId: planId,
        activeSessionId: sessionId ?? null,
        identityKey: planId ? currentIdentityKey() : null,
        companyId: planId ? currentCompanyId() : null,
    }),
    clearActiveSession: () => set({
        activePlanId: null,
        activeSessionId: null,
        identityKey: null,
        companyId: null,
    }),
}));

function invalidateWorkSessionIfScopeChanged() {
    const state = useWorkSessionStore.getState();
    if (!state.activePlanId) return;
    if (state.identityKey !== currentIdentityKey() || state.companyId !== currentCompanyId()) {
        state.clearActiveSession();
    }
}

// A resumed plan is only a pointer into CORE truth. Never carry that pointer into
// another principal/session/company and render it as if it were still authorized.
useSessionStore.subscribe(invalidateWorkSessionIfScopeChanged);
useNavStore.subscribe(invalidateWorkSessionIfScopeChanged);
