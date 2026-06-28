import { buildFieldFromOpenFlow } from '@/lib/lagefeld/buildFieldFromOpenFlow';
import { reduceUiActions } from '@/lib/lagefeld/reduceUiActions';
import type { OpenFlowLagebild, OpenFlowSignal } from '@/lib/openflow/types';

const empty: Pick<OpenFlowLagebild, 'changed' | 'attention' | 'nextSteps'> = {
  changed: [],
  attention: [],
  nextSteps: [],
};

function signal(overrides: Partial<OpenFlowSignal> & Pick<OpenFlowSignal, 'id' | 'title'>): OpenFlowSignal {
  return {
    source: 'mail',
    summary: 'Zusammenfassung',
    priority: 'normal',
    status: 'new',
    trustScope: 'personal',
    relatedNodeIds: [],
    relatedRelationIds: [],
    suggestedActions: [],
    ...overrides,
  };
}

test('returns empty actions when no live signals exist', () => {
  expect(buildFieldFromOpenFlow(empty)).toEqual([]);
});

test('maps changed signals to signal cards', () => {
  const actions = buildFieldFromOpenFlow({
    ...empty,
    changed: [signal({ id: 'mail-1', title: 'Neue Mail von Team', summary: 'Bitte Rückmeldung', priority: 'high' })],
  });

  expect(actions.some((a) => a.name === 'placeCard' && a.input.kind === 'signal')).toBe(true);
  expect(actions.some((a) => a.name === 'placeSymbol')).toBe(true);
});

test('synthesizes a Deutung (interpretation) card that anchors the field', () => {
  const actions = buildFieldFromOpenFlow({
    ...empty,
    changed: [
      signal({ id: 'mail-1', title: 'Mahnung Lieferant', priority: 'urgent' }),
      signal({ id: 'mail-2', title: 'Angebot Kunde' }),
    ],
  });
  const field = reduceUiActions(actions);

  const deutung = field.cards.filter((c) => c.kind === 'interpretation');
  expect(deutung).toHaveLength(1);
  // The interpretation must say something real about the lage, not be empty.
  expect((deutung[0].title + (deutung[0].body ?? '')).length).toBeGreaterThan(8);
});

test('connects every signal into the interpretation so nothing floats alone', () => {
  const actions = buildFieldFromOpenFlow({
    ...empty,
    changed: [
      signal({ id: 'mail-1', title: 'A' }),
      signal({ id: 'mail-2', title: 'B' }),
    ],
  });
  const field = reduceUiActions(actions);
  const deutung = field.cards.find((c) => c.kind === 'interpretation');
  expect(deutung).toBeDefined();

  const intoDeutung = field.connections.filter((edge) => edge.to === deutung!.id);
  expect(intoDeutung).toHaveLength(2);
});

test('routes the interpretation toward each next-step action', () => {
  const actions = buildFieldFromOpenFlow({
    ...empty,
    changed: [signal({ id: 'mail-1', title: 'A' })],
    nextSteps: [
      signal({
        id: 'mail-1',
        title: 'A',
        suggestedActions: [{ id: 'a1', label: 'Antwort entwerfen', kind: 'reply' }],
      }),
    ],
  });
  const field = reduceUiActions(actions);
  const deutung = field.cards.find((c) => c.kind === 'interpretation');
  const action = field.cards.find((c) => c.kind === 'action');
  expect(deutung && action).toBeTruthy();
  expect(field.connections.some((e) => e.from === deutung!.id && e.to === action!.id)).toBe(true);
});

test('action cards carry a lock symbol (human-approval gate)', () => {
  const actions = buildFieldFromOpenFlow({
    ...empty,
    changed: [signal({ id: 'mail-1', title: 'A' })],
    nextSteps: [
      signal({
        id: 'mail-1',
        title: 'A',
        suggestedActions: [{ id: 'a1', label: 'Senden', kind: 'reply' }],
      }),
    ],
  });
  const field = reduceUiActions(actions);
  const action = field.cards.find((c) => c.kind === 'action');
  expect(action?.symbols).toContain('lock');
});

test('never includes demo court fixture content', () => {
  const actions = buildFieldFromOpenFlow(empty);
  const serialized = JSON.stringify(actions);
  expect(serialized).not.toMatch(/Gericht|landessozialgericht|Absage/i);
});
