import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeSurface } from '@/components/home/HomeSurface';
import { usePaneStore } from '@/lib/store/paneStore';
import { useAccountStore } from '@/lib/auth/useAccount';
import { useActivityStore } from '@/lib/store/activityStore';
import * as sessionLifecycle from '@/lib/auth/sessionLifecycle';
import { renderWithProviders, resetAllStores, createTestQueryClient, testFixtures } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { DEFAULT_SURFACE_PROFILE } from '@/lib/os/surfaceProfile';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';

jest.mock('@/lib/hooks/useSurfaceProfile', () => ({
    useSurfaceProfile: jest.fn(),
}));

jest.mock('@/lib/hooks/useCreateDossierNode', () => ({
    useCreateDossierNode: jest.fn().mockReturnValue({ nodeId: 'mock-node-99', isCreating: false }),
}));

jest.mock('@/lib/hooks/useAutoOpenDossier', () => ({
    useAutoOpenDossier: jest.fn(),
}));

import { useSessionStore } from '@/lib/store/sessionStore';
import { queryKeys } from '@/lib/queries/queryKeys';
import { WEBSITE_ENTRY_CONTEXT_STORAGE_KEY } from '@/lib/websiteEntryStorage';

// ── mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/api/coreClient', () => ({
    authLogout: jest.fn(),
    fetchMyContent: jest.fn().mockResolvedValue(null),
    // useCommunicationLiveData (added in 1aef20c) calls coreGet for mail/calendar polling
    coreGet: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/auth/sessionLifecycle', () => ({
    clearClientSessionArtifacts: jest.fn(),
}));

jest.mock('@/lib/hooks/useCommunicationLiveData', () => ({
    useCommunicationLiveData: () => ({
        mailPreview: [],
        calendarPreview: [],
        feedPreview: [],
        cloudPreview: [],
        isLoading: false,
        refresh: jest.fn(),
    }),
}));

jest.mock('@/lib/hooks/useIntegrationsOverview', () => ({
    useIntegrationsOverview: () => ({
        overview: null,
        isLoading: false,
        error: null,
        browserBridge: { supported: false, permission: 'unsupported' },
        loadOverview: jest.fn(),
        refreshBrowserBridge: jest.fn(),
    }),
}));

jest.mock('@/lib/hooks/useLocalTruthBridge', () => ({
    useLocalTruthBridge: () => ({
        state: 'offline',
        isLocalSurface: true,
        uiReachable: false,
        coreReachable: false,
        selectedUiUrl: null,
        selectedCoreUrl: null,
        lastCheckedAt: null,
        error: null,
        refresh: jest.fn(),
    }),
}));

jest.mock('@/lib/home/briefing', () => ({
    buildBriefing: jest.fn((_depts: any, _tree: any) => 'R&D ist aktiv — 3 Inhalte.'),
}));

jest.mock('framer-motion', () => {
    const motionProps = new Set(['animate', 'exit', 'initial', 'transition', 'variants', 'whileHover', 'whileTap']);
    const strip = (props: any) => Object.fromEntries(Object.entries(props).filter(([k]) => !motionProps.has(k)));
    return {
        AnimatePresence: ({ children }: any) => <>{children}</>,
        motion: {
            div:    ({ children, ...props }: any) => <div    {...strip(props)}>{children}</div>,
            span:   ({ children, ...props }: any) => <span   {...strip(props)}>{children}</span>,
            button: ({ children, ...props }: any) => <button {...strip(props)}>{children}</button>,
        },
        useReducedMotion: () => false,
    };
});

jest.mock('@/lib/api/nightwatchClient', () => ({
    fetchNightwatchIncidents: jest.fn().mockResolvedValue([]),
}));

// ── stable module-level refs ─────────────────────────────────────────────

const STABLE_DEPTS = [
    { id: 'dept-rd',      name: 'R&D',     company_id: 'co-1', color: '#10b981' },
    { id: 'dept-product', name: 'Product', company_id: 'co-1', color: '#06b6d4' },
    { id: 'dept-growth',  name: 'Growth',  company_id: 'co-1', color: '#8b5cf6' },
];
const STABLE_TREE = [
    { id: 'dept-rd',      children: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }] },
    { id: 'dept-product', children: [] },
    { id: 'dept-growth',  children: [] },
];
const STABLE_USER = { id: 'u-1', name: 'Anna Mueller', role: 'member' as const, email: 'anna@example.com' };

