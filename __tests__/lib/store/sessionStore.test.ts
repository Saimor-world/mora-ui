import { useSessionStore } from '@/lib/store/sessionStore';
import type { User } from '@/lib/types/mora';

const mockUser: User = {
  id: 'u1', name: 'Alice', role: 'admin', email: 'alice@test.com',
};

beforeEach(() => {
  useSessionStore.setState({
    user: null,
    permissions: { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false },
    hasBooted: false,
    isLoggingOut: false,
  });
});

describe('sessionStore', () => {
  it('setUser populates user and derives permissions from role', () => {
    useSessionStore.getState().setUser(mockUser);
    const { user, permissions } = useSessionStore.getState();
    expect(user?.name).toBe('Alice');
    expect(permissions.canAdmin).toBe(true);  // admin role
  });

  it('setUser(null) clears user and resets to demo permissions', () => {
    useSessionStore.getState().setUser(mockUser);
    useSessionStore.getState().setUser(null);
    const { user, permissions } = useSessionStore.getState();
    expect(user).toBeNull();
    expect(permissions.canCreate).toBe(false);
  });

  it('patchOperationalSession merges patch into user', () => {
    useSessionStore.getState().setUser(mockUser);
    useSessionStore.getState().patchOperationalSession({ active_company_id: 'c1' });
    expect(useSessionStore.getState().user?.active_company_id).toBe('c1');
  });

  it('resetStore clears all state', () => {
    useSessionStore.getState().setUser(mockUser);
    useSessionStore.getState().resetStore();
    expect(useSessionStore.getState().user).toBeNull();
    expect(useSessionStore.getState().hasBooted).toBe(false);
  });
});
