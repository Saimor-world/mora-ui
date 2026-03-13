import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockUpdatePanePosition = jest.fn();
const mockUpdatePaneSize = jest.fn();
const mockRemovePane = jest.fn();
const mockMinimizePane = jest.fn();
const mockFocusPane = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockToastInfo = jest.fn();
const mockUploadCompanyFile = jest.fn();
const mockRequestCreateNodeFromFile = jest.fn();
const mockConfirmCreateNodeFromFile = jest.fn();
const mockRejectCreateNodeFromFile = jest.fn();

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            removePane: mockRemovePane,
            minimizePane: mockMinimizePane,
            focusPane: mockFocusPane,
            updatePanePosition: mockUpdatePanePosition,
            updatePaneSize: mockUpdatePaneSize,
            activePaneId: 'scanner-main',
            getPane: () => ({
                id: 'scanner-main',
                size: { width: 920, height: 640 },
                position: { x: 100, y: 80 },
                zIndex: 10,
                data: {
                    source: 'mycelium',
                    batchId: 'batch-1',
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
}));

jest.mock('@/lib/toast', () => ({
    toast: {
        success: (...args: any[]) => mockToastSuccess(...args),
        error: (...args: any[]) => mockToastError(...args),
        info: (...args: any[]) => mockToastInfo(...args),
    },
}));

jest.mock('@/lib/api/filesClient', () => ({
    uploadCompanyFile: (...args: any[]) => mockUploadCompanyFile(...args),
    requestCreateNodeFromFile: (...args: any[]) => mockRequestCreateNodeFromFile(...args),
    confirmCreateNodeFromFile: (...args: any[]) => mockConfirmCreateNodeFromFile(...args),
    rejectCreateNodeFromFile: (...args: any[]) => mockRejectCreateNodeFromFile(...args),
}));

jest.mock('@/components/mora/ConfirmationCard', () => ({
    ConfirmationCard: ({ action, onConfirmed, onRejected }: any) => (
        <div data-testid="confirmation-card">
            <span>{action.file_name}</span>
            <button onClick={() => onConfirmed({ status: 'executed' })}>confirm</button>
            <button onClick={() => onRejected()}>reject</button>
        </div>
    ),
}));

import { ScannerPane } from '@/components/panes/ScannerPane';

beforeEach(() => {
    jest.clearAllMocks();
    mockConfirmCreateNodeFromFile.mockResolvedValue({ status: 'executed' });
    mockUploadCompanyFile
        .mockResolvedValueOnce({ id: 'file-1', company_id: 'company-1', filename: 'brief-one.pdf' })
        .mockResolvedValueOnce({ id: 'file-2', company_id: 'company-1', filename: 'brief-two.pdf' });
    mockRequestCreateNodeFromFile
        .mockResolvedValueOnce({
            status: 'pending_confirmation',
            tool_name: 'create_node_from_file',
            risk_level: 'mutation',
            confirmation_token: 'token-1',
            action_id: 'action-1',
            intake_context: {
                suggested_category: 'briefing',
                suggested_location: 'Marketing > Kampagnen',
                route_confidence_label: 'niedrig',
                route_confidence_score: 0.42,
                target_department_name: 'Marketing',
                target_space_name: 'Kampagnen',
            },
        })
        .mockResolvedValueOnce({
            status: 'pending_confirmation',
            tool_name: 'create_node_from_file',
            risk_level: 'mutation',
            confirmation_token: 'token-2',
            action_id: 'action-2',
            intake_context: {
                suggested_category: 'briefing',
                suggested_location: 'Marketing > Kampagnen',
                route_confidence_label: 'hoch',
                route_confidence_score: 0.91,
                target_department_name: 'Marketing',
                target_space_name: 'Kampagnen',
            },
        });
});

describe('ScannerPane batch review', () => {
    test('queues multiple pending reviews and advances after confirmation/rejection', async () => {
        render(<ScannerPane id="scanner-main" />);

        expect(await screen.findByText(/Mycelium Intake/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Upload All/i }));

        await waitFor(() => {
            expect(mockUploadCompanyFile).toHaveBeenCalledTimes(2);
            expect(mockRequestCreateNodeFromFile).toHaveBeenCalledTimes(2);
        });

        expect(await screen.findByText(/2 Dateien warten auf Freigabe/i)).toBeInTheDocument();
        expect(screen.getByText('Marketing > Kampagnen')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Alle einordnen/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Alle verwerfen/i })).toBeInTheDocument();
        expect(screen.getAllByText('brief-one.pdf').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Niedrige Sicherheit/i).length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

        await waitFor(() => {
            expect(screen.getAllByText('brief-two.pdf').length).toBeGreaterThan(0);
            expect(screen.getByText(/1 Datei wartet auf Freigabe/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'reject' }));

        await waitFor(() => {
            expect(screen.queryByTestId('confirmation-card')).not.toBeInTheDocument();
        });

        expect(mockRejectCreateNodeFromFile).toHaveBeenCalledWith('file-2', 'token-2');
        expect(screen.getByText(/Node created/i)).toBeInTheDocument();
        expect(screen.getByText(/Node creation rejected/i)).toBeInTheDocument();
        expect(screen.getByText(/Batch abgeschlossen/i)).toBeInTheDocument();
        expect(screen.getByText(/1 bestaetigt, 1 verworfen/i)).toBeInTheDocument();
    });

    test('bulk confirm processes the whole review queue', async () => {
        render(<ScannerPane id="scanner-main" />);

        fireEvent.click(screen.getByRole('button', { name: /Upload All/i }));

        expect(await screen.findByText(/2 Dateien warten auf Freigabe/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Alle einordnen/i }));

        await waitFor(() => {
            expect(screen.queryByTestId('confirmation-card')).not.toBeInTheDocument();
        });

        expect(mockConfirmCreateNodeFromFile).toHaveBeenCalledTimes(2);
        expect(screen.getAllByText(/Node created/i).length).toBeGreaterThanOrEqual(2);
    });
});
