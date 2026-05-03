import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContextRail } from '@/components/layout/ContextRail';
import { renderWithProviders, resetAllStores, createTestQueryClient, testFixtures } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { queryKeys } from '@/lib/queries/queryKeys';

const STABLE_COMPANIES = [{ id: 'co-1', name: 'Workspace', tenant_id: 'tenant-1' }];

const mockOpenPane = jest.fn();

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: {
        getState: () => ({ openPane: mockOpenPane }),
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

beforeEach(resetAllStores);

function renderWithState(state: Record<string, unknown>) {
    useNavStore.setState({
        navigateToCore: state.navigateToCore ?? jest.fn(),
        viewLevel: state.viewLevel ?? 'core',
        viewMode: state.viewMode ?? 'workspace',
        setViewMode: state.setViewMode ?? jest.fn(),
        isStandardMode: state.isStandardMode ?? false,
        activeCompanyId: 'co-1',
        setActiveCompany: state.setActiveCompany ?? jest.fn(),
    } as any);

    useSessionStore.setState({
        user: null,
        permissions: { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false },
        hasBooted: true,
        isLoggingOut: false,
        resetStore: jest.fn(),
        setIsLoggingOut: jest.fn(),
    } as any);

    const qc = createTestQueryClient();
    qc.setQueryData(queryKeys.companies(), STABLE_COMPANIES);
    return renderWithProviders(<ContextRail />, { queryClient: qc });
}

describe('ContextRail core navigation contract', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockOpenPane.mockClear();
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

    it('Search button opens the search pane', () => {
        renderWithState({
            navigateToCore: jest.fn(),
            viewLevel: 'department',
            viewMode: 'workspace',
            setViewMode: jest.fn(),
            isStandardMode: false,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Suche' }));

        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'search' })
        );
    });
});
