import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RootPage from '@/app/page';
import { readCookie } from '@/lib/auth/cookies';

const mockPush = jest.fn();
const mockReadCookie = readCookie as jest.MockedFunction<typeof readCookie>;

let mockStatus: 'loading' | 'authenticated' | 'unauthenticated' = 'unauthenticated';
let mockSleepParam: string | null = null;

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
    }),
    useSearchParams: () => ({
        get: (key: string) => (key === 'sleep' ? mockSleepParam : null),
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
    deleteCookie: jest.fn(),
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
        mockSleepParam = null;
        mockReadCookie.mockReturnValue(undefined);
    });

    it('does not auto-redirect to /home when a session exists', async () => {
        mockStatus = 'authenticated';

        render(<RootPage />);

        await waitFor(() => {
            expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
        });
        expect(mockPush).not.toHaveBeenCalledWith('/home');
    });

    it('shows the lock screen when sleep=true and a session exists', async () => {
        mockStatus = 'authenticated';
        mockSleepParam = 'true';

        render(<RootPage />);

        await waitFor(() => {
            expect(screen.getByTestId('lock-screen')).toBeInTheDocument();
        });
    });
});
