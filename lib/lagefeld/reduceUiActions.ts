import type { Card, CardKind, CardStatus, Connection, FieldState, Relation, SymbolKind, UiToolCall } from './types';

const CARD_KINDS = new Set<CardKind>(['signal', 'uncertainty', 'interpretation', 'action', 'object']);
const CARD_STATUSES = new Set<CardStatus>(['ok', 'waiting', 'unknown', 'alert']);
const SYMBOL_KINDS = new Set<SymbolKind>(['clock', 'lock', 'eye', 'check', 'loop', 'alert']);
const RELATIONS = new Set<Relation>(['waits_on', 'relates_to', 'contradicts', 'needs_decision']);
const RISKS = new Set(['send', 'delete', 'publish', 'external']);

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function cardKind(value: unknown): CardKind | undefined {
  return typeof value === 'string' && CARD_KINDS.has(value as CardKind) ? (value as CardKind) : undefined;
}

function cardStatus(value: unknown): CardStatus | undefined {
  return typeof value === 'string' && CARD_STATUSES.has(value as CardStatus) ? (value as CardStatus) : undefined;
}

function symbolKind(value: unknown): SymbolKind | undefined {
  return typeof value === 'string' && SYMBOL_KINDS.has(value as SymbolKind) ? (value as SymbolKind) : undefined;
}

function relation(value: unknown): Relation | undefined {
  return typeof value === 'string' && RELATIONS.has(value as Relation) ? (value as Relation) : undefined;
}

function source(value: unknown): Card['source'] | undefined {
  return typeof value === 'string' && ['mail', 'calendar', 'node', 'incident'].includes(value)
    ? (value as Card['source'])
    : undefined;
}

function args(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function reduceUiActions(actions: UiToolCall[]): FieldState {
  const cardsById = new Map<string, Card>();
  const connections: Connection[] = [];
  let autoStack = 0;

  for (const { name, input } of actions) {
    if (name === 'placeCard') {
      const id = text(input.card_id);
      const kind = cardKind(input.kind);
      const title = text(input.title);
      const x = number(input.x);
      const y = number(input.y);
      if (!id || !kind || !title || x === undefined || y === undefined) continue;

      cardsById.set(id, {
        id,
        kind,
        title,
        body: text(input.body),
        status: cardStatus(input.status),
        source: source(input.source),
        x,
        y,
        symbols: [],
      });
      continue;
    }

    if (name === 'placeSymbol') {
      const target = text(input.on_card);
      const kind = symbolKind(input.kind);
      const card = target ? cardsById.get(target) : undefined;
      if (card && kind && !card.symbols.includes(kind)) card.symbols.push(kind);
      continue;
    }

    if (name === 'connect') {
      const from = text(input.from_card);
      const to = text(input.to_card);
      const rel = relation(input.relation);
      if (from && to && rel) connections.push({ from, to, relation: rel });
      continue;
    }

    if (name === 'proposeAction') {
      const label = text(input.label);
      const tool = text(input.tool);
      const risk = text(input.risk);
      if (!label || !tool || !risk || !RISKS.has(risk)) continue;

      const id = text(input.card_id) ?? `action-${autoStack}`;
      cardsById.set(id, {
        id,
        kind: 'action',
        title: label,
        x: number(input.x) ?? 480,
        y: number(input.y) ?? 80 + autoStack * 90,
        symbols: ['lock'],
        action: {
          label,
          tool,
          args: args(input.args),
          risk: risk as 'send' | 'delete' | 'publish' | 'external',
          locked: true,
        },
      });
      autoStack += 1;
    }
  }

  return { cards: [...cardsById.values()], connections };
}
