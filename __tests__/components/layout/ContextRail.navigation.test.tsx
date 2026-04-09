import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContextRail } from '@/components/layout/ContextRail';
import { useMoraStore } from '@/lib/store/moraState';

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn(),
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

const mockUseMoraStore = useMoraStore as jest.MockedFunction<typeof useMoraStore>;

function renderWithState(state: Record<string, unknown>) {
    mockUseMoraStore.mockImplementation((selector?: any) => (selector ? selector(state) : state));
    (mockUseMoraStore as any).getState = () => state;
    return render(<ContextRail />);
}

describe('ContextRail core navigation contract', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Home button resets to core home via navigateToCore', async () => {
        const navigateToCore = jest.fn();
        const setViewMode = jest.fn();
        const loadTree = jest.fn();
        const setActiveCompany = jest.fn();
        const loadDepartments = jest.fn().mockResolvedValue(undefined);
        const loadNodesForCompany = jest.fn().mockResolvedValue(undefined);

        renderWithState({
            navigateToCore,
            viewLevel: 'space',
            viewMode: 'workspace',
            setViewMode,
            loadTree,
            resetStore: jest.fn(),
            isStandardMode: false,
            user: { role: 'member' },
            companies: [{ id: 'co-1', name: 'Workspace', tenant_id: 'tenant-1' }],
            setActiveCompany,
            loadDepartments,
            loadNodesForCompany,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Start' }));

        expect(setViewMode).toHaveBeenCalledWith('workspace');
        expect(navigateToCore).toHaveBeenCalledTimes(1);
    });

    it('Search button also resets to core home before opening chat', () => {
        const navigateToCore = jest.fn();
        const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
        const loadTree = jest.fn();

        renderWithState({
            navigateToCore,
            viewLevel: 'department',
            viewMode: 'workspace',
            setViewMode: jest.fn(),
            loadTree,
            resetStore: jest.fn(),
            isStandardMode: false,
            user: { role: 'member' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Suche' }));

        expect(navigateToCore).toHaveBeenCalledTimes(1);
        expect(loadTree).toHaveBeenCalledTimes(1);
        expect(dispatchSpy).toHaveBeenCalled();
        dispatchSpy.mockRestore();
    });
});
