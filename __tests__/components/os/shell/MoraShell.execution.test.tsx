/**
 * MoraShell.execution.test.tsx
 * TDD RED → GREEN: state-aware session card renders correctly for
 * running / waiting_confirmation / done states.
 *
 * Strategy: render MoraShell, fire a WORK_SESSION_PLAN_EVENT CustomEvent
 * to set workSessionSummary state, then assert card content.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WORK_SESSION_PLAN_EVENT } from '@/lib/utils/moraExplanation';

// ── heavy dependency mocks ─────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
    usePathname: () => '/',
    useSearchParams: () => ({ get: jest.fn() }),
}));

jest.mock('@/lib/hooks/useAuthBootstrapper', () => ({
    useAuthBootstrapper: () => ({ isBootstrapped: true, authError: null }),
}));

jest.mock('@/lib/hooks/useOperationalFlip', () => ({
    useOperationalFlip: jest.fn(),
}));

jest.mock('@/lib/hooks/useUser', () => ({
    resetUserState: jest.fn(),
}));

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: (selector?: any) => {
        const store = {
            orbNotifications: [],
            companies: [],
            departments: [],
            spacesByDepartment: {},
            foldersBySpace: {},
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: jest.fn((selector?: any) => {
        const state = {
            viewLevel: 'company', coreMode: 'home', viewMode: 'workspace',
            activeCompanyId: 'company-1', activeDepartmentId: null, activeSpaceId: null, activeFolderId: null,
            isStandardMode: false, nameConflict: null,
            navigateToCore: jest.fn(), navigateToDepartment: jest.fn(),
            navigateToSpace: jest.fn(), navigateToFolder: jest.fn(), navigateToExplore: jest.fn(),
            setActiveCompany: jest.fn(), setViewMode: jest.fn(), setIsStandardMode: jest.fn(),
            cancelNameConflict: jest.fn(), setNameConflict: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

jest.mock('@/lib/store/sessionStore', () => ({
    useSessionStore: jest.fn((selector?: any) => {
        const state = {
            user: { role: 'admin', tenant_id: 'tenant-1' },
            permissions: { canCreate: false, canDelete: false, canAdmin: true, canEditSettings: true, canViewAnalytics: false },
            hasBooted: true, isLoggingOut: false,
            resetStore: jest.fn(), setIsLoggingOut: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

jest.mock('@/lib/store/orbStore', () => ({
    useOrbStore: jest.fn((selector?: any) => {
        const state = { orbState: 'idle', setOrbState: jest.fn() };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

jest.mock('@/lib/auth/useAccount', () => ({
    useAccountStore: (selector?: any) => {
        const store = { logout: jest.fn() };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            reset: jest.fn(),
            openPane: jest.fn(),
            panes: [],
            removePane: jest.fn(),
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/hooks/shell', () => ({
    useShellEvents: jest.fn(),
    useAwareness: jest.fn().mockReturnValue({ orbState: 'idle' }),
    useMindloopStream: jest.fn(),
    useRealtime: jest.fn(),
    useKeyboardShortcuts: jest.fn(),
}));

jest.mock('@/lib/api/realtimeClient', () => ({
    realtime: { connect: jest.fn(), disconnect: jest.fn() },
}));

jest.mock('@/components/layout/ViewPort', () => ({
    ViewPort: () => <div data-testid="viewport" />,
}));

jest.mock('@/components/visual/StarField', () => ({
    StarField: () => <div data-testid="starfield" />,
}));

jest.mock('@/components/mora/MoraLivingBackground', () => ({
    MoraLivingBackground: () => <div data-testid="living-bg" />,
}));

jest.mock('@/components/visual/ForestLightCanopy', () => ({
    ForestLightCanopy: () => <div data-testid="canopy" />,
}));

jest.mock('@/components/mora/Dock', () => ({
    Dock: () => <div data-testid="dock" />,
}));

jest.mock('@/components/mora/ResonanceRoom', () => ({
    ResonanceRoom: () => <div data-testid="resonance" />,
}));

jest.mock('@/components/mora/Spotlight', () => ({
    Spotlight: () => <div data-testid="spotlight" />,
}));

jest.mock('@/components/mora/KeyboardShortcutsOverlay', () => ({
    KeyboardShortcutsOverlay: () => <div data-testid="shortcuts" />,
}));

jest.mock('@/components/auth/LockScreen', () => ({
    LockScreen: () => <div data-testid="lockscreen" />,
}));

jest.mock('@/components/mora/MoraInsightPopup', () => ({
    MoraInsightPopup: () => <div data-testid="insight-popup" />,
}));

jest.mock('@/lib/hooks/useMindLoopInsights', () => ({
    useMindLoopInsights: () => ({
        currentInsight: null,
        confirmInsight: jest.fn(),
        dismissInsight: jest.fn(),
    }),
}));

jest.mock('@/components/mora/CursorAgent', () => ({
    CursorAgent: () => <div data-testid="cursor-agent" />,
}));

jest.mock('@/components/agency/AgencyCursor', () => ({
    AgencyCursor: () => <div data-testid="agency-cursor" />,
}));

jest.mock('@/components/mora/GhostOverlay', () => ({
    GhostOverlay: () => <div data-testid="ghost" />,
}));

jest.mock('@/components/layout/UserCursor', () => ({
    UserCursor: () => <div data-testid="user-cursor" />,
}));

jest.mock('@/components/effects/CursorTrailEffect', () => ({
    CursorTrailEffect: () => <div data-testid="cursor-trail" />,
}));

jest.mock('@/components/home/UniverseControls', () => ({
    UniverseControls: () => <div data-testid="universe-controls" />,
}));

jest.mock('@/components/mora/MyceliumDropfield', () => ({
    MyceliumDropfield: () => <div data-testid="mycelium-dropfield" />,
}));

jest.mock('@/components/ui/ConnectionBanner', () => ({
    ConnectionBanner: () => <div data-testid="connection-banner" />,
}));

jest.mock('@/components/ui/QuickTips', () => ({
    QuickTips: () => <div data-testid="quick-tips" />,
}));

jest.mock('@/components/ui/MoraGreeting', () => ({
    MoraGreeting: () => <div data-testid="mora-greeting" />,
}));

jest.mock('@/components/ui/SystemStats', () => ({
    SystemStats: () => <div data-testid="system-stats" />,
}));

jest.mock('@/components/os/QuickPreview', () => ({
    QuickPreview: () => <div data-testid="quick-preview" />,
}));

jest.mock('@/components/os/SnapPreview', () => ({
    SnapPreview: () => <div data-testid="snap-preview" />,
}));

jest.mock('@/components/os/MemorySidebar', () => ({
    MemorySidebar: () => <div data-testid="memory-sidebar" />,
    useMemorySidebarShortcut: jest.fn(),
}));

jest.mock('@/lib/hooks/useWindowSnapping', () => ({
    useWindowSnapping: () => ({
        detectSnapZone: jest.fn(),
        applySnap: jest.fn(),
        snapPreview: null,
    }),
}));

jest.mock('@/lib/utils/searchOpen', () => ({
    NAVIGATION_RESULT_EVENT: 'saimor:navigation-result',
    openNavigationOutcome: jest.fn(),
}));

jest.mock('@/components/ui/NameConflictModal', () => ({
    __esModule: true,
    default: () => <div data-testid="name-conflict" />,
}));

jest.mock('@/components/dev/IntelligenceDiagnostics', () => ({
    IntelligenceDiagnostics: () => <div data-testid="diagnostics" />,
}));

jest.mock('@/lib/constants/tenants', () => ({
    TENANT_DEMO: 'demo-tenant',
    TENANT_HQ: 'hq-tenant',
}));

import { MoraShell } from '@/components/os/shell/MoraShell';

// ── helpers ────────────────────────────────────────────────────────────────

function fireSessionEvent(detail: Record<string, unknown>) {
    act(() => {
        window.dispatchEvent(new CustomEvent(WORK_SESSION_PLAN_EVENT, { detail }));
    });
}

const BASE_SUMMARY = {
    planId: 'plan-1',
    sessionId: 'sess-1',
    source: 'chat',
    title: 'Mein Testplan',
    stats: { total_steps: 3, completed_steps: 1, read_steps: 1, write_steps: 2, pending_confirmations: 0 },
};

// ── tests ──────────────────────────────────────────────────────────────────

// 1.0 gated — WorkSession banner removed from shell (work-session is future-tier).
// Tests kept for reactivation when work-session surface ships.
// See docs/plans/2026-03-27-surface-hierarchy-1.0.md § Future / Hidden
describe.skip('MoraShell execution card', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('state running: card has border-blue-400/28 class and "Laeuft gerade" text', async () => {
        render(<MoraShell />);

        fireSessionEvent({ ...BASE_SUMMARY, state: 'running' });

        await waitFor(() => {
            expect(screen.getByText('Laeuft gerade')).toBeInTheDocument();
        });

        const card = document.querySelector('.border-blue-400\\/28');
        expect(card).not.toBeNull();
    });

    it('state waiting_confirmation: card has border-amber-400/28 class and "Freigabe erforderlich" text', async () => {
        render(<MoraShell />);

        fireSessionEvent({ ...BASE_SUMMARY, state: 'waiting_confirmation' });

        await waitFor(() => {
            expect(screen.getByText('Freigabe erforderlich')).toBeInTheDocument();
        });

        const card = document.querySelector('.border-amber-400\\/28');
        expect(card).not.toBeNull();
    });

    it('state done: "Abgeschlossen" renders', async () => {
        render(<MoraShell />);

        fireSessionEvent({ ...BASE_SUMMARY, state: 'done' });

        await waitFor(() => {
            expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
        });
    });

    it('running with running_step_title: step title renders in card body', async () => {
        render(<MoraShell />);

        fireSessionEvent({ ...BASE_SUMMARY, state: 'running', running_step_title: 'Datei lesen' });

        await waitFor(() => {
            expect(screen.getByText('Datei lesen')).toBeInTheDocument();
        });
    });

    it('running without running_step_title: getSessionBodyText fallback renders', async () => {
        render(<MoraShell />);

        // No running_step_title — fallback should show "Mora arbeitet am Arbeitsplan."
        fireSessionEvent({ ...BASE_SUMMARY, state: 'running', stats: { total_steps: 0, completed_steps: 0 } });

        await waitFor(() => {
            expect(screen.getByText('Mora arbeitet am Arbeitsplan.')).toBeInTheDocument();
        });
    });

    it('waiting with next_message: renders next_message text', async () => {
        render(<MoraShell />);

        fireSessionEvent({
            ...BASE_SUMMARY,
            state: 'waiting_confirmation',
            next_message: 'Bitte bestaetige diesen Schritt',
        });

        await waitFor(() => {
            expect(screen.getByText('Bitte bestaetige diesen Schritt')).toBeInTheDocument();
        });
    });

    it('waiting with no next_message but pending_confirmation_title: renders that title', async () => {
        render(<MoraShell />);

        fireSessionEvent({
            ...BASE_SUMMARY,
            state: 'waiting_confirmation',
            pending_confirmation_title: 'Schritt X',
        });

        await waitFor(() => {
            expect(screen.getByText('Schritt X')).toBeInTheDocument();
        });
    });

    it('waiting with neither next_message nor pending_confirmation_title: fallback renders', async () => {
        render(<MoraShell />);

        fireSessionEvent({
            ...BASE_SUMMARY,
            state: 'waiting_confirmation',
            stats: { total_steps: 3, completed_steps: 1, pending_confirmations: 0 },
        });

        await waitFor(() => {
            expect(screen.getByText('Mora wartet auf deine Entscheidung')).toBeInTheDocument();
        });
    });

    it('waiting with next_label: renders next_label as secondary hint', async () => {
        render(<MoraShell />);

        fireSessionEvent({
            ...BASE_SUMMARY,
            state: 'waiting_confirmation',
            next_message: 'Bitte bestaetige',
            next_label: 'Ausfuehren',
        });

        await waitFor(() => {
            expect(screen.getByText('Ausfuehren')).toBeInTheDocument();
        });
    });
});
