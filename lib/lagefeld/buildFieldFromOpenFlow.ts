import type { OpenFlowLagebild, OpenFlowSignal, OpenFlowSourceKind } from '@/lib/openflow/types';
import type { UiToolCall } from './types';

const FIELD_ID = 'current-lage';

function mapSource(source: OpenFlowSourceKind): 'mail' | 'calendar' | 'incident' | undefined {
  if (source === 'mail') return 'mail';
  if (source === 'calendar') return 'calendar';
  if (source === 'server') return 'incident';
  return undefined;
}

function mapStatus(priority: OpenFlowSignal['priority']): 'ok' | 'waiting' | 'alert' | undefined {
  if (priority === 'urgent') return 'alert';
  if (priority === 'high') return 'waiting';
  return 'ok';
}

function cardId(prefix: string, id: string) {
  return `${prefix}-${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/**
 * Maps live OpenFlow signals into Lagefeld UI tool calls.
 * Returns an empty array when there is nothing to show — never demo fixtures.
 */
export function buildFieldFromOpenFlow(
  lagebild: Pick<OpenFlowLagebild, 'changed' | 'attention' | 'nextSteps'>,
): UiToolCall[] {
  const actions: UiToolCall[] = [];
  const signalCards: string[] = [];
  const attentionCards: string[] = [];
  let signalY = 58;
  let attentionY = 120;
  let actionY = 122;

  for (const item of lagebild.changed.slice(0, 5)) {
    const id = cardId('s', item.id);
    signalCards.push(id);
    actions.push({
      name: 'placeCard',
      input: {
        field_id: FIELD_ID,
        card_id: id,
        kind: 'signal',
        title: item.title,
        body: item.summary,
        status: mapStatus(item.priority),
        source: mapSource(item.source),
        x: 24,
        y: signalY,
      },
    });
    if (item.priority === 'urgent' || item.priority === 'high') {
      actions.push({ name: 'placeSymbol', input: { field_id: FIELD_ID, on_card: id, kind: 'alert' } });
    }
    signalY += 90;
  }

  const changedIds = new Set(lagebild.changed.map((item) => item.id));
  const uniqueAttention = lagebild.attention.filter((item) => !changedIds.has(item.id));

  for (const item of uniqueAttention.slice(0, 3)) {
    const id = cardId('u', item.id);
    attentionCards.push(id);
    actions.push({
      name: 'placeCard',
      input: {
        field_id: FIELD_ID,
        card_id: id,
        kind: 'uncertainty',
        title: item.title,
        body: item.summary,
        status: 'unknown',
        x: 286,
        y: attentionY,
      },
    });
    attentionY += 100;
  }

  for (const item of lagebild.nextSteps.slice(0, 3)) {
    const suggested = item.suggestedActions[0];
    if (!suggested) continue;
    const id = cardId('h', item.id);
    actions.push({
      name: 'placeCard',
      input: {
        field_id: FIELD_ID,
        card_id: id,
        kind: 'action',
        title: suggested.label,
        body: item.title,
        x: 530,
        y: actionY,
      },
    });
    actionY += 100;
  }

  if (signalCards.length > 0 && attentionCards.length > 0) {
    actions.push({
      name: 'connect',
      input: {
        field_id: FIELD_ID,
        from_card: signalCards[signalCards.length - 1],
        to_card: attentionCards[0],
        relation: 'relates_to',
      },
    });
  }

  return actions;
}
