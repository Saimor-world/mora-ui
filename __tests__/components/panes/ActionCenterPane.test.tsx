import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActionCenterPane } from '@/components/panes/ActionCenterPane';

const coreGet = jest.fn();
const corePost = jest.fn();
const confirmCreateNodeFromFile = jest.fn();
const rejectCreateNodeFromFile = jest.fn();
const realtimeOn = jest.fn();
const realtimeOff = jest.fn();
const realtimeConnect = jest.fn();

const paneState = {
  activePaneId: 'actions-main',
  getPane: () => ({
    id: 'actions-main',
    type: 'actions',
    title: 'Action Center',
    size: { width: 920, height: 680 },
    position: { x: 120, y: 80 },
    zIndex: 700,
    minimized: false,
  }),
  removePane: jest.fn(),
  minimizePane: jest.fn(),
  focusPane: jest.fn(),
  updatePanePosition: jest.fn(),
  updatePaneSize: jest.fn(),
};

jest.mock('@/components/layers/GlassPanel', () => ({
  GlassPanel: ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
}));

jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (selector?: (state: typeof paneState) => unknown) => (
    typeof selector === 'function' ? selector(paneState) : paneState
  ),
}));

jest.mock('@/lib/api/coreClient', () => ({
  coreGet: (...args: unknown[]) => coreGet(...args),
  corePost: (...args: unknown[]) => corePost(...args),
}));

jest.mock('@/lib/api/filesClient', () => ({
  confirmCreateNodeFromFile: (...args: unknown[]) => confirmCreateNodeFromFile(...args),
  rejectCreateNodeFromFile: (...args: unknown[]) => rejectCreateNodeFromFile(...args),
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}));

jest.mock('@/lib/api/realtimeClient', () => ({
  realtime: {
    on: (...args: unknown[]) => realtimeOn(...args),
    off: (...args: unknown[]) => realtimeOff(...args),
    connect: (...args: unknown[]) => realtimeConnect(...args),
  }
}));

