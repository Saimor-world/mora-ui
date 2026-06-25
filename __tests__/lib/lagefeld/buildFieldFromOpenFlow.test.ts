import { buildFieldFromOpenFlow } from '@/lib/lagefeld/buildFieldFromOpenFlow';
import type { OpenFlowLagebild } from '@/lib/openflow/types';

const empty: Pick<OpenFlowLagebild, 'changed' | 'attention' | 'nextSteps'> = {
  changed: [],
  attention: [],
  nextSteps: [],
};

test('returns empty actions when no live signals exist', () => {
  expect(buildFieldFromOpenFlow(empty)).toEqual([]);
});

test('maps changed signals to signal cards', () => {
  const actions = buildFieldFromOpenFlow({
    ...empty,
    changed: [{
      id: 'mail-1',
      source: 'mail',
      title: 'Neue Mail von Team',
      summary: 'Bitte Rückmeldung',
      priority: 'high',
      status: 'new',
      trustScope: 'personal',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [],
    }],
  });

  expect(actions.some((a) => a.name === 'placeCard' && a.input.kind === 'signal')).toBe(true);
  expect(actions.some((a) => a.name === 'placeSymbol')).toBe(true);
});

test('never includes demo court fixture content', () => {
  const actions = buildFieldFromOpenFlow(empty);
  const serialized = JSON.stringify(actions);
  expect(serialized).not.toMatch(/Gericht|landessozialgericht|Absage/i);
});
