/**
 * Hook for Begleitungen Attention Signals
 *
 * Provides attention data for home view integration.
 * Returns clients who need attention (no session in 14+ days, ending soon).
 */

import { useCallback, useEffect, useState } from 'react';
import type { KlientinMitAttention } from './types';
import {
  fetchBegleitungenOverview,
  computeAttentionSignals,
  filterNeedsAttention,
} from './begleitungenClient';

export interface BegleitungenAttentionData {
  needsAttention: KlientinMitAttention[];
  count: number;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useBegleitungenAttention(): BegleitungenAttentionData {
  const [needsAttention, setNeedsAttention] = useState<KlientinMitAttention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const overview = await fetchBegleitungenOverview();
      if (!overview) {
        setNeedsAttention([]);
        return;
      }

      const withAttention = computeAttentionSignals(overview.klientinnen);
      const filtered = filterNeedsAttention(withAttention);
      setNeedsAttention(filtered);
    } catch (err) {
      console.error('[Begleitungen] Attention fetch failed:', err);
      setError('Fehler beim Laden der Begleitungen.');
      setNeedsAttention([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    needsAttention,
    count: needsAttention.length,
    isLoading,
    error,
    reload: load,
  };
}
