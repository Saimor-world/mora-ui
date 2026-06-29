import type { UiToolCall } from './types';

/**
 * Shape of a tool call returned by POST /v3/mora/field (mirrors the
 * FieldToolCall used in useAmbientMora). Môra emits UI-grammar tools alongside
 * data tools; here we keep only the Lagefeld UI grammar.
 */
export interface FieldToolCall {
  type?: string;
  label?: string;
  payload?: Record<string, unknown>;
  risk?: string;
  requiresConfirmation?: boolean;
}

const LAGEFELD_UI_TOOLS = new Set<UiToolCall['name']>([
  'placeCard',
  'connect',
  'placeSymbol',
  'proposeAction',
]);

/**
 * Extracts the Lagefeld UI tool calls from a Mora Field response, mapping the
 * field wire shape ({ type, payload }) onto the canvas grammar ({ name, input }).
 * Non-UI tools and malformed entries are dropped — never throws.
 */
export function extractLagefeldActions(calls: FieldToolCall[] | undefined | null): UiToolCall[] {
  if (!Array.isArray(calls)) return [];

  const actions: UiToolCall[] = [];
  for (const call of calls) {
    const name = call?.type;
    const payload = call?.payload;
    if (typeof name !== 'string' || !LAGEFELD_UI_TOOLS.has(name as UiToolCall['name'])) continue;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;
    actions.push({ name: name as UiToolCall['name'], input: payload as Record<string, unknown> });
  }
  return actions;
}
