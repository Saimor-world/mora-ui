import React, { useState, useEffect } from 'react';
import { Search, Command, FileText, Hash, ArrowRight, Layout, Settings, Plus, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavStore } from '@/lib/store/navStore';
import type { MoraObject } from '@/lib/types';

interface GlobalCommandBarProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: string) => void;
    onSearch: (query: string) => void;
    searchResults: MoraObject[];
}

export function GlobalCommandBar({ isOpen, onClose, onNavigate, onSearch, searchResults }: GlobalCommandBarProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const isStandardMode = useNavStore((state) => state.isStandardMode);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % (searchResults.length + 3)); // +3 for static commands
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + (searchResults.length + 3)) % (searchResults.length + 3));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                // Execute selected command
                if (selectedIndex === 0) onNavigate('home');
                else if (selectedIndex === 1) onNavigate('spaces');
                else if (selectedIndex === 2) onNavigate('settings');
                else if (searchResults[selectedIndex - 3]) {
                    // Handle node selection (would need a prop for this)
                }
                onClose();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, searchResults, onNavigate, onClose]);

    // Input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        onSearch(e.target.value);
        setSelectedIndex(0);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className={`absolute inset-0 ${
                            isStandardMode
                                ? 'bg-black/20'
                                : 'bg-black/60 backdrop-blur-sm'
                        }`}
                    />

                    {/* Command Bar */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`w-full max-w-2xl overflow-hidden relative z-10 ${
                            isStandardMode
                                ? 'bg-white border border-[#E1E1E1] rounded-lg shadow-xl'
                                : 'bg-mora-forest/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl'
                        }`}
                    >
                        {/* Search Input */}
                        <div className={`flex items-center px-4 py-4 border-b ${
                            isStandardMode ? 'border-[#E1E1E1]' : 'border-white/5'
                        }`}>
                            <Search className={`w-5 h-5 mr-3 ${
                                isStandardMode ? 'text-gray-400' : 'text-emerald-500/50'
                            }`} />
                            <input
                                autoFocus
                                type="text"
                                value={query}
                                onChange={handleInputChange}
                                placeholder="Type a command or search..."
                                className={`flex-1 bg-transparent border-none outline-none text-lg ${
                                    isStandardMode
                                        ? 'text-[#1F1F1F] placeholder:text-gray-400'
                                        : 'text-emerald-50 placeholder:text-emerald-500/30'
                                }`}
                            />
                            <div className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${
                                    isStandardMode
                                        ? 'bg-gray-100 border-gray-200 text-gray-500'
                                        : 'bg-white/5 border-white/5 text-emerald-500/50'
                                }`}>ESC</span>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                            <div className={`text-[10px] uppercase tracking-wider px-3 py-2 ${
                                isStandardMode ? 'text-gray-500' : 'text-emerald-500/40'
                            }`}>Commands</div>

                            <CommandItem
                                icon={Layout}
                                label="Go to Dashboard"
                                shortcut="G D"
                                active={selectedIndex === 0}
                                onClick={() => { onNavigate('home'); onClose(); }}
                                isStandardMode={isStandardMode}
                            />
                            <CommandItem
                                icon={Plus}
                                label="Create New Space"
                                shortcut="C S"
                                active={selectedIndex === 1}
                                onClick={() => { onNavigate('create-space'); onClose(); }}
                                isStandardMode={isStandardMode}
                            />
                            <CommandItem
                                icon={Settings}
                                label="Settings"
                                shortcut="G S"
                                active={selectedIndex === 2}
                                onClick={() => { onNavigate('settings'); onClose(); }}
                                isStandardMode={isStandardMode}
                            />

                            {searchResults.length > 0 && (
                                <>
                                    <div className={`text-[10px] uppercase tracking-wider px-3 py-2 mt-2 ${
                                        isStandardMode ? 'text-gray-500' : 'text-emerald-500/40'
                                    }`}>Search Results</div>
                                    {searchResults.map((result, i) => (
                                        <CommandItem
                                            key={result.id}
                                            icon={result.type === 'project' ? Hash : FileText}
                                            label={result.title}
                                            subLabel={result.type}
                                            active={selectedIndex === i + 3}
                                            onClick={() => { /* Handle node select */ onClose(); }}
                                            isStandardMode={isStandardMode}
                                        />
                                    ))}
                                </>
                            )}

                            {query && searchResults.length === 0 && (
                                <div className={`py-8 text-center text-sm ${
                                    isStandardMode ? 'text-gray-400' : 'text-emerald-500/30'
                                }`}>
                                    No results found for &quot;{query}&quot;
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className={`px-4 py-2 border-t flex items-center justify-between text-[10px] ${
                            isStandardMode
                                ? 'bg-gray-50 border-[#E1E1E1] text-gray-500'
                                : 'bg-black/20 border-white/5 text-emerald-500/40'
                        }`}>
                            <div className="flex items-center gap-3">
                                <span><span className={isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'}>↑↓</span> to navigate</span>
                                <span><span className={isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'}>↵</span> to select</span>
                            </div>
                            <div>
                                Mora Command v1.0
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function CommandItem({ icon: Icon, label, subLabel, shortcut, active, onClick, isStandardMode }: { icon: any, label: string, subLabel?: string, shortcut?: string, active: boolean, onClick: () => void, isStandardMode?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between px-3 py-3 rounded-lg transition-all text-left group",
                isStandardMode
                    ? active
                        ? "bg-[#E5F3FF] text-[#0078D4]"
                        : "text-[#1F1F1F] hover:bg-gray-100"
                    : active
                        ? "bg-mora-gold/10 text-mora-gold"
                        : "text-emerald-200/70 hover:bg-white/5"
            )}
        >
            <div className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4",
                    isStandardMode
                        ? active ? "text-[#0078D4]" : "text-gray-400"
                        : active ? "text-mora-gold" : "text-emerald-500/50"
                )} />
                <div>
                    <div className={cn("text-sm font-medium",
                        isStandardMode
                            ? active ? "text-[#0078D4]" : "text-[#1F1F1F]"
                            : active ? "text-mora-gold" : "text-emerald-100"
                    )}>{label}</div>
                    {subLabel && <div className="text-[10px] opacity-50 capitalize">{subLabel}</div>}
                </div>
            </div>
            {shortcut && (
                <div className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border",
                    isStandardMode
                        ? active
                            ? "border-[#0078D4]/30 bg-[#0078D4]/10"
                            : "border-gray-200 bg-gray-100"
                        : active
                            ? "border-mora-gold/20 bg-mora-gold/10"
                            : "border-white/5 bg-white/5 opacity-50"
                )}>
                    {shortcut}
                </div>
            )}
            {active && <ArrowRight className={`w-3 h-3 ${isStandardMode ? '' : 'animate-pulse'}`} />}
        </button>
    );
}