const mockClearArtifacts = sessionLifecycle.clearClientSessionArtifacts as jest.MockedFunction<typeof sessionLifecycle.clearClientSessionArtifacts>;

const openPane     = jest.fn();
const getPane      = jest.fn().mockReturnValue(null);
const focusPane    = jest.fn();
const restorePane  = jest.fn();
const updatePane   = jest.fn();
const updatePanePosition = jest.fn();
const updatePaneSize     = jest.fn();
const accountLogout = jest.fn();
const resetStore    = jest.fn();
const setUser       = jest.fn();
const navigateToAmbient = jest.fn();

// ── fixtures ───────────────────────────────────────────────────────────────

const depts = STABLE_DEPTS;
const treeWithActivity = STABLE_TREE;

// ── setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
    (useSurfaceProfile as jest.Mock).mockReturnValue(DEFAULT_SURFACE_PROFILE);
    localStorage.clear();

    useNavStore.setState({
        activeCompanyId: 'co-1',
        coreMode: 'home',
        isStandardMode: false,
        setCoreMode: jest.fn(),
        navigateToAmbient,
    } as any);

    useSessionStore.setState({
        user: STABLE_USER,
        resetStore,
        setUser,
    } as any);

    usePaneStore.setState({
        openPane, getPane, focusPane, restorePane,
        updatePane, updatePanePosition, updatePaneSize,
    } as any);

    useAccountStore.setState({ logout: accountLogout } as any);
    useActivityStore.setState({ recentItems: [] });
});

/**
 * One source for both the fixture and the assertions below.
 *
 * These labels are only ever asserted *negatively* — placeholders must not
 * reach the cockpit as if they were real recommendations. A negative assertion
 * with a wrong needle passes silently, so typing the haystack and the needle
 * separately is how this suite once stopped testing anything at all: the `ô`
 * in 'Saimôr Desk' decayed into a U+FFFD replacement character on one side,
 * the query never matched, and the green tick meant nothing. Sharing the
 * constant makes needle and haystack impossible to drift apart, and
 * `__tests__/source-encoding.test.ts` guards the character itself.
 */
const PLACEHOLDER_LABELS = [
    'Mail für OpenClaw vorbereiten',
    'Kalender für OpenClaw vorbereiten',
    'OpenClaw Infrastruktur',
    'Saimôr Desk',
] as const;

const PLACEHOLDER_CARDS = PLACEHOLDER_LABELS.map((label) => ({
    label,
    reason: 'No backend evidence contract found',
}));

function renderWithDepts(depsData = STABLE_DEPTS, treeData = STABLE_TREE, homeData?: any) {
    const qc = createTestQueryClient();
    qc.setQueryData(queryKeys.departments('co-1'), depsData);
    qc.setQueryData(queryKeys.tree('co-1'), treeData);
    qc.setQueryData(queryKeys.companies(), [{ id: 'co-1', name: 'Test Corp' }]);
    qc.setQueryData(queryKeys.viewHome(), homeData ?? {
        company: { id: 'co-1', name: 'Test Corp', is_visitor: false },
        greeting: '',
        changes: [{ id: 'change-1', title: 'Tageslage aktualisiert', scope: 'mindloop_events', occurred_at: '2026-06-05T10:00:00Z', severity: 0.4 }],
        attention: [],
        next_steps: [],
    });
    qc.setQueryData(queryKeys.viewHomeStatus(), {
        tenant_id: 'tenant-demo',
        user_role: 'owner',
        company: { id: 'co-1', name: 'Test Corp', is_visitor: false },
        home_truth: { changes: [], attention: [], next_steps: [] },
        runtime: { status: 'unknown', evidence: [] },
        home_cards: {
            verified: [{ id: 'changes', label: 'Was hat sich verändert?', source: 'mindloop_events' }],
            placeholder: PLACEHOLDER_CARDS,
            unknown: [{ id: 'next_steps', label: 'Nächster echter Schritt', reason: 'No tenant-scoped task node is available' }],
        },
        placeholders_detected: PLACEHOLDER_CARDS,
        unknowns: [
            { id: 'runtime_larry_openclaw', reason: 'No CORE evidence contract currently proves runtime state' },
            { id: 'connector_handshake', reason: 'Stored connector config is not a live handshake' },
        ],
    });
    return renderWithProviders(<HomeSurface />, { queryClient: qc });
}

