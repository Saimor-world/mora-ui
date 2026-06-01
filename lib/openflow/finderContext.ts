import type { InitiativeSummary, OpenFlowSignal } from '@/lib/openflow/types';
import { deriveInitiativesFromSignals } from '@/lib/openflow/presentation';

export interface FinderItemLike {
  id: string;
  title?: string;
  name?: string;
}

/**
 * Derives the initiative context for the items currently visible in a Finder
 * folder. Folders stay folders — this is a materialized, read-only view over
 * the items' titles, reusing the same initiative patterns the OS Lagebild uses.
 */
export function deriveFolderInitiatives(items: FinderItemLike[]): InitiativeSummary[] {
  const signals: OpenFlowSignal[] = items.map((item) => ({
    id: `finder-${item.id}`,
    source: 'cloud',
    title: item.title || item.name || '',
    summary: '',
    priority: 'low',
    status: 'linked',
    trustScope: 'department',
    relatedNodeIds: [item.id],
    relatedRelationIds: [],
    suggestedActions: [],
  }));
  return deriveInitiativesFromSignals(signals);
}
