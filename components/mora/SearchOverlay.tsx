"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Command, X, ArrowRight, Zap, FileText, Folder, Globe, Map } from 'lucide-react';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';
import { CoreNode, CoreSpace, CoreFolder, CoreDepartment } from '@/lib/types/core';

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

type SearchResult =
    | { type: 'department', item: CoreDepartment }
    | { type: 'space', item: CoreSpace }
    | { type: 'folder', item: CoreFolder }
    | { type: 'node', item: CoreNode };

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [isMoraMode, setIsMoraMode] = useState(false);
    const [serverResults, setServerResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Store Data
    const {
        activeCompanyId,
        navigateToDepartment,
        navigateToSpace,
        navigateToFolder
    } = useMoraStore();

    const { openPane } = usePaneStore();

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setServerResults([]);
            setIsMoraMode(false);
        }
    }, [isOpen]);

    // Handle Input Change & Debounced Search
    useEffect(() => {
        const isChat = query.trim().toLowerCase().startsWith('@mora');
        setIsMoraMode(isChat);

        if (!query.trim() || isChat || query.length < 2) {
            setServerResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Dynamic Import to avoid cycle if any
                const { searchGlobal } = await import('@/lib/api/coreClient');
                const res = await searchGlobal(query, activeCompanyId || undefined);
                if (res && res.results) {
                    setServerResults(res.results);
                }
            } catch (e) {
                console.error("Search failed", e);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, activeCompanyId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Enter' && query.trim()) {
            if (isMoraMode) {
                handleMoraChat(query);
            } else {
                handleDeepSearch();
            }
        }
    };

    const handleMoraChat = (fullQuery: string) => {
        const cleanQuery = fullQuery.replace(/^@mora\s*/i, '').trim();
        openPane({
            id: 'mora-chat', // Reuse singleton chat ID
            type: 'chat', // Should map to a Chat Pane
            title: 'Môra Intelligence',
            size: { width: 860, height: 680 },
            data: { initialMessage: cleanQuery }
        });
        onClose();
    };

    const handleDeepSearch = () => {
        if (!query.trim()) return;
        openPane({
            id: 'finder-main',
            type: 'finder',
            title: `Finder: ${query}`,
            size: { width: 1280, height: 820 },
            data: { query }
        });
        onClose();
    };

    const handleSelect = (hit: any) => {
        // Backend result mapping
        const type = hit.type;

        switch (type) {
            case 'department':
                if (hit.id) {
                    dispatchMoraPresence({ action: 'navigate', targetId: hit.id, targetType: 'department', message: `Navigiere zu ${hit.title || 'dem Bereich'}`, source: 'system' });
                    navigateToDepartment(hit.id);
                }
                break;
            case 'space':
                if (hit.id) {
                    dispatchMoraPresence({ action: 'navigate', targetId: hit.id, targetType: 'space', message: `Navigiere zu ${hit.title || 'dem Space'}`, source: 'system' });
                    navigateToSpace(hit.id);
                }
                break;
            case 'folder':
                if (hit.id) {
                    dispatchMoraPresence({ action: 'navigate', targetId: hit.id, targetType: 'folder', message: `Navigiere zu ${hit.title || 'dem Ordner'}`, source: 'system' });
                    navigateToFolder(hit.id);
                }
                break;
            default:
                // Node/File
                openPane({
                    id: `node-${hit.node_id || hit.id}`,
                    type: 'document',
                    title: hit.title || 'Untitled',
                    data: { id: hit.node_id || hit.id, ...hit }, // Pass all hit data
                    size: { width: 800, height: 600 }
                });
                break;
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Search Container */}
                    <motion.div
                        className={`relative w-[640px] glass-card overflow-hidden rounded-2xl shadow-2xl border transition-all duration-500 ${isMoraMode ? 'border-purple-500/40 bg-purple-900/20 shadow-[0_0_80px_rgba(168,85,247,0.15)]' : 'border-emerald-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'}`}
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Glass Sheen Animation */}
                        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-2xl">
                            <motion.div
                                className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                                animate={{ left: ['0%', '200%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            />
                        </div>

                        {/* Search Bar */}
                        <div className="flex items-center p-4 gap-4 border-b border-white/5">
                            {isMoraMode ? (
                                <Sparkles className="text-purple-400 animate-pulse" size={20} />
                            ) : (
                                <Search className="text-emerald-500/60" size={20} />
                            )}

                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Suche... oder starte mit @mora für Chat"
                                className={`flex-1 bg-transparent text-lg text-white placeholder:text-white/20 outline-none transition-colors ${isMoraMode ? 'text-purple-100' : ''}`}
                            />
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/40 uppercase tracking-widest font-bold">
                                <Command size={10} /> K
                            </div>
                        </div>

                        {/* Results / Empty State */}
                        <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {!query ? (
                                <div className="p-8 text-center">
                                    <Sparkles className="mx-auto text-emerald-500/20 mb-3" size={40} />
                                    <h3 className="text-white/40 text-sm font-medium">Bereit</h3>
                                    <p className="text-white/20 text-xs mt-1">Nutze @mora für AI Chat oder tippe direkt.</p>
                                </div>
                            ) : isMoraMode ? (
                                <div className="p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <div className="text-purple-300 font-medium text-sm">Frage an Môra senden</div>
                                        <div className="text-white/30 text-xs">Drücke Enter um den Chat zu öffnen</div>
                                    </div>
                                    <ArrowRight className="ml-auto text-purple-400/50" size={16} />
                                </div>
                            ) : isLoading ? (
                                <div className="p-8 flex justify-center">
                                    <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                </div>
                            ) : serverResults.length === 0 ? (
                                <div className="p-8 text-center text-white/40 text-sm">
                                    Keine Ergebnisse für &quot;{query}&quot;
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {/* Backend Results */}
                                    {serverResults.map((hit: any) => (
                                        <motion.div
                                            key={`${hit.type}-${hit.id || hit.node_id}`}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer flex items-center gap-3 transition-all duration-300 group"
                                            onClick={() => handleSelect(hit)}
                                        >
                                            {/* Icon mapping based on type/source */}
                                            <div className="p-2 rounded-lg bg-black/20 text-white/40 group-hover:text-emerald-400 group-hover:scale-110 transition-all">
                                                {hit.type === 'department' && <Globe size={18} />}
                                                {hit.type === 'space' && <Map size={18} />}
                                                {hit.type === 'folder' && <Folder size={18} />}
                                                {(!['department', 'space', 'folder'].includes(hit.type)) && <FileText size={18} />}
                                            </div>

                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-white/90 group-hover:text-emerald-100 transition-colors">
                                                    {hit.title || hit.name}
                                                </div>
                                                <div className="text-[11px] text-white/30 truncate max-w-[400px]">
                                                    {hit.content_preview || hit.description || hit.space_id}
                                                </div>
                                            </div>

                                            <div className="text-[9px] text-white/10 font-bold tracking-widest uppercase border border-white/5 px-2 py-0.5 rounded-md group-hover:border-emerald-500/30 group-hover:text-emerald-500/50 transition-colors">
                                                {hit.type}
                                            </div>
                                        </motion.div>
                                    ))}

                                    <div className="h-px bg-white/5 my-2" />

                                    <div
                                        className="p-2 text-center text-xs text-emerald-500/40 hover:text-emerald-400 cursor-pointer transition-colors"
                                        onClick={handleDeepSearch}
                                    >
                                        Alle Ergebnisse im Finder anzeigen
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider ${isMoraMode ? 'text-purple-400/40' : 'text-emerald-500/40'}`}>
                                    <Zap size={10} />
                                    {isMoraMode ? 'AI Mode Active' : 'Server-Search Active'}
                                </span>
                            </div>
                            <div className="text-[10px] text-white/20">
                                Enter zum Öffnen • Esc zum Schließen
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

