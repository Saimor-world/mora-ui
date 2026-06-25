import { render, screen } from '@testing-library/react';
import { LagefeldCanvas } from '@/components/lagefeld/LagefeldCanvas';
import { LANDESSOZIALGERICHT_FIELD } from '@/lib/lagefeld/fixtures';
import { reduceUiActions } from '@/lib/lagefeld/reduceUiActions';

test('the canned scenario reduces to 7 cards including a locked action', () => {
  const state = reduceUiActions(LANDESSOZIALGERICHT_FIELD);

  expect(state.cards).toHaveLength(7);
  expect(state.cards.some((c) => c.action?.locked)).toBe(true);
});

test('the canned scenario renders the interpretation and the gated action', () => {
  const state = reduceUiActions(LANDESSOZIALGERICHT_FIELD);
  render(<LagefeldCanvas state={state} />);

  expect(screen.getByText(/kein Beweis für eine Absage/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /freigeben/i })).toBeInTheDocument();
});
