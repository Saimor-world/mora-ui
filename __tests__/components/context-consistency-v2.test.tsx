import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

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
    loadNodeDetails: jest.fn(),
};

const mockGetPane = jest.fn();
const mockOpenPane = jest.fn();
const mockRemovePane = jest.fn();
const mockSearchGlobal = jest.fn();
const mockSearchSemantic = jest.fn();
const mockCoreGet = jest.fn();

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: (selector?: any) => selector ? selector(storeState) : storeState,
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
}));

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
        button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/lib/api/realtimeClient', () => ({
    realtime: { on: jest.fn(), off: jest.fn() },
}));

jest.mock('@/lib/hooks/useHilToggle', () => ({
    useHilToggle: () => ({ hilEnabled: false, setHilEnabled: jest.fn() }),
}));

jest.mock('@/lib/mora/presenceEvents', () => ({
    dispatchMoraPresence: jest.fn(),
}));

jest.mock('@/lib/toast', () => ({
    toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

import { SearchPane } from '@/components/panes/SearchPane';
import { MoraUpdatesFeed } from '@/components/mora/MoraUpdatesFeed';

function renderSearchPane() {
    mockGetPane.mockReturnValue({
        id: 'search-main',
        size: { width: 860, height: 680 },
        position: { x: 100, y: 80 },
        zIndex: 10,
        data: {},
    });
    return render(<SearchPane id="search-main" />);
}

describe('Context Consistency V2', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        storeState.activeCompanyId = 'company-alpha';
        storeState.activeDepartmentId = null;
        mockSearchSemantic.mockResolvedValue([]);
        mockSearchGlobal.mockResolvedValue({ results: [] });
        mockCoreGet.mockResolvedValue({ events: [] });
    });

    afterEach(() => {
        cleanup();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it('clears stale SearchPane results immediately after company switch', async () => {
        mockSearchGlobal.mockResolvedValueOnce({
            results: [{ id: 'node-alpha', type: 'node', title: 'Alpha-Dokument', name: 'Alpha-Dokument' }],
        });

        const { rerender } = renderSearchPane();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bericht' } });

        await waitFor(() => expect(screen.getByText('Alpha-Dokument')).toBeInTheDocument());

        mockSearchGlobal.mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({
                results: [{ id: 'node-beta', type: 'node', title: 'Beta-Dokument', name: 'Beta-Dokument' }],
            }), 200))
        );
        mockSearchSemantic.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 200)));

        storeState.activeCompanyId = 'company-beta';
        await act(async () => {
            rerender(<SearchPane id="search-main" />);
        });

        expect(screen.queryByText('Alpha-Dokument')).not.toBeInTheDocument();
    });

    it('opens Finder from SearchPane with the active company scope', async () => {
        mockSearchGlobal.mockResolvedValueOnce({
            results: [{ id: 'folder-1', type: 'folder', title: 'Q4 Reports', folder_id: 'folder-1' }],
        });

        renderSearchPane();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Q4' } });

        await waitFor(() => expect(screen.getByText('Q4 Reports')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Q4 Reports'));

        expect(mockOpenPane).toHaveBeenCalledWith(expect.objectContaining({
            type: 'finder',
            data: expect.objectContaining({
                folderId: 'folder-1',
                companyId: 'company-alpha',
            }),
        }));
    });

    it('clears stale updates immediately when company scope changes', async () => {
        jest.useFakeTimers();
        mockCoreGet.mockResolvedValueOnce({
            events: [{
                id: 'ev-alpha',
                event_type: 'data_change',
                source: 'system',
                payload: { company_id: 'company-alpha' },
                created_at: new Date().toISOString(),
            }],
        });

        const { rerender } = render(<MoraUpdatesFeed scope="company" showHeader={false} />);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(mockCoreGet).toHaveBeenCalledWith(expect.stringContaining('company_id=company-alpha'));
        });

        mockCoreGet.mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({
                events: [{
                    id: 'ev-beta',
                    event_type: 'insight',
                    source: 'mora',
                    payload: { company_id: 'company-beta' },
                    created_at: new Date().toISOString(),
                }],
            }), 500))
        );

        storeState.activeCompanyId = 'company-beta';
        await act(async () => {
            rerender(<MoraUpdatesFeed scope="company" showHeader={false} />);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(screen.queryByText(/Data Change/i)).not.toBeInTheDocument();
    });
});
