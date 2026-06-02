'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, BookmarkPlus, Check, Lightbulb, Brain } from 'lucide-react';
import { learnInsight } from '@/lib/api/coreClient';
import type { MemoryCategory, MemorySearchResult } from '@/lib/types/memory';

// ─── Memory: Save Insight Button ───
export const SaveInsightButton: React.FC<{
    content: string;
    companyId?: string;
    onSaved: () => void;
    isSaved: boolean;
}> = ({ content, companyId, onSaved, isSaved }) => {
    const [saving, setSaving] = useState(false);
    const [showCategorySelect, setShowCategorySelect] = useState(false);

    const handleSave = async (category: MemoryCategory = 'context') => {
        if (!companyId) return;
        setSaving(true);
        try {
            await learnInsight({
                insight: content,
                category,
                auto_commit: true,
                company_id: companyId
            });
            onSaved();
            setShowCategorySelect(false);
        } catch (err) {
            console.error('[ChatApp] Failed to save insight:', err);
        } finally {
            setSaving(false);
        }
    };

    if (isSaved) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] text-violet-400/60 ml-2">
                <Check size={10} />
                Gespeichert
            </span>
        );
    }

    return (
        <div className="relative inline-block ml-2">
            <button
                onClick={() => setShowCategorySelect(!showCategorySelect)}
                disabled={saving}
                className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-violet-400 transition-colors"
                title="Als Insight speichern"
            >
                {saving ? (
                    <Loader2 size={10} className="animate-spin" />
                ) : (
                    <BookmarkPlus size={10} />
                )}
                <span className="hidden sm:inline">Merken</span>
            </button>

            <AnimatePresence>
                {showCategorySelect && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-1 bg-black/90 border border-white/10 rounded-lg p-2 z-50 min-w-[140px]"
                    >
                        <p className="text-[10px] text-white/55 mb-1.5 px-1">Kategorie:</p>
                        {(['context', 'fact', 'preference', 'summary'] as MemoryCategory[]).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => handleSave(cat)}
                                className="block w-full text-left text-xs px-2 py-1 text-white/70 hover:bg-violet-500/20 hover:text-violet-300 rounded transition-colors capitalize"
                            >
                                {cat === 'context' ? 'Kontext' :
                                    cat === 'fact' ? 'Fakt' :
                                        cat === 'preference' ? 'Präferenz' :
                                            cat === 'summary' ? 'Zusammenfassung' : cat}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Memory: Hint for detected memory intent ───
export const MemoryHint: React.FC<{
    onConfirm: () => void;
    onDismiss: () => void;
}> = ({ onConfirm, onDismiss }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg text-xs"
    >
        <Lightbulb size={14} className="text-violet-400 shrink-0" />
        <span className="text-white/70">Soll ich das speichern?</span>
        <button
            onClick={onConfirm}
            className="px-2 py-0.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded transition-colors"
        >
            Ja
        </button>
        <button
            onClick={onDismiss}
            className="px-2 py-0.5 text-white/40 hover:text-white/60 transition-colors"
        >
            Nein
        </button>
    </motion.div>
);

// ─── Memory: Relevant Memories Display ───
export const RelevantMemories: React.FC<{
    memories: MemorySearchResult[];
    isMemoryBasis?: boolean;
    onOpenMemory?: () => void;
    onDismiss: () => void;
}> = ({ memories, isMemoryBasis = false, onOpenMemory, onDismiss }) => {
    if (memories.length === 0 && !isMemoryBasis) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`border-b border-white/5 ${isMemoryBasis
                ? 'bg-gradient-to-r from-amber-500/10 via-purple-500/8 to-transparent'
                : 'bg-gradient-to-r from-purple-500/5 to-transparent'
                }`}
        >
            <div className="px-4 py-2">
                <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-2 text-xs ${isMemoryBasis ? 'text-amber-200/80' : 'text-purple-300/70'}`}>
                        <Brain size={12} />
                        <span>{isMemoryBasis ? 'Gedächtnisbasis dieser Antwort' : 'Relevante Erinnerungen'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {onOpenMemory && (
                            <button
                                onClick={onOpenMemory}
                                className="text-[11px] text-violet-300/80 hover:text-violet-200 transition-colors"
                            >
                                Im Memory öffnen
                            </button>
                        )}
                        <button
                            onClick={onDismiss}
                            className="text-white/30 hover:text-white/50 text-xs"
                        >
                            Ausblenden
                        </button>
                    </div>
                </div>
                {isMemoryBasis && (
                    <p className="mb-2 text-[11px] leading-relaxed text-white/55">
                        Mora hat diese Antwort auf gespeichertes Wissen gestuetzt. Hier siehst du die naheliegendsten Gedaechtnistreffer im aktuellen Organisationskontext.
                    </p>
                )}
                <div className="space-y-1.5">
                    {memories.slice(0, 3).map((mem) => (
                        <div
                            key={mem.id}
                            className={`text-xs text-white/70 bg-white/5 px-2 py-1.5 rounded border-l-2 ${isMemoryBasis ? 'border-amber-400/40' : 'border-purple-500/30'}`}
                        >
                            <div className="line-clamp-2">{mem.summary}</div>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-white/35">
                                <span>{mem.category || 'memory'}</span>
                                {typeof mem.score === 'number' && <span>{Math.round(mem.score * 100)}%</span>}
                            </div>
                        </div>
                    ))}
                    {memories.length === 0 && isMemoryBasis && (
                        <div className="text-xs text-white/45 bg-white/5 px-2 py-1.5 rounded border-l-2 border-amber-400/30">
                            Kein einzelner Gedächtnistreffer hervorgehoben, aber die Antwort wurde aus gespeichertem Kontext abgeleitet.
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
