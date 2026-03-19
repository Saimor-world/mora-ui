// __tests__/components/panes/SearchPane.scope-path.test.tsx
//
// Verifies Delta 3: SearchPane semantic results use scope_path (top-level) as
// subtitle, not content preview, when scope_path is present.

import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { searchSemantic, searchGlobal } from '@/lib/api/coreClient';

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

// Stable references declared before jest.mock factories are called.
// Prevents infinite useEffect loops caused by new array/object identity on each render.
// SearchPane uses: departments → buildLocalResults, spacesByDepartment → allSpaces,
// nodesByCompany → allNodes. All three feed into useEffect deps via useMemo.
const STABLE_DEPARTMENTS: never[] = [];
const STABLE_SPACES_BY_DEPT: Record<string, never[]> = {};
const STABLE_NODES_BY_COMPANY: Record<string, never[]> = {};
const STABLE_COMPANIES = [{ id: 'company-1', name: 'Acme' }];

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: (selector?: (s: any) => unknown) => {
        const store = {
            activeCompanyId: 'company-1',
            user: { id: 'u1' },
            companies: STABLE_COMPANIES,
            isStandardMode: false,
            departments: STABLE_DEPARTMENTS,
            spacesByDepartment: STABLE_SPACES_BY_DEPT,
            nodesByCompany: STABLE_NODES_BY_COMPANY,
            setActiveDepartment: jest.fn(),
            setActiveSpace: jest.fn(),
            setViewLevel: jest.fn(),
        };
        return selector ? selector(store) : store;
    },
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
import SearchPane from '@/components/panes/SearchPane';

const mockSearchSemantic = searchSemantic as jest.Mock;
const mockSearchGlobal = searchGlobal as jest.Mock;

describe('SearchPane — semantic result scope_path priority', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchGlobal.mockResolvedValue({ results: [] });
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

        render(<SearchPane id="search-test" />);

        // Trigger the search via React's synthetic event system.
        // fireEvent.change correctly fires the onChange handler that sets `query` state.
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
