'use client';
import { useQuery } from '@tanstack/react-query';
import { searchGlobal } from '@/lib/api/searchClient';
import { useMemories, useMemorySearch } from '@/lib/queries/useMemories';
import { useSessionStore } from '@/lib/store/sessionStore';

/**
 * Wissen = one query layer over existing clients:
 *  - keyword search  → lib/api/searchClient.searchGlobal (Spotlight / Search app)
 *  - memory          → lib/queries/useMemories (MemorySidebar)
 * No new endpoints.
 */
export function useKnowledgeSearch(query: string) {
  const tenant = useSessionStore((s) => s.user?.tenant_id ?? null);
  const q = query.trim();
  const keyword = useQuery({
    queryKey: ['os', 'knowledge', 'keyword', tenant, q],
    queryFn: () => searchGlobal(q),
    enabled: Boolean(tenant) && q.length >= 2,
    staleTime: 30_000,
  });
  const memory = useMemorySearch(tenant ? q : '');
  return { keyword, memory, active: q.length >= 2 };
}

export function useRecentMemories() {
  return useMemories(8);
}
