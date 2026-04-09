import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeSurface } from '@/components/home/HomeSurface';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useAccountStore } from '@/lib/auth/useAccount';
import { useActivityStore } from '@/lib/store/activityStore';
import * as coreClient from '@/lib/api/coreClient';
import * as sessionLifecycle from '@/lib/auth/sessionLifecycle';

// ── mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/api/coreClient', () => ({
    authLogout: jest.fn(),
    fetchMyContent: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/auth/sessionLifecycle', () => ({
    clearClientSessionArtifacts: jest.fn(),
}));

jest.mock('@/lib/home/briefing', () => ({
    buildBriefing: jest.fn((_depts: any, _tree: any) => 'R&D ist aktiv — 3 Inhalte.'),
}));

jest.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
    useReducedMotion: () => false,
}));

const mockAuthLogout   = coreClient.authLogout as jest.MockedFunction<typeof coreClient.authLogout>;
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

const depts = [
    { id: 'dept-rd',     name: 'R&D'          },
    { id: 'dept-product', name: 'Product'     },
    { id: 'dept-growth',  name: 'Growth'      },
];

const treeWithActivity = [
    { id: 'dept-rd',      children: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }] },
    { id: 'dept-product', children: [] },
    { id: 'dept-growth',  children: [] },
];

// ── setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    mockAuthLogout.mockResolvedValue({ success: true } as any);
    localStorage.clear();

    usePaneStore.setState({
        openPane, getPane, focusPane, restorePane,
        updatePane, updatePanePosition, updatePaneSize,
    } as any);

    useAccountStore.setState({ logout: accountLogout } as any);

    useMoraStore.setState({
        user:          { id: 'u-1', name: 'Anna Mueller', role: 'member' },
        activeCompanyId: 'co-1',
        coreMode:      'home',
        isStandardMode: false,
        departments:   depts,
        treeData:      treeWithActivity,
        resetStore,
        setUser,
    } as any);

    useActivityStore.setState({ recentItems: [] });
});

// ── rendering ──────────────────────────────────────────────────────────────

describe('HomeSurface — rendering', () => {
    it('renders a personalised greeting with first name', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByText(/Anna/)).toBeInTheDocument();
        });
    });

    it('renders "Arbeitsplatz" heading when no user', async () => {
        useMoraStore.setState({ user: null } as any);
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByText('Arbeitsplatz')).toBeInTheDocument();
        });
    });

    it('renders the logout button', () => {
        render(<HomeSurface />);
        expect(screen.getByTestId('home-logout')).toBeInTheDocument();
    });
});

// ── briefing strip ─────────────────────────────────────────────────────────

describe('HomeSurface — Mora Briefing Strip', () => {
    it('renders the briefing strip', () => {
        render(<HomeSurface />);
        expect(screen.getByTestId('briefing-strip')).toBeInTheDocument();
    });

    it('renders briefing text from buildBriefing()', () => {
        render(<HomeSurface />);
        expect(screen.getByTestId('briefing-text')).toHaveTextContent('R&D ist aktiv — 3 Inhalte.');
    });

    it('calls buildBriefing with departments and treeData from store', () => {
        const { buildBriefing } = require('@/lib/home/briefing');
        render(<HomeSurface />);
        expect(buildBriefing).toHaveBeenCalledWith(depts, treeWithActivity);
    });
});

// ── dept pulse tiles ───────────────────────────────────────────────────────

describe('HomeSurface — Department Pulse Tiles', () => {
    it('renders dept-pulse-tiles when departments are present', () => {
        render(<HomeSurface />);
        expect(screen.getByTestId('dept-pulse-tiles')).toBeInTheDocument();
    });

    it('renders a tile per department (up to 6)', () => {
        render(<HomeSurface />);
        depts.forEach((d) => {
            expect(screen.getByTestId(`dept-tile-${d.id}`)).toBeInTheDocument();
        });
    });

    it('does not render dept tiles when departments list is empty', () => {
        useMoraStore.setState({ departments: [] } as any);
        render(<HomeSurface />);
        expect(screen.queryByTestId('dept-pulse-tiles')).not.toBeInTheDocument();
    });

    it('active dept tile shows Inhalte count', () => {
        render(<HomeSurface />);
        const tile = screen.getByTestId('dept-tile-dept-rd');
        expect(tile).toHaveTextContent('3 Inhalte');
    });

    it('quiet dept tile shows "ruhig"', () => {
        render(<HomeSurface />);
        const tile = screen.getByTestId('dept-tile-dept-product');
        expect(tile).toHaveTextContent('ruhig');
    });

    it('clicking a dept tile opens finder with departmentId', () => {
        render(<HomeSurface />);
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
        render(<HomeSurface />);
        expect(screen.getByTestId('recent-items-section')).toBeInTheDocument();
    });

    it('shows empty state when activityStore is empty', () => {
        render(<HomeSurface />);
        expect(screen.getByTestId('recent-items-empty')).toBeInTheDocument();
    });

    it('renders activity items from activityStore', async () => {
        useActivityStore.setState({
            recentItems: [
                { id: 'doc-1', label: 'Projektplan Q2.md', openedAt: Date.now() - 7200000, paneType: 'document', paneData: { nodeId: 'doc-1' } },
                { id: 'finder-main', label: 'Finder', openedAt: Date.now() - 86400000, paneType: 'finder' },
            ],
        } as any);

        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getAllByTestId('recent-item')).toHaveLength(2);
            expect(screen.getByText('Projektplan Q2.md')).toBeInTheDocument();
            expect(screen.getByText('Finder')).toBeInTheDocument();
        });
    });

    it('shows at most 5 recent items', async () => {
        const manyItems = Array.from({ length: 8 }, (_, i) => ({
            id: `item-${i}`,
            label: `Item ${i}`,
            openedAt: Date.now() - i * 1000,
            paneType: 'document',
            paneData: { nodeId: `item-${i}` },
        }));
        useActivityStore.setState({ recentItems: manyItems } as any);

        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getAllByTestId('recent-item')).toHaveLength(5);
        });
    });

    it('clicking a document item opens a document pane', async () => {
        useActivityStore.setState({
            recentItems: [
                { id: 'doc-1', label: 'Bericht Q1.md', openedAt: Date.now(), paneType: 'document', paneData: { nodeId: 'doc-1' } },
            ],
        } as any);

        render(<HomeSurface />);
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

        render(<HomeSurface />);
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
        render(<HomeSurface />);
        expect(screen.getByTestId('qa-finder')).toBeInTheDocument();
    });

    it('renders Mora fragen button', () => {
        render(<HomeSurface />);
        expect(screen.getByTestId('qa-mora')).toBeInTheDocument();
    });

    it('renders Datei hochladen button', () => {
        render(<HomeSurface />);
        expect(screen.getByTestId('qa-upload')).toBeInTheDocument();
    });

    it('Finder öffnen opens finder-main pane', () => {
        render(<HomeSurface />);
        fireEvent.click(screen.getByTestId('qa-finder'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'finder', id: 'finder-main' })
        );
    });

    it('Mora fragen opens chat-main pane', () => {
        render(<HomeSurface />);
        fireEvent.click(screen.getByTestId('qa-mora'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'chat', id: 'chat-main' })
        );
    });

    it('Datei hochladen opens finder with showUpload: true', () => {
        render(<HomeSurface />);
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
        render(<HomeSurface />);
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
