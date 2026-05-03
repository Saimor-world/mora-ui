// __tests__/components/panes/MeineDateienPane.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MeineDateienPane } from '@/components/panes/MeineDateienPane';
import { fetchMyContent, shareNode, shareFile, fetchCloudConnectorItems } from '@/lib/api/contentClient';
import type { UserContentResponse } from '@/lib/api/contentClient';

jest.mock('@/lib/api/contentClient', () => ({
    fetchMyContent: jest.fn(),
    shareNode: jest.fn(),
    shareFile: jest.fn(),
    fetchCloudConnectorItems: jest.fn(),
}));

// Framer-motion renders as plain elements so GlassPanel (which uses it internally)
// can mount without animation engine in JSDOM. No GlassPanel mock needed.
jest.mock('framer-motion', () => ({
    motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useDragControls: () => ({ start: jest.fn() }),
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            getPane: (id: string) => ({
                id,
                type: 'meine-dateien',
                title: 'Meine Dateien',
                position: { x: 100, y: 100 },
                size: { width: 800, height: 600 },
                minimized: false,
                zIndex: 500,
            }),
            openPane: jest.fn(),
            removePane: jest.fn(),
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            activePaneId: 'meine-dateien',
            // GlassPanel reads panes array to compute visiblePaneCount
            panes: [],
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: (selector?: any) => selector ? selector({ isStandardMode: false }) : { isStandardMode: false },
}));

const mockShareNode = shareNode as jest.MockedFunction<typeof shareNode>;
const mockShareFile = shareFile as jest.MockedFunction<typeof shareFile>;
const mockFetchCloudConnectorItems = fetchCloudConnectorItems as jest.MockedFunction<typeof fetchCloudConnectorItems>;

const mockFetch = fetchMyContent as jest.MockedFunction<typeof fetchMyContent>;

const mockResponse: UserContentResponse = {
    space: { id: 'sp-1', name: 'Mein Bereich', owner_id: 'u-me' },
    folders: [
        { id: 'f-1', name: 'Projekte', space_id: 'sp-1', order: 0 },
    ],
    nodes: [
        {
            id: 'n-1',
            title: 'Projektplan Q2',
            type: 'document',
            space_id: 'sp-1',
            owner_id: 'u-me',
            visibility: 'private',
        },
        {
            id: 'n-2',
            title: 'Team-Präsentation',
            type: 'document',
            space_id: 'sp-1',
            owner_id: 'u-me',
            visibility: 'department',
        },
    ],
    files: [
        {
            id: 'file-1',
            name: 'bericht.pdf',
            size: 204800,
            owner_id: 'u-me',
            visibility: 'private',
        },
    ],
    counts: { folders: 1, nodes: 2, items: 3, files: 1, standalone_files: 1, total: 4 },
};

describe('MeineDateienPane', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetchCloudConnectorItems.mockResolvedValue(null);
    });

    it('shows loading state initially', async () => {
        mockFetch.mockImplementation(() => new Promise(() => {}));
        render(<MeineDateienPane />);
        // findByTestId waits for AppLoader's dynamic import to resolve before the
        // app renders its own loading indicator (same pattern as ScannerPane tests)
        expect(await screen.findByTestId('meine-dateien-loading')).toBeInTheDocument();
    });

    it('shows folder section with folder names', async () => {
        mockFetch.mockResolvedValue(mockResponse);
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByText('Projekte')).toBeInTheDocument();
        });
    });

    it('shows nodes in Inhalte section', async () => {
        mockFetch.mockResolvedValue(mockResponse);
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByText('Projektplan Q2')).toBeInTheDocument();
            expect(screen.getByText('Team-Präsentation')).toBeInTheDocument();
        });
    });

    it('shows files in Dateien section', async () => {
        mockFetch.mockResolvedValue(mockResponse);
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByText('bericht.pdf')).toBeInTheDocument();
        });
    });

    it('shows visibility badges on nodes and files', async () => {
        mockFetch.mockResolvedValue(mockResponse);
        render(<MeineDateienPane />);
        await waitFor(() => {
            const privateBadges = screen.getAllByTitle('Privat');
            expect(privateBadges.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByTitle('Abteilung')).toBeInTheDocument();
        });
    });

    it('degrades gracefully when fetchMyContent returns null', async () => {
        mockFetch.mockResolvedValue(null);
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByText(/nicht verfügbar/i)).toBeInTheDocument();
        });
    });

    it('shows empty state when all sections are empty', async () => {
        mockFetch.mockResolvedValue({ folders: [], nodes: [], files: [] });
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByText(/keine eigenen inhalte/i)).toBeInTheDocument();
        });
    });

    it('shows counts summary when counts are present', async () => {
        mockFetch.mockResolvedValue(mockResponse);
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByText(/2 Inhalte/i)).toBeInTheDocument();
        });
    });

    it('folder rows have lighter visual weight than node rows', async () => {
        mockFetch.mockResolvedValue(mockResponse);
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByTestId('folder-row-f-1')).toBeInTheDocument();
            expect(screen.getByTestId('node-row-n-1')).toBeInTheDocument();
        });
    });

    describe('sharing', () => {
        it('calls shareFile and shows share URL on success', async () => {
            mockFetch.mockResolvedValue(mockResponse);
            mockShareFile.mockResolvedValue({
                file_id: 'file-1',
                company_id: 'c-1',
                owner_user_id: 'u-me',
                visibility: 'public',
                public_path: '/s/abc',
                public_url: 'https://saimor.app/s/abc',
                status: 'active',
            });
            render(<MeineDateienPane />);
            await waitFor(() => expect(screen.getByTestId('file-row-file-1')).toBeInTheDocument());
            // file share button is the last share button (after node share buttons)
            const shareBtns = screen.getAllByTestId('share-button');
            fireEvent.click(shareBtns[shareBtns.length - 1]);
            await waitFor(() => {
                expect(mockShareFile).toHaveBeenCalledWith('file-1');
                expect(screen.getByTestId('share-url')).toBeInTheDocument();
            });
        });

        it('calls shareNode and shows unavailable message when server returns null', async () => {
            mockFetch.mockResolvedValue(mockResponse);
            mockShareNode.mockResolvedValue(null); // non-file-backed node
            render(<MeineDateienPane />);
            await waitFor(() => expect(screen.getByTestId('node-row-n-1')).toBeInTheDocument());
            const shareBtns = screen.getAllByTestId('share-button');
            fireEvent.click(shareBtns[0]);
            await waitFor(() => {
                expect(mockShareNode).toHaveBeenCalledWith('n-1');
                expect(screen.getByTestId('share-unavailable')).toBeInTheDocument();
            });
        });
    });
});
