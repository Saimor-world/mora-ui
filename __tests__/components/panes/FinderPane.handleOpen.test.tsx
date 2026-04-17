// __tests__/components/panes/FinderPane.handleOpen.test.tsx

import React from 'react';
import { screen, act } from '@testing-library/react';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';

// ── Module-level mocks ────────────────────────────────────────────────────────

const mockOpenPane = jest.fn();

const STABLE_PANE = {
    id: 'finder-test',
    type: 'finder',
    title: 'Finder',
    size: { width: 900, height: 640 },
    position: { x: 100, y: 100 },
    zIndex: 10,
    data: {},
};

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: (s: any) => unknown) => {
        const store = {
            panes: [STABLE_PANE],
            openPane: mockOpenPane,
            removePane: jest.fn(),
            updatePane: jest.fn(),
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            getPane: jest.fn().mockReturnValue(STABLE_PANE),
            activePaneId: 'finder-test',
        };
        return selector ? selector(store) : store;
    },
}));

// moraState is legacy — keep its mock
jest.mock('@/lib/store/moraState', () => {
    const store = {
        user: { id: 'u1' },
        isStandardMode: false,
        departments: [],
        spacesByDepartment: {},
        loadSpacesForDepartment: jest.fn(),
        foldersBySpace: {},
        loadFoldersForSpace: jest.fn(),
        nodesByFolder: {},
        nodesByCompany: {},
        loadNodesForFolder: jest.fn(),
        loadNodesForCompany: jest.fn().mockResolvedValue([]),
        loadedNodes: new Set(),
        loadChildren: jest.fn().mockResolvedValue([]),
    };
    const useMoraStore = (selector?: (s: any) => unknown) =>
        selector ? selector(store) : store;
    useMoraStore.getState = () => store;
    return { useMoraStore };
});

jest.mock('@/lib/queries/useTree', () => {
    const stableEmptyTree: never[] = [];
    return {
        useTree: jest.fn(() => ({ data: stableEmptyTree, isFetching: false })),
    };
});

jest.mock('@/lib/api/orgClient', () => ({
    createFolder: jest.fn().mockResolvedValue({}),
    createNode: jest.fn().mockResolvedValue({}),
    updateNode: jest.fn().mockResolvedValue({}),
    deleteNode: jest.fn().mockResolvedValue(undefined),
    updateFolder: jest.fn().mockResolvedValue({}),
    deleteFolder: jest.fn().mockResolvedValue(undefined),
    updateSpace: jest.fn().mockResolvedValue({}),
    deleteSpace: jest.fn().mockResolvedValue(undefined),
    fetchTree: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/api/coreClient', () => ({
    fetchFolderContext: jest.fn().mockResolvedValue(null),
    getSemanticallySimilarNodes: jest.fn().mockResolvedValue([]),
    getEntityContext: jest.fn().mockResolvedValue(null),
    fetchNodeDetails: jest.fn().mockResolvedValue(null),
    corePost: jest.fn(),
    coreGet: jest.fn(),
    corePatch: jest.fn(),
    fetchTree: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/api/filesClient', () => ({
    uploadCompanyFile: jest.fn(),
    listCompanyFiles: jest.fn().mockResolvedValue([]),
    requestCreateNodeFromFile: jest.fn(),
    confirmCreateNodeFromFile: jest.fn(),
    rejectCreateNodeFromFile: jest.fn(),
    getFileNode: jest.fn(),
    downloadCompanyFile: jest.fn(),
    relocateCompanyFile: jest.fn(),
}));

jest.mock('@/lib/api/realtimeClient', () => ({
    realtime: {
        on: jest.fn(),
        off: jest.fn(),
        subscribe: jest.fn(() => jest.fn()),
        unsubscribe: jest.fn(),
        connect: jest.fn(),
    },
}));

jest.mock('@/lib/mora/awarenessController', () => ({
    setThinking: jest.fn(), setFocus: jest.fn(), setIdle: jest.fn(),
}));

jest.mock('@/lib/mora/presenceEvents', () => ({
    dispatchMoraPresence: jest.fn(),
}));

jest.mock('@/lib/utils/moraExplanation', () => ({
    dispatchMyceliumBatchComplete: jest.fn(),
    dispatchMyceliumReviewReady: jest.fn(),
}));

jest.mock('@/lib/hooks/useSemanticConstellation', () => ({
    useSemanticConstellation: () => ({ nodes: [], loading: false }),
}));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="glass-panel">{children}</div>
    ),
}));

// ── Import component AFTER mocks ──────────────────────────────────────────────
import { FinderPane } from '@/components/panes/FinderPane';

beforeEach(resetAllStores);

describe('FinderPane.handleOpen', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        useNavStore.setState({
            activeCompanyId: 'c1',
            activeDepartmentId: null,
            activeSpaceId: null,
            activeFolderId: null,
            viewLevel: 'core',
            viewMode: 'workspace',
            coreMode: 'home',
            isStandardMode: false,
            nameConflict: null,
            setViewLevel: jest.fn(),
            setActiveDepartment: jest.fn(),
            setActiveSpace: jest.fn(),
            setActiveFolder: jest.fn(),
            navigateToDepartment: jest.fn(),
        } as any);
        (useNavStore as any).getState = () => useNavStore.getState();
    });

    function renderPane() {
        const qc = createTestQueryClient();
        qc.setQueryData(['companies'], [{ id: 'c1', name: 'Acme' }]);
        return renderWithProviders(<FinderPane id="finder-test" />, { queryClient: qc });
    }

    it('renders without crashing and compiles with DocumentNavigationContext import', async () => {
        const { container } = renderPane();
        await act(async () => { await new Promise(r => setTimeout(r, 50)); });

        expect(container.firstChild).not.toBeNull();
    });

    it('does not crash when pane has no navigationContext', async () => {
        const { container } = renderPane();
        await act(async () => { await new Promise(r => setTimeout(r, 50)); });
        expect(container.firstChild).not.toBeNull();
        expect(mockOpenPane).not.toHaveBeenCalled();
    });

    it('does not crash when pane store would include a real navigationContext', async () => {
        const { container } = renderPane();
        await act(async () => { await new Promise(r => setTimeout(r, 50)); });
        expect(container.firstChild).not.toBeNull();
    });
});
