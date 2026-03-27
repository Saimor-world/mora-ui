import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { useMoraStore } from '@/lib/store/moraState';
import * as coreClient from '@/lib/api/coreClient';
import * as cookies from '@/lib/auth/cookies';

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn(),
}));

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    authLogout: jest.fn(),
    getCoreBaseUrl: jest.fn(() => '/api/core'),
}));

jest.mock('@/lib/auth/cookies', () => ({
    writeCookie: jest.fn(),
    readCookie: jest.fn(),
    deleteCookie: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
    signIn: jest.fn(),
}));

jest.mock('sonner', () => ({
    toast: {
        info: jest.fn(),
        error: jest.fn(),
        success: jest.fn(),
        loading: jest.fn(),
    },
}));

jest.mock('@/components/mora/MoraOrb', () => ({
    MoraOrb: () => <div data-testid="mora-orb" />,
}));

jest.mock('@/components/ui/CompanyLogo', () => ({
    CompanyLogoUpload: () => <div data-testid="company-logo-upload" />,
}));

jest.mock('@/components/auth/OnboardingWizard', () => ({
    OnboardingWizard: () => <div data-testid="onboarding-wizard" />,
}));

jest.mock('framer-motion', () => {
    const React = require('react');
    const passthrough = (tag: string) =>
        React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, viewport, ...props }: any, ref: React.Ref<any>) =>
            React.createElement(tag, { ref, ...props }, children)
        );

    return {
        motion: new Proxy({}, {
            get: (_target, key) => passthrough(typeof key === 'string' ? key : 'div'),
        }),
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        useReducedMotion: () => true,
    };
});

const mockUseMoraStore = useMoraStore as jest.MockedFunction<typeof useMoraStore>;
const mockCoreGet = coreClient.coreGet as jest.MockedFunction<typeof coreClient.coreGet>;
const mockAuthLogout = coreClient.authLogout as jest.MockedFunction<typeof coreClient.authLogout>;
const mockReadCookie = cookies.readCookie as jest.MockedFunction<typeof cookies.readCookie>;

function renderWithStore(state: Record<string, unknown>) {
    mockUseMoraStore.mockImplementation((selector?: any) => (selector ? selector(state) : state));
    (mockUseMoraStore as any).getState = () => state;
    return render(<WelcomeScreen onAuthenticated={jest.fn()} />);
}

describe('WelcomeScreen session recovery card', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        mockReadCookie.mockReturnValue(null as any);
    });

    it('shows session card when only an HttpOnly core session exists', async () => {
        mockCoreGet.mockResolvedValue({
            user_id: 'user-1',
            name: 'Anna Mueller',
            email: 'anna@example.com',
            role: 'member',
            active_company_name: 'Workspace Alpha',
        } as any);

        renderWithStore({
            setViewMode: jest.fn(),
            setUser: jest.fn(),
            navigateToCore: jest.fn(),
        });

        await waitFor(() => {
            expect(mockCoreGet).toHaveBeenCalledWith('/v3/auth/session', { skipAuth: true, isOptional: true });
            expect(screen.getByText(/Sitzung fortsetzen/i)).toBeInTheDocument();
            expect(screen.getByText(/Anna Mueller/i)).toBeInTheDocument();
            expect(screen.getByText(/Workspace Alpha/i)).toBeInTheDocument();
        });
    });

    it('keeps the normal welcome actions when no session exists', async () => {
        mockCoreGet.mockResolvedValue(null);

        renderWithStore({
            setViewMode: jest.fn(),
            setUser: jest.fn(),
            navigateToCore: jest.fn(),
        });

        await waitFor(() => {
            expect(mockCoreGet).toHaveBeenCalled();
            expect(screen.queryByText(/Sitzung fortsetzen/i)).not.toBeInTheDocument();
            expect(screen.getByText('Anmelden')).toBeInTheDocument();
            expect(screen.getByText('Account Erstellen')).toBeInTheDocument();
        });
    });

    it('does not offer session resume when the cached session is stale', async () => {
        localStorage.setItem('last_activity', new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString());
        mockCoreGet.mockResolvedValue({
            user_id: 'user-1',
            name: 'Anna Mueller',
            email: 'anna@example.com',
            role: 'member',
            active_company_name: 'Workspace Alpha',
        } as any);

        renderWithStore({
            setViewMode: jest.fn(),
            setUser: jest.fn(),
            navigateToCore: jest.fn(),
            resetStore: jest.fn(),
        });

        await waitFor(() => {
            expect(mockAuthLogout).toHaveBeenCalled();
            expect(screen.queryByText(/Sitzung fortsetzen/i)).not.toBeInTheDocument();
            expect(screen.getByText('Anmelden')).toBeInTheDocument();
        });
    });
});
