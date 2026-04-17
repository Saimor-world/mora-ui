/**
 * Context Consistency — company-switch stale state tests
 *
 * After a company switch, each scoped surface must immediately discard
 * state from the previous company rather than letting it linger until
 * the next network response arrives.
 *
 * Surfaces: SearchPane, MoraUpdatesFeed
 *
 * Architecture note: useCompanies/useDepartments/useTree are kept mocked here
 * because SearchPane's empty-query branch calls setResults([]) which
 * creates a new array reference, causing an infinite loop when real
 * TanStack Query hooks add their initialization renders. The navStore
 * is real (not mocked), enabling Zustand subscriptions to drive
 * the company-switch re-render without needing rerender().
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { resetAllStores } from '../test-utils';
import { useNavStore } from '@/lib/store/navStore';

// ─── Query hooks: stable references prevent infinite buildLocalResults cascade ─
// useDepartments/useTree are in buildLocalResults' dep chain. A new [] on every call
// recreates the useCallback, triggering the search effect on every render.
// Stable references inside the factory closure are the fix.

jest.mock('@/lib/queries/useCompanies', () => {
    const stableCompanies = [{ id: 'company-alpha', name: 'Alpha Co' }];
    return { useCompanies: () => ({ data: stableCompanies, isFetching: false }) };
});

jest.mock('@/lib/queries/useDepartments', () => {
    const stableDepts: never[] = [];
    return { useDepartments: () => ({ data: stableDepts, isFetching: false }) };
});

jest.mock('@/lib/queries/useTree', () => {
    const stableTree: never[] = [];
    return { useTree: () => ({ data: stableTree, isFetching: false }) };
});

// ─── paneStore — stable fake ──────────────────────────────────────────────────

const mockGetPane = jest.fn();
const mockOpenPane = jest.fn();
const mockRemovePane = jest.fn();

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

// ─── I/O boundaries ──────────────────────────────────────────────────────────

const mockSearchGlobal = jest.fn();
const mockSearchSemantic = jest.fn();
const mockCoreGet = jest.fn();

jest.mock('@/lib/api/coreClient', () => ({
    searchGlobal: (...args: any[]) => mockSearchGlobal(...args),
    searchSemantic: (...args: any[]) => mockSearchSemantic(...args),
    coreGet: (...args: any[]) => mockCoreGet(...args),
    fetchSystemStats: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/api/realtimeClient', () => ({
    realtime: { on: jest.fn(), off: jest.fn() },
}));

// ─── UI-only mocks ────────────────────────────────────────────────────────────

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

jest.mock('@/lib/hooks/useHilToggle', () => ({
    useHilToggle: () => ({ hilEnabled: false, setHilEnabled: jest.fn() }),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

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

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();

    // Real navStore drives activeCompanyId for SearchPane + MoraUpdatesFeed
    useNavStore.setState({
        activeCompanyId: 'company-alpha',
        activeDepartmentId: null,
        navigateToCore: jest.fn(),
        navigateToDepartment: jest.fn(),
        navigateToSpace: jest.fn(),
        navigateToFolder: jest.fn(),
    } as any);

    mockSearchSemantic.mockResolvedValue([]);
    mockSearchGlobal.mockResolvedValue({ results: [] });
    mockCoreGet.mockResolvedValue({ events: [] });
});

afterEach(() => cleanup());

// ═══════════════════════════════════════════════════════════════════════════════
// SearchPane — stale results cleared on company switch
// ═══════════════════════════════════════════════════════════════════════════════

describe('SearchPane — stale results cleared on company switch', () => {
    test('stale API results from company-alpha are cleared immediately when switching to company-beta', async () => {
        mockSearchGlobal.mockResolvedValue({
            results: [
                { id: 'n-alpha-1', type: 'node', title: 'Alpha-Dokument', name: 'Alpha-Dokument' },
            ],
        });

        makeSearchPane();

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'bericht' } });

        await waitFor(() =>
            expect(screen.getByText('Alpha-Dokument')).toBeInTheDocument()
        );

        // Slow down beta search so we can assert the cleared intermediate state
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

        // Switch company via real navStore — Zustand subscriptions trigger re-render
        await act(async () => {
            useNavStore.setState({ activeCompanyId: 'company-beta' } as any);
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
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('company-alpha events are cleared immediately when switching to company-beta', async () => {
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

        render(<MoraUpdatesFeed scope="company" showHeader={false} />);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() =>
            expect(mockCoreGet).toHaveBeenCalledWith(
                expect.stringContaining('company_id=company-alpha')
            )
        );

        // Slow down beta fetch
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

        // Switch company via real navStore
        await act(async () => {
            useNavStore.setState({ activeCompanyId: 'company-beta' } as any);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(screen.queryByText(/Data Change/i)).not.toBeInTheDocument();
    });
});
