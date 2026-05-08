'use client';
// lib/queries/useMemories.ts
// Sprint 3: TanStack Query v5 hooks for Mora episodic memory (mora_memories table).
//
// Convention: useEffect on data, not onSuccess (v5 API).
// All stale times chosen to balance freshness vs server load.

import { useQuery } from '@tanstack/react-query';
import { fetchMoraMemories, searchMoraMemories, type MoraMemory } from '@/lib/api/memoryClient';

// Stale time: memories are written after conversations end — 60s is fresh enough.
const MEMORIES_STALE = 60 * 1000;
// Search results are content-heavy — 30s stale is fine.
const MEMORY_SEARCH_STALE = 30 * 1000;

/** List most recent mora_memories for the authenticated user. */
export function useMemories(limit = 50) {
    return useQuery<MoraMemory[] | null>({
        queryKey: ['moraMemories', 'list', limit],
        queryFn: () => fetchMoraMemories(limit),
        staleTime: MEMORIES_STALE,
    });
}

/**
 * Semantic search over mora_memories.
 * Only fires when query.length >= 2 (matches backend min_length=2 validation).
 */
export function useMemorySearch(query: string) {
    return useQuery<MoraMemory[] | null>({
        queryKey: ['moraMemories', 'search', query],
        queryFn: () => searchMoraMemories(query),
        enabled: query.trim().length >= 2,
        staleTime: MEMORY_SEARCH_STALE,
    });
}
