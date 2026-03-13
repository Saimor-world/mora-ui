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

  it('renders route suggestion details for intake cards', () => {
    render(
      <ConfirmationCard
        action={{
          ...baseAction,
          tool_name: 'create_node_from_file',
          action_id: 'action-intake-route',
          intake_context: {
            business_summary: 'Neue Rechnung erkannt',
            suggested_category: 'PDF-Dokument',
            suggested_location: 'Finance > Eingaenge > Inbox',
            route_reason: 'Standard-Eingang fuer neue Dateien in dieser Firma',
            route_confidence_label: 'hoch',
            route_confidence_score: 0.86,
            route_signals: ['firmenweite_inbox', 'neuer_dateieingang'],
            target_department_name: 'Finance',
            target_space_name: 'Eingaenge',
            target_folder_name: 'Inbox',
          },
        }}
        onConfirmed={jest.fn()}
        onRejected={jest.fn()}
        variant="intake"
      />
    );

    expect(screen.getByText('Mycelium Routing')).toBeInTheDocument();
    expect(screen.getByText('PDF-Dokument')).toBeInTheDocument();
    expect(screen.getByText('Finance > Eingaenge > Inbox')).toBeInTheDocument();
    expect(screen.getByText('Standard-Eingang fuer neue Dateien in dieser Firma')).toBeInTheDocument();
    expect(screen.getByText(/Hohe Sicherheit/i)).toBeInTheDocument();
    expect(screen.getByText(/86%/i)).toBeInTheDocument();
    expect(screen.getByText('firmenweite inbox')).toBeInTheDocument();
  });

  it('renders readable file operation details', () => {
    render(
      <ConfirmationCard
        action={baseAction}
        onConfirmed={jest.fn()}
        onRejected={jest.fn()}
      />
    );

    expect(screen.getByText('1 Datei wird verschoben')).toBeInTheDocument();
    expect(screen.getByText('Datei verschieben')).toBeInTheDocument();
    expect(screen.getByText('Budget 2026.pdf')).toBeInTheDocument();
    expect(screen.getByText('Winter Marketing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ausführen' })).toBeInTheDocument();
  });

  it('renders readable rename operation details', () => {
    render(
      <ConfirmationCard
        action={{
          ...baseAction,
          tool_name: 'rename_node',
          action_id: 'action-rename',
          params: {
            summary: '1 Datei wird umbenannt',
            operations: [
              {
                type: 'rename_node',
                node_id: 'node-2',
                node_name: 'Budget 2026.pdf',
                new_name: 'Budget 2027.pdf',
              },
            ],
            session_id: 'sess-rename',
          },
        }}
        onConfirmed={jest.fn()}
        onRejected={jest.fn()}
      />
    );

    expect(screen.getByText('1 Datei wird umbenannt')).toBeInTheDocument();
    expect(screen.getByText('Datei umbenennen')).toBeInTheDocument();
    expect(screen.getByText('Budget 2027.pdf')).toBeInTheDocument();
  });

  it('renders create_note plans in a readable confirmation card', () => {
    render(
      <ConfirmationCard
        action={{
          tool_name: 'create_note',
          risk_level: 'write',
          confirmation_token: 'tok-note',
          action_id: 'act-note',
          params: {
            summary: "Notiz 'Launch Briefing' wird erstellt",
            operations: [{ type: 'create_note', title: 'Launch Briefing', destination_label: 'Winter Marketing', content_preview: 'Erste Stichpunkte' }],
          },
        } as any}
        onConfirmed={jest.fn()}
        onRejected={jest.fn()}
      />
    );

    expect(screen.getByText('Launch Briefing', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/Winter Marketing/)).toBeInTheDocument();
    expect(screen.getByText(/Erste Stichpunkte/)).toBeInTheDocument();
  });

  it('renders create_draft plans in a readable confirmation card', () => {
    render(
      <ConfirmationCard
        action={{
          tool_name: 'create_draft',
          risk_level: 'write',
          confirmation_token: 'tok-draft',
          action_id: 'act-draft',
          params: {
            summary: "Entwurf 'Q4 Launch' wird erstellt",
            operations: [{ type: 'create_draft', title: 'Q4 Launch', destination_label: 'Campaigns', content_preview: 'Erster Entwurf' }],
          },
        } as any}
        onConfirmed={jest.fn()}
        onRejected={jest.fn()}
      />
    );

    expect(screen.getByText('Q4 Launch', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/Campaigns/)).toBeInTheDocument();
    expect(screen.getByText(/Erster Entwurf/)).toBeInTheDocument();
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
      fireEvent.click(screen.getByRole('button', { name: 'Ausführen' }));
    });

    expect(mockCorePost).toHaveBeenCalledWith('/v3/actions/confirm', {
      confirm_token: 'token-1',
      session_id: 'sess-1',
    });
    expect(onConfirmed).toHaveBeenCalledWith({ ok: true });
  });

  it('uses the file-op reject endpoint by default', async () => {
    mockCorePost.mockResolvedValue({ rejected: true, result: { status: 'rejected' } } as any);
    const onRejected = jest.fn();

    render(
      <ConfirmationCard
        action={baseAction}
        onConfirmed={jest.fn()}
        onRejected={onRejected}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    });

    expect(mockCorePost).toHaveBeenCalledWith('/v3/actions/reject', {
      confirmation_token: 'token-1',
      session_id: 'sess-1',
    });
    expect(onRejected).toHaveBeenCalled();
  });
});
