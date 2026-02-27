"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronLeft, ChevronRight, Search, Check, Clock, AlertCircle, Lightbulb, X } from 'lucide-react';
import { create } from 'zustand';
import { useMemory } from '@/lib/hooks/useMemory';
import { usePlatformModifier } from '@/lib/hooks/usePlatformModifier';
import { useMoraStore } from '@/lib/store/moraState';
import { searchMemory, learnInsight } from '@/lib/api/coreClient';
import type { MemorySearchResult, MemoryCategory } from '@/lib/types/memory';

/**
 * MEMORY SIDEBAR
 *
 * Quick-access sidebar for Mora's memory system.
 * Shows pending items, recent memories, and quick input.
 *
 * Features:
 * - Collapsible sidebar (right edge)
 * - Quick memory input
 * - Pending review count
 * - Recent memories list
 * - Keyboard shortcut: Strg+Shift+M
 */

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

interface MemorySidebarState {
    isOpen: boolean;
    isCollapsed: boolean;
    setOpen: (open: boolean) => void;
    setCollapsed: (collapsed: boolean) => void;
    toggle: () => void;
}

export const useMemorySidebarStore = create<MemorySidebarState>((set) => ({
    isOpen: false,
    isCollapsed: true,
    setOpen: (open) => set({ isOpen: open }),
    setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
    toggle: () => set((s) => ({ isOpen: !s.isOpen, isCollapsed: false })),
}));

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUT HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useMemorySidebarShortcut() {
    const toggle = useMemorySidebarStore((s) => s.toggle);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + Shift + M
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
                e.preventDefault();
                toggle();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggle]);
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const QuickMemoryInputInline: React.FC<{
    onSuccess?: () => Promise<void> | void;
    companyId?: string | null;
}> = ({ onSuccess, companyId }) => {
    const [input, setInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!input.trim() || isSubmitting || !companyId) return;
        setIsSubmitting(true);

        try {
            await learnInsight({
                insight: input.trim(),
                category: 'context',
                auto_commit: true,
                company_id: companyId,
            });
            setSuccess(true);
            setInput('');
            onSuccess?.();
            setTimeout(() => setSuccess(false), 2000);
        } catch (err) {
            console.error('[MemorySidebar] Learn failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-3 border-b border-white/5">
            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="Schnell merken..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
                    disabled={isSubmitting}
                />
                <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isSubmitting}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-white/30 hover:text-violet-400 disabled:opacity-30 transition-colors"
                >
                    {success ? <Check size={14} className="text-emerald-400" /> : <Brain size={14} />}
                </button>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// PENDING ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const PendingItem: React.FC<{
    item: any;
    onApprove: () => void;
    onReject: () => void;
}> = ({ item, onApprove, onReject }) => (
    <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-xs">
        <p className="text-white/70 line-clamp-2 mb-2">{item.summary || item.insight}</p>
        <div className="flex items-center justify-between">
            <span className="text-[9px] text-amber-400/60 uppercase">{item.category}</span>
            <div className="flex gap-1">
                <button
                    onClick={onApprove}
                    className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                    <Check size={12} />
                </button>
                <button
                    onClick={onReject}
                    className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const MemoryItem: React.FC<{ memory: MemorySearchResult }> = ({ memory }) => {
    const categoryColors: Record<string, string> = {
        preference: 'text-blue-400',
        fact: 'text-amber-400',
        context: 'text-violet-400',
        summary: 'text-emerald-400',
    };

    const colorClass = memory.category ? categoryColors[memory.category] || 'text-white/40' : 'text-white/40';

    return (
        <div className="p-2 bg-white/[0.02] border border-white/5 rounded-lg text-xs hover:bg-white/[0.04] transition-colors">
            <p className="text-white/70 line-clamp-2">{memory.summary}</p>
            <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[9px] uppercase ${colorClass}`}>
                    {memory.category || 'unknown'}
                </span>
                {memory.score && (
                    <span className="text-[9px] text-white/20">{Math.round(memory.score * 100)}%</span>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const MemorySidebar: React.FC = () => {
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const mod = usePlatformModifier();
    const { isOpen, isCollapsed, setOpen, setCollapsed } = useMemorySidebarStore();
    const { pendingCount, pendingItems, refresh, approve, reject } = useMemory();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<MemorySearchResult[]>([]);
    const [recentMemories, setRecentMemories] = useState<MemorySearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Load recent memories on mount
    useEffect(() => {
        if (!activeCompanyId) {
            setRecentMemories([]);
            return;
        }
        const loadRecent = async () => {
            try {
                const results = await searchMemory('', 10, activeCompanyId);
                if (results) {
                    setRecentMemories(results);
                }
            } catch (err) {
                console.warn('[MemorySidebar] Failed to load recent:', err);
            }
        };
        if (isOpen) {
            loadRecent();
        }
    }, [activeCompanyId, isOpen]);

    // Search memories
    useEffect(() => {
        if (searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            if (!activeCompanyId) {
                setIsSearching(false);
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const results = await searchMemory(searchQuery, 5, activeCompanyId);
                setSearchResults(results || []);
            } catch (err) {
                console.error('[MemorySidebar] Search failed:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [activeCompanyId, searchQuery]);

    // Register shortcut
    useMemorySidebarShortcut();

    // Calculate sidebar width
    const sidebarWidth = isCollapsed ? 48 : 280;

    return (
        <>
            {/* Collapsed Tab (always visible on right edge) */}
            <motion.button
                initial={{ x: 100 }}
                animate={{ x: isOpen ? 100 : 0 }}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-[400] p-2 bg-black/60 backdrop-blur-xl border border-white/10 border-r-0 rounded-l-xl hover:bg-black/80 transition-colors"
                onClick={() => { setOpen(true); setCollapsed(false); }}
            >
                <div className="flex flex-col items-center gap-1">
                    <Brain size={18} className="text-violet-400" />
                    {pendingCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-[9px] text-white font-bold flex items-center justify-center">
                            {pendingCount > 9 ? '!' : pendingCount}
                        </span>
                    )}
                </div>
            </motion.button>

            {/* Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-[399] bg-black/20"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ x: 300 }}
                            animate={{ x: 0 }}
                            exit={{ x: 300 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed right-0 top-0 bottom-0 z-[400] bg-black/80 backdrop-blur-2xl border-l border-white/10 shadow-2xl"
                            style={{ width: sidebarWidth }}
                        >
                            {isCollapsed ? (
                                // Collapsed view
                                <div className="flex flex-col items-center py-4 gap-4">
                                    <button
                                        onClick={() => setCollapsed(false)}
                                        className="p-2 text-white/40 hover:text-white/70 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <Brain size={20} className="text-violet-400" />
                                    {pendingCount > 0 && (
                                        <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                            <span className="text-[10px] text-amber-400 font-bold">{pendingCount}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Expanded view
                                <div className="flex flex-col h-full">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-3 border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                            <Brain size={16} className="text-violet-400" />
                                            <span className="text-xs font-medium text-white/80">Memory</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setCollapsed(true)}
                                                className="p-1 text-white/30 hover:text-white/60 transition-colors"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                            <button
                                                onClick={() => setOpen(false)}
                                                className="p-1 text-white/30 hover:text-white/60 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Input */}
                                    <QuickMemoryInputInline onSuccess={refresh} companyId={activeCompanyId} />

                                    {!activeCompanyId && (
                                        <div className="mx-3 mt-3 p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-200">
                                            Keine aktive Company gewaehlt. Memory ist pro Company isoliert.
                                        </div>
                                    )}

                                    {/* Search */}
                                    <div className="p-3 border-b border-white/5">
                                        <div className="relative">
                                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Suchen..."
                                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                                            />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                                        {/* Search Results */}
                                        {searchQuery.length >= 3 && (
                                            <div>
                                                <div className="text-[9px] uppercase tracking-wider text-white/30 mb-2">
                                                    Suchergebnisse
                                                </div>
                                                {isSearching ? (
                                                    <div className="text-xs text-white/40 text-center py-2">Suche...</div>
                                                ) : searchResults.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {searchResults.map((mem) => (
                                                            <MemoryItem key={mem.id} memory={mem} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-white/40 text-center py-2">Keine Ergebnisse</div>
                                                )}
                                            </div>
                                        )}

                                        {/* Pending Reviews */}
                                        {pendingCount > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertCircle size={12} className="text-amber-400" />
                                                    <span className="text-[9px] uppercase tracking-wider text-amber-400/70">
                                                        Zur Prüfung ({pendingCount})
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {pendingItems.slice(0, 3).map((item) => (
                                                        <PendingItem
                                                            key={item.id}
                                                            item={item}
                                                            onApprove={() => approve(item.id)}
                                                            onReject={() => reject(item.id)}
                                                        />
                                                    ))}
                                                    {pendingItems.length > 3 && (
                                                        <button className="w-full text-[10px] text-violet-400/70 hover:text-violet-400 py-1">
                                                            +{pendingItems.length - 3} weitere
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recent Memories */}
                                        {searchQuery.length < 3 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock size={12} className="text-white/30" />
                                                    <span className="text-[9px] uppercase tracking-wider text-white/30">
                                                        Kürzlich gelernt
                                                    </span>
                                                </div>
                                                {recentMemories.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {recentMemories.slice(0, 5).map((mem) => (
                                                            <MemoryItem key={mem.id} memory={mem} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-white/30 text-center py-4">
                                                        <Lightbulb size={16} className="mx-auto mb-2 opacity-40" />
                                                        Noch keine Erinnerungen
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="p-3 border-t border-white/5 text-[9px] text-white/20 text-center">
                                        {mod}+Shift+M zum Oeffnen
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default MemorySidebar;
