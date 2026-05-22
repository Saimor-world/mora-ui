import React from 'react';
import { act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, resetAllStores } from '../../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOrbStore } from '@/lib/store/orbStore';

const mockDetectSnapZone = jest.fn();
const mockApplySnap = jest.fn();

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

jest.mock('@/lib/auth/useAccount', () => ({
    useAccountStore: (selector?: any) => {
        const store = { logout: jest.fn() };
        return selector ? selector(store) : store;
    },
}));

const STABLE_PANE = {
    id: 'pane-test',
    type: 'search',
    title: 'Test',
    size: { width: 960, height: 720 },
    position: { x: 0, y: 0 },
    zIndex: 1,
    data: {},
};

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            reset: jest.fn(),
            openPane: jest.fn(),
            panes: [STABLE_PANE],
            removePane: jest.fn(),
            activePaneId: 'pane-test',
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            getPane: () => STABLE_PANE,
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
    realtime: { connect: jest.fn(), disconnect: jest.fn(), on: jest.fn(), off: jest.fn() },
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

jest.mock('@/components/os/AmbientAudioController', () => ({
    AmbientAudioController: () => <div data-testid="ambient-audio" />,
}));

jest.mock('@/components/os/MoraPulsePanel', () => ({
    MoraPulsePanel: () => <div data-testid="mora-pulse" />,
}));

jest.mock('@/components/os/MemorySidebar', () => ({
    MemorySidebar: () => <div data-testid="memory-sidebar" />,
    useMemorySidebarShortcut: jest.fn(),
}));

jest.mock('@/lib/hooks/useWindowSnapping', () => ({
    useWindowSnapping: () => ({
        detectSnapZone: mockDetectSnapZone,
        applySnap: mockApplySnap,
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

beforeEach(resetAllStores);

function seedShellStores() {
    useNavStore.setState({
        viewLevel: 'company',
        coreMode: 'home',
        viewMode: 'workspace',
        activeCompanyId: 'company-1',
        activeDepartmentId: null,
        activeSpaceId: null,
        activeFolderId: null,
        isStandardMode: false,
        nameConflict: null,
        navigateToCore: jest.fn(),
        navigateToDepartment: jest.fn(),
        navigateToSpace: jest.fn(),
        navigateToFolder: jest.fn(),
        navigateToExplore: jest.fn(),
        setActiveCompany: jest.fn(),
        setViewMode: jest.fn(),
        setIsStandardMode: jest.fn(),
        cancelNameConflict: jest.fn(),
        setNameConflict: jest.fn(),
    } as any);

    useSessionStore.setState({
        user: { role: 'admin', tenant_id: 'tenant-1' },
        permissions: {
            canCreate: false,
            canDelete: false,
            canAdmin: true,
            canEditSettings: true,
            canViewAnalytics: false,
        },
        hasBooted: true,
        isLoggingOut: false,
        resetStore: jest.fn(),
        setIsLoggingOut: jest.fn(),
    } as any);

    useOrbStore.setState({
        orbState: 'idle',
        setOrbState: jest.fn(),
    } as any);
}

describe('MoraShell window snapping', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        seedShellStores();
        mockDetectSnapZone
            .mockReturnValueOnce('left')
            .mockReturnValueOnce('right');
    });

    it('keeps drag listeners stable and applies the latest snap zone', () => {
        renderWithProviders(<MoraShell />);

        act(() => {
            window.dispatchEvent(new CustomEvent('mora-pane-drag-start'));
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 40 }));
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 1200, clientY: 40 }));
            window.dispatchEvent(new CustomEvent('mora-pane-drag-end', { detail: { paneId: 'pane-test' } }));
        });

        expect(mockDetectSnapZone).toHaveBeenCalledTimes(2);
        expect(mockApplySnap).toHaveBeenCalledWith('pane-test', 'right');
    });
});
