import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeSurface } from '@/components/home/HomeSurface';
import { usePaneStore } from '@/lib/store/paneStore';
import { useAccountStore } from '@/lib/auth/useAccount';
import { useActivityStore } from '@/lib/store/activityStore';
import * as coreClient from '@/lib/api/coreClient';
import * as sessionLifecycle from '@/lib/auth/sessionLifecycle';
import { renderWithProviders, resetAllStores, createTestQueryClient, testFixtures } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { queryKeys } from '@/lib/queries/queryKeys';

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

jest.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
    useReducedMotion: () => false,
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

const mockAuthLogout    = coreClient.authLogout as jest.MockedFunction<typeof coreClient.authLogout>;
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

// ── fixtures ───────────────────────────────────────────────────────────────

const depts = STABLE_DEPTS;
const treeWithActivity = STABLE_TREE;

// ── setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
    mockAuthLogout.mockResolvedValue({ success: true } as any);
    localStorage.clear();

    useNavStore.setState({
        activeCompanyId: 'co-1',
        coreMode: 'home',
        isStandardMode: false,
        setCoreMode: jest.fn(),
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

function renderWithDepts(depsData = STABLE_DEPTS, treeData = STABLE_TREE) {
    const qc = createTestQueryClient();
    qc.setQueryData(queryKeys.departments('co-1'), depsData);
    qc.setQueryData(queryKeys.tree('co-1'), treeData);
    qc.setQueryData(queryKeys.companies(), [{ id: 'co-1', name: 'Test Corp' }]);
    return renderWithProviders(<HomeSurface />, { queryClient: qc });
}

// ── rendering ──────────────────────────────────────────────────────────────

describe('HomeSurface — rendering', () => {
    it('renders a personalised greeting with first name', async () => {
        renderWithDepts();
        await waitFor(() => {
            // Overlay renders greeting in two spots (portal + left card) — use getAllByText
            expect(screen.getAllByText(/Anna/).length).toBeGreaterThan(0);
        });
    });

    it('renders "Arbeitsplatz" heading when no user', async () => {
        useSessionStore.setState({ user: null, resetStore, setUser } as any);
        renderWithDepts();
        await waitFor(() => {
            expect(screen.getByText('Arbeitsplatz')).toBeInTheDocument();
        });
    });

    it('renders the logout button', () => {
        renderWithDepts();
        expect(screen.getByTestId('home-logout')).toBeInTheDocument();
    });
});

// ── briefing strip ─────────────────────────────────────────────────────────

describe('HomeSurface — Mora Briefing Strip', () => {
    it('renders the briefing strip', () => {
        renderWithDepts();
        expect(screen.getByTestId('briefing-strip')).toBeInTheDocument();
    });

    it('renders briefing text from buildBriefing()', () => {
        renderWithDepts();
        expect(screen.getByTestId('briefing-text')).toHaveTextContent('R&D ist aktiv — 3 Inhalte.');
    });

    it('calls buildBriefing with departments and treeData from store', () => {
        const { buildBriefing } = require('@/lib/home/briefing');
        renderWithDepts();
        expect(buildBriefing).toHaveBeenCalledWith(depts, treeWithActivity);
    });
});

// ── dept pulse tiles ───────────────────────────────────────────────────────

describe('HomeSurface — Department Pulse Tiles', () => {
    it('renders dept-pulse-tiles when departments are present', () => {
        renderWithDepts();
        expect(screen.getByTestId('dept-pulse-tiles')).toBeInTheDocument();
    });

    it('renders a tile per department (up to 6)', () => {
        renderWithDepts();
        depts.forEach((d) => {
            expect(screen.getByTestId(`dept-tile-${d.id}`)).toBeInTheDocument();
        });
    });

    it('does not render dept tiles when departments list is empty', () => {
        renderWithDepts([]);
        expect(screen.queryByTestId('dept-pulse-tiles')).not.toBeInTheDocument();
    });

    it('active dept tile shows Inhalte count', () => {
        renderWithDepts();
        const tile = screen.getByTestId('dept-tile-dept-rd');
        expect(tile).toHaveTextContent('3 Inhalte');
    });

    it('quiet dept tile shows "ruhig"', () => {
        renderWithDepts();
        const tile = screen.getByTestId('dept-tile-dept-product');
        expect(tile).toHaveTextContent('ruhig');
    });

    it('clicking a dept tile opens finder with departmentId', () => {
        renderWithDepts();
        fireEvent.click(screen.getByTestId('dept-tile-dept-rd'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'finder',
                data: expect.objectContaining({ departmentId: 'dept-rd' }),
            })
        );
    });
});

// ── zuletzt berührt ────────────────────────────────────────────────────────

describe('HomeSurface — Zuletzt berührt', () => {
    it('always renders the recent-items section', () => {
        renderWithDepts();
        expect(screen.getByTestId('recent-items-section')).toBeInTheDocument();
    });

    it('shows empty state when activityStore is empty', () => {
        renderWithDepts();
        expect(screen.getByTestId('recent-items-empty')).toBeInTheDocument();
    });

    it('renders activity items from activityStore', async () => {
        useActivityStore.setState({
            recentItems: [
                { id: 'doc-1', label: 'Projektplan Q2.md', openedAt: Date.now() - 7200000, paneType: 'document', paneData: { nodeId: 'doc-1' } },
                { id: 'finder-main', label: 'Finder', openedAt: Date.now() - 86400000, paneType: 'finder' },
            ],
        } as any);

        renderWithDepts();
        await waitFor(() => {
            expect(screen.getAllByTestId('recent-item')).toHaveLength(2);
            expect(screen.getByText('Projektplan Q2.md')).toBeInTheDocument();
            expect(screen.getByText('Finder')).toBeInTheDocument();
        });
    });

    it('shows at most 3 recent items (overlay cap)', async () => {
        const manyItems = Array.from({ length: 8 }, (_, i) => ({
            id: `item-${i}`,
            label: `Item ${i}`,
            openedAt: Date.now() - i * 1000,
            paneType: 'document',
            paneData: { nodeId: `item-${i}` },
        }));
        useActivityStore.setState({ recentItems: manyItems } as any);

        renderWithDepts();
        await waitFor(() => {
            // Overlay caps recent items at 3 (compact panel design)
            expect(screen.getAllByTestId('recent-item')).toHaveLength(3);
        });
    });

    it('clicking a document item opens a document pane', async () => {
        useActivityStore.setState({
            recentItems: [
                { id: 'doc-1', label: 'Bericht Q1.md', openedAt: Date.now(), paneType: 'document', paneData: { nodeId: 'doc-1' } },
            ],
        } as any);

        renderWithDepts();
        await waitFor(() => screen.getByText('Bericht Q1.md'));
        fireEvent.click(screen.getByTestId('recent-item').querySelector('button')!);

        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'document',
                data: expect.objectContaining({ nodeId: 'doc-1' }),
            })
        );
    });

    it('clicking a finder item opens the finder pane', async () => {
        useActivityStore.setState({
            recentItems: [
                { id: 'finder-main', label: 'Finder', openedAt: Date.now(), paneType: 'finder' },
            ],
        } as any);

        renderWithDepts();
        await waitFor(() => screen.getByText('Finder'));
        fireEvent.click(screen.getByTestId('recent-item').querySelector('button')!);

        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'finder' })
        );
    });
});

