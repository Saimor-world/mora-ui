import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthBootstrapper } from '@/lib/hooks/useAuthBootstrapper';
import { signOut } from 'next-auth/react';
import * as coreClient from '@/lib/api/coreClient';
import * as sessionLifecycle from '@/lib/auth/sessionLifecycle';
import { readCookie } from '@/lib/auth/cookies';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: mockReplace,
    }),
    usePathname: () => '/home',
}));

jest.mock('next-auth/react', () => ({
    useSession: () => ({
        status: 'authenticated',
        data: { user: { email: 'demo@saimor.io' } },
    }),
    signOut: jest.fn(),
}));

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    authLogout: jest.fn(),
    fetchUserProfile: jest.fn().mockResolvedValue(null),
    fetchCompanies: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/auth/sessionLifecycle', () => ({
    clearClientSessionArtifacts: jest.fn(),
    getSessionTier: jest.requireActual('@/lib/auth/sessionLifecycle').getSessionTier,
    touchSessionActivity: jest.fn(),
}));

jest.mock('@/lib/auth/cookies', () => ({
    readCookie: jest.fn(),
    writeCookie: jest.fn(),
    deleteCookie: jest.fn(),
}));

function Probe() {
    useAuthBootstrapper();
    return null;
}

function makeWrapper() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    };
}

describe('useAuthBootstrapper stale session handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        // 73h ago → neustart tier (72h+ threshold)
        localStorage.setItem('last_activity', new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString());
        localStorage.setItem('last_user_email', 'demo@saimor.io');
        (coreClient.authLogout as jest.Mock).mockResolvedValue({ success: true });
        (signOut as jest.Mock).mockResolvedValue(undefined);
        (readCookie as jest.Mock).mockImplementation((name: string) => (
            name === 'mora_session' ? 'local-session' : undefined
        ));
    });

    it('tears down auth and redirects to root when the session is neustart (72h+)', async () => {
        render(<Probe />, { wrapper: makeWrapper() });

        await waitFor(() => {
            expect(coreClient.authLogout).toHaveBeenCalled();
            expect(signOut).not.toHaveBeenCalled();
            expect(sessionLifecycle.clearClientSessionArtifacts).toHaveBeenCalled();
            expect(mockReplace).toHaveBeenCalledWith('/');
        });
    });

    it('does NOT tear down auth for erwachen tier (13h — under 72h threshold)', async () => {
        localStorage.setItem('last_activity', new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString());
        render(<Probe />, { wrapper: makeWrapper() });

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
        });
        expect(coreClient.authLogout).not.toHaveBeenCalled();
    });
});
