"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, FileText, File, Link as LinkIcon, ChevronRight } from 'lucide-react';
import { searchSemantic, type SearchResult } from '@/lib/api/semanticClient';
import { useMoraStore } from '@/lib/store/moraState';
import { motion, AnimatePresence } from 'framer-motion';

export const SemanticSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Store actions for navigation
    const { setActiveNode, loadDepartments } = useMoraStore();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsLoading(true);
                setIsOpen(true);
                try {
                    const hits = await searchSemantic(query);
                    setResults(hits);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (result: SearchResult) => {
        console.log('Selected:', result);
        // Navigate to node
        // Ideally we would load the full path (Dept -> Space -> Folder)
        // For now, we just open the detail panel if we have the ID
        // Note: This requires the node to be in the current store state or fetched separately
        // Since we don't have a direct "fetchNode" in store yet, we might need to add it
        // For MVP, we'll try to set it if it exists in current view, or just log it

        // TODO: Implement deep linking navigation
        setIsOpen(false);
        setQuery('');
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'link': return LinkIcon;
            case 'note': return FileText;
            default: return File;
        }
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-md z-50">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 text-mora-gold animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 text-emerald-500/50 group-focus-within:text-mora-gold transition-colors" />
                    )}
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-black/20 text-emerald-100 placeholder-emerald-500/30 focus:outline-none focus:bg-black/40 focus:border-mora-gold/50 transition-all sm:text-sm backdrop-blur-sm"
                    placeholder="Search knowledge base..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
            </div>

            <AnimatePresence>
                {isOpen && (results.length > 0 || isLoading) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute mt-2 w-full rounded-xl bg-[#050f0a]/95 border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden"
                    >
                        {results.length > 0 ? (
                            <div className="py-2">
                                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-emerald-500/50 font-medium">
                                    Semantic Matches
                                </div>
                                {results.map((result) => {
                                    const Icon = getIcon(result.metadata.type);
                                    return (
                                        <button
                                            key={result.node_id}
                                            onClick={() => handleSelect(result)}
                                            className="w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left group"
                                        >
                                            <div className="mt-0.5 p-1.5 rounded bg-emerald-500/10 text-emerald-400 group-hover:text-mora-gold transition-colors">
                                                <Icon size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-emerald-100 truncate group-hover:text-white transition-colors">
                                                    {result.metadata.title}
                                                </div>
                                                <div className="text-xs text-emerald-500/50 truncate mt-0.5">
                                                    Relevance: {(result.score * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className="text-emerald-500/20 group-hover:text-emerald-500/50 mt-1" />
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            !isLoading && (
                                <div className="px-4 py-8 text-center text-sm text-emerald-500/40">
                                    No semantic matches found
                                </div>
                            )
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
