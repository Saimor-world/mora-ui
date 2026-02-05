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
    const { departments, navigateToDepartment, navigateToSpace, setOrbState } = useMoraStore();
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
                    className="rounded-2xl overflow-hidden"
                    style={{
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
                    <div className="p-4 border-b border-white/5">
                        <div className="relative">
                            {isMoraMode ? (
                                <Sparkles size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                            ) : (
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            )}
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onQueryChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search or @mora to chat..."
                                className={`w-full bg-black/30 border rounded-xl pl-12 pr-4 py-3 text-base text-white placeholder:text-white/30 focus:outline-none transition-all ${isMoraMode
                                        ? 'border-emerald-500/40 focus:border-emerald-500/60'
                                        : 'border-white/10 focus:border-white/20'
                                    }`}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => onQueryChange('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
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
                                className="mt-3 flex items-center gap-2 text-emerald-400 text-sm"
                            >
                                <Sparkles size={14} />
                                <span>Direkter Draht zu Môra - Enter zum Senden</span>
                            </motion.div>
                        )}
                    </div>

                    {/* Mora Chat Area - shown when in Mora mode with messages */}
                    {isMoraMode && moraMessages.length > 0 && (
                        <div className="border-b border-white/5 max-h-[200px] overflow-y-auto p-4 space-y-3">
                            {moraMessages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${msg.role === 'user'
                                                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30'
                                                : 'bg-white/5 text-white/90 border border-white/10'
                                            }`}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1">
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
                                    <div className="bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                                        <div className="flex items-center gap-2 text-emerald-400">
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
                                <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Ergebnisse</h3>
                                <div className="space-y-1">
                                    {searchResults.map((result) => {
                                        const Icon = getTypeIcon(result.type);
                                        return (
                                            <button
                                                key={result.id}
                                                onClick={() => handleResultClick(result)}
                                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                    <Icon size={16} className="text-white/60" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm text-white/90 truncate">{result.title}</div>
                                                    <div className="text-xs text-white/40 capitalize">{result.type}</div>
                                                </div>
                                                <ArrowRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
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
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                    <Search size={20} className="text-emerald-400" />
                                </motion.div>
                            </div>
                        )}

                        {/* Default Content (no search) */}
                        {!searchQuery && (
                            <div className="grid grid-cols-2 gap-6">
                                {/* Left Column - Quick Searches */}
                                <div>
                                    <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Quick Searches</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {quickSearches.map((qs, i) => (
                                            <button
                                                key={i}
                                                onClick={() => onQueryChange(qs.query)}
                                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors"
                                            >
                                                {qs.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Recent Items */}
                                    {recentItems.length > 0 && (
                                        <div className="mt-6">
                                            <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Clock size={12} />
                                                Zuletzt verwendet
                                            </h3>
                                            <div className="space-y-1">
                                                {recentItems.slice(0, 5).map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleResultClick(item)}
                                                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-sm text-white/70 text-left"
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
                                    <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Zap size={12} />
                                        Abteilungen
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {departments.slice(0, 6).map((dept) => (
                                            <button
                                                key={dept.id}
                                                onClick={() => handleDepartmentClick(dept.id)}
                                                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${dept.color || '#10B981'}33, ${dept.color || '#10B981'}11)`
                                                    }}
                                                >
                                                    <Building2 size={18} style={{ color: dept.color || '#10B981' }} />
                                                </div>
                                                <span className="text-xs text-white/60 group-hover:text-white/90 text-center truncate w-full">
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
                            <div className="text-center py-8 text-white/40">
                                <Search size={32} className="mx-auto mb-3 opacity-50" />
                                <p>Keine Ergebnisse für "{searchQuery}"</p>
                                <button
                                    onClick={() => {
                                        onQueryChange(`@mora ${searchQuery}`);
                                    }}
                                    className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm flex items-center gap-2 mx-auto"
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
