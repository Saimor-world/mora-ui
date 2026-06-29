import { extractLagefeldPreview } from '@/lib/lagefeld/extractVoicePreview';
import type { AmbientToolCall } from '@/lib/hooks/useAmbientMora';
import type { UiToolCall } from '@/lib/lagefeld/types';

const fieldActions: UiToolCall[] = [
  { name: 'placeCard', input: { card_id: 's1', kind: 'signal', title: 'Mahnung', x: 24, y: 40 } },
  { name: 'placeCard', input: { card_id: 'd1', kind: 'interpretation', title: 'Zugespitzt', x: 262, y: 56 } },
  { name: 'connect', input: { from_card: 's1', to_card: 'd1', relation: 'relates_to' } },
];

test('returns null when no lagefeld openPane call is present', () => {
  const calls: AmbientToolCall[] = [
    { tool: 'searchGlobal', input: { query: 'x' } },
    { tool: 'openPane', input: { type: 'finder' } },
  ];
  expect(extractLagefeldPreview(calls)).toBeNull();
});

test('reduces the uiActions of a lagefeld openPane call into a FieldState', () => {
  const calls: AmbientToolCall[] = [
    { tool: 'openPane', input: { type: 'lagefeld', title: 'Lagefeld', data: { uiActions: fieldActions } } },
  ];
  const state = extractLagefeldPreview(calls);
  expect(state).not.toBeNull();
  expect(state!.cards).toHaveLength(2);
  expect(state!.connections).toHaveLength(1);
});

test('returns null when the lagefeld call carries no usable cards', () => {
  const calls: AmbientToolCall[] = [
    { tool: 'openPane', input: { type: 'lagefeld', data: { uiActions: [] } } },
  ];
  expect(extractLagefeldPreview(calls)).toBeNull();
});
