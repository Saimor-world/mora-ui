import { render, screen } from '@testing-library/react';
import { LagefeldCanvas } from '@/components/lagefeld/LagefeldCanvas';
import type { FieldState } from '@/lib/lagefeld/types';

const state: FieldState = {
  cards: [
    { id: 'c1', kind: 'signal', title: 'Keine neue Mail', x: 20, y: 30, symbols: ['clock'] },
    {
      id: 'a1',
      kind: 'action',
      title: 'Mailentwurf senden',
      x: 400,
      y: 60,
      symbols: ['lock'],
      action: { label: 'Mailentwurf senden', tool: 'sendMail', args: {}, risk: 'send', locked: true },
    },
  ],
  connections: [{ from: 'c1', to: 'a1', relation: 'needs_decision' }],
};

test('renders a card per state card with its title', () => {
  render(<LagefeldCanvas state={state} />);

  expect(screen.getByText('Keine neue Mail')).toBeInTheDocument();
  expect(screen.getByText('Mailentwurf senden')).toBeInTheDocument();
});

test('renders one connection line per connection', () => {
  const { container } = render(<LagefeldCanvas state={state} />);

  expect(container.querySelectorAll('[data-testid="lagefeld-edge"]')).toHaveLength(1);
});

test('a locked action card shows a freigeben control', () => {
  render(<LagefeldCanvas state={state} />);

  expect(screen.getByRole('button', { name: /freigeben/i })).toBeInTheDocument();
});
