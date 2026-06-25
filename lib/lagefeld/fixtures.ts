import type { UiToolCall } from './types';

const fieldId = 'landessozialgericht-demo';

export const LANDESSOZIALGERICHT_FIELD: UiToolCall[] = [
  {
    name: 'placeCard',
    input: {
      field_id: fieldId,
      card_id: 's1',
      kind: 'signal',
      title: 'Gespräch fand statt',
      body: '12. Juni · Kalender',
      status: 'ok',
      source: 'calendar',
      x: 24,
      y: 58,
    },
  },
  {
    name: 'placeCard',
    input: {
      field_id: fieldId,
      card_id: 's2',
      kind: 'signal',
      title: 'Rückmeldung angekündigt',
      body: 'vom Gericht zugesagt',
      status: 'waiting',
      x: 24,
      y: 148,
    },
  },
  {
    name: 'placeCard',
    input: {
      field_id: fieldId,
      card_id: 's3',
      kind: 'signal',
      title: 'Keine neue Mail',
      body: 'seit 12 Tagen',
      status: 'waiting',
      source: 'mail',
      x: 24,
      y: 238,
    },
  },
  {
    name: 'placeCard',
    input: {
      field_id: fieldId,
      card_id: 'u1',
      kind: 'uncertainty',
      title: 'Interne Entscheidung unbekannt',
      body: 'keine Absage vorhanden',
      status: 'unknown',
      x: 24,
      y: 328,
    },
  },
  {
    name: 'placeCard',
    input: {
      field_id: fieldId,
      card_id: 'd1',
      kind: 'interpretation',
      title: 'Keine Mail ist kein Beweis für eine Absage',
      x: 286,
      y: 180,
    },
  },
  {
    name: 'placeCard',
    input: {
      field_id: fieldId,
      card_id: 'h1',
      kind: 'action',
      title: 'Wiedervorlage setzen',
      body: 'in 7 Tagen erinnern',
      x: 530,
      y: 122,
    },
  },
  { name: 'placeSymbol', input: { field_id: fieldId, on_card: 's2', kind: 'clock' } },
  { name: 'connect', input: { field_id: fieldId, from_card: 's3', to_card: 'd1', relation: 'relates_to' } },
  { name: 'connect', input: { field_id: fieldId, from_card: 'u1', to_card: 'd1', relation: 'needs_decision' } },
  { name: 'connect', input: { field_id: fieldId, from_card: 'd1', to_card: 'h1', relation: 'relates_to' } },
  {
    name: 'proposeAction',
    input: {
      field_id: fieldId,
      card_id: 'a1',
      label: 'Mailentwurf vorbereiten',
      tool: 'createNode',
      args: { type: 'draft' },
      risk: 'send',
      x: 530,
      y: 232,
    },
  },
];
