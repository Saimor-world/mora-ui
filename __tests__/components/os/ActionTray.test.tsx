import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActionTray } from '@/components/os/ActionTray';

jest.mock('@/lib/store/moraState', () => ({
  useMoraStore: (selector: (state: { isStandardMode: boolean }) => unknown) =>
    selector({ isStandardMode: false }),
}));

jest.mock('@/lib/hooks/useActionEvents', () => ({
  useActionEvents: jest.fn(),
}));

const { useActionEvents } = jest.requireMock('@/lib/hooks/useActionEvents') as {
  useActionEvents: jest.Mock;
};

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

    render(<ActionTray />);

    fireEvent.click(screen.getByTitle('Action tray'));

    expect(screen.getByText('Aktionsverlauf')).toBeInTheDocument();
    expect(screen.getByText('Ordner erstellen')).toBeInTheDocument();
    expect(screen.getByText('Wartet auf Bestaetigung')).toBeInTheDocument();
    expect(screen.getByText("Ordner 'Q4 Marketing' wird erstellt")).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
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

    render(<ActionTray />);

    fireEvent.click(screen.getByTitle('Action tray'));

    expect(screen.getByText('Datei verschieben')).toBeInTheDocument();
    expect(screen.getByText('Verworfen')).toBeInTheDocument();
    expect(screen.getByText("Verworfen: Datei/Node 'Budget 2026.pdf' wird verschoben")).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });
});
