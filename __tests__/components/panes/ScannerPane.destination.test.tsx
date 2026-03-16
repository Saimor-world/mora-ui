/**
 * ScannerPane — destination threading V2
 *
 * Verifies that after file confirmation, batchResultSummary carries per-route folderId
 * and the UI renders navigable "Öffnen →" / "Im Zielordner öffnen →" buttons.
 *
 * Priority chain for folderId:
 *   1. confirm response folder_id
 *   2. confirm response destination.folder_id
 *   3. confirm response result.destination.folder_id
 *   4. getFileNode() fallback
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockOpenPane = jest.fn();
const mockUpdatePanePosition = jest.fn();
const mockUpdatePaneSize = jest.fn();
const mockRemovePane = jest.fn();
const mockMinimizePane = jest.fn();
const mockFocusPane = jest.fn();
const mockUploadCompanyFile = jest.fn();
const mockRequestCreateNodeFromFile = jest.fn();
const mockConfirmCreateNodeFromFile = jest.fn();
const mockRejectCreateNodeFromFile = jest.fn();
const mockGetFileNode = jest.fn();
const mockFetchFoldersByCompany = jest.fn();
const mockFetchFolderContext = jest.fn();

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            removePane: mockRemovePane,
            minimizePane: mockMinimizePane,
            focusPane: mockFocusPane,
            updatePanePosition: mockUpdatePanePosition,
            updatePaneSize: mockUpdatePaneSize,
            openPane: mockOpenPane,
            activePaneId: 'scanner-main',
            getPane: () => ({
                id: 'scanner-main',
                size: { width: 920, height: 640 },
                position: { x: 100, y: 80 },
                zIndex: 10,
                data: {
                    source: 'mycelium',
                    batchId: 'batch-dest',
                    initialFiles: [
                        new File(['one'], 'brief-one.pdf', { type: 'application/pdf' }),
                        new File(['two'], 'brief-two.pdf', { type: 'application/pdf' }),
                    ],
                },
            }),
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: () => ({
        activeCompanyId: 'company-1',
        user: { settings: { autoExecuteActions: false } },
    }),
}));

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/lib/api/coreClient', () => ({
    fetchSystemStats: jest.fn().mockResolvedValue(null),
    fetchFoldersByCompany: (...args: any[]) => mockFetchFoldersByCompany(...args),
    fetchFolderContext: (...args: any[]) => mockFetchFolderContext(...args),
}));

jest.mock('@/lib/toast', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
    },
}));

jest.mock('@/lib/api/filesClient', () => ({
    uploadCompanyFile: (...args: any[]) => mockUploadCompanyFile(...args),
    requestCreateNodeFromFile: (...args: any[]) => mockRequestCreateNodeFromFile(...args),
    confirmCreateNodeFromFile: (...args: any[]) => mockConfirmCreateNodeFromFile(...args),
    rejectCreateNodeFromFile: (...args: any[]) => mockRejectCreateNodeFromFile(...args),
    getFileNode: (...args: any[]) => mockGetFileNode(...args),
}));

// ConfirmationCard mock — passes folder_id in the confirmed result (destination V2 contract)
jest.mock('@/components/mora/ConfirmationCard', () => ({
    ConfirmationCard: ({ action, onConfirmed, onRejected }: any) => (
        <div data-testid="confirmation-card">
            <span>{action.file_name}</span>
            <button onClick={() => onConfirmed({ status: 'executed', folder_id: 'folder-dest-card' })}>confirm</button>
            <button onClick={() => onRejected()}>reject</button>
        </div>
    ),
}));

import { ScannerPane } from '@/components/panes/ScannerPane';

beforeEach(() => {
    jest.clearAllMocks();
    mockFetchFoldersByCompany.mockResolvedValue([]);
    mockFetchFolderContext.mockResolvedValue(null);
    mockUploadCompanyFile
        .mockResolvedValueOnce({ id: 'file-d1', company_id: 'company-1', filename: 'brief-one.pdf' })
        .mockResolvedValueOnce({ id: 'file-d2', company_id: 'company-1', filename: 'brief-two.pdf' });
    mockRequestCreateNodeFromFile
        .mockResolvedValueOnce({
            status: 'pending_confirmation',
            tool_name: 'create_node_from_file',
            risk_level: 'mutation',
            confirmation_token: 'tok-d1',
            action_id: 'act-d1',
            intake_context: {
                suggested_location: 'Finance > Reports',
                target_department_name: 'Finance',
                target_space_name: 'Reports',
                target_folder_name: 'Q4 Reports',
            },
        })
        .mockResolvedValueOnce({
            status: 'pending_confirmation',
            tool_name: 'create_node_from_file',
            risk_level: 'mutation',
            confirmation_token: 'tok-d2',
            action_id: 'act-d2',
            intake_context: {
                suggested_location: 'Finance > Reports',
                target_department_name: 'Finance',
                target_space_name: 'Reports',
                target_folder_name: 'Q4 Reports',
            },
        });
    mockConfirmCreateNodeFromFile.mockResolvedValue({ status: 'executed', folder_id: 'folder-dest-bulk' });
    mockGetFileNode.mockResolvedValue({ status: 'linked', folder_id: 'folder-dest-fallback' });
});

afterEach(() => {
    cleanup();
});

// ── helpers ──────────────────────────────────────────────────────────────────

async function uploadBothFiles() {
    fireEvent.click(screen.getByRole('button', { name: /Alle hochladen/i }));
    await waitFor(() => {
        expect(mockUploadCompanyFile).toHaveBeenCalledTimes(2);
        expect(mockRequestCreateNodeFromFile).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
        expect(screen.getByRole('button', { name: /Alle einordnen/i })).toBeInTheDocument();
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScannerPane — destination threading V2', () => {
    // ── Single ConfirmationCard path ──────────────────────────────────────────

    test('sequential confirms: batchResultSummary carries folderId from ConfirmationCard result', async () => {
        render(<ScannerPane id="scanner-main" />);
        fireEvent.click(screen.getByRole('button', { name: /Alle hochladen/i }));

        await waitFor(() => expect(screen.getByTestId('confirmation-card')).toBeInTheDocument());

        // Confirm first file
        fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
        await waitFor(() => expect(screen.getAllByText('brief-two.pdf').length).toBeGreaterThan(0));

        // Confirm second file
        fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
        await waitFor(() => {
            expect(screen.queryByTestId('confirmation-card')).not.toBeInTheDocument();
            expect(screen.getByText(/Batch abgeschlossen/i)).toBeInTheDocument();
        });

        // Per-route "Öffnen →" button must exist (folderId from ConfirmationCard result)
        const perRouteBtn = screen.getByRole('button', { name: /^Öffnen →$/ });
        expect(perRouteBtn).toBeInTheDocument();

        fireEvent.click(perRouteBtn);
        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'finder',
                data: expect.objectContaining({ folderId: 'folder-dest-card' }),
            })
        );
    });

    test('sequential confirms: single destination → header shows "Im Zielordner öffnen" instead of generic "Finder öffnen"', async () => {
        render(<ScannerPane id="scanner-main" />);
        fireEvent.click(screen.getByRole('button', { name: /Alle hochladen/i }));

        await waitFor(() => expect(screen.getByTestId('confirmation-card')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
        await waitFor(() => expect(screen.getAllByText('brief-two.pdf').length).toBeGreaterThan(0));
        fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

        await waitFor(() => expect(screen.getByText(/Batch abgeschlossen/i)).toBeInTheDocument());

        // Single known destination → personalised header label
        expect(screen.getByRole('button', { name: /Im Zielordner öffnen/i })).toBeInTheDocument();
        // Generic label must NOT appear
        expect(screen.queryByRole('button', { name: /^Finder öffnen →$/ })).not.toBeInTheDocument();
    });

    // ── Bulk confirm path ─────────────────────────────────────────────────────

    test('bulk confirm: per-route "Öffnen →" button calls openPane with folderId from confirm response', async () => {
        render(<ScannerPane id="scanner-main" />);
        await uploadBothFiles();

        fireEvent.click(screen.getByRole('button', { name: /Alle einordnen/i }));

        await waitFor(() => {
            expect(screen.getByText(/Batch abgeschlossen/i)).toBeInTheDocument();
        });

        const perRouteBtn = screen.getByRole('button', { name: /^Öffnen →$/ });
        fireEvent.click(perRouteBtn);

        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'finder',
                data: expect.objectContaining({ folderId: 'folder-dest-bulk' }),
            })
        );
    });

    test('bulk confirm: confirm response destination.folder_id (priority 2) is used when top-level folder_id absent', async () => {
        mockConfirmCreateNodeFromFile.mockResolvedValue({
            status: 'executed',
            destination: { folder_id: 'folder-dest-priority2' },
        });

        render(<ScannerPane id="scanner-main" />);
        await uploadBothFiles();
        fireEvent.click(screen.getByRole('button', { name: /Alle einordnen/i }));

        await waitFor(() => expect(screen.getByText(/Batch abgeschlossen/i)).toBeInTheDocument());

        const perRouteBtn = screen.getByRole('button', { name: /^Öffnen →$/ });
        fireEvent.click(perRouteBtn);

        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ folderId: 'folder-dest-priority2' }),
            })
        );
    });

    // ── getFileNode fallback ──────────────────────────────────────────────────

    test('bulk confirm: getFileNode called as fallback when confirm response has no folder_id', async () => {
        mockConfirmCreateNodeFromFile.mockResolvedValue({ status: 'executed' }); // no folder_id at all
        mockGetFileNode.mockResolvedValue({ status: 'linked', folder_id: 'folder-dest-fallback' });

        render(<ScannerPane id="scanner-main" />);
        await uploadBothFiles();
        fireEvent.click(screen.getByRole('button', { name: /Alle einordnen/i }));

        await waitFor(() => {
            expect(mockGetFileNode).toHaveBeenCalledWith('file-d1');
            expect(mockGetFileNode).toHaveBeenCalledWith('file-d2');
        });

        await waitFor(() => expect(screen.getByText(/Batch abgeschlossen/i)).toBeInTheDocument());

        const perRouteBtn = screen.getByRole('button', { name: /^Öffnen →$/ });
        fireEvent.click(perRouteBtn);

        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ folderId: 'folder-dest-fallback' }),
            })
        );
    });

    test('bulk confirm: no "Öffnen →" button when getFileNode also returns no folder_id', async () => {
        mockConfirmCreateNodeFromFile.mockResolvedValue({ status: 'executed' });
        mockGetFileNode.mockResolvedValue({ status: 'not_linked' }); // no folder_id

        render(<ScannerPane id="scanner-main" />);
        await uploadBothFiles();
        fireEvent.click(screen.getByRole('button', { name: /Alle einordnen/i }));

        await waitFor(() => expect(screen.getByText(/Batch abgeschlossen/i)).toBeInTheDocument());

        // No per-route navigation button when destination is unknown
        expect(screen.queryByRole('button', { name: /^Öffnen →$/ })).not.toBeInTheDocument();
        // Falls back to generic "Finder öffnen →" in the header
        expect(screen.getByRole('button', { name: /Finder öffnen →/ })).toBeInTheDocument();
    });
});
