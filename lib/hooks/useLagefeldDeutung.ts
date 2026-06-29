'use client';

import { useCallback, useState } from 'react';
import { corePost } from '@/lib/api/http';
import { buildChatContext } from '@/lib/api/moraAgentClient';
import { describeLagebild } from '@/lib/lagefeld/describeLagebild';
import { extractLagefeldActions, type FieldToolCall } from '@/lib/lagefeld/extractFieldActions';
import type { OpenFlowLagebild } from '@/lib/openflow/types';
import type { UiToolCall } from '@/lib/lagefeld/types';

type FieldResponse = {
  text?: string;
  intent?: string;
  toolCalls?: FieldToolCall[];
};

type Lagebild = Pick<OpenFlowLagebild, 'changed' | 'attention' | 'nextSteps'>;

export interface UseLagefeldDeutungReturn {
  /** Ask Môra to read the current Lagebild. Resolves to her UI grammar (or null). */
  deuten: (lagebild: Lagebild) => Promise<UiToolCall[] | null>;
  actions: UiToolCall[] | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * On-demand Môra interpretation for the Lagefeld. The deterministic field is
 * the instant, free default; this hook lets the user spend one LLM call to get
 * Môra's real reading + gated actions, replacing the synthesized Deutung.
 */
export function useLagefeldDeutung(): UseLagefeldDeutungReturn {
  const [actions, setActions] = useState<UiToolCall[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deuten = useCallback(async (lagebild: Lagebild): Promise<UiToolCall[] | null> => {
    const message = describeLagebild(lagebild);
    if (!message) return null;

    setIsLoading(true);
    setError(null);
    try {
      const ctx = buildChatContext();
      const response = (await corePost('/v3/mora/field', {
        message,
        context: { source: 'lagefeld-deuten', surface: ctx?.route_path },
      })) as FieldResponse | null;

      const next = extractLagefeldActions(response?.toolCalls);
      if (next.length === 0) {
        setError('Môra hat gerade keine Deutung geformt.');
        return null;
      }
      setActions(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Môra ist nicht erreichbar.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setActions(null);
    setError(null);
  }, []);

  return { deuten, actions, isLoading, error, reset };
}