// ── rendering ──────────────────────────────────────────────────────────────

describe('HomeSurface — rendering', () => {
    it('frames Home in the full-bleed cockpit workspace', () => {
        renderWithDepts();
        const workspace = screen.getByTestId('openflow-workspace');
        expect(workspace).toHaveClass('inset-x-0');
        expect(workspace).not.toHaveClass('max-w-[1320px]');
        expect(screen.getByTestId('home-cockpit')).toBeInTheDocument();
        expect(screen.getByTestId('home-widget-meinTag')).toBeInTheDocument();
        expect(screen.getByTestId('home-widget-signals')).toBeInTheDocument();
        expect(screen.getByTestId('home-priority-card')).toBeInTheDocument();
        expect(screen.getByTestId('home-status-grid')).toBeInTheDocument();
    });

    it('lets a critical system signal overrule the calm organizational lead', () => {
        renderWithDepts(STABLE_DEPTS, STABLE_TREE, {
            company: { id: 'co-1', name: 'Test Corp', is_visitor: false },
            greeting: '',
            changes: [],
            attention: [{
                id: 'storage-truth',
                title: 'Einige Dateien sind nicht vollständig verfügbar',
                detail: 'Die betroffenen Inhalte müssen erneut bereitgestellt werden.',
                severity: 0.85,
                category: 'risk',
                scope: 'system',
            }],
            next_steps: [],
            priority: {
                state: 'attention',
                domain: 'system',
                eyebrow: 'System braucht Aufmerksamkeit',
                title: 'Einige Dateien sind nicht vollständig verfügbar',
                detail: 'Die betroffenen Inhalte müssen erneut bereitgestellt werden.',
                severity: 0.85,
                action: 'signals',
            },
        });

        expect(screen.getByTestId('home-priority-card')).toHaveTextContent('System braucht Aufmerksamkeit');
        expect(screen.getByTestId('home-priority-card')).toHaveTextContent('Einige Dateien sind nicht vollständig verfügbar');
        expect(screen.queryByText('Kein akuter Handlungsdruck')).not.toBeInTheDocument();
        expect(screen.getByTestId('home-status-grid')).toHaveTextContent('Einige Dateien sind nicht vollständig verfügbar');
    });

    it('renders HomeCockpit zones for normal OS home', async () => {
        renderWithDepts();
        await waitFor(() => {
            expect(screen.getByTestId('home-widget-meinTag')).toBeInTheDocument();
            expect(screen.getByTestId('home-widget-signals')).toBeInTheDocument();
            expect(screen.getByTestId('home-widget-team')).toBeInTheDocument();
        });
    });

    it('does not render Home status placeholders as normal recommendations', async () => {
        renderWithDepts();
        await waitFor(() => expect(screen.getByTestId('home-widget-meinTag')).toBeInTheDocument());

        PLACEHOLDER_LABELS.forEach((label) => {
            expect(screen.queryByText(label)).not.toBeInTheDocument();
        });
        expect(screen.queryByText('Noch kein belegter nächster Schritt.')).not.toBeInTheDocument();
    });

    it.each(PLACEHOLDER_LABELS)('would actually notice %s on screen', (label) => {
        // Positive control for the negative assertions above. Without it,
        // nothing proves those queries *can* match — a mistyped or
        // mis-encoded needle would make them pass while guarding nothing.
        renderWithDepts(STABLE_DEPTS, STABLE_TREE, {
            company: { id: 'co-1', name: 'Test Corp', is_visitor: false },
            greeting: '',
            changes: [],
            attention: [],
            next_steps: [],
            priority: {
                state: 'attention',
                domain: 'system',
                eyebrow: 'System braucht Aufmerksamkeit',
                title: label,
                detail: 'Kontrollfall: dieser Text wird bewusst gerendert.',
                severity: 0.85,
                action: 'signals',
            },
        });

        expect(screen.getByTestId('home-priority-card')).toHaveTextContent(label);
    });

    it('renders cockpit when no user', async () => {
        useSessionStore.setState({ user: null, resetStore, setUser } as any);
        renderWithDepts();
        await waitFor(() => {
            // HomeCockpit renders even without a user — greeting adapts but zones remain
            expect(screen.getByTestId('home-widget-meinTag')).toBeInTheDocument();
        });
    });

    it('renders the logout button', () => {
        renderWithDepts();
        expect(screen.getByTestId('home-logout')).toBeInTheDocument();
    });

    it('does not render old Voice Room suggestions in the default Lagebild', () => {
        renderWithDepts();
        expect(screen.queryByRole('button', { name: 'Voice Room' })).not.toBeInTheDocument();
        expect(navigateToAmbient).not.toHaveBeenCalled();
    });

    it('surfaces stored website entry context as the current OS focus', async () => {
        localStorage.setItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY, JSON.stringify({
            surface: 'website',
            entity: 'security-audit',
            id: 'audit-123',
            companyName: 'Acme GmbH',
            domain: 'acme.de',
            score: 61,
            title: 'Digital Risk Check aus der Website',
            rooms: [],
            documents: [],
            tasks: [
                { title: 'Audit-Ergebnis validieren', priority: 'mittel' },
                { title: 'Echte Tools verbinden', priority: 'niedrig' },
            ],
        }));

        renderWithDepts();

        await waitFor(() => {
            expect(screen.getByTestId('website-entry-home-card')).toBeInTheDocument();
            // Shows the domain from the stored context
            expect(screen.getByText('acme.de')).toBeInTheDocument();
            // Shows task titles from the context
            expect(screen.getByText('Audit-Ergebnis validieren')).toBeInTheDocument();
        });
    });

    it('shows "Auf die Wall" button when website entry context is present', async () => {
        localStorage.setItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY, JSON.stringify({
            surface: 'website',
            entity: 'security-audit',
            id: 'audit-wall-test',
            companyName: 'Wall Corp',
            domain: 'wall.de',
            score: 55,
            title: 'Test',
            rooms: [],
            documents: [],
            tasks: [{ title: 'Fix it', priority: 'hoch' }],
        }));
        renderWithDepts();
        await waitFor(() => {
            expect(screen.getByTestId('dossier-wall-btn')).toBeInTheDocument();
        });
    });

    it('shows Demo-Modus chip when isPublicDemoSurface', async () => {
        (useSurfaceProfile as jest.Mock).mockReturnValue({
            ...DEFAULT_SURFACE_PROFILE,
            isPublicDemoSurface: true,
        });
        renderWithDepts();
        await waitFor(() => {
            expect(screen.getByTestId('demo-mode-chip')).toBeInTheDocument();
        });
    });
});

