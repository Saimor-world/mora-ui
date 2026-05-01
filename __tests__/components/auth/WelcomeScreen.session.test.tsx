import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import * as coreClient from '@/lib/api/coreClient';
import * as cookies from '@/lib/auth/cookies';
import { signIn } from 'next-auth/react';
import { renderWithProviders, resetAllStores } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';

jest.mock('@/lib/queries/queryKeys', () => ({
    queryKeys: {
        companies: () => ['companies'],
        departments: (id?: string) => ['departments', id],
    },
}));

jest.mock('@/lib/hooks/useSurfaceProfile', () => ({
    useSurfaceProfile: () => ({
        id: 'standard',
        isPublicDemoSurface: false,
        isLocalTruthSurface: false,
        workspaceTabLabel: 'Organisation',
        fallbackCompanyName: 'Organisation',
        roleBadgeLabel: 'Arbeitsmodus',
        companySwitcherEnabled: true,
    }),
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

const HOUR = 60 * 60 * 1000;

const mockCoreGet = coreClient.coreGet as jest.MockedFunction<typeof coreClient.coreGet>;
const mockAuthLogout = coreClient.authLogout as jest.MockedFunction<typeof coreClient.authLogout>;
const mockReadCookie = cookies.readCookie as jest.MockedFunction<typeof cookies.readCookie>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockLocationAssign = jest.fn();

beforeEach(resetAllStores);

function renderWithStore(_state: Record<string, unknown> = {}) {
    useNavStore.setState({
        setViewMode: jest.fn(),
        navigateToCore: jest.fn(),
        viewMode: 'workspace',
        viewLevel: 'core',
        isStandardMode: false,
    } as any);
    useSessionStore.setState({
        user: null,
        resetStore: jest.fn(),
        setUser: jest.fn(),
    } as any);
    // Attach getState so WelcomeScreen can call useNavStore.getState()
    (useNavStore as any).getState = () => ({
        setViewMode: jest.fn(),
        navigateToCore: jest.fn(),
        setActiveCompany: jest.fn(),
    });
    (useSessionStore as any).getState = () => ({
        resetStore: jest.fn(),
        setUser: jest.fn(),
    });
    return renderWithProviders(<WelcomeScreen onAuthenticated={jest.fn()} />);
}

describe('WelcomeScreen — Mora Erwachen tiers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        mockReadCookie.mockReturnValue(null as any);
        (global.fetch as any) = jest.fn();
        mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: '/home' } as any);
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...window.location, assign: mockLocationAssign, hostname: 'localhost' },
        });
    });

    it('shows normal welcome buttons when no session exists', async () => {
        mockCoreGet.mockResolvedValue(null);

        renderWithStore();

        await waitFor(() => {
            expect(screen.getByText('Anmelden')).toBeInTheDocument();
            expect(screen.getByText('Account Erstellen')).toBeInTheDocument();
            expect(screen.getByText('Zugang prüfen')).toBeInTheDocument();
        });
    });

    it('shows "erwachen" card for 6-hour-old session with token', async () => {
        localStorage.setItem('last_activity', new Date(Date.now() - 6 * HOUR).toISOString());
        localStorage.setItem('user_name', 'Anna');
        localStorage.setItem('saimor_role', 'member');
        localStorage.setItem('last_workspace', 'Workspace Alpha');
        mockReadCookie.mockImplementation((name: string) =>
            name === 'saimor_auth' ? 'test-token' : null as any
        );

        renderWithStore();

        await waitFor(() => {
            expect(screen.getByText(/Mora erwacht/i)).toBeInTheDocument();
            expect(screen.getByText(/Anna/)).toBeInTheDocument();
            expect(screen.getByText(/Workspace Alpha/)).toBeInTheDocument();
            expect(screen.getByText('Fortsetzen')).toBeInTheDocument();
        });
    });

    it('shows "erkennung" card with password prompt for expired token', async () => {
        localStorage.setItem('last_activity', new Date(Date.now() - 48 * HOUR).toISOString());
        localStorage.setItem('user_name', 'Marco');
        localStorage.setItem('saimor_role', 'owner');
        localStorage.setItem('last_workspace', 'SAIMOR HQ');
        mockReadCookie.mockImplementation((name: string) =>
            name === 'saimor_auth' ? 'old-token' : null as any
        );
        // Backend says token expired
        mockCoreGet.mockResolvedValue(null);

        renderWithStore();

        await waitFor(() => {
            expect(screen.getByText(/Mora erkennt dich/i)).toBeInTheDocument();
            expect(screen.getByText(/Marco/)).toBeInTheDocument();
            expect(screen.getByText(/Bestaetige kurz dein Passwort/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Passwort')).toBeInTheDocument();
        });
    });

    it('shows "erkennung" card with Fortsetzen when token is still valid', async () => {
        localStorage.setItem('last_activity', new Date(Date.now() - 30 * HOUR).toISOString());
        localStorage.setItem('user_name', 'Anna');
        localStorage.setItem('saimor_role', 'member');
        mockReadCookie.mockImplementation((name: string) =>
            name === 'saimor_auth' ? 'valid-token' : null as any
        );
        // Backend validates successfully
        mockCoreGet.mockResolvedValue({
            user_id: 'user-1',
            name: 'Anna Mueller',
            email: 'anna@example.com',
            role: 'member',
            active_company_name: 'Workspace Alpha',
        } as any);

        renderWithStore();

        await waitFor(() => {
            expect(screen.getByText(/Mora erkennt dich/i)).toBeInTheDocument();
            expect(screen.getByText(/Identität bestätigt/i)).toBeInTheDocument();
        });
    });

    it('clears session and shows login for neustart tier (72h+)', async () => {
        localStorage.setItem('last_activity', new Date(Date.now() - 100 * HOUR).toISOString());
        localStorage.setItem('user_name', 'Marco');
        mockReadCookie.mockImplementation((name: string) =>
            name === 'saimor_auth' ? 'ancient-token' : null as any
        );

        renderWithStore();

        await waitFor(() => {
            expect(mockAuthLogout).toHaveBeenCalled();
            expect(screen.getByText('Anmelden')).toBeInTheDocument();
        });
    });

    it('shows no session resume when no token exists, regardless of last_activity', async () => {
        localStorage.setItem('last_activity', new Date(Date.now() - 2 * HOUR).toISOString());
        localStorage.setItem('user_name', 'Ghost');
        // No cookies — hasToken = false

        renderWithStore();

        await waitFor(() => {
            expect(screen.getByText('Anmelden')).toBeInTheDocument();
            expect(screen.queryByText(/Mora erwacht/i)).not.toBeInTheDocument();
        });
    });

    it('erkennung re-auth sends full email from last_user_email', async () => {
        localStorage.setItem('last_activity', new Date(Date.now() - 48 * HOUR).toISOString());
        localStorage.setItem('user_name', 'Marco');
        localStorage.setItem('last_user_email', 'marco@example.com');
        localStorage.setItem('saimor_role', 'owner');
        mockReadCookie.mockImplementation((name: string) =>
            name === 'saimor_auth' ? 'old-token' : null as any
        );
        // Backend says token expired
        mockCoreGet.mockResolvedValue(null);

        const mockFetch = global.fetch as jest.Mock;
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                role: 'owner',
                email: 'marco@example.com',
                tenant_id: 'tenant-1',
            }),
        } as any);

        renderWithStore();

        // Wait for erkennung card with password prompt
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Passwort')).toBeInTheDocument();
        });

        // Type password and submit
        fireEvent.change(screen.getByPlaceholderText('Passwort'), { target: { value: 'secret123' } });
        fireEvent.click(screen.getByText('Bestaetigen'));

        // Verify login was called with full email, not just username
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/auth/core-login',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        email: 'marco@example.com',
                        password: 'secret123',
                    }),
                })
            );
        });
    });

    it('does not open a shared demo account from the default entry button', async () => {
        const mockFetch = global.fetch as jest.Mock;
        mockCoreGet.mockResolvedValue(null);

        renderWithStore();

        await waitFor(() => {
            expect(screen.getByText('Zugang prüfen')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Zugang prüfen'));

        await waitFor(() => {
            expect(screen.getByPlaceholderText('name@firma.de')).toBeInTheDocument();
            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockSignIn).not.toHaveBeenCalled();
        });
    });

    it('creates an isolated website-entry workspace when a signed entry token exists', async () => {
        const mockFetch = global.fetch as jest.Mock;
        mockCoreGet.mockResolvedValue(null);
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: {
                ...window.location,
                hostname: 'localhost',
                search: '?surface=website&entity=security-audit&id=audit-123&company=Acme+GmbH&email=lead%40acme.de&domain=acme.de&score=64&level=Mittel&entry_token=signed-entry-token',
                assign: mockLocationAssign,
            },
        });
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                role: 'owner',
                email: 'entry-abc@preview.saimor.local',
                tenant_id: 'tenant-preview-abc',
                active_company_name: 'Acme GmbH',
                auth_type: 'website_entry_preview',
            }),
        } as any);

        renderWithStore();

        await waitFor(() => {
            expect(screen.getByText('Acme GmbH als HQ-Workspace öffnen')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Acme GmbH als HQ-Workspace öffnen'));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/auth/website-entry-login',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ entryToken: 'signed-entry-token' }),
                })
            );
            expect(localStorage.getItem('saimor_tenant')).toBe('tenant-preview-abc');
            expect(localStorage.getItem('last_workspace')).toBe('Acme GmbH');
            expect(mockLocationAssign).toHaveBeenCalledWith('/home');
        });
    });

    it('binds a website-entry dossier to a customer account', async () => {
        const mockFetch = global.fetch as jest.Mock;
        mockCoreGet.mockResolvedValue(null);
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: {
                ...window.location,
                hostname: 'localhost',
                search: '?surface=website&entity=security-audit&id=audit-claim&company=Acme+GmbH&email=lead%40acme.de&domain=acme.de&score=64&level=Mittel&entry_token=signed-entry-token',
                assign: mockLocationAssign,
            },
        });
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                role: 'owner',
                email: 'lead@acme.de',
                tenant_id: 'tenant-preview-abc',
                active_company_name: 'Acme GmbH',
                auth_type: 'website_entry_claim',
            }),
        } as any);

        renderWithStore();

        await waitFor(() => {
            expect(screen.getByText('Dossier mit Account verbinden')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Dossier mit Account verbinden'));
        await waitFor(() => expect(screen.getByText('Kundenaccount verbinden')).toBeInTheDocument());
        fireEvent.change(screen.getByPlaceholderText('ihre@email.de'), { target: { value: 'lead@acme.de' } });
        fireEvent.change(screen.getByPlaceholderText('Name Ihrer Organisation'), { target: { value: 'Acme GmbH' } });
        fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'claim12345' } });
        fireEvent.click(screen.getByText('Kundenaccount verbinden'));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/auth/website-entry-claim',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        entryToken: 'signed-entry-token',
                        email: 'lead@acme.de',
                        password: 'claim12345',
                        fullName: 'Acme GmbH',
                    }),
                })
            );
            expect(localStorage.getItem('saimor_tenant')).toBe('tenant-preview-abc');
            expect(localStorage.getItem('last_workspace')).toBe('Acme GmbH');
            expect(mockLocationAssign).toHaveBeenCalledWith('/home');
        });
    });
});
