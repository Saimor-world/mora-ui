'use client';

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useMemories, useMemorySearch } from '@/lib/queries/useMemories';
import type { MoraMemory } from '@/lib/api/memoryClient';

export interface MemoriesViewProps {
    searchQuery: string;
    onSearchQueryChange: (q: string) => void;
    isStandardMode: boolean;
}

export function MemoriesView({ searchQuery, onSearchQueryChange, isStandardMode }: MemoriesViewProps) {
    const { data: memoriesList, isLoading: isLoadingList } = useMemories(50);
    const { data: searchResults, isLoading: isLoadingSearch } = useMemorySearch(searchQuery);

    const isSearching = searchQuery.trim().length >= 2;
    const displayMemories: MoraMemory[] = isSearching
        ? (searchResults ?? [])
        : (memoriesList ?? []);
    const isLoading = isSearching ? isLoadingSearch : isLoadingList;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search field */}
            <div className={`px-4 py-3 border-b ${isStandardMode ? 'border-[#E1E1E1]' : 'border-white/[0.06]'}`}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder="Erinnerungen durchsuchen…"
                    className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                        isStandardMode
                            ? 'bg-gray-100 border border-gray-200 text-[#1F1F1F] placeholder-gray-400 focus:ring-[#0078D4]/30'
                            : 'bg-white/5 border border-white/10 text-white/90 placeholder-white/30 focus:ring-violet-500/20'
                    }`}
                />
            </div>

            {/* Memory list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading && (
                    <div className="flex justify-center py-8">
                        <Loader2 size={20} className={`animate-spin ${isStandardMode ? 'text-[#0078D4]/40' : 'text-violet-400/40'}`} />
                    </div>
                )}

                {!isLoading && displayMemories.length === 0 && (
                    <div className={`text-center py-8 text-sm ${isStandardMode ? 'text-[#605E5C]' : 'text-white/35'}`}>
                        {isSearching
                            ? 'Keine passenden Erinnerungen gefunden.'
                            : 'Noch keine Erinnerungen. Chatte mit Mora, um Erinnerungen zu erzeugen.'}
                    </div>
                )}

                {!isLoading && displayMemories.map((memory) => (
                    <div
                        key={memory.id}
                        className={`rounded-xl p-3 border text-sm ${
                            isStandardMode
                                ? 'bg-gray-50 border-gray-200 text-[#1F1F1F]'
                                : 'bg-white/[0.03] border-white/[0.07] text-white/80'
                        }`}
                    >
                        {memory.similarity !== undefined && (
                            <div className={`text-[10px] mb-1 flex items-center gap-1 ${isStandardMode ? 'text-[#0078D4]' : 'text-violet-400/70'}`}>
                                <Sparkles size={9} />
                                Ähnlichkeit: {(memory.similarity * 100).toFixed(0)}%
                            </div>
                        )}
                        <p className="leading-relaxed">{memory.summary}</p>
                        <p className={`text-[10px] mt-2 ${isStandardMode ? 'text-gray-400' : 'text-white/25'}`}>
                            {new Date(memory.created_at).toLocaleString('de-DE', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
