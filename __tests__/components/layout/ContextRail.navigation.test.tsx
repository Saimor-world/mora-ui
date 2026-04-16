import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContextRail } from '@/components/layout/ContextRail';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';

const STABLE_COMPANIES = [{ id: 'co-1', name: 'Workspace', tenant_id: 'tenant-1' }];

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: jest.fn(),
}));

jest.mock('@/lib/store/sessionStore', () => ({
    useSessionStore: jest.fn((selector?: any) => {
        const state = {
            user: null,
            permissions: { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false },
            hasBooted: true, isLoggingOut: false,
            resetStore: jest.fn(), setIsLoggingOut: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

jest.mock('@/lib/queries/useCompanies', () => ({
    useCompanies: () => ({ data: STABLE_COMPANIES }),
}));

jest.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('@/lib/queries/queryKeys', () => ({
    queryKeys: {
        tree: (id?: string) => ['tree', id],
        departments: (id?: string) => ['departments', id],
    },
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: {
        getState: () => ({ openPane: jest.fn() }),
    },
}));

jest.mock('@/lib/auth/useAccount', () => ({
    useAccountStore: () => ({
        currentAccount: { tenantId: 'tenant-1', role: 'member', email: 'user@example.com' },
        logout: jest.fn(),
    }),
}));

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
    }),
}));

jest.mock('framer-motion', () => {
    const React = require('react');
    return {
        motion: {
            div: React.forwardRef((props: any, ref: React.Ref<HTMLDivElement>) => <div ref={ref} {...props} />),
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

jest.mock('sonner', () => ({
    toast: {
        info: jest.fn(),
    },
}));

jest.mock('@/lib/auth/cookies', () => ({
    writeCookie: jest.fn(),
}));

jest.mock('@/lib/constants/tenants', () => ({
    isDemoTenant: jest.fn(() => false),
}));

jest.mock('@/components/mora/UserAvatar', () => ({
    UserAvatar: () => <div data-testid="user-avatar" />,
}));

jest.mock('@/lib/hooks/useUser', () => ({
    resetUserState: jest.fn(),
}));

jest.mock('@/lib/hooks/useSurfaceProfile', () => ({
    useSurfaceProfile: () => ({ isPublicDemoSurface: false, isLocalTruthSurface: false }),
}));

jest.mock('@/lib/api/coreClient', () => ({
    authLogout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/auth/sessionLifecycle', () => ({
    clearClientSessionArtifacts: jest.fn(),
}));

jest.mock('@/lib/auth/roles', () => ({
    roleLabel: (r: string) => r,
}));

const mockUseNavStore = useNavStore as jest.MockedFunction<typeof useNavStore>;

function renderWithState(state: Record<string, unknown>) {
    const navState = {
        navigateToCore: state.navigateToCore ?? jest.fn(),
        viewLevel: state.viewLevel ?? 'core',
        viewMode: state.viewMode ?? 'workspace',
        setViewMode: state.setViewMode ?? jest.fn(),
        isStandardMode: state.isStandardMode ?? false,
        activeCompanyId: 'co-1',
    };
    mockUseNavStore.mockImplementation((selector?: any) => (selector ? selector(navState) : navState));
    (mockUseNavStore as any).getState = () => ({
        ...navState,
        setActiveCompany: state.setActiveCompany ?? jest.fn(),
    });
    return render(<ContextRail />);
}

describe('ContextRail core navigation contract', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Home button resets to core home via navigateToCore', async () => {
        const navigateToCore = jest.fn();
        const setViewMode = jest.fn();

        renderWithState({
            navigateToCore,
            viewLevel: 'space',
            viewMode: 'workspace',
            setViewMode,
            isStandardMode: false,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Start' }));

        expect(setViewMode).toHaveBeenCalledWith('workspace');
        expect(navigateToCore).toHaveBeenCalledTimes(1);
    });

    it('Search button also resets to core home before opening chat', () => {
        const navigateToCore = jest.fn();
        const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

        renderWithState({
            navigateToCore,
            viewLevel: 'department',
            viewMode: 'workspace',
            setViewMode: jest.fn(),
            isStandardMode: false,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Suche' }));

        expect(navigateToCore).toHaveBeenCalledTimes(1);
        expect(dispatchSpy).toHaveBeenCalled();
        dispatchSpy.mockRestore();
    });
});
