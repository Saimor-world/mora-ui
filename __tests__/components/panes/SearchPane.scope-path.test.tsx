// __tests__/components/panes/SearchPane.scope-path.test.tsx

import React from 'react';
import { screen, act, fireEvent } from '@testing-library/react';
import { searchSemantic, searchGlobal } from '@/lib/api/coreClient';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { queryKeys } from '@/lib/queries/queryKeys';

// ── Module-level mocks (must be before any import that triggers them) ─────────

jest.mock('@/lib/api/coreClient', () => ({
    searchSemantic: jest.fn(),
    searchGlobal: jest.fn(),
    fetchFolderContext: jest.fn(),
    getSemanticallySimilarNodes: jest.fn(),
    getEntityContext: jest.fn(),
    fetchNodeDetails: jest.fn(),
    corePost: jest.fn(),
    coreGet: jest.fn(),
    corePatch: jest.fn(),
}));

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Stable references to prevent infinite useEffect loops.
const STABLE_DEPARTMENTS: never[] = [];
const STABLE_TREE: never[] = [];
const STABLE_COMPANIES = [{ id: 'company-1', name: 'Acme' }];

jest.mock('@/lib/queries/useTree', () => ({
    useTree: () => ({ data: STABLE_TREE, isFetching: false }),
}));

// Stable pane object — identity must not change between renders.
const STABLE_PANE = {
    id: 'search-test',
    type: 'search',
    title: 'Suche',
    size: { width: 960, height: 720 },
    position: { x: 0, y: 0 },
    zIndex: 1,
    data: {},
};

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: (s: any) => unknown) => {
        const store = {
            panes: [STABLE_PANE],
            openPane: jest.fn(),
            removePane: jest.fn(),
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            getPane: (_id: string) => STABLE_PANE,
            activePaneId: 'search-test',
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/utils/searchOpen', () => ({
    ...jest.requireActual('@/lib/utils/searchOpen'),
    openSearchResult: jest.fn(),
}));

// ── Import component AFTER mocks ──────────────────────────────────────────────
import SearchApp from '@/apps/search';

const mockSearchSemantic = searchSemantic as jest.Mock;
const mockSearchGlobal = searchGlobal as jest.Mock;

beforeEach(resetAllStores);

describe('SearchPane — semantic result scope_path priority', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchGlobal.mockResolvedValue({ results: [] });

        useNavStore.setState({ activeCompanyId: 'company-1' } as any);
    });

    it('shows scope_path as subtitle instead of content preview', async () => {
        mockSearchSemantic.mockResolvedValue([{
            node_id: 'n1',
            score: 0.9,
            content: 'CONTENT PREVIEW THAT MUST NOT APPEAR',
            scope_path: '/Acme/Sales/Q4.docx',
            folder_id: 'f1',
            company_id: 'company-1',
            metadata: { title: 'Q4 Report' },
        }]);

        const qc = createTestQueryClient();
        qc.setQueryData(queryKeys.companies(), STABLE_COMPANIES);
        qc.setQueryData(queryKeys.departments('company-1'), STABLE_DEPARTMENTS);
        renderWithProviders(<SearchApp paneId="search-test" initialData={{}} />, { queryClient: qc });

        // Trigger the search via React's synthetic event system.
        const input = screen.getByPlaceholderText(/Suche nach/i);

        await act(async () => {
            fireEvent.change(input, { target: { value: 'Q4' } });
            // Wait for debounce (200 ms in component) + async resolution margin
            await new Promise(r => setTimeout(r, 400));
        });

        // scope_path must appear as the subtitle, content preview must not
        expect(screen.getByText('/Acme/Sales/Q4.docx')).toBeInTheDocument();
        expect(screen.queryByText('CONTENT PREVIEW THAT MUST NOT APPEAR')).toBeNull();
    });
});
