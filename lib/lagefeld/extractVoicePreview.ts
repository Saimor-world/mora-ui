import { reduceUiActions } from './reduceUiActions';
import type { FieldState, UiToolCall } from './types';
import type { AmbientToolCall } from '@/lib/hooks/useAmbientMora';

/**
 * Finds a lagefeld openPane tool call among Môra's voice tool calls and reduces
 * its uiActions into a FieldState — so the voice room can render a live preview
 * of the field Môra is forming, instead of a flat "lagefeld öffnen" text line.
 * Returns null when there is no usable field to preview.
 */
export function extractLagefeldPreview(toolCalls: AmbientToolCall[]): FieldState | null {
  for (const call of toolCalls) {
    if (call.tool !== 'openPane' || call.input?.type !== 'lagefeld') continue;
    const ui = (call.input.data as Record<string, unknown> | undefined)?.uiActions;
    if (!Array.isArray(ui) || ui.length === 0) continue;
    const state = reduceUiActions(ui as UiToolCall[]);
    if (state.cards.length > 0) return state;
  }
  return null;
}
