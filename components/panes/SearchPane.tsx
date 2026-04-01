"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, Folder, Building2, Clock, Sparkles } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { searchGlobal, searchSemantic } from '@/lib/api/coreClient';
import { getSearchResolution, getSearchResultSubtitle, mapRawSearchResult, openSearchResult, type OpenableSearchResult } from '@/lib/utils/searchOpen';
import { AmbiguityChoiceSurface } from '@/components/ui/AmbiguityChoiceSurface';

/**
 * SearchPane - Universal Search Interface
 * 
 * Features:
 * - Searches across Nodes, Spaces, Departments
 * - Shows recent searches
 * - AI-powered suggestions (ready for local LLM)
 * - Keyboard navigation
 */

type SearchResult = OpenableSearchResult & { source?: 'local' | 'mora' };

export const SearchPane: React.FC<{ id?: string }> = ({ id = 'search-main' }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const pane = getPane(id);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchMode, setSearchMode] = useState<'local' | 'mora' | null>(null);
    const [searchHint, setSearchHint] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchRequestRef = useRef(0);

    const {
        companies,
        departments,
        spacesByDepartment,
        nodesByCompany,
        activeCompanyId,
        setActiveDepartment,
        setActiveSpace,
        setViewLevel
    } = useMoraStore();

    // Must be initialised after activeCompanyId is available (avoids TDZ)
    const previousCompanyIdRef = useRef<string | null | undefined>(activeCompanyId);
    const safeCompanies = React.useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);
    const activeCompanyName = React.useMemo(
        () => safeCompanies.find((company) => company.id === activeCompanyId)?.name || null,
        [safeCompanies, activeCompanyId]
    );

    // Flatten spaces and nodes for searching (Memoized to prevent infinite re-render loops)
    const allSpaces = React.useMemo(() => Object.values(spacesByDepartment).flat(), [spacesByDepartment]);
    const allNodes = React.useMemo(() => {
        return activeCompanyId && nodesByCompany[activeCompanyId]
            ? nodesByCompany[activeCompanyId]
            : [];
    }, [activeCompanyId, nodesByCompany]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();

        // Load recent searches from localStorage
        const saved = localStorage.getItem('saimor_recent_searches');
        if (saved) {
            setRecentSearches(JSON.parse(saved).slice(0, 5));
        }
    }, []);

    useEffect(() => {
        const initialQuery = pane?.data?.query;
        if (typeof initialQuery === 'string' && initialQuery.trim().length > 0) {
            setQuery(initialQuery.trim());
        }
    }, [pane?.data?.query]);

    useEffect(() => {
        if (previousCompanyIdRef.current === activeCompanyId) return;
        previousCompanyIdRef.current = activeCompanyId;
        searchRequestRef.current += 1;
        setResults([]);
        setSearchMode(null);
        setSearchHint(null);
        setSelectedIndex(0);
        setIsSearching(false);
    }, [activeCompanyId]);

    useEffect(() => {
        if (!query.trim()) return;
        const resolution = getSearchResolution(query, results);
        setSelectedIndex(resolution.status === 'ask' ? -1 : results.length > 0 ? 0 : -1);
    }, [query, results]);

    const mapKeywordResult = React.useCallback((raw: any): SearchResult | null => {
        const mapped = mapRawSearchResult(raw);
        if (!mapped) return null;
        return {
            ...mapped,
            icon: mapped.icon || FileText,
            subtitle: getSearchResultSubtitle(mapped, raw?.content_preview?.substring?.(0, 80) || raw?.content?.substring?.(0, 80)),
            source: 'mora',
        };
    }, []);

    const buildLocalResults = React.useCallback((rawQuery: string): SearchResult[] => {
        const lowerQuery = rawQuery.toLowerCase();
        const searchResults: SearchResult[] = [];

        departments.forEach(dept => {
            if (dept.name.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    id: dept.id,
                    type: 'department',
                    title: dept.name,
                    subtitle: 'Department',
                    icon: Building2,
                    source: 'local'
                });
            }
        });

        allSpaces.forEach(space => {
            if (space.name.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    id: space.id,
                    type: 'space',
                    title: space.name,
                    subtitle: 'Space',
                    icon: Folder,
                    source: 'local'
                });
            }
        });

        allNodes.forEach(node => {
            if (node.title?.toLowerCase().includes(lowerQuery) ||
                node.content?.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    id: node.id,
                    type: 'node',
                    title: node.title || 'Untitled',
                    subtitle: node.content?.substring(0, 50) || 'Element',
                    icon: FileText,
                    source: 'local'
                });
            }
        });

        return searchResults.slice(0, 10);
    }, [departments, allSpaces, allNodes]);

    // Search logic
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setSearchMode(null);
            setSearchHint(null);
            setIsSearching(false);
            return;
        }

        const trimmedQuery = query.trim();
        const localResults = buildLocalResults(trimmedQuery);
        setResults(localResults);
        setSearchMode('local');
        setSearchHint(localResults.length > 0 ? 'Lokal' : null);
        setSelectedIndex(0);

        if (!activeCompanyId || trimmedQuery.length < 2) {
            setIsSearching(false);
            return;
        }

        const requestId = ++searchRequestRef.current;
        setIsSearching(true);
        const timeoutId = setTimeout(async () => {
            try {
                const [semanticResults, keywordResponse] = await Promise.all([
                    searchSemantic(trimmedQuery, activeCompanyId, 10, 0.55),
                    searchGlobal(trimmedQuery, activeCompanyId),
                ]);
                if (requestId !== searchRequestRef.current) return;

                const mapped: SearchResult[] = semanticResults.map((result) => {
                    const scopePath = result.scope_path || result.path || undefined;
                    // Priority: scope_path > path > content preview (last resort) > type label.
                    return {
                        id: result.node_id,
                        type: 'node' as const,
                        title: result.metadata?.title || 'Untitled',
                        path: scopePath,
                        subtitle: getSearchResultSubtitle(
                            { path: scopePath, type: 'node' },
                            result.content?.substring(0, 80),
                        ),
                        icon: FileText,
                        source: 'mora' as const,
                        score: result.score,
                        companyId: result.company_id || activeCompanyId || undefined,
                        nodeId: result.node_id,
                        folderId: result.folder_id || result.metadata?.folder_id,
                        departmentId: result.department_id || undefined,
                        spaceId: result.space_id || result.metadata?.space_id,
                    };
                });

                const keywordMapped = (keywordResponse?.results || [])
                    .map(mapKeywordResult)
                    .filter((result): result is SearchResult => result !== null);

                const deduped = new Map<string, SearchResult>();
                [...keywordMapped, ...mapped].forEach((result) => {
                    const key = `${result.type}:${result.id}`;
                    if (!deduped.has(key)) deduped.set(key, result);
                });
                const merged = Array.from(deduped.values());

                if (merged.length > 0) {
                    setResults(merged);
                    setSearchMode(mapped.length > 0 ? 'mora' : 'local');
                    setSearchHint(
                        mapped.length > 0 && keywordMapped.length > 0
                            ? 'Mora + Treffer'
                            : mapped.length > 0
                                ? 'Mora'
                                : 'Treffer'
                    );
                } else {
                    setSearchHint(localResults.length > 0 ? 'Lokal' : null);
                }
            } catch {
                if (requestId !== searchRequestRef.current) return;
                setSearchHint(localResults.length > 0 ? 'Lokal · Semantic offline' : 'Semantic offline');
            } finally {
                if (requestId === searchRequestRef.current) {
                    setIsSearching(false);
                }
            }
        }, 200);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [query, activeCompanyId, buildLocalResults, mapKeywordResult]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => {
                    const next = i < 0 ? 0 : i + 1;
                    return Math.min(next, results.length - 1);
                });
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => {
                    if (i < 0) return 0;
                    return Math.max(i - 1, 0);
                });
                break;
            case 'Enter':
                if (results[selectedIndex]) {
                    handleResultClick(results[selectedIndex]);
                }
                break;
            case 'Escape':
                setQuery('');
                break;
        }
    };

    const handleResultClick = async (result: SearchResult) => {
        // Save to recent searches
        const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('saimor_recent_searches', JSON.stringify(newRecent));

        // Navigate based on type
        switch (result.type) {
            case 'department':
                setActiveDepartment(result.departmentId || result.id);
                setViewLevel('department');
                removePane(id);
                break;
            case 'space':
                setActiveSpace(result.spaceId || result.id);
                setViewLevel('space');
                removePane(id);
                break;
            case 'folder':
            case 'file':
            case 'node':
                await openSearchResult(result, openPane, { companyId: activeCompanyId || result.companyId || undefined });
                removePane(id);
                break;
            default:
                removePane(id);
                break;
        }
    };

    if (!pane) return null;

    return (
        <GlassPanel
            title={searchMode === 'mora' ? 'Suche (Mora)' : 'Suche'}
            paneId={id}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            showBackButton={false}
            draggable
            resizable
        >
            <div className="h-full flex flex-col">
                {/* Search Input */}
                <div className="p-4 border-b border-white/10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Suche nach Elementen, Bereichen..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                        {activeCompanyName ? (
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-200/85">
                                Kontext: {activeCompanyName}
                            </span>
                        ) : (
                            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-100/85">
                                Firmenkontext fehlt
                            </span>
                        )}
                        {query.trim() && activeCompanyName && (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/55">
                                Ergebnisse nur aus {activeCompanyName}
                            </span>
                        )}
                    </div>
                    {(searchHint || isSearching) && (
                        <div className="mt-2 flex items-center gap-2 text-[11px]">
                            {searchHint && (
                                <span className={`px-2 py-0.5 rounded-full border ${
                                    searchMode === 'mora'
                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                        : 'border-white/10 bg-white/5 text-white/55'
                                }`}>
                                    {searchHint}
                                </span>
                            )}
                            {isSearching && (
                                <span className="text-white/35">Semantic Suche laeuft...</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Results / Recent */}
                <div className="flex-1 overflow-auto p-2">
                    {query ? (
                        <AnimatePresence mode="wait">
                            {isSearching && results.length === 0 ? (
                                <div className="flex items-center justify-center py-8">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Sparkles className="text-emerald-400" size={24} />
                                    </motion.div>
                                </div>
                            ) : results.length > 0 ? (
                                <AmbiguityChoiceSurface
                                    query={query}
                                    results={results}
                                    selectedIndex={selectedIndex}
                                    onPick={(result) => void handleResultClick(result)}
                                    onReview={() => openPane({
                                        id: 'search-main',
                                        type: 'search',
                                        title: 'Suche',
                                        size: { width: 960, height: 720 },
                                        data: { query },
                                    })}
                                    tone={results.length > 1 ? 'amber' : 'cyan'}
                                    body={results.length > 1
                                        ? 'Mehrere plausible Treffer. Wähle einen Eintrag.'
                                        : 'Ein klarer Treffer. Du kannst ihn direkt öffnen.'}
                                />
                            ) : (
                                <div className="text-center py-8 text-white/40">
                                    <Search size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Kein klarer Treffer für &quot;{query}&quot;</p>
                                    <button
                                        onClick={() => openPane({
                                            id: 'search-main',
                                            type: 'search',
                                            title: 'Suche',
                                            size: { width: 960, height: 720 },
                                            data: { query },
                                        })}
                                        className="mt-3 text-sm flex items-center gap-2 mx-auto text-emerald-400 hover:text-emerald-300"
                                    >
                                        <Sparkles size={14} />
                                        Suche prüfen
                                    </button>
                                </div>
                            )}
                        </AnimatePresence>
                    ) : (
                        <div>
                            {recentSearches.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40 uppercase tracking-wider">
                                        <Clock size={12} />
                                        Zuletzt gesucht
                                    </div>
                                    <div className="space-y-1">
                                        {recentSearches.map((search, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setQuery(search)}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all"
                                            >
                                                <Clock size={14} className="text-white/30" />
                                                <span className="text-sm text-white/70">{search}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-white/30">
                        <Search size={12} className="text-emerald-400" />
                        <span>
                            {searchMode === 'mora' ? 'Lokal + Mora-Semantik' : 'Lokale Suche'}
                            {activeCompanyName ? ` · ${activeCompanyName}` : ''}
                        </span>
                    </div>
                </div>
            </div>
        </GlassPanel>
    );
};

export default SearchPane;
