import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, resetAllStores } from '../../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { MoraShell } from '@/components/os/shell/MoraShell';

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

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            reset: jest.fn(),
            openPane: jest.fn(),
            panes: [],
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

jest.mock('@/components/mora/Spotlight', () => ({
    Spotlight: () => <div data-testid="spotlight" />,
}));

jest.mock('@/components/mora/KeyboardShortcutsOverlay', () => ({
    KeyboardShortcutsOverlay: () => <div data-testid="shortcuts" />,
}));

jest.mock('@/components/auth/LockScreen', () => ({
    LockScreen: () => <div data-testid="lockscreen" />,
}));

jest.mock('@/components/layout/UserCursor', () => ({
    UserCursor: () => <div data-testid="user-cursor" />,
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

jest.mock('@/components/os/InteractionAudioController', () => ({
    InteractionAudioController: () => <div data-testid="interaction-audio" />,
}));

jest.mock('@/components/os/TemporalAtmosphere', () => ({
    TemporalAtmosphere: () => <div data-testid="temporal-atmosphere" />,
}));

jest.mock('@/components/os/shell/ShellBreadcrumb', () => ({
    ShellBreadcrumb: () => <div data-testid="shell-breadcrumb" />,
}));

jest.mock('@/components/visual/NeuralGrid', () => ({
    NeuralGrid: () => <div data-testid="neural-grid" />,
}));

jest.mock('@/components/organic/AmbientDust', () => ({
    AmbientDust: () => <div data-testid="ambient-dust" />,
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

jest.mock('@/lib/hooks/useWindowSnapping', () => ({
    useWindowSnapping: () => ({
        detectSnapZone: jest.fn(),
        applySnap: jest.fn(),
        snapPreview: null,
    }),
}));

beforeEach(resetAllStores);

function seedShellStores(activeMode: 'real_hq' | 'public_playground' | 'personal_demo' | 'private_preview') {
    useNavStore.setState({
        viewLevel: 'core',
        coreMode: 'home',
        viewMode: 'workspace',
        activeCompanyId: 'company-1',
        activeMode,
        navigateToCore: jest.fn(),
        setActiveCompany: jest.fn(),
        setViewMode: jest.fn(),
    } as any);

    useSessionStore.setState({
        user: { role: 'admin', tenant_id: 'tenant-1' },
        hasBooted: true,
        isLoggingOut: false,
    } as any);
}

describe('MoraShell mode indicator banner', () => {
    it('does not render banner in real_hq mode', () => {
        seedShellStores('real_hq');
        renderWithProviders(<MoraShell />);
        expect(screen.queryByText(/Website-HQ \/ Public Playground/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Personal Demo/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Private Preview/i)).not.toBeInTheDocument();
    });

    it('renders public_playground banner correctly', () => {
        seedShellStores('public_playground');
        renderWithProviders(<MoraShell />);
        expect(screen.getByText(/Website-HQ \/ Public Playground/i)).toBeInTheDocument();
        expect(screen.getByText(/Geteilte Umgebung. Du kannst Beitraege auf der Wall schreiben./i)).toBeInTheDocument();
    });

    it('renders personal_demo banner correctly', () => {
        seedShellStores('personal_demo');
        renderWithProviders(<MoraShell />);
        expect(screen.getByText(/Personal Demo/i)).toBeInTheDocument();
        expect(screen.getByText(/Deine private Testumgebung. Experimente werden nicht veroeffentlicht./i)).toBeInTheDocument();
    });

    it('renders private_preview banner correctly', () => {
        seedShellStores('private_preview');
        renderWithProviders(<MoraShell />);
        expect(screen.getByText(/Private Preview/i)).toBeInTheDocument();
        expect(screen.getByText(/Zeitlich begrenzte Voransicht. Daten werden nach 24 Stunden geloescht./i)).toBeInTheDocument();
    });
});
