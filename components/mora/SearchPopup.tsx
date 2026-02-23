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
    Folder,
    FileText,
    Building2,
    Users,
    X,
    ArrowRight,
    Zap,
    Star,
    Send,
    Loader2,
    MessageCircle
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { buildChatContext } from '@/lib/api/moraAgentClient';

interface SearchResult {
    id: string;
    title: string;
    type: 'department' | 'space' | 'folder' | 'file' | 'node';
    icon?: string;
    path?: string;
}

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
    const { departments, navigateToDepartment, navigateToSpace, setOrbState, isStandardMode } = useMoraStore();
    const { openPane } = usePaneStore();

    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentItems] = useState<SearchResult[]>([]);

    // Mora direct chat state
    const [moraMessages, setMoraMessages] = useState<MoraMessage[]>([]);
    const [isMoraThinking, setIsMoraThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Quick searches
    const quickSearches = [
        { label: 'Alle Dokumente', query: 'type:file' },
        { label: 'Heute erstellt', query: 'created:today' },
        { label: 'Letzte Woche', query: 'created:week' },
    ];

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
                const response = await coreGet(`/v1/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
                if (response?.results) {
                    setSearchResults(response.results.map((r: any) => ({
                        id: r.id,
                        title: r.title || r.name,
                        type: r.type,
                        path: r.spaceId || r.departmentId
                    })));
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
    }, [searchQuery, departments]);

    // Handle result click
    const handleResultClick = (result: SearchResult) => {
        setOrbState('focus');

        switch (result.type) {
            case 'department':
                navigateToDepartment(result.id);
                break;
            case 'space':
                navigateToSpace(result.id);
                break;
            case 'folder':
            case 'file':
            case 'node':
                openPane({
                    id: `finder-${result.id}`,
                    type: 'finder',
                    title: result.title,
                    size: { width: 800, height: 600 },
                    data: { folderId: result.id }
                });
                break;
        }

        onClose();
    };

    // Handle department quick access
    const handleDepartmentClick = (deptId: string) => {
        navigateToDepartment(deptId);
        setOrbState('focus');
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
            const response = await corePost('/v1/chat', {
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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'department': return Building2;
            case 'space': return Star;
            case 'folder': return Folder;
            case 'file':
            case 'node': return FileText;
            default: return FileText;
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
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[600px] max-h-[500px]"
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
                                placeholder="Search or @mora to chat..."
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
                                <div className="space-y-1">
                                    {searchResults.map((result) => {
                                        const Icon = getTypeIcon(result.type);
                                        return (
                                            <button
                                                key={result.id}
                                                onClick={() => handleResultClick(result)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left group ${
                                                    isStandardMode
                                                        ? 'hover:bg-gray-100'
                                                        : 'hover:bg-white/5'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                    isStandardMode
                                                        ? 'bg-gray-100'
                                                        : 'bg-white/5'
                                                }`}>
                                                    <Icon size={16} className={
                                                        isStandardMode ? 'text-gray-600' : 'text-white/60'
                                                    } />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm truncate ${
                                                        isStandardMode ? 'text-[#1F1F1F]' : 'text-white/90'
                                                    }`}>{result.title}</div>
                                                    <div className={`text-xs capitalize ${
                                                        isStandardMode ? 'text-gray-400' : 'text-white/40'
                                                    }`}>{result.type}</div>
                                                </div>
                                                <ArrowRight size={14} className={`transition-colors ${
                                                    isStandardMode
                                                        ? 'text-gray-300 group-hover:text-gray-500'
                                                        : 'text-white/20 group-hover:text-white/50'
                                                }`} />
                                            </button>
                                        );
                                    })}
                                </div>
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
                                                        onClick={() => handleResultClick(item)}
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
                                <p>Keine Ergebnisse für &quot;{searchQuery}&quot;</p>
                                <button
                                    onClick={() => {
                                        onQueryChange(`@mora ${searchQuery}`);
                                    }}
                                    className={`mt-3 text-sm flex items-center gap-2 mx-auto ${
                                        isStandardMode
                                            ? 'text-[#0078D4] hover:text-[#005A9E]'
                                            : 'text-emerald-400 hover:text-emerald-300'
                                    }`}
                                >
                                    <Sparkles size={14} />
                                    Frag Môra danach
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
