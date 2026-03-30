/**
 * Context Consistency V2 — company-switch stale state tests
 *
 * After a company switch, each scoped surface must immediately discard
 * state from the previous company rather than letting it linger until
 * the next network response arrives.
 *
 * Surfaces: SearchPane, MoraUpdatesFeed
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Mutable store state (mutate to simulate company switch in tests) ─────────

const storeState = {
    departments: [] as any[],
    spacesByDepartment: {} as Record<string, any[]>,
    nodesByCompany: {} as Record<string, any[]>,
    activeCompanyId: 'company-alpha' as string | null,
    activeDepartmentId: null as string | null,
    setActiveDepartment: jest.fn(),
    setActiveSpace: jest.fn(),
    setViewLevel: jest.fn(),
    navigateToCore: jest.fn(),
    navigateToDepartment: jest.fn(),
    navigateToSpace: jest.fn(),
    navigateToFolder: jest.fn(),
};

const mockGetPane = jest.fn();
const mockOpenPane = jest.fn();
const mockRemovePane = jest.fn();
const mockSearchGlobal = jest.fn();
const mockSearchSemantic = jest.fn();
const mockCoreGet = jest.fn();

// ─── Module-level mocks (hoisted) ────────────────────────────────────────────

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: (selector?: any) =>
        selector ? selector(storeState) : storeState,
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            removePane: mockRemovePane,
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            openPane: mockOpenPane,
            activePaneId: 'search-main',
            getPane: mockGetPane,
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/api/coreClient', () => ({
    searchGlobal: (...args: any[]) => mockSearchGlobal(...args),
    searchSemantic: (...args: any[]) => mockSearchSemantic(...args),
    coreGet: (...args: any[]) => mockCoreGet(...args),
    fetchSystemStats: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
        button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
        li: ({ children, ...p }: any) => <li {...p}>{children}</li>,
        ul: ({ children, ...p }: any) => <ul {...p}>{children}</ul>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/lib/mora/presenceEvents', () => ({
    dispatchMoraPresence: jest.fn(),
}));

jest.mock('@/lib/toast', () => ({
    toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

jest.mock('@/lib/api/realtimeClient', () => ({
    realtime: { on: jest.fn(), off: jest.fn() },
}));

jest.mock('@/lib/hooks/useHilToggle', () => ({
    useHilToggle: () => ({ hilEnabled: false, setHilEnabled: jest.fn() }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { SearchPane } from '@/components/panes/SearchPane';
import { MoraUpdatesFeed } from '@/components/mora/MoraUpdatesFeed';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSearchPane() {
    mockGetPane.mockReturnValue({
        id: 'search-main',
        size: { width: 860, height: 680 },
        position: { x: 100, y: 80 },
        zIndex: 10,
        data: {},
    });
    return render(<SearchPane id="search-main" />);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SearchPane — stale results cleared on company switch
// ═══════════════════════════════════════════════════════════════════════════════

describe('SearchPane — stale results cleared on company switch', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        storeState.activeCompanyId = 'company-alpha';

        mockSearchSemantic.mockResolvedValue([]);
        mockSearchGlobal.mockResolvedValue({
            results: [
                { id: 'n-alpha-1', type: 'node', title: 'Alpha-Dokument', name: 'Alpha-Dokument' },
            ],
        });
    });

    afterEach(() => cleanup());

    test('stale API results from company-alpha are cleared immediately when switching to company-beta', async () => {
        const { rerender } = makeSearchPane();

        // Type a query — triggers debounced API search for company-alpha
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'bericht' } });

        // Wait for company-alpha results to appear
        await waitFor(() =>
            expect(screen.getByText('Alpha-Dokument')).toBeInTheDocument()
        );

        // ── Simulate company switch: new mock returns company-beta results ──
        // Make the new search take a measurable amount of time so we can assert
        // the intermediate state (results cleared before new results arrive).
        mockSearchGlobal.mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                results: [{ id: 'n-beta-1', type: 'node', title: 'Beta-Dokument', name: 'Beta-Dokument' }],
                            }),
                        200
                    )
                )
        );
        mockSearchSemantic.mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve([]), 200))
        );

        storeState.activeCompanyId = 'company-beta';

        await act(async () => {
            rerender(<SearchPane id="search-main" />);
        });

        // Alpha results must be gone immediately (before beta search resolves)
        expect(screen.queryByText('Alpha-Dokument')).not.toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MoraUpdatesFeed — stale events cleared on company switch
// ═══════════════════════════════════════════════════════════════════════════════

describe('MoraUpdatesFeed — stale events cleared on company switch', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        storeState.activeCompanyId = 'company-alpha';
        storeState.activeDepartmentId = null;
    });

    afterEach(() => {
        cleanup();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('company-alpha events are cleared immediately when switching to company-beta', async () => {
        // company-alpha fetch returns a visible event summary
        mockCoreGet.mockResolvedValueOnce({
            events: [
                {
                    id: 'ev-alpha-1',
                    event_type: 'data_change',
                    source: 'system',
                    payload: { company_id: 'company-alpha' },
                    created_at: new Date().toISOString(),
                },
            ],
        });

        const { rerender } = render(
            <MoraUpdatesFeed scope="company" showHeader={false} />
        );

        // Let the company-alpha fetch resolve
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve(); // extra tick for state flush
        });

        await waitFor(() =>
            expect(mockCoreGet).toHaveBeenCalledWith(
                expect.stringContaining('company_id=company-alpha')
            )
        );

        // ── Company switch: company-beta fetch will be slow ──
        // This lets us assert the intermediate cleared state.
        mockCoreGet.mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                events: [
                                    {
                                        id: 'ev-beta-1',
                                        event_type: 'insight',
                                        source: 'mora',
                                        payload: { company_id: 'company-beta' },
                                        created_at: new Date().toISOString(),
                                    },
                                ],
                            }),
                        500
                    )
                )
        );

        storeState.activeCompanyId = 'company-beta';

        // Rerender kicks off company-beta's fetchEvents; stale events should
        // be cleared BEFORE the new fetch completes.
        await act(async () => {
            rerender(<MoraUpdatesFeed scope="company" showHeader={false} />);
            await Promise.resolve();
            await Promise.resolve();
        });

        // The feed must not be rendering company-alpha's event type label any
        // more while waiting for company-beta's response.
        // "Data Change" is the label for event_type "data_change".
        expect(screen.queryByText(/Data Change/i)).not.toBeInTheDocument();
    });
});
