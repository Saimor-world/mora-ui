import { render, screen, fireEvent } from '@testing-library/react';
import { MoraWorkspaceStart } from '@/apps/chat/components/MoraWorkspaceStart';
import { useScopedToday } from '@/lib/os/useScopedToday';

jest.mock('@/lib/os/useScopedToday', () => ({ useScopedToday: jest.fn() }));
const scopedToday = jest.mocked(useScopedToday);
const meta = { status: 'ok', complete: true, as_of: new Date().toISOString(), stale_after_seconds: 600 };
const snapshot = {
  generated_at: new Date().toISOString(),
  mail: { ...meta, inbox_loaded: 1, items: [{ subject: 'Echte Quelle im Test', from_addr: 'a@example.invalid', snippet: 'Auszug' }] },
  calendar: { ...meta, count: 0, next_event: null, events: [] },
  tasks: { ...meta, counts: { due_today: 0 }, due_today: [], overdue: [] },
};

describe('MÔRA workspace source truth', () => {
  function setup(overrides = {}) {
    const refresh = jest.fn();
    scopedToday.mockReturnValue({ snapshot, loading: false, refreshing: false, loadError: null, refresh, ...overrides } as unknown as ReturnType<typeof useScopedToday>);
    const onAsk = jest.fn();
    render(<MoraWorkspaceStart context="Gewählte Firma" onAsk={onAsk} />);
    return { onAsk, refresh };
  }

  it('passes the actual loaded source data to the question after an explicit click', () => {
    const { onAsk } = setup();
    expect(onAsk).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Meinen Tag klären/ }));
    expect(onAsk).toHaveBeenCalledWith(expect.stringContaining('Echte Quelle im Test'), 'Was ist heute wichtig?');
    expect(onAsk.mock.calls[0][0]).toContain(snapshot.generated_at);
    expect(screen.getByText('Heute keine Termine')).toBeInTheDocument();
  });

  it('does not present a disconnected source as an empty inbox', () => {
    setup({ snapshot: { ...snapshot, mail: { ...snapshot.mail, status: 'disconnected', inbox_loaded: null, items: [] } } });
    expect(screen.getByText('Verbindung getrennt')).toBeInTheDocument();
    expect(screen.queryByText('Geladener Posteingang ist leer')).not.toBeInTheDocument();
  });

  it('does not present an old source as a current count', () => {
    setup({ snapshot: { ...snapshot, mail: { ...snapshot.mail, as_of: '2020-01-01T00:00:00Z' } } });
    expect(screen.getByText('Stand veraltet')).toBeInTheDocument();
    expect(screen.queryByText('1 Nachricht im geladenen Ausschnitt')).not.toBeInTheDocument();
  });

  it('shows a rights error and offers a real retry', () => {
    const { refresh } = setup({ snapshot: null, loadError: 'forbidden' });
    expect(screen.getByRole('alert')).toHaveTextContent('Zugriffsrechte');
    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }));
    expect(refresh).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Heute keine Termine')).not.toBeInTheDocument();
  });
});
