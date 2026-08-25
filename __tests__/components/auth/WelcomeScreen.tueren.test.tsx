import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { renderWithProviders, resetAllStores } from '../../test-utils';
import { coreGet } from '@/lib/api/coreClient';
import { fetchWorkspaceAccess } from '@/lib/api/workspaceClient';
import { readCookie } from '@/lib/auth/cookies';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';

/*
 * Drei Tueren auf dem Anmeldeschirm - zwei davon fuehrten an denselben Ort.
 *
 * Am 25.08.2026 auf hq.saimor.world gemessen: die dritte Karte verspricht
 * "Dein eigener Raum - mit Kontext ODER Login. Kein geteiltes Schaufenster."
 * Der Klick landete auf demselben Anmeldeformular wie die erste Karte.
 *
 * Im Code:
 *     onClick={() => {
 *         if (websiteEntryContext) { void handleWebsiteEntryLogin(); }
 *         else { setMode('login'); }        // <- dasselbe wie "Anmelden"
 *     }}
 *
 * websiteEntryContext entsteht nur ueber den Security-Check der Website. Wer
 * hq.saimor.world direkt eintippt, hat ihn nie - fuer den ist die Tuer eine
 * Attrappe, die etwas verspricht und den Schluessel verlangt.
 *
 * Eine Tuer, die dorthin fuehrt, wo eine andere Tuer schon hinfuehrt, ist
 * kein Angebot. Sie ist Rauschen.
 */

jest.mock('@/lib/queries/queryKeys', () => ({
    queryKeys: { companies: () => ['companies'], departments: (id?: string) => ['departments', id] },
}));

jest.mock('@/lib/hooks/useSurfaceProfile', () => ({
    useSurfaceProfile: () => ({
        id: 'hq',
        isPublicDemoSurface: false,
        isLocalTruthSurface: false,
        isHqSurface: true,
        workspaceTabLabel: 'Organisation',
        fallbackCompanyName: 'Organisation',
        roleBadgeLabel: 'Arbeitsmodus',
        companySwitcherEnabled: true,
    }),
}));

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(), authLogout: jest.fn(), getCoreBaseUrl: jest.fn(() => '/api/core'),
}));
jest.mock('@/lib/api/workspaceClient', () => ({ fetchWorkspaceAccess: jest.fn() }));
jest.mock('@/lib/auth/cookies', () => ({ writeCookie: jest.fn(), readCookie: jest.fn(), deleteCookie: jest.fn() }));
jest.mock('next-auth/react', () => ({ signIn: jest.fn() }));
jest.mock('sonner', () => ({ toast: { info: jest.fn(), error: jest.fn(), success: jest.fn(), loading: jest.fn() } }));
jest.mock('@/components/mora/MoraOrb', () => ({ MoraOrb: () => <div data-testid="mora-orb" /> }));
jest.mock('@/components/ui/CompanyLogo', () => ({ CompanyLogoUpload: () => <div data-testid="company-logo-upload" /> }));
jest.mock('@/components/auth/OnboardingWizard', () => ({ OnboardingWizard: () => <div data-testid="onboarding-wizard" /> }));

jest.mock('framer-motion', () => {
    const R = require('react');
    const passthrough = (tag: string) =>
        R.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, viewport, ...props }: any, ref: any) =>
            R.createElement(tag, { ref, ...props }, children));
    return {
        motion: new Proxy({}, { get: (_t, k) => passthrough(typeof k === 'string' ? k : 'div') }),
        AnimatePresence: ({ children }: any) => <>{children}</>,
        useReducedMotion: () => true,
    };
});

describe('Die Tueren auf dem Anmeldeschirm', () => {
    beforeEach(() => {
        resetAllStores();
        jest.clearAllMocks();
        window.sessionStorage.clear();
        window.localStorage.clear();
        // Die Fassade fragt beim Aufbau nach Sitzung und Zugriff. Ohne
        // Antwort bricht sie an einem .then() ab - das ist kein Befund,
        // sondern fehlende Einrichtung im Test.
        (readCookie as jest.Mock).mockReturnValue(null);
        (coreGet as jest.Mock).mockResolvedValue(null);
        (fetchWorkspaceAccess as jest.Mock).mockResolvedValue(null);
        useNavStore.setState({ setViewMode: jest.fn(), navigateToCore: jest.fn(), viewMode: 'workspace', viewLevel: 'core' } as any);
        useSessionStore.setState({ user: null, resetStore: jest.fn(), setUser: jest.fn() } as any);
    });

    it('zeigt ohne Website-Kontext keine dritte Tuer, die zur Anmeldung fuehrt', () => {
        renderWithProviders(<WelcomeScreen onAuthenticated={jest.fn()} />);

        // "Anmelden" bleibt - das ist die echte Tuer.
        expect(screen.getByText('Anmelden')).toBeInTheDocument();
        // "Eintreten" verspricht einen Weg ohne Login und hat keinen.
        expect(screen.queryByText('Eintreten')).not.toBeInTheDocument();
    });

    it('verspricht nicht "mit Kontext oder Login", wenn es keinen Kontext gibt', () => {
        renderWithProviders(<WelcomeScreen onAuthenticated={jest.fn()} />);
        expect(screen.queryByText(/mit Kontext oder Login/i)).not.toBeInTheDocument();
    });
});
