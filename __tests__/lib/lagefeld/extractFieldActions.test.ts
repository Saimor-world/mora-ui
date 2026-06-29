import { extractLagefeldActions } from '@/lib/lagefeld/extractFieldActions';

test('returns empty array for no tool calls', () => {
  expect(extractLagefeldActions(undefined)).toEqual([]);
  expect(extractLagefeldActions([])).toEqual([]);
});

test('keeps only the four Lagefeld UI tools and maps type+payload to name+input', () => {
  const actions = extractLagefeldActions([
    { type: 'placeCard', payload: { card_id: 'd1', kind: 'interpretation', title: 'Deutung', x: 1, y: 2 } },
    { type: 'connect', payload: { from_card: 's1', to_card: 'd1', relation: 'relates_to' } },
    { type: 'placeSymbol', payload: { on_card: 'd1', kind: 'eye' } },
    { type: 'proposeAction', payload: { label: 'Senden', tool: 'sendMail', args: {}, risk: 'send' } },
    { type: 'search', payload: { query: 'ignored' } },
    { type: 'open_pane', payload: { paneType: 'finder' } },
  ]);

  expect(actions).toHaveLength(4);
  expect(actions.map((a) => a.name)).toEqual(['placeCard', 'connect', 'placeSymbol', 'proposeAction']);
  expect(actions[0]).toEqual({
    name: 'placeCard',
    input: { card_id: 'd1', kind: 'interpretation', title: 'Deutung', x: 1, y: 2 },
  });
});

test('drops malformed entries (missing type or payload)', () => {
  const actions = extractLagefeldActions([
    { type: 'placeCard' } as never,
    { payload: { card_id: 'x' } } as never,
    { type: 'placeCard', payload: { card_id: 'ok', kind: 'signal', title: 'A', x: 0, y: 0 } },
  ]);
  expect(actions).toHaveLength(1);
  expect(actions[0].input.card_id).toBe('ok');
});
