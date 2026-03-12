import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActionCenterPane } from '@/components/panes/ActionCenterPane';

const coreGet = jest.fn();
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
            result: {
              operations_executed: [
                {
                  type: 'rename_node',
                  node_name: 'Altname.pdf',
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
    expect(screen.getByText('Datei umbenennen', { selector: 'div' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }));
    expect(screen.queryByText('Ordner erstellen', { selector: 'div' })).not.toBeInTheDocument();
    expect(screen.getByText('Datei umbenennen', { selector: 'div' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Action details' }));
    expect(screen.getByText('Aktion')).toBeInTheDocument();
    expect(screen.getByText('act_2')).toBeInTheDocument();
    expect(screen.getByText('Rolle')).toBeInTheDocument();
    expect(screen.getByText('Ergebnis')).toBeInTheDocument();
    expect(screen.getByText('Altname.pdf -> Neuname.pdf')).toBeInTheDocument();
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
      expect.stringContaining('intent=rename_node'),
      { isOptional: true }
    ));

    fireEvent.change(screen.getByPlaceholderText('Session-ID'), { target: { value: 'sess-2' } });
    await waitFor(() => expect(coreGet).toHaveBeenLastCalledWith(
      expect.stringContaining('session_id=sess-2'),
      { isOptional: true }
    ));
  });
});
