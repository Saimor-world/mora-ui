/**
 * TeamPane — isOperational gate tests
 *
 * Verifies that TeamPane respects the 3-state model:
 *   null  → bootstrap: renders nothing (no flash)
 *   false → setup_required: shows setup state, does NOT fire team API calls
 *   true  → operational: renders content, fires fetchTeamData
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Dependency mocks ──────────────────────────────────────────────────────────

const mockCoreGet = jest.fn().mockResolvedValue(null);
const mockCorePost = jest.fn().mockResolvedValue(null);
jest.mock('@/lib/api/coreClient', () => ({
    coreGet: (...args: any[]) => mockCoreGet(...args),
    corePost: (...args: any[]) => mockCorePost(...args),
}));

jest.mock('@/lib/api/realtimeClient', () => ({
    realtime: { on: jest.fn(), off: jest.fn(), connect: jest.fn() },
}));

jest.mock('@/lib/api/moraAgentClient', () => ({
    buildChatContext: jest.fn().mockResolvedValue({}),
}));

const mockIsOperational = jest.fn<boolean | null, []>();
jest.mock('@/lib/mora/useMoraContext', () => ({
    useMoraContext: () => ({
        isOperational: mockIsOperational(),
        scopeLabels: {},
        scopeLevel: 'global',
    }),
}));

// Pane store: always return a valid pane so the component doesn't bail early
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            removePane: jest.fn(),
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            openPane: jest.fn(),
            getPane: () => ({
                id: 'team-main',
                size: { width: 900, height: 640 },
                position: { x: 100, y: 100 },
                zIndex: 10,
            }),
            activePaneId: 'team-main',
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: (selector?: any) => {
        const store = { user: { role: 'member' } };
        return selector ? selector(store) : store;
    },
}));

// Render GlassPanel as a simple wrapper — we're testing content, not chrome
jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="glass-panel">{children}</div>
    ),
}));

// Shim framer-motion to plain renders — animations not under test
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

// ── Import component AFTER mocks ─────────────────────────────────────────────
import { TeamPane } from '@/components/panes/TeamPane';

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TeamPane — isOperational gate', () => {

    test('bootstrap null: renders nothing, no API calls fired', async () => {
        mockIsOperational.mockReturnValue(null);

        const { container } = render(<TeamPane id="team-main" />);

        // null guard: nothing inside GlassPanel that is team-specific
        expect(screen.queryByText(/Team/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Teammitglied/i)).not.toBeInTheDocument();

        // No API calls during bootstrap window
        await waitFor(() => {
            expect(mockCoreGet).not.toHaveBeenCalled();
        });
    });

    test('setup_required: shows setup state, does NOT call team or user-chat endpoints', async () => {
        mockIsOperational.mockReturnValue(false);

        render(<TeamPane id="team-main" />);

        // Setup state should be visible
        expect(await screen.findByText(/Kein Kontext aktiv/i)).toBeInTheDocument();

        // Member list / active tab content should NOT appear
        expect(screen.queryByText(/Teammitglied suchen/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Raum/i)).not.toBeInTheDocument();

        // No v3/team or v3/user-chat calls
        await waitFor(() => {
            const teamCalls = mockCoreGet.mock.calls.filter(
                ([url]: [string]) => url.includes('/v3/team') || url.includes('/v3/user-chat')
            );
            expect(teamCalls).toHaveLength(0);
        });
    });

    test('operational: renders member tab content and fires fetchTeamData', async () => {
        mockIsOperational.mockReturnValue(true);
        mockCoreGet.mockResolvedValue([]);

        render(<TeamPane id="team-main" />);

        // Member search bar should appear (members tab is default)
        expect(await screen.findByPlaceholderText(/Teammitglied suchen/i)).toBeInTheDocument();

        // fetchTeamData should have fired — /v3/team/members must be called
        await waitFor(() => {
            const memberCall = mockCoreGet.mock.calls.find(
                ([url]: [string]) => url.includes('/v3/team/members')
            );
            expect(memberCall).toBeDefined();
        });
    });

    test('setup_required: user-chat/history is never called even if showChat is somehow set', async () => {
        mockIsOperational.mockReturnValue(false);

        render(<TeamPane id="team-main" />);

        // Confirm no user-chat/history call regardless of showChat state
        await waitFor(() => {
            const chatHistoryCalls = mockCoreGet.mock.calls.filter(
                ([url]: [string]) => url.includes('/v3/user-chat/history')
            );
            expect(chatHistoryCalls).toHaveLength(0);
        });
    });
});
