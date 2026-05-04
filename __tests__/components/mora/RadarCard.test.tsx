import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion — standard SAIMOR pattern
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
  created_at: '2026-05-04T10:00:00Z',
  ...overrides,
});

describe('RadarCard', () => {
  it('renders title and body', () => {
    render(<RadarCard notification={makeNotif()} onDismiss={jest.fn()} />);
    expect(screen.getByText('Dokument veraltet')).toBeInTheDocument();
    expect(screen.getByText(/seit 14 Tagen/)).toBeInTheDocument();
  });

  it('calls onDismiss when X is clicked', () => {
    const onDismiss = jest.fn();
    render(<RadarCard notification={makeNotif()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /Schließen/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows Ansehen button for suggest tier with onAct', () => {
    const onAct = jest.fn();
    render(<RadarCard notification={makeNotif({ tier: 'suggest' })} onDismiss={jest.fn()} onAct={onAct} />);
    const btn = screen.getByRole('button', { name: /Ansehen/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAct).toHaveBeenCalledTimes(1);
  });

  it('does not show Ansehen button for inform tier', () => {
    render(<RadarCard notification={makeNotif({ tier: 'inform' })} onDismiss={jest.fn()} onAct={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /Ansehen/i })).toBeNull();
  });

  it('does not show Ansehen button for suggest tier without onAct', () => {
    render(<RadarCard notification={makeNotif({ tier: 'suggest' })} onDismiss={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /Ansehen/i })).toBeNull();
  });
});
