import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';
import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';
import { corePost } from '@/lib/api/coreClient';

jest.mock('@/lib/api/coreClient', () => ({
  corePost: jest.fn(),
}));

jest.mock('@/lib/mora/presenceEvents', () => ({
  dispatchMoraPresence: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockDispatchMoraPresence = dispatchMoraPresence as jest.MockedFunction<typeof dispatchMoraPresence>;
const mockCorePost = corePost as jest.MockedFunction<typeof corePost>;

describe('ConfirmationCard presence trigger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const baseAction = {
    tool_name: 'move_node',
    params: {
      summary: '1 Datei wird verschoben',
      operations: [
        {
          type: 'move_node',
          node_id: 'node-1',
          node_name: 'Budget 2026.pdf',
          target_folder_id: 'folder-1',
          target_folder_name: 'Winter Marketing',
        },
      ],
      session_id: 'sess-1',
    },
    risk_level: 'write',
    confirmation_token: 'token-1',
    action_id: 'action-1',
  };

  it('points to the file-op confirmation card once after mount', () => {
    render(
      <ConfirmationCard
        action={baseAction}
        onConfirmed={jest.fn()}
        onRejected={jest.fn()}
      />
    );

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(mockDispatchMoraPresence).toHaveBeenCalledWith({
      action: 'point',
      targetId: 'confirmation-card-action-1',
      message: 'Aktionsausfuehrung bestaetigen',
      duration: 2600,
      source: 'system',
    });
  });

  it('uses the intake-specific message for intake cards', () => {
    render(
      <ConfirmationCard
        action={{
          ...baseAction,
          action_id: 'action-2',
          intake_context: {
            business_summary: 'Neue Rechnung erkannt',
            suggested_location: 'Finance / Eingaenge',
          },
        }}
        onConfirmed={jest.fn()}
        onRejected={jest.fn()}
        variant="intake"
      />
    );

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(mockDispatchMoraPresence).toHaveBeenCalledWith({
      action: 'point',
      targetId: 'confirmation-card-action-2',
      message: 'Bitte Einordnung pruefen',
      duration: 2600,
      source: 'system',
    });
  });

  it('renders readable file operation details', () => {
    render(
      <ConfirmationCard
        action={baseAction}
        onConfirmed={jest.fn()}
        onRejected={jest.fn()}
      />
    );

    expect(screen.getByText('Aktionsplan pruefen')).toBeInTheDocument();
    expect(screen.getByText('1 Datei wird verschoben')).toBeInTheDocument();
    expect(screen.getByText('Datei verschieben')).toBeInTheDocument();
    expect(screen.getByText('Budget 2026.pdf')).toBeInTheDocument();
    expect(screen.getByText('Winter Marketing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ausfuehren' })).toBeInTheDocument();
  });

  it('uses the file-op confirm endpoint by default', async () => {
    mockCorePost.mockResolvedValue({ confirmed: true, result: { ok: true } } as any);
    const onConfirmed = jest.fn();

    render(
      <ConfirmationCard
        action={baseAction}
        onConfirmed={onConfirmed}
        onRejected={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ausfuehren' }));
    });

    expect(mockCorePost).toHaveBeenCalledWith('/v3/actions/confirm', {
      confirm_token: 'token-1',
      session_id: 'sess-1',
    });
    expect(onConfirmed).toHaveBeenCalledWith({ ok: true });
  });
});
