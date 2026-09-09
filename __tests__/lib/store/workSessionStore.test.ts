import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useWorkSessionStore } from '@/lib/store/workSessionStore';

function setIdentity(userId: string, generation: number) {
  useSessionStore.setState((state) => ({
    ...state,
    user: {
      id: userId,
      name: 'Test User',
      role: 'member',
      tenant_id: 'tenant-a',
    },
    sessionGeneration: generation,
  }));
}

describe('workSessionStore scope invalidation', () => {
  beforeEach(() => {
    useWorkSessionStore.getState().clearActiveSession();
    useNavStore.setState({ activeCompanyId: 'company-a' });
    setIdentity('user-a', 1);
  });

  it('keeps a plan only inside the identity and company that activated it', () => {
    useWorkSessionStore.getState().setActiveSession({ planId: 'plan-a', sessionId: 'session-a' });
    expect(useWorkSessionStore.getState().activePlanId).toBe('plan-a');

    useNavStore.setState({ activeCompanyId: 'company-b' });
    expect(useWorkSessionStore.getState().activePlanId).toBeNull();
  });

  it('drops a plan when a new login generation starts for the same user', () => {
    useWorkSessionStore.getState().setActiveSession({ planId: 'plan-a', sessionId: 'session-a' });
    setIdentity('user-a', 2);

    expect(useWorkSessionStore.getState().activePlanId).toBeNull();
    expect(useWorkSessionStore.getState().activeSessionId).toBeNull();
  });
});
