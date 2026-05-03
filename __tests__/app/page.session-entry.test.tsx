import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RootPage from '@/app/page';
import { readCookie, writeCookie } from '@/lib/auth/cookies';
import { ssoLogin } from '@/lib/api/authClient';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockReadCookie = readCookie as jest.MockedFunction<typeof readCookie>;
const mockWriteCookie = writeCookie as jest.MockedFunction<typeof writeCookie>;
const mockSsoLogin = ssoLogin as jest.MockedFunction<typeof ssoLogin>;

let mockStatus: 'loading' | 'authenticated' | 'unauthenticated' = 'unauthenticated';
let mockSearchParams: Record<string, string | null> = {};

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
    }),
    useSearchParams: () => ({
        get: (key: string) => mockSearchParams[key] ?? null,
    }),
}));

jest.mock('next-auth/react', () => ({
    useSession: () => ({
        status: mockStatus,
        data: mockStatus === 'authenticated'
            ? { user: { email: 'anna@example.com' } }
            : null,
    }),
}));

jest.mock('@/lib/auth/cookies', () => ({
    readCookie: jest.fn(),
    writeCookie: jest.fn(),
    deleteCookie: jest.fn(),
}));

jest.mock('@/lib/api/authClient', () => ({
    ssoLogin: jest.fn(),
}));

jest.mock('@/lib/api/coreClient', () => ({
    authLogout: jest.fn(),
}));

jest.mock('@/components/auth/WelcomeScreen', () => ({
    WelcomeScreen: () => <div data-testid="welcome-screen">welcome</div>,
}));

jest.mock('@/components/auth/LockScreen', () => ({
    LockScreen: () => <div data-testid="lock-screen">lock</div>,
}));

describe('Root page session entry', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockStatus = 'unauthenticated';
        mockSearchParams = {};
        mockReadCookie.mockReturnValue(undefined);
        mockSsoLogin.mockResolvedValue(null);
        localStorage.clear();
    });

    it('does not auto-redirect to /home when a session exists', async () => {
        localStorage.setItem('last_user_email', 'anna@example.com');
        mockReadCookie.mockImplementation((name: string) => (
            name === 'mora_session' ? 'local-session' : undefined
        ));

        render(<RootPage />);

        await waitFor(() => {
            expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
        });
        expect(mockPush).not.toHaveBeenCalledWith('/home');
    });

    it('shows the lock screen when sleep=true and a session exists', async () => {
        mockSearchParams = { sleep: 'true' };
        localStorage.setItem('last_user_email', 'anna@example.com');
        mockReadCookie.mockImplementation((name: string) => (
            name === 'mora_session' ? 'local-session' : undefined
        ));

        render(<RootPage />);

        await waitFor(() => {
            expect(screen.getByTestId('lock-screen')).toBeInTheDocument();
        });
    });

    it('exchanges WORLD SSO tokens and routes to /entry with website context', async () => {
        mockSearchParams = {
            sso_token: 'signed-token',
            surface: 'website',
            entity: 'security-audit',
            id: 'audit-123',
            company: 'Acme GmbH',
            domain: 'acme.de',
            score: '42',
            level: 'kritisch',
        };
        mockSsoLogin.mockResolvedValue({ token: 'core-session' } as any);

        render(<RootPage />);

        await waitFor(() => {
            expect(mockSsoLogin).toHaveBeenCalledWith('signed-token');
            expect(mockWriteCookie).toHaveBeenCalledWith('mora_session', 'core-session');
            expect(mockPush).toHaveBeenCalledWith(
                '/entry?surface=website&entity=security-audit&id=audit-123&company=Acme+GmbH&domain=acme.de&score=42&level=kritisch'
            );
        });
        expect(mockReplace).toHaveBeenCalledWith('/');
    });
});
