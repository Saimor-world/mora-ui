import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { ActionTray } from '@/components/os/ActionTray';
import { renderWithProviders, resetAllStores } from '../../test-utils';

const openPane = jest.fn();

const STABLE_PANE = { id: 'pane-test', type: 'search', title: 'Test', size: { width: 960, height: 720 }, position: { x: 0, y: 0 }, zIndex: 1, data: {} };
jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (selector: (state: { openPane: typeof openPane }) => unknown) =>
    selector({ openPane }),
}));

jest.mock('@/lib/hooks/useActionEvents', () => ({
  useActionEvents: jest.fn(),
}));

const { useActionEvents } = jest.requireMock('@/lib/hooks/useActionEvents') as {
  useActionEvents: jest.Mock;
};

beforeEach(resetAllStores);

describe('ActionTray', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders human-readable action titles and status text', () => {
    useActionEvents.mockReturnValue({
      events: [
        {
          action_id: 'act_1',
          status: 'pending_confirmation',
          intent: 'create_folder',
          message: "Ordner 'Q4 Marketing' wird erstellt",
          error: null,
          payload: {
            tool_name: 'create_folder',
            summary: "Ordner 'Q4 Marketing' wird erstellt",
          },
          timestamp: '2026-03-12T14:41:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
    });

    renderWithProviders(<ActionTray />);

    fireEvent.click(screen.getByTitle('Action tray'));

    expect(screen.getByText('Aktionsverlauf')).toBeInTheDocument();
    expect(screen.getByText('Ordner erstellen')).toBeInTheDocument();
    expect(screen.getByText('Wartet auf Bestätigung')).toBeInTheDocument();
    expect(screen.getByText("Ordner 'Q4 Marketing' wird erstellt")).toBeInTheDocument();
  });

  it('renders rejected actions as user-readable audit items', () => {
    useActionEvents.mockReturnValue({
      events: [
        {
          action_id: 'act_2',
          status: 'rejected',
          intent: 'move_node',
          message: null,
          error: null,
          payload: {
            tool_name: 'move_node',
            summary: "Datei/Node 'Budget 2026.pdf' wird verschoben",
          },
          timestamp: '2026-03-12T14:42:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
    });

    renderWithProviders(<ActionTray />);

    fireEvent.click(screen.getByTitle('Action tray'));

    expect(screen.getByText('Dokument verschieben')).toBeInTheDocument();
    expect(screen.getAllByText('Verworfen').length).toBeGreaterThan(0);
    expect(screen.getByText("Verworfen: Dokument 'Budget 2026.pdf' wird verschoben")).toBeInTheDocument();
  });

  it('renders expandable action details and filters', () => {
    useActionEvents.mockReturnValue({
      events: [
        {
          action_id: 'act_abc1234567',
          status: 'done',
          intent: 'rename_node',
          actor_role: 'owner',
          session_id: 'sess-demo',
          message: 'Abgeschlossen: Datei wurde umbenannt',
          error: null,
          payload: {
            tool_name: 'rename_node',
            summary: 'Datei wurde umbenannt',
          },
          timestamp: '2026-03-12T14:43:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
    });

    renderWithProviders(<ActionTray />);
    fireEvent.click(screen.getByTitle('Action tray'));
    fireEvent.click(screen.getByRole('button', { name: 'Action details' }));

    expect(screen.getByText('Rolle')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText('Zeit')).toBeInTheDocument();


    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }));
    expect(screen.getByText('Dokument umbenennen')).toBeInTheDocument();
  });

  it('opens the action center pane from the tray footer', () => {
    useActionEvents.mockReturnValue({
      events: [],
      isLoading: false,
      error: null,
    });

    renderWithProviders(<ActionTray />);
    fireEvent.click(screen.getByTitle('Action tray'));
    fireEvent.click(screen.getByRole('button', { name: /Im Action Center/i }));

    expect(openPane).toHaveBeenCalledWith({
      id: 'actions-main',
      type: 'actions',
      title: 'Action Center',
      size: { width: 920, height: 680 }
    });
  });
});
