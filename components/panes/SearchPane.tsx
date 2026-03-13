"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, Folder, Building2, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { searchGlobal, searchSemantic } from '@/lib/api/coreClient';

/**
 * SearchPane - Universal Search Interface
 * 
 * Features:
 * - Searches across Nodes, Spaces, Departments
 * - Shows recent searches
 * - AI-powered suggestions (ready for local LLM)
 * - Keyboard navigation
 */

interface SearchResult {
    id: string;
    type: 'node' | 'space' | 'department' | 'user' | 'file' | 'folder';
    title: string;
    subtitle?: string;
    icon: typeof FileText;
    source?: 'local' | 'mora';
    score?: number;
    departmentId?: string;
    spaceId?: string;
    folderId?: string;
    nodeId?: string;
}

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
        departments,
        spacesByDepartment,
        nodesByCompany,
        activeCompanyId,
        setActiveDepartment,
        setActiveSpace,
        setViewLevel
    } = useMoraStore();

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

    const mapKeywordResult = React.useCallback((raw: any): SearchResult | null => {
        const type = String(raw?.type || raw?.result_type || '').toLowerCase();
        const normalizedType = (['department', 'space', 'node', 'file', 'folder'].includes(type)
            ? type
            : 'node') as SearchResult['type'];
        const departmentId = raw?.department_id || raw?.departmentId;
        const spaceId = raw?.space_id || raw?.spaceId;
        const folderId = raw?.folder_id || raw?.folderId;
        const nodeId = raw?.node_id || raw?.nodeId || (normalizedType === 'node' || normalizedType === 'file' ? raw?.id : undefined);
        const id = departmentId || spaceId || folderId || nodeId || raw?.id;

        if (!id) return null;

        const subtitle =
            raw?.path ||
            raw?.scope_path ||
            raw?.content?.substring?.(0, 80) ||
            (normalizedType === 'department' ? 'Bereich' :
                normalizedType === 'space' ? 'Space' :
                    normalizedType === 'folder' ? 'Ordner' :
                        normalizedType === 'file' ? 'Datei' : 'Treffer');

        return {
            id,
            type: normalizedType,
            title: raw?.title || raw?.name || raw?.filename || 'Unbenannt',
            subtitle,
            icon: normalizedType === 'department' ? Building2 :
                normalizedType === 'space' || normalizedType === 'folder' ? Folder : FileText,
            source: 'mora',
            departmentId,
            spaceId,
            folderId,
            nodeId,
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

                const mapped: SearchResult[] = semanticResults.map((result) => ({
                    id: result.node_id,
                    type: 'node',
                    title: result.metadata?.title || 'Untitled',
                    subtitle: result.content?.substring(0, 80) || result.metadata?.type || 'Semantic result',
                    icon: FileText,
                    source: 'mora',
                    score: result.score,
                    nodeId: result.node_id,
                    folderId: result.metadata?.folder_id,
                    spaceId: result.metadata?.space_id,
                }));

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
                setSelectedIndex(i => Math.min(i + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
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

    const handleResultClick = (result: SearchResult) => {
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
                openPane({
                    id: `finder-${result.folderId || result.id}`,
                    type: 'finder',
                    title: result.title,
                    size: { width: 900, height: 640 },
                    data: { folderId: result.folderId || result.id }
                });
                removePane(id);
                break;
            case 'file':
            case 'node':
                if (result.folderId) {
                    openPane({
                        id: `finder-${result.folderId}`,
                        type: 'finder',
                        title: result.title,
                        size: { width: 900, height: 640 },
                        data: { folderId: result.folderId }
                    });
                }
                window.dispatchEvent(new CustomEvent('open-node-detail', { detail: { nodeId: result.nodeId || result.id } }));
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
            title={searchMode === 'mora' ? 'Search (Mora)' : 'Search'}
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
                                <span className="text-white/35">Semantic Suche läuft…</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Results / Recent */}
                <div className="flex-1 overflow-auto p-2">
                    {query ? (
                        <AnimatePresence mode="wait">
                            {isSearching ? (
                                <div className="flex items-center justify-center py-8">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Sparkles className="text-emerald-400" size={24} />
                                    </motion.div>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="space-y-1">
                                    {results.map((result, index) => (
                                        <motion.button
                                            key={result.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            onClick={() => handleResultClick(result)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${index === selectedIndex
                                                ? 'bg-emerald-500/20 border border-emerald-500/30'
                                                : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${result.type === 'department' ? 'bg-purple-500/20 text-purple-400' :
                                                result.type === 'space' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                <result.icon size={18} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="text-sm font-medium text-white/90">{result.title}</div>
                                                {result.subtitle && (
                                                    <div className="text-xs text-white/40 truncate">{result.subtitle}</div>
                                                )}
                                                {typeof result.score === 'number' && result.source === 'mora' && (
                                                    <div className="text-[10px] text-emerald-300/70 mt-0.5">
                                                        Relevanz {Math.round(result.score * 100)}%
                                                    </div>
                                                )}
                                            </div>
                                            <ArrowRight size={14} className="text-white/20" />
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-white/40">
                                    <Search size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No results for &quot;{query}&quot;</p>
                                </div>
                            )}
                        </AnimatePresence>
                    ) : (
                        <div>
                            {recentSearches.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40 uppercase tracking-wider">
                                        <Clock size={12} />
                                        Recent Searches
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
                        <span>{searchMode === 'mora' ? 'Local-first + Mora semantic' : 'Local-first search'}</span>
                    </div>
                </div>
            </div>
        </GlassPanel>
    );
};

export default SearchPane;