// ── briefing strip ─────────────────────────────────────────────────────────

describe('HomeSurface — Mora Briefing Strip', () => {
    it('does not render the old briefing strip in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('briefing-strip')).not.toBeInTheDocument();
    });

    it('does not render briefing text in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('briefing-text')).not.toBeInTheDocument();
    });

    it('calls buildBriefing with departments and treeData from store', () => {
        const { buildBriefing } = require('@/lib/home/briefing');
        renderWithDepts();
        expect(buildBriefing).toHaveBeenCalledWith(depts, treeWithActivity);
    });
});

// ── dept pulse tiles ───────────────────────────────────────────────────────

describe('HomeSurface — Department Pulse Tiles', () => {
    it('does not render dept-pulse-tiles in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('dept-pulse-tiles')).not.toBeInTheDocument();
    });

    it('does not render a tile per department in default Home', () => {
        renderWithDepts();
        depts.forEach((d) => {
            expect(screen.queryByTestId(`dept-tile-${d.id}`)).not.toBeInTheDocument();
        });
    });

    it('does not render dept tiles when departments list is empty', () => {
        renderWithDepts([]);
        expect(screen.queryByTestId('dept-pulse-tiles')).not.toBeInTheDocument();
    });

    it('does not expose active dept pulse counts in default Home', () => {
        renderWithDepts();
        expect(screen.queryByText('3 Inhalte')).not.toBeInTheDocument();
    });

    it('does not expose quiet dept tile state in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('dept-tile-dept-product')).not.toBeInTheDocument();
    });

    it('cannot open finder through old dept tiles in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('dept-tile-dept-rd')).not.toBeInTheDocument();
        expect(openPane).not.toHaveBeenCalled();
    });
});

// ── zuletzt berührt ────────────────────────────────────────────────────────