describe('ActionCenterPane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filtered action history and details', async () => {
    coreGet.mockResolvedValue({
      events: [
        {
          action_id: 'act_1',
          status: 'pending_confirmation',
          intent: 'create_folder',
          actor_role: 'owner',
          session_id: 'sess-1',
          message: "Ordner 'Winter Marketing' wird erstellt",
          error: null,
          payload: { summary: "Ordner 'Winter Marketing' wird erstellt", tool_name: 'create_folder' },
          timestamp: '2026-03-12T16:00:00.000Z',
        },
        {
          action_id: 'act_2',
          status: 'done',
          intent: 'rename_node',
          actor_role: 'member',
          session_id: 'sess-2',
          message: 'Datei wurde umbenannt',
          error: null,
          payload: {
            summary: 'Datei wurde umbenannt',
            tool_name: 'rename_node',
            operations: [
              {
                type: 'rename_node',
                node_name: 'Altname.pdf',
                new_name: 'Neuname-final.pdf',
              },
            ],
            result: {
              operations_executed: [
                {
                  type: 'rename_node',
                  old_name: 'Altname.pdf',
                  new_name: 'Neuname.pdf',
                },
              ],
            },
          },
          timestamp: '2026-03-12T16:01:00.000Z',
        },
      ],
    });

    render(<ActionCenterPane id="actions-main" />);

    expect(await screen.findByText('Action Center')).toBeInTheDocument();
    expect(await screen.findByText('Ordner erstellen', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByText('Dokument umbenennen', { selector: 'div' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }));
    expect(screen.queryByText('Ordner erstellen', { selector: 'div' })).not.toBeInTheDocument();
    expect(screen.getByText('Dokument umbenennen', { selector: 'div' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Action details' }));
    expect(screen.getByText('Aktion')).toBeInTheDocument();
    expect(screen.getByText('Rolle')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Ergebnis')).toBeInTheDocument();
    expect(screen.getAllByText('Vorher: Altname.pdf')).toHaveLength(2);
    expect(screen.getByText('Nachher: Neuname-final.pdf')).toBeInTheDocument();
    expect(screen.getByText('Nachher: Neuname.pdf')).toBeInTheDocument();
  });

  it('renders move plan and result details with source and target folders', async () => {
    coreGet.mockResolvedValue({
      events: [
        {
          action_id: 'act_move_1',
          status: 'done',
          intent: 'move_node',
          actor_role: 'owner',
          session_id: 'sess-move-1',
          message: 'Datei wurde verschoben',
          error: null,
          payload: {
            summary: 'Datei wurde verschoben',
            tool_name: 'move_node',
            operations: [
              {
                type: 'move_node',
                node_name: 'Budgetplanung.pdf',
                source_folder_name: 'Inbox',
                target_folder_name: 'Q4 Planning',
              },
            ],
            result: {
              operations_executed: [
                {
                  type: 'move_node',
                  node_name: 'Budgetplanung.pdf',
                  source_folder_name: 'Inbox',
                  target_folder_name: 'Q4 Planning',
                },
              ],
            },
          },
          timestamp: '2026-03-12T16:02:00.000Z',
        },
      ],
    });

    render(<ActionCenterPane id="actions-main" />);

    expect(await screen.findByText('Dokument verschieben', { selector: 'div' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Action details' }));

    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Ergebnis')).toBeInTheDocument();
    expect(screen.getAllByText('Dokument: Budgetplanung.pdf')).toHaveLength(2);
    expect(screen.getAllByText('Quelle: Inbox')).toHaveLength(2);
    expect(screen.getAllByText('Ziel: Q4 Planning')).toHaveLength(2);
  });

  it('reloads history when action realtime events arrive', async () => {
    coreGet.mockResolvedValue({ events: [] });

    render(<ActionCenterPane id="actions-main" />);

    await waitFor(() => expect(realtimeOn).toHaveBeenCalledWith('action_status', expect.any(Function)));

    const handler = realtimeOn.mock.calls[0][1] as () => void;

    await act(async () => {
      handler();
    });

    await waitFor(() => expect(coreGet).toHaveBeenCalledTimes(2));
  });

  it('passes intent and session filters to the backend query', async () => {
    coreGet.mockResolvedValue({ events: [] });

    render(<ActionCenterPane id="actions-main" />);

    await waitFor(() => expect(coreGet).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByDisplayValue('Alle Aktionen'), { target: { value: 'rename_node' } });
    await waitFor(() => expect(coreGet).toHaveBeenLastCalledWith(
      expect.stringContaining('intent=rename_node')
    ));

    fireEvent.change(screen.getByPlaceholderText('Session-ID'), { target: { value: 'sess-2' } });
    await waitFor(() => expect(coreGet).toHaveBeenLastCalledWith(
      expect.stringContaining('session_id=sess-2')
    ));
  });

  it('confirms a pending intake event directly from the batch history view', async () => {
    coreGet.mockResolvedValue({
      events: [
        {
          action_id: 'file_1',
          status: 'pending_confirmation',
          intent: 'create_node_from_file',
          actor_role: 'owner',
          session_id: 'batch_1',
          batch_id: 'batch_1',
          message: "Datei 'briefing.pdf' wartet auf Einordnung",
          error: null,
          payload: {
            tool_name: 'create_node_from_file',
            summary: "Datei 'briefing.pdf' wartet auf Einordnung",
            file_id: 'file-real-1',
            filename: 'briefing.pdf',
            confirmation_token: 'tok_file_123',
            intake_context: {
              target_department_name: 'Marketing',
              target_space_name: 'Kampagnen',
              route_confidence_label: 'hoch',
            },
          },
          timestamp: '2026-03-12T16:03:00.000Z',
        },
      ],
    });
    confirmCreateNodeFromFile.mockResolvedValue({ status: 'done' });

    render(<ActionCenterPane id="actions-main" />);

    fireEvent.change(screen.getByDisplayValue('Alle Aktionen'), { target: { value: 'intake' } });
    const batchSummary = await screen.findByText('1 Datei wartet auf Freigabe');
    fireEvent.click(batchSummary);
    fireEvent.click(await screen.findByRole('button', { name: /Best.tigen/ }));

    await waitFor(() => expect(confirmCreateNodeFromFile).toHaveBeenCalledWith('file-real-1', 'tok_file_123'));
    await waitFor(() => expect(coreGet.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('rejects a pending file-op action directly from the flat action list', async () => {
    coreGet.mockResolvedValue({
      events: [
        {
          action_id: 'act_fileop_1',
          status: 'pending_confirmation',
          intent: 'create_folder',
          actor_role: 'owner',
          session_id: 'sess-9',
          message: "Ordner 'Winter Marketing' wird erstellt",
          error: null,
          payload: {
            tool_name: 'create_folder',
            summary: "Ordner 'Winter Marketing' wird erstellt",
            confirmation_token: 'tok_action_123',
          },
          timestamp: '2026-03-12T16:04:00.000Z',
        },
      ],
    });
    corePost.mockResolvedValue({ rejected: true });

    render(<ActionCenterPane id="actions-main" />);

    expect(await screen.findByText('Ordner erstellen', { selector: 'div' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }));

    await waitFor(() => expect(corePost).toHaveBeenCalledWith('/v3/actions/reject', { confirmation_token: 'tok_action_123' }));
    await waitFor(() => expect(coreGet).toHaveBeenCalledTimes(2));
  });
});

