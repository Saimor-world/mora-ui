import type { OpenFlowLagebild, OpenFlowSignal, OpenFlowSourceKind } from '@/lib/openflow/types';
import type { UiToolCall } from './types';

const FIELD_ID = 'current-lage';
const DEUTUNG_ID = 'lage-deutung';

// Column anchors — signals flow in from the left, Môra's reading sits in the
// centre, gated actions leave on the right.
const COL_SIGNAL_X = 24;
const COL_DEUTUNG_X = 262;
const COL_ACTION_X = 500;

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

function quote(value: string): string {
  const trimmed = value.trim();
  const short = trimmed.length > 48 ? `${trimmed.slice(0, 47)}…` : trimmed;
  return `„${short}“`;
}

/**
 * Synthesizes Môra's reading of the situation — the Deutung card. This is the
 * piece that turns disconnected boxes into a *field*: a single centre of gravity
 * that names what is going on, not just a list of raw signals.
 */
function synthesizeDeutung(
  changed: OpenFlowSignal[],
  attention: OpenFlowSignal[],
): { title: string; body: string; status: 'ok' | 'waiting' | 'alert'; symbol: 'eye' | 'alert' | 'clock' } | null {
  if (changed.length === 0 && attention.length === 0) return null;

  const urgent = changed.filter((s) => s.priority === 'urgent');
  const high = changed.filter((s) => s.priority === 'high');
  const openCount = attention.length;

  if (urgent.length > 0) {
    const focus = urgent[0];
    return {
      title: 'Zugespitzt',
      body: `${changed.length} Signale, ${urgent.length} dringend. Im Fokus: ${quote(focus.title)}.`,
      status: 'alert',
      symbol: 'alert',
    };
  }

  if (high.length > 0) {
    return {
      title: 'In Bewegung',
      body: `${changed.length} Signale, ${high.length} mit Priorität.${openCount ? ` ${openCount} offene Frage(n).` : ''}`,
      status: 'waiting',
      symbol: 'clock',
    };
  }

  return {
    title: 'Ruhige Lage',
    body: changed.length
      ? `${changed.length} neue Signale, nichts Dringendes.${openCount ? ` ${openCount} offene Frage(n).` : ''}`
      : `${openCount} offene Frage(n), keine neuen Signale.`,
    status: 'ok',
    symbol: 'eye',
  };
}

/**
 * Maps live OpenFlow signals into Lagefeld UI tool calls.
 * Returns an empty array when there is nothing to show — never demo fixtures.
 */
export function buildFieldFromOpenFlow(
  lagebild: Pick<OpenFlowLagebild, 'changed' | 'attention' | 'nextSteps'>,
): UiToolCall[] {
  const deutung = synthesizeDeutung(lagebild.changed, lagebild.attention);
  if (!deutung) return [];

  const actions: UiToolCall[] = [];
  const signalCards: string[] = [];
  const actionCards: string[] = [];
  let signalY = 40;
  let actionY = 64;

  // 1) Incoming signals (left column) — each one wires into the Deutung.
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
        x: COL_SIGNAL_X,
        y: signalY,
      },
    });
    if (item.priority === 'urgent' || item.priority === 'high') {
      actions.push({ name: 'placeSymbol', input: { field_id: FIELD_ID, on_card: id, kind: 'alert' } });
    } else if (item.source === 'calendar') {
      actions.push({ name: 'placeSymbol', input: { field_id: FIELD_ID, on_card: id, kind: 'clock' } });
    }
    signalY += 92;
  }

  // 2) Môra's reading (centre) — the anchor every signal connects into.
  const deutungY = Math.max(56, (signalY - 40) / 2);
  actions.push({
    name: 'placeCard',
    input: {
      field_id: FIELD_ID,
      card_id: DEUTUNG_ID,
      kind: 'interpretation',
      title: deutung.title,
      body: deutung.body,
      status: deutung.status,
      x: COL_DEUTUNG_X,
      y: deutungY,
    },
  });
  actions.push({ name: 'placeSymbol', input: { field_id: FIELD_ID, on_card: DEUTUNG_ID, kind: deutung.symbol } });

  for (const signalId of signalCards) {
    actions.push({
      name: 'connect',
      input: { field_id: FIELD_ID, from_card: signalId, to_card: DEUTUNG_ID, relation: 'relates_to' },
    });
  }

  // 3) Open questions (centre, below the reading) — Môra flags what it cannot
  //    yet decide. These hang off the Deutung as needs_decision.
  const changedIds = new Set(lagebild.changed.map((item) => item.id));
  const uniqueAttention = lagebild.attention.filter((item) => !changedIds.has(item.id));
  let uncertaintyY = deutungY + 120;
  for (const item of uniqueAttention.slice(0, 3)) {
    const id = cardId('u', item.id);
    actions.push({
      name: 'placeCard',
      input: {
        field_id: FIELD_ID,
        card_id: id,
        kind: 'uncertainty',
        title: item.title,
        body: item.summary,
        status: 'unknown',
        x: COL_DEUTUNG_X,
        y: uncertaintyY,
      },
    });
    actions.push({ name: 'placeSymbol', input: { field_id: FIELD_ID, on_card: id, kind: 'eye' } });
    actions.push({
      name: 'connect',
      input: { field_id: FIELD_ID, from_card: DEUTUNG_ID, to_card: id, relation: 'needs_decision' },
    });
    uncertaintyY += 96;
  }

  // 4) Gated next steps (right column) — flow out of the reading, always locked.
  for (const item of lagebild.nextSteps.slice(0, 3)) {
    const suggested = item.suggestedActions[0];
    if (!suggested) continue;
    const id = cardId('h', `${item.id}-${suggested.id}`);
    actionCards.push(id);
    actions.push({
      name: 'placeCard',
      input: {
        field_id: FIELD_ID,
        card_id: id,
        kind: 'action',
        title: suggested.label,
        body: item.title,
        x: COL_ACTION_X,
        y: actionY,
      },
    });
    actions.push({ name: 'placeSymbol', input: { field_id: FIELD_ID, on_card: id, kind: 'lock' } });
    actions.push({
      name: 'connect',
      input: { field_id: FIELD_ID, from_card: DEUTUNG_ID, to_card: id, relation: 'relates_to' },
    });
    actionY += 96;
  }

  return actions;
}
