import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: any) =>
      React.createElement('div', { className, 'data-testid': 'motion-div', ...rest }, children),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { RadarCard } from '@/components/mora/RadarCard';
import type { RadarNotification } from '@/lib/store/radarStore';

const makeNotif = (overrides: Partial<RadarNotification> = {}): RadarNotification => ({
  id: 'n1',
  signal_type: 'stale_document',
  title: 'Dokument veraltet',
  body: 'Das Dokument wurde seit 14 Tagen nicht bearbeitet.',
  tier: 'inform',
  status: 'pending',
  entity_id: 'e1',
  entity_type: 'node',
  created_at: new Date(Date.now() - 60_000).toISOString(),
  ...overrides,
});

describe('RadarCard', () => {
  it('renders title, body, signal label and time meta', () => {
    render(<RadarCard notification={makeNotif()} onDismiss={jest.fn()} />);
    expect(screen.getByText('Dokument veraltet')).toBeInTheDocument();
    expect(screen.getByText(/seit 14 Tagen/)).toBeInTheDocument();
    expect(screen.getByText('/ Dokument')).toBeInTheDocument();
    expect(screen.getByText('1m')).toBeInTheDocument();
    expect(screen.getByText('Mora sieht')).toBeInTheDocument();
    expect(screen.getByText('Naechster Schritt')).toBeInTheDocument();
    expect(screen.getByText(/aktiven Bereich/)).toBeInTheDocument();
  });

  it('renders inform tier as Hinweis', () => {
    render(<RadarCard notification={makeNotif({ tier: 'inform', signal_type: 'InactiveSpaceRule' })} onDismiss={jest.fn()} />);
    expect(screen.getByText('Hinweis')).toBeInTheDocument();
    expect(screen.getByText('/ Bereich')).toBeInTheDocument();
  });

  it('renders suggest tier as Vorschlag', () => {
    render(<RadarCard notification={makeNotif({ tier: 'suggest', signal_type: 'deadline_proximity' })} onDismiss={jest.fn()} />);
    expect(screen.getByText('Vorschlag')).toBeInTheDocument();
    expect(screen.getByText('/ Termin')).toBeInTheDocument();
  });

  it('calls onDismiss from the Erledigt action', () => {
    const onDismiss = jest.fn();
    render(<RadarCard notification={makeNotif()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows a concrete action for actionable suggest cards', () => {
    const onAct = jest.fn();
    render(<RadarCard notification={makeNotif({ tier: 'suggest' })} onDismiss={jest.fn()} onAct={onAct} />);
    const btn = screen.getByRole('button', { name: /Dokument oeffnen/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAct).toHaveBeenCalledTimes(1);
  });

  it('shows a direct action for actionable inform cards too', () => {
    const onAct = jest.fn();
    render(<RadarCard notification={makeNotif({ tier: 'inform' })} onDismiss={jest.fn()} onAct={onAct} />);
    fireEvent.click(screen.getByRole('button', { name: /Dokument oeffnen/i }));
    expect(onAct).toHaveBeenCalledTimes(1);
  });

  it('does not show an open action without an action handler', () => {
    render(<RadarCard notification={makeNotif({ tier: 'suggest' })} onDismiss={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /oeffnen|ansehen/i })).toBeNull();
  });
});
