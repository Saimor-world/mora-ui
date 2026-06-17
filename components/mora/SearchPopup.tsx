"use client";

/**
 * WINDOWS 11-STYLE SEARCH POPUP
 *
 * Expands from the Dock search bar - shows:
 * - Recent items
 * - Quick searches / Quick actions
 * - Top apps (Departments)
 * - Search results as you type
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Clock,
    Sparkles,
    FileText,
    Building2,
    X,
    Zap,
    Send,
    Loader2,
    MessageCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useOrbStore } from '@/lib/store/orbStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';
import { searchGlobal, corePost } from '@/lib/api/coreClient';
import { buildChatContext } from '@/lib/api/moraAgentClient';
import { mapRawSearchResult, openSearchResult } from '@/lib/utils/searchOpen';
import { AmbiguityChoiceSurface } from '@/components/ui/AmbiguityChoiceSurface';

interface SearchResult {
    id: string;
    title: string;
    type: 'department' | 'space' | 'folder' | 'file' | 'node';
    icon?: LucideIcon;
    path?: string;
    subtitle?: string;
    companyId?: string;
    departmentId?: string;
    spaceId?: string;
    folderId?: string;
    nodeId?: string;
}

// Stable empty array — avoids recreating a new reference on every render when
// useDepartments has not yet resolved, which would cause an infinite useEffect loop.
const EMPTY_DEPARTMENTS: never[] = [];

interface SearchPopupProps {
    isOpen: boolean;
    onClose: () => void;
    searchQuery: string;
    onQueryChange: (query: string) => void;
    onMoraChat: (message: string) => void;
}

interface MoraMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const SearchPopup: React.FC<SearchPopupProps> = ({
    isOpen,
    onClose,
    searchQuery,
    onQueryChange,
    onMoraChat
}) => {
    const navigateToDepartment = useNavStore((s) => s.navigateToDepartment);
    const navigateToSpace = useNavStore((s) => s.navigateToSpace);
    const setOrbState = useOrbStore((s) => s.setOrbState);
    const isStandardMode = useNavStore((s) => s.isStandardMode);
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const { data: departments = EMPTY_DEPARTMENTS } = useDepartments(activeCompanyId);
    const { openPane } = usePaneStore();

    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentItems] = useState<SearchResult[]>([]);

    // Mora direct chat state
    const [moraMessages, setMoraMessages] = useState<MoraMessage[]>([]);
    const [isMoraThinking, setIsMoraThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const previousCompanyIdRef = useRef<string | null | undefined>(activeCompanyId);

    // Quick searches
    const quickSearches = [
        { label: 'Alle Dateien', query: 'type:file' },
        { label: 'Heute erstellt', query: 'created:today' },
        { label: 'Letzte Woche', query: 'created:week' },
    ];

    const mapSearchResult = useCallback((raw: any): SearchResult | null => {
        const mapped = mapRawSearchResult(raw);
        if (!mapped) return null;
        return mapped;
    }, []);

    // Search when query changes
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.startsWith('@mora')) {
            setSearchResults([]);
            return;
        }

        const searchTimeout = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Server-side search
                const response = await searchGlobal(searchQuery, activeCompanyId || undefined);
                if (response?.results) {
                    setSearchResults(
                        response.results
                            .map(mapSearchResult)
                            .filter((result): result is SearchResult => result !== null)
                    );
                }
            } catch (e) {
                // Fallback: local search in departments
                const localResults = departments
                    .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(d => ({
                        id: d.id,
                        title: d.name,
                        type: 'department' as const
                    }));
                setSearchResults(localResults);
            }
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [searchQuery, departments, activeCompanyId, mapSearchResult]);

    useEffect(() => {
        if (previousCompanyIdRef.current === activeCompanyId) return;
        previousCompanyIdRef.current = activeCompanyId;
        setSearchResults([]);
        setIsSearching(false);
    }, [activeCompanyId]);

    // Handle result click
    const handleResultClick = async (result: SearchResult) => {
        setOrbState('focus');

        switch (result.type) {
            case 'department':
                dispatchMoraPresence({ action: 'navigate', targetId: result.departmentId || result.id, targetType: 'department', message: `Navigiere zu ${result.title}`, source: 'system' });
                navigateToDepartment(result.departmentId || result.id);
                break;
            case 'space':
                dispatchMoraPresence({ action: 'navigate', targetId: result.spaceId || result.id, targetType: 'space', message: `Navigiere zu ${result.title}`, source: 'system' });
                navigateToSpace(result.spaceId || result.id);
                break;
            case 'folder':
            case 'file':
            case 'node':
                await openSearchResult(result, openPane, { companyId: activeCompanyId || result.companyId || undefined });
                break;
        }

        onQueryChange('');
        onClose();
    };

    // Handle department quick access
    const handleDepartmentClick = (deptId: string) => {
        const dept = departments.find(d => d.id === deptId);
        dispatchMoraPresence({ action: 'navigate', targetId: deptId, targetType: 'department', message: dept ? `Navigiere zu ${dept.name}` : 'Navigiere zum Bereich', source: 'system' });
        navigateToDepartment(deptId);
        setOrbState('focus');
        onQueryChange('');
        onClose();
    };

    // Check if it's a Mora chat
    const isMoraMode = searchQuery.startsWith('@mora');

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [moraMessages]);

    // Send message to Mora directly in popup
    const sendMoraMessage = async (message: string) => {
        if (!message.trim() || isMoraThinking) return;

        const userMessage: MoraMessage = { role: 'user', content: message };
        setMoraMessages(prev => [...prev, userMessage]);
        setIsMoraThinking(true);
        setOrbState('thinking');

        try {
            const response = await corePost('/v3/chat', {
                message: message,
                context: buildChatContext({ session_id: 'search_popup' })
            }) as { reply?: string; response?: string; message?: string };

            const assistantMessage: MoraMessage = {
                role: 'assistant',
                content: response?.reply || response?.response || response?.message || 'Ich bin gerade nicht erreichbar. Versuche es später noch einmal.'
            };
            setMoraMessages(prev => [...prev, assistantMessage]);
            setOrbState('idle');
        } catch (error) {
            console.error('[SearchPopup] Mora chat error:', error);
            const errorMessage: MoraMessage = {
                role: 'assistant',
                content: 'Entschuldigung, ich konnte deine Nachricht nicht verarbeiten. Bitte versuche es erneut.'
            };
            setMoraMessages(prev => [...prev, errorMessage]);
            setOrbState('idle');
        } finally {
            setIsMoraThinking(false);
        }
    };

    // Handle Enter for Mora chat
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isMoraMode) {
            e.preventDefault();
            const message = searchQuery.replace(/^@mora\s*/i, '').trim();
            if (message) {
                sendMoraMessage(message);
                onQueryChange('@mora '); // Reset to @mora prefix for next message
            }
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed bottom-24 left-1/2 z-[960] w-[min(600px,calc(100vw-2rem))] max-h-[500px] -translate-x-1/2 pointer-events-auto"
            >
                {/* Backdrop */}
                <div
                    className="fixed inset-0 z-[-1]"
                    onClick={onClose}
                />

                {/* Search Panel */}
                <div
                    className={`overflow-hidden ${
                        isStandardMode
                            ? 'rounded-lg bg-white border border-[#E1E1E1] shadow-xl'
                            : 'rounded-2xl'
                    }`}
                    style={isStandardMode ? {} : {
                        background: 'linear-gradient(180deg, rgba(10, 15, 13, 0.98) 0%, rgba(6, 10, 8, 0.99) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                        boxShadow: `
                            0 25px 60px rgba(0, 0, 0, 0.5),
                            0 0 80px rgba(16, 185, 129, 0.08),
                            inset 0 1px 0 rgba(255, 255, 255, 0.05)
                        `
                    }}
                >
                    {/* Search Input (mirrors dock input) */}
                    <div className={`p-4 border-b ${
                        isStandardMode ? 'border-[#E1E1E1]' : 'border-white/5'
                    }`}>
                        <div className="relative">
                            {isMoraMode ? (
                                <Sparkles size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                                    isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'
                                }`} />
                            ) : (
                                <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                                    isStandardMode ? 'text-gray-400' : 'text-white/40'
                                }`} />
                            )}
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onQueryChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Suchen oder @mora für Chat..."
                                className={`w-full border pl-12 pr-4 py-3 text-base focus:outline-none transition-all ${
                                    isStandardMode
                                        ? `bg-gray-50 text-[#1F1F1F] placeholder:text-gray-400 rounded-md ${
                                            isMoraMode
                                                ? 'border-[#0078D4] focus:border-[#0078D4]'
                                                : 'border-gray-200 focus:border-[#0078D4]'
                                        }`
                                        : `bg-black/30 text-white placeholder:text-white/30 rounded-xl ${
                                            isMoraMode
                                                ? 'border-emerald-500/40 focus:border-emerald-500/60'
                                                : 'border-white/10 focus:border-white/20'
                                        }`
                                }`}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => onQueryChange('')}
                                    className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                                        isStandardMode
                                            ? 'text-gray-400 hover:text-gray-600'
                                            : 'text-white/30 hover:text-white/60'
                                    }`}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Mora Mode Indicator */}
                        {isMoraMode && moraMessages.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mt-3 flex items-center gap-2 text-sm ${
                                    isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'
                                }`}
                            >
                                <Sparkles size={14} />
                                <span>Direkter Draht zu Môra - Enter zum Senden</span>
                            </motion.div>
                        )}
                    </div>

                    {/* Mora Chat Area - shown when in Mora mode with messages */}
                    {isMoraMode && moraMessages.length > 0 && (
                        <div className={`border-b max-h-[200px] overflow-y-auto p-4 space-y-3 ${
                            isStandardMode ? 'border-[#E1E1E1]' : 'border-white/5'
                        }`}>
                            {moraMessages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] px-4 py-2 text-sm ${
                                            isStandardMode
                                                ? msg.role === 'user'
                                                    ? 'bg-[#E5F3FF] text-[#1F1F1F] border border-[#0078D4]/30 rounded-lg'
                                                    : 'bg-gray-50 text-[#1F1F1F] border border-gray-200 rounded-lg'
                                                : msg.role === 'user'
                                                    ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-xl'
                                                    : 'bg-white/5 text-white/90 border border-white/10 rounded-xl'
                                        }`}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className={`flex items-center gap-1.5 text-xs mb-1 ${
                                                isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'
                                            }`}>
                                                <Sparkles size={10} />
                                                <span>Môra</span>
                                            </div>
                                        )}
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </motion.div>
                            ))}
                            {isMoraThinking && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className={`px-4 py-2 ${
                                        isStandardMode
                                            ? 'bg-gray-50 rounded-lg border border-gray-200'
                                            : 'bg-white/5 rounded-xl border border-white/10'
                                    }`}>
                                        <div className={`flex items-center gap-2 ${
                                            isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'
                                        }`}>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="text-sm">Môra denkt nach...</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="p-4 max-h-[380px] overflow-y-auto">
                        {/* Search Results */}
                        {searchQuery && !isMoraMode && searchResults.length > 0 && (
                            <div className="mb-6">
                                <h3 className={`text-xs uppercase tracking-wider mb-3 ${
                                    isStandardMode ? 'text-gray-500' : 'text-white/40'
                                }`}>Ergebnisse</h3>
                                <AmbiguityChoiceSurface
                                    query={searchQuery}
                                    results={searchResults as any}
                                    onPick={(result) => void handleResultClick(result as any)}
                                    onReview={() => {
                                        onClose();
                                        openPane({
                                            id: 'search-main',
                                            type: 'search',
                                            title: 'Suche',
                                            size: { width: 960, height: 720 },
                                            data: { query: searchQuery },
                                        });
                                    }}
                                    tone={searchResults.length > 1 ? 'amber' : 'cyan'}
                                    body={searchResults.length > 1
                                        ? 'Mehrere plausible Treffer. Wähle einen Eintrag.'
                                        : 'Ein klarer Treffer. Du kannst ihn direkt öffnen.'}
                                />
                            </div>
                        )}

                        {/* Loading State */}
                        {isSearching && (
                            <div className="flex items-center justify-center py-8">
                                <motion.div
                                    animate={isStandardMode ? {} : { rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                    {isStandardMode ? (
                                        <Loader2 size={20} className="text-[#0078D4] animate-spin" />
                                    ) : (
                                        <Search size={20} className="text-emerald-400" />
                                    )}
                                </motion.div>
                            </div>
                        )}

                        {/* Default Content (no search) */}
                        {!searchQuery && (
                            <div className="grid grid-cols-2 gap-6">
                                {/* Left Column - Quick Searches */}
                                <div>
                                    <h3 className={`text-xs uppercase tracking-wider mb-3 ${
                                        isStandardMode ? 'text-gray-500' : 'text-white/40'
                                    }`}>Quick Searches</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {quickSearches.map((qs, i) => (
                                            <button
                                                key={i}
                                                onClick={() => onQueryChange(qs.query)}
                                                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                                    isStandardMode
                                                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
                                                        : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                                                }`}
                                            >
                                                {qs.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Recent Items */}
                                    {recentItems.length > 0 && (
                                        <div className="mt-6">
                                            <h3 className={`text-xs uppercase tracking-wider mb-3 flex items-center gap-2 ${
                                                isStandardMode ? 'text-gray-500' : 'text-white/40'
                                            }`}>
                                                <Clock size={12} />
                                                Zuletzt verwendet
                                            </h3>
                                            <div className="space-y-1">
                                                {recentItems.slice(0, 5).map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => void handleResultClick(item)}
                                                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm text-left ${
                                                            isStandardMode
                                                                ? 'hover:bg-gray-100 text-gray-600'
                                                                : 'hover:bg-white/5 text-white/70'
                                                        }`}
                                                    >
                                                        <FileText size={14} />
                                                        {item.title}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column - Departments (Top Apps) */}
                                <div>
                                    <h3 className={`text-xs uppercase tracking-wider mb-3 flex items-center gap-2 ${
                                        isStandardMode ? 'text-gray-500' : 'text-white/40'
                                    }`}>
                                        <Zap size={12} />
                                        Abteilungen
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {departments.slice(0, 6).map((dept) => (
                                            <button
                                                key={dept.id}
                                                onClick={() => handleDepartmentClick(dept.id)}
                                                className={`flex flex-col items-center gap-2 p-3 transition-colors group ${
                                                    isStandardMode
                                                        ? 'rounded-lg hover:bg-gray-100'
                                                        : 'rounded-xl hover:bg-white/5'
                                                }`}
                                            >
                                                <div
                                                    className={`w-10 h-10 flex items-center justify-center ${
                                                        isStandardMode ? 'rounded-lg' : 'rounded-xl'
                                                    }`}
                                                    style={isStandardMode
                                                        ? { background: dept.color || '#0078D4', opacity: 0.15 }
                                                        : { background: `linear-gradient(135deg, ${dept.color || '#10B981'}33, ${dept.color || '#10B981'}11)` }
                                                    }
                                                >
                                                    <Building2 size={18} style={{ color: dept.color || (isStandardMode ? '#0078D4' : '#10B981') }} />
                                                </div>
                                                <span className={`text-xs text-center truncate w-full ${
                                                    isStandardMode
                                                        ? 'text-gray-500 group-hover:text-gray-700'
                                                        : 'text-white/60 group-hover:text-white/90'
                                                }`}>
                                                    {dept.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* No Results */}
                        {searchQuery && !isMoraMode && searchResults.length === 0 && !isSearching && (
                            <div className={`text-center py-8 ${
                                isStandardMode ? 'text-gray-400' : 'text-white/40'
                            }`}>
                                <Search size={32} className="mx-auto mb-3 opacity-50" />
                                <p>Kein klarer Treffer für &quot;{searchQuery}&quot;</p>
                                <button
                                    onClick={() => {
                                        onClose();
                                        openPane({
                                            id: 'search-main',
                                            type: 'search',
                                            title: 'Suche',
                                            size: { width: 960, height: 720 },
                                            data: { query: searchQuery },
                                        });
                                    }}
                                    className={`mt-3 text-sm flex items-center gap-2 mx-auto ${
                                        isStandardMode
                                            ? 'text-[#0078D4] hover:text-[#005A9E]'
                                            : 'text-emerald-400 hover:text-emerald-300'
                                    }`}
                                >
                                    <Sparkles size={14} />
                                    Suche prüfen
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
