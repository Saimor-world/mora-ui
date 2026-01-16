"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, Folder, Building2, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { GlassPanel } from '@/components/layers/GlassPanel';

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
    type: 'node' | 'space' | 'department' | 'user' | 'file';
    title: string;
    subtitle?: string;
    icon: typeof FileText;
}

export const SearchPane: React.FC<{ id?: string }> = ({ id = 'search-main' }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

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

    // Search logic
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        const lowerQuery = query.toLowerCase();

        // Search across all data sources
        const searchResults: SearchResult[] = [];

        // Search departments
        departments.forEach(dept => {
            if (dept.name.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    id: dept.id,
                    type: 'department',
                    title: dept.name,
                    subtitle: 'Department',
                    icon: Building2
                });
            }
        });

        // Search spaces
        allSpaces.forEach(space => {
            if (space.name.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    id: space.id,
                    type: 'space',
                    title: space.name,
                    subtitle: 'Space',
                    icon: Folder
                });
            }
        });

        // Search nodes
        allNodes.forEach(node => {
            if (node.title?.toLowerCase().includes(lowerQuery) ||
                node.content?.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    id: node.id,
                    type: 'node',
                    title: node.title || 'Untitled',
                    subtitle: node.content?.substring(0, 50) || 'Node',
                    icon: FileText
                });
            }
        });

        setResults(searchResults.slice(0, 10));
        setIsSearching(false);
        setSelectedIndex(0);
    }, [query, departments, allSpaces, allNodes]);

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
                setActiveDepartment(result.id);
                setViewLevel('department');
                removePane(id);
                break;
            case 'space':
                setActiveSpace(result.id);
                setViewLevel('space');
                removePane(id);
                break;
            case 'node':
                window.dispatchEvent(new CustomEvent('open-node-detail', { detail: { nodeId: result.id } }));
                removePane(id);
                break;
        }
    };

    if (!pane) return null;

    return (
        <GlassPanel
            title="Search"
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
                            placeholder="Search nodes, spaces, departments..."
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
                                            </div>
                                            <ArrowRight size={14} className="text-white/20" />
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-white/40">
                                    <Search size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No results for "{query}"</p>
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

                            {/* Search Tips */}
                            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-xs text-white/40 mb-2">💡 Search Tips</div>
                                <ul className="text-xs text-white/50 space-y-1">
                                    <li>• Type to search across all content</li>
                                    <li>• Use ↑↓ to navigate, Enter to select</li>
                                    <li>• Press Escape to clear</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Ready Badge */}
                <div className="p-3 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-white/30">
                        <Sparkles size={12} className="text-emerald-400" />
                        <span>AI-enhanced search coming soon</span>
                    </div>
                </div>
            </div>
        </GlassPanel>
    );
};

export default SearchPane;
