import { reduceUiActions } from '@/lib/lagefeld/reduceUiActions';

const card = (input: Record<string, unknown>) => ({ name: 'placeCard' as const, input });

test('placeCard becomes a positioned card with empty symbols', () => {
  const state = reduceUiActions([
    card({ field_id: 'f', card_id: 'c1', kind: 'signal', title: 'Gespräch fand statt', x: 10, y: 20 }),
  ]);

  expect(state.cards).toHaveLength(1);
  expect(state.cards[0]).toMatchObject({
    id: 'c1',
    kind: 'signal',
    title: 'Gespräch fand statt',
    x: 10,
    y: 20,
    symbols: [],
  });
});

test('placeSymbol attaches to its card; connect collects a typed edge', () => {
  const state = reduceUiActions([
    card({ field_id: 'f', card_id: 'c1', kind: 'signal', title: 'A', x: 0, y: 0 }),
    card({ field_id: 'f', card_id: 'c2', kind: 'interpretation', title: 'B', x: 0, y: 0 }),
    { name: 'placeSymbol' as const, input: { field_id: 'f', on_card: 'c1', kind: 'clock' } },
    { name: 'connect' as const, input: { field_id: 'f', from_card: 'c1', to_card: 'c2', relation: 'waits_on' } },
  ]);

  expect(state.cards.find((c) => c.id === 'c1')!.symbols).toEqual(['clock']);
  expect(state.connections).toEqual([{ from: 'c1', to: 'c2', relation: 'waits_on' }]);
});

test('proposeAction becomes a locked action card carrying its payload', () => {
  const state = reduceUiActions([
    {
      name: 'proposeAction',
      input: {
        field_id: 'f',
        card_id: 'a1',
        label: 'Mailentwurf senden',
        tool: 'sendMail',
        args: { to: 'x' },
        risk: 'send',
        x: 5,
        y: 6,
      },
    },
  ]);

  const action = state.cards.find((c) => c.id === 'a1')!;
  expect(action.kind).toBe('action');
  expect(action.action).toMatchObject({ label: 'Mailentwurf senden', tool: 'sendMail', risk: 'send', locked: true });
  expect(action.symbols).toContain('lock');
});

test('unknown card reference in placeSymbol is ignored, not crashing', () => {
  const state = reduceUiActions([{ name: 'placeSymbol', input: { field_id: 'f', on_card: 'ghost', kind: 'eye' } }]);

  expect(state.cards).toEqual([]);
});
