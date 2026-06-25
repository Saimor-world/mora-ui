export type CardKind = 'signal' | 'uncertainty' | 'interpretation' | 'action' | 'object';
export type CardStatus = 'ok' | 'waiting' | 'unknown' | 'alert';
export type SymbolKind = 'clock' | 'lock' | 'eye' | 'check' | 'loop' | 'alert';
export type Relation = 'waits_on' | 'relates_to' | 'contradicts' | 'needs_decision';

export interface ProposedAction {
  label: string;
  tool: string;
  args: Record<string, unknown>;
  risk: 'send' | 'delete' | 'publish' | 'external';
  locked: true;
}

export interface Card {
  id: string;
  kind: CardKind;
  title: string;
  body?: string;
  status?: CardStatus;
  source?: 'mail' | 'calendar' | 'node' | 'incident';
  x: number;
  y: number;
  symbols: SymbolKind[];
  action?: ProposedAction;
}

export interface Connection {
  from: string;
  to: string;
  relation: Relation;
}

export interface FieldState {
  cards: Card[];
  connections: Connection[];
}

export interface UiToolCall {
  name: 'placeCard' | 'connect' | 'placeSymbol' | 'proposeAction';
  input: Record<string, unknown>;
}