describe('HomeSurface — Zuletzt berührt', () => {
    it('does not render the old recent-items section in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('recent-items-section')).not.toBeInTheDocument();
    });

    it('does not render the old recent-items empty state in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('recent-items-empty')).not.toBeInTheDocument();
    });

    it('does not render the old left-panel recent-item rows in default Home', () => {
        useActivityStore.setState({
            recentItems: [
                { id: 'doc-1', label: 'Projektplan Q2.md', openedAt: Date.now() - 7200000, paneType: 'document', paneData: { nodeId: 'doc-1' } },
                { id: 'finder-main', label: 'Finder', openedAt: Date.now() - 86400000, paneType: 'finder' },
            ],
        } as any);

        renderWithDepts();
        // The old left-panel "Zuletzt berührt" section is gone (no recent-item testid)
        expect(screen.queryByTestId('recent-item')).not.toBeInTheDocument();
        // WeiterarbeitenStrip inside HomeCockpit shows items in a compact horizontal strip —
        // that is the NEW rendering; only the old full-height panel is gone.
    });

    it('does not expose recent item caps in default Home', () => {
        const manyItems = Array.from({ length: 8 }, (_, i) => ({
            id: `item-${i}`,
            label: `Item ${i}`,
            openedAt: Date.now() - i * 1000,
            paneType: 'document',
            paneData: { nodeId: `item-${i}` },
        }));
        useActivityStore.setState({ recentItems: manyItems } as any);

        renderWithDepts();
        expect(screen.queryByTestId('recent-item')).not.toBeInTheDocument();
    });

    it('cannot open a document pane through old left-panel recent items in default Home', () => {
        useActivityStore.setState({
            recentItems: [
                { id: 'doc-1', label: 'Bericht Q1.md', openedAt: Date.now(), paneType: 'document', paneData: { nodeId: 'doc-1' } },
            ],
        } as any);

        renderWithDepts();
        // Old left-panel section is gone — no recent-item row renders in the sidebar
        expect(screen.queryByTestId('recent-item')).not.toBeInTheDocument();
        expect(openPane).not.toHaveBeenCalled();
    });

    it('cannot open the finder pane through old recent items in default Home', () => {
        useActivityStore.setState({
            recentItems: [
                { id: 'finder-main', label: 'Finder', openedAt: Date.now(), paneType: 'finder' },
            ],
        } as any);

        renderWithDepts();
        expect(screen.queryByTestId('recent-item')).not.toBeInTheDocument();
        expect(openPane).not.toHaveBeenCalled();
    });
});

// ── quick actions ──────────────────────────────────────────────────────────

describe('HomeSurface — Quick Actions', () => {
    it('does not render old Finder quick action in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('qa-finder')).not.toBeInTheDocument();
    });

    it('does not render old Mora quick action in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('qa-mora')).not.toBeInTheDocument();
    });

    it('does not render old upload quick action in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('qa-upload')).not.toBeInTheDocument();
    });

    it('old Finder quick action cannot open a pane in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('qa-finder')).not.toBeInTheDocument();
        expect(openPane).not.toHaveBeenCalled();
    });

    it('old Mora quick action cannot open a pane in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('qa-mora')).not.toBeInTheDocument();
        expect(openPane).not.toHaveBeenCalled();
    });

    it('old upload quick action cannot open a pane in default Home', () => {
        renderWithDepts();
        expect(screen.queryByTestId('qa-upload')).not.toBeInTheDocument();
        expect(openPane).not.toHaveBeenCalled();
    });
});

// ── logout ─────────────────────────────────────────────────────────────────

describe('HomeSurface — logout', () => {
    it('uses same-origin logout link and clears client state on click', async () => {
        renderWithDepts();
        const logoutLink = screen.getByTestId('home-logout');

        expect(logoutLink.closest('form')).toHaveAttribute('action', '/api/auth/logout');
        logoutLink.closest('form')?.addEventListener('submit', (event) => event.preventDefault(), { once: true });
        fireEvent.click(logoutLink);

        await waitFor(() => {
            expect(mockClearArtifacts).toHaveBeenCalled();
            expect(accountLogout).toHaveBeenCalled();
            expect(resetStore).toHaveBeenCalled();
            expect(setUser).toHaveBeenCalledWith(null);
        });
    });
});