// ── quick actions ──────────────────────────────────────────────────────────

describe('HomeSurface — Quick Actions', () => {
    it('renders Finder öffnen button', () => {
        renderWithDepts();
        expect(screen.getByTestId('qa-finder')).toBeInTheDocument();
    });

    it('renders Mora fragen button', () => {
        renderWithDepts();
        expect(screen.getByTestId('qa-mora')).toBeInTheDocument();
    });

    it('renders Datei hochladen button', () => {
        renderWithDepts();
        expect(screen.getByTestId('qa-upload')).toBeInTheDocument();
    });

    it('Finder öffnen opens finder-main pane', () => {
        renderWithDepts();
        fireEvent.click(screen.getByTestId('qa-finder'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'finder', id: 'finder-main' })
        );
    });

    it('Mora fragen opens chat-main pane', () => {
        renderWithDepts();
        fireEvent.click(screen.getByTestId('qa-mora'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'chat', id: 'chat-main' })
        );
    });

    it('Datei hochladen opens finder with showUpload: true', () => {
        renderWithDepts();
        fireEvent.click(screen.getByTestId('qa-upload'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'finder',
                data: expect.objectContaining({ showUpload: true }),
            })
        );
    });
});

// ── logout ─────────────────────────────────────────────────────────────────

describe('HomeSurface — logout', () => {
    it('calls server logout and clears client state on button click', async () => {
        renderWithDepts();
        fireEvent.click(screen.getByTestId('home-logout'));

        await waitFor(() => {
            expect(mockAuthLogout).toHaveBeenCalled();
            expect(mockClearArtifacts).toHaveBeenCalled();
            expect(accountLogout).toHaveBeenCalled();
            expect(resetStore).toHaveBeenCalled();
            expect(setUser).toHaveBeenCalledWith(null);
        });
    });
});
