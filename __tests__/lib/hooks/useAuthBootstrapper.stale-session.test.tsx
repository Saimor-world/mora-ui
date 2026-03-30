import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAuthBootstrapper } from '@/lib/hooks/useAuthBootstrapper';
import { signOut } from 'next-auth/react';
import * as coreClient from '@/lib/api/coreClient';
import * as sessionLifecycle from '@/lib/auth/sessionLifecycle';

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
}));

jest.mock('@/lib/auth/sessionLifecycle', () => ({
    clearClientSessionArtifacts: jest.fn(),
    getSessionTier: jest.requireActual('@/lib/auth/sessionLifecycle').getSessionTier,
    touchSessionActivity: jest.fn(),
}));

function Probe() {
    useAuthBootstrapper();
    return null;
}

describe('useAuthBootstrapper stale session handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        // 73h ago → neustart tier (72h+ threshold)
        localStorage.setItem('last_activity', new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString());
        (coreClient.authLogout as jest.Mock).mockResolvedValue({ success: true });
        (signOut as jest.Mock).mockResolvedValue(undefined);
    });

    it('tears down auth and redirects to root when the session is neustart (72h+)', async () => {
        render(<Probe />);

        await waitFor(() => {
            expect(coreClient.authLogout).toHaveBeenCalled();
            expect(signOut).toHaveBeenCalledWith({ redirect: false });
            expect(sessionLifecycle.clearClientSessionArtifacts).toHaveBeenCalled();
            expect(mockReplace).toHaveBeenCalledWith('/');
        });
    });

    it('does NOT tear down auth for erwachen tier (13h — under 72h threshold)', async () => {
        localStorage.setItem('last_activity', new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString());
        render(<Probe />);

        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(coreClient.authLogout).not.toHaveBeenCalled();
    });
});
