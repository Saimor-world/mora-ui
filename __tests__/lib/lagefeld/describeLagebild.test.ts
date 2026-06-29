import { describeLagebild } from '@/lib/lagefeld/describeLagebild';
import type { OpenFlowSignal } from '@/lib/openflow/types';

function sig(o: Partial<OpenFlowSignal> & Pick<OpenFlowSignal, 'id' | 'title'>): OpenFlowSignal {
  return {
    source: 'mail', summary: '', priority: 'normal', status: 'new', trustScope: 'personal',
    relatedNodeIds: [], relatedRelationIds: [], suggestedActions: [], ...o,
  };
}

test('returns empty string when there is nothing to interpret', () => {
  expect(describeLagebild({ changed: [], attention: [], nextSteps: [] })).toBe('');
});

test('lists signals with priority and summary so Mora can read them', () => {
  const text = describeLagebild({
    changed: [sig({ id: 'm1', title: 'Mahnung Nord', summary: 'Frist heute', priority: 'urgent' })],
    attention: [sig({ id: 'u1', title: 'Wer macht das?' })],
    nextSteps: [],
  });
  expect(text).toMatch(/Mahnung Nord/);
  expect(text).toMatch(/Frist heute/);
  expect(text).toMatch(/dringend/i);
  expect(text).toMatch(/Wer macht das\?/);
});

test('asks Mora to form a Lagefeld with her interpretation', () => {
  const text = describeLagebild({
    changed: [sig({ id: 'm1', title: 'A' })],
    attention: [], nextSteps: [],
  });
  expect(text).toMatch(/Lagefeld|Deutung/i);
});
