import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';
import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';

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
    params: { node_id: 'node-1' },
    risk_level: 'high',
    confirmation_token: 'token-1',
    action_id: 'action-1',
  };

  it('points to the default confirmation card once after mount', () => {
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
      message: 'Bestätigung erforderlich',
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
            suggested_location: 'Finance / Eingänge',
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
      message: 'Bitte Einordnung prüfen',
      duration: 2600,
      source: 'system',
    });
  });
});
