'use client';

/**
 * ChatPane - Mora AI Conversation Interface
 *
 * MASTERBIBEL: Môra is your Disney fairy AI companion.
 * This pane allows direct conversation with Môra (via Ollama/Gemini/etc).
 *
 * Commands like "show me department XY" trigger cursor navigation.
 *
 * Memory Integration (2026-02):
 * - Save insights from Mora responses
 * - Detect memory keywords in user input
 * - Show relevant memories for context
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { learnInsight, searchMemory } from '@/lib/api/coreClient';
import { moraAgentClient } from '@/lib/api/moraAgentClient';
import { parseAIResponse, executeCursorCommands } from '@/lib/ai/cursorBridge';
import { Send, Sparkles, Loader2, Bot, User, Wand2, Brain, BookmarkPlus, Lightbulb, Check } from 'lucide-react';
import type { MemoryCategory, MemorySearchResult } from '@/lib/types/memory';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
    savedAsInsight?: boolean; // Track if message was saved as insight
}

// Memory keywords that trigger save hint (German)
const MEMORY_KEYWORDS = [
    'merke dir', 'merk dir', 'speicher das', 'speichere das',
    'wichtig:', 'wichtig ist', 'vergiss nicht', 'erinnere dich',
    'remember', 'save this', 'note that', 'keep in mind'
];

// Detect memory intent in user message
function detectMemoryIntent(text: string): boolean {
    const lower = text.toLowerCase();
    return MEMORY_KEYWORDS.some(kw => lower.includes(kw));
}

// Extract the insight content from a memory request
function extractInsightFromRequest(text: string): string {
    let content = text;
    // Remove common prefixes
    const prefixes = [
        'merke dir,?', 'merk dir,?', 'speicher das,?', 'speichere das,?',
        'wichtig:', 'vergiss nicht,?', 'erinnere dich,?',
        'remember,?', 'save this,?', 'note that,?', 'keep in mind,?'
    ];
    for (const prefix of prefixes) {
        content = content.replace(new RegExp(`^${prefix}\\s*`, 'i'), '');
    }
    return content.trim();
}

interface ChatPaneProps {
    id?: string;
}

// ─── Memory: Save Insight Button ───
const SaveInsightButton: React.FC<{
    content: string;
    onSaved: () => void;
    isSaved: boolean;
}> = ({ content, onSaved, isSaved }) => {
    const [saving, setSaving] = useState(false);
    const [showCategorySelect, setShowCategorySelect] = useState(false);

    const handleSave = async (category: MemoryCategory = 'context') => {
        setSaving(true);
        try {
            await learnInsight({
                insight: content,
                category,
                auto_commit: true
            });
            onSaved();
            setShowCategorySelect(false);
        } catch (err) {
            console.error('[ChatPane] Failed to save insight:', err);
        } finally {
            setSaving(false);
        }
    };

    if (isSaved) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/60 ml-2">
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
                className="inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-emerald-400 transition-colors"
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
                        <p className="text-[10px] text-white/50 mb-1.5 px-1">Kategorie:</p>
                        {(['context', 'fact', 'preference', 'summary'] as MemoryCategory[]).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => handleSave(cat)}
                                className="block w-full text-left text-xs px-2 py-1 text-white/70 hover:bg-emerald-500/20 hover:text-emerald-300 rounded transition-colors capitalize"
                            >
                                {cat === 'context' ? 'Kontext' :
                                 cat === 'fact' ? 'Fakt' :
                                 cat === 'preference' ? 'Praeferenz' :
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
const MemoryHint: React.FC<{
    onConfirm: () => void;
    onDismiss: () => void;
}> = ({ onConfirm, onDismiss }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs"
    >
        <Lightbulb size={14} className="text-emerald-400 shrink-0" />
        <span className="text-white/70">Soll ich das speichern?</span>
        <button
            onClick={onConfirm}
            className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded transition-colors"
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
const RelevantMemories: React.FC<{
    memories: MemorySearchResult[];
    onDismiss: () => void;
}> = ({ memories, onDismiss }) => {
    if (memories.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-white/5 bg-gradient-to-r from-purple-500/5 to-transparent"
        >
            <div className="px-4 py-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-purple-300/70">
                        <Brain size={12} />
                        <span>Relevante Erinnerungen</span>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-white/30 hover:text-white/50 text-xs"
                    >
                        Ausblenden
                    </button>
                </div>
                <div className="space-y-1.5">
                    {memories.slice(0, 3).map((mem) => (
                        <div
                            key={mem.id}
                            className="text-xs text-white/60 bg-white/5 px-2 py-1.5 rounded border-l-2 border-purple-500/30"
                        >
                            {mem.summary}
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

// ─── Context-Aware Chat Suggestions ───
const ChatSuggestions: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
    const viewLevel = useMoraStore((s) => s.viewLevel);
    const departments = useMoraStore((s) => s.departments);
    const activeDepartmentId = useMoraStore((s) => s.activeDepartmentId);
    const orbState = useMoraStore((s) => s.orbState);

    const suggestions = React.useMemo(() => {
        const dept = departments.find(d => d.id === activeDepartmentId);

        if (viewLevel === 'folder' || viewLevel === 'space') {
            return [
                'Fasse diesen Bereich zusammen',
                'Was fehlt hier noch?',
                dept ? `Zurück zu ${dept.name}` : 'Übersicht zeigen',
            ];
        }
        if (viewLevel === 'department' && dept) {
            return [
                `Was gibt es Neues in ${dept.name}?`,
                'Welche Dokumente sind wichtig?',
                'Zeig mir alle Spaces',
            ];
        }
        if (orbState === 'alert') {
            return [
                'Was braucht Aufmerksamkeit?',
                'Zeig mir die Alerts',
                'Status Report',
            ];
        }
        // Default / Core level
        const firstDept = departments[0]?.name;
        return [
            firstDept ? `Zeig mir ${firstDept}` : 'Zeig mir die Abteilungen',
            'Was gibt es Neues?',
            'Hilf mir beim Organisieren',
        ];
    }, [viewLevel, departments, activeDepartmentId, orbState]);

    return (
        <div className="flex gap-2 mt-2 flex-wrap">
            {suggestions.map((suggestion) => (
                <button
                    key={suggestion}
                    onClick={() => onSelect(suggestion)}
                    className="text-xs px-3 py-1.5 bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-full text-emerald-100/60 hover:text-emerald-300 transition-all duration-200"
                >
                    {suggestion}
                </button>
            ))}
        </div>
    );
};

export function ChatPane({ id = 'chat-main' }: ChatPaneProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const { departments } = useMoraStore();
    const pane = getPane(id);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hallo! Ich bin Mora, deine KI-Begleiterin.

Ich kann dir helfen:
- **"Zeig mir Abteilung XY"** - Ich navigiere dorthin
- **"Was gibt es Neues?"** - Aktuelle Updates
- **"Finde Dokumente ueber..."** - Suche im Wissen
- **"Merke dir..."** - Ich speichere wichtige Infos

Was kann ich fuer dich tun?`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const initialMessageProcessed = useRef(false);

    // Memory Integration State
    const [memoryHint, setMemoryHint] = useState<{ show: boolean; content: string }>({ show: false, content: '' });
    const [relevantMemories, setRelevantMemories] = useState<MemorySearchResult[]>([]);
    const [showMemories, setShowMemories] = useState(false);

    // Search for relevant memories based on user query
    const fetchRelevantMemories = useCallback(async (query: string) => {
        if (query.length < 5) {
            setRelevantMemories([]);
            setShowMemories(false);
            return;
        }
        try {
            const results = await searchMemory(query, 3);
            if (results && results.length > 0) {
                setRelevantMemories(results);
                setShowMemories(true);
            } else {
                setRelevantMemories([]);
                setShowMemories(false);
            }
        } catch (err) {
            console.warn('[ChatPane] Memory search failed:', err);
            setRelevantMemories([]);
        }
    }, []);

    // Mark message as saved
    const markMessageAsSaved = useCallback((messageId: string) => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, savedAsInsight: true } : msg
        ));
    }, []);

    // Handle memory hint confirmation
    const handleMemoryConfirm = useCallback(async () => {
        if (!memoryHint.content) return;
        try {
            await learnInsight({
                insight: memoryHint.content,
                category: 'context',
                auto_commit: true
            });
        } catch (err) {
            console.error('[ChatPane] Failed to save memory:', err);
        }
        setMemoryHint({ show: false, content: '' });
    }, [memoryHint.content]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle initial message from Dock/Spotlight chat input
    useEffect(() => {
        if (pane?.data?.initialMessage && !initialMessageProcessed.current) {
            initialMessageProcessed.current = true;
            const initialMsg = pane.data.initialMessage;

            // Set input as visual feedback
            setInput(initialMsg); // Optional, maybe better to just show it in chat

            // Trigger processing immediately
            setTimeout(() => {
                const userMessage: Message = {
                    id: crypto.randomUUID(),
                    role: 'user',
                    content: initialMsg,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, userMessage]);
                setInput('');
                processMessage(userMessage.content);
            }, 300); // Slight delay for mount animation
        }
    }, [pane?.data?.initialMessage, pane?.id]); // Added pane.id to ensure it triggers on new pane creation

    // Parse command intents
    const parseIntent = (text: string): { type: 'navigate' | 'search' | 'global_search' | 'chat', target?: string } => {
        const lower = text.toLowerCase();

        // Global Documents Request
        if (lower.includes('alle dokumente') || lower.includes('alle dateien') || lower.includes('all documents') || lower.includes('everything')) {
            return { type: 'global_search' };
        }

        // Navigation commands
        if (lower.includes('zeig') || lower.includes('show') || lower.includes('geh zu') || lower.includes('go to')) {
            // Find department name
            for (const dept of departments) {
                if (lower.includes(dept.name.toLowerCase())) {
                    return { type: 'navigate', target: dept.id };
                }
            }
        }

        // Search commands
        if (lower.includes('find') || lower.includes('such') || lower.includes('search')) {
            // Priority regex for German/English search verbs
            const target = text.replace(/^(finde|find|suche|such|search|suche nach|search for|suche mir|find me)\s+/i, '')
                .replace(/\s+(dokumente|dokument|documents|document|dateien|datei|files|file)$/i, '')
                .trim();
            return { type: 'search', target };
        }

        return { type: 'chat' };
    };

    // Execute navigation
    const executeNavigation = (deptId: string) => {
        const dept = departments.find(d => d.id === deptId);
        if (dept) {
            // Dispatch event for cursor to move
            window.dispatchEvent(new CustomEvent('mora:navigate', {
                detail: { departmentId: deptId, departmentName: dept.name }
            }));

            return `✨ Ich navigiere zu **${dept.name}**! Schau auf die Planeten links.`;
        }
        return 'Department nicht gefunden.';
    };

    // Execute search
    const executeSearch = (query: string, global: boolean = false) => {
        openPane({
            id: 'finder-main',
            type: 'finder',
            title: global ? 'Saimôr Mycelium (Alle Daten)' : `Finder: ${query}`,
            size: { width: 900, height: 600 },
            data: { query, globalSearch: global }
        });
        return global
            ? `🌐 Ich öffne das gesamte **Saimôr Mycelium**. Hier findest du alle Dokumente des Unternehmens.`
            : `🔍 Ich öffne die Suche für **"${query}"**...`;
    };

    // Process message content (used by both sendMessage and initial message handler)
    const processMessage = async (content: string) => {
        setIsLoading(true);
        const intent = parseIntent(content);

        // Check for memory intent (e.g., "merke dir...", "wichtig...")
        if (detectMemoryIntent(content)) {
            const insightContent = extractInsightFromRequest(content);
            if (insightContent.length > 5) {
                setMemoryHint({ show: true, content: insightContent });
            }
        }

        // Fetch relevant memories for context
        await fetchRelevantMemories(content);

        let responseContent = '';

        try {
            if (intent.type === 'navigate' && intent.target) {
                responseContent = executeNavigation(intent.target);
            } else if (intent.type === 'global_search') {
                responseContent = executeSearch('', true);
            } else if (intent.type === 'search' && intent.target) {
                responseContent = executeSearch(intent.target);
            } else {
                // Call Mora Agent API with conversation history for memory
                try {
                    // Build history from previous messages (exclude welcome message)
                    const historyForApi = messages
                        .filter(m => m.id !== 'welcome')
                        .slice(-10) // Last 10 messages for context
                        .map(m => ({
                            role: m.role,
                            content: m.content
                        }));

                    const agentResponse = await moraAgentClient.chat({
                        message: content,
                        session_id: `chat_pane_${id}`,
                        history: historyForApi
                    });

                    if (agentResponse?.response) {
                        const { cleanContent, commands } = parseAIResponse(agentResponse.response);
                        responseContent = cleanContent;

                        if (commands.length > 0) {
                            console.log('[ChatPane] Executing cursor commands:', commands);
                            executeCursorCommands(commands);
                        }

                        if (agentResponse.tool_uses && agentResponse.tool_uses.length > 0) {
                            const toolsUsed = agentResponse.tool_uses.map(t => t.tool).join(', ');
                            responseContent += `\n\n<div class="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md w-fit border border-blue-500/20"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Used tools: ${toolsUsed}</div>`;
                        }
                    } else {
                        responseContent = "Ich habe keine Antwort vom Agenten erhalten.";
                    }
                } catch (apiError) {
                    responseContent = `Ich bin gerade offline, aber ich kann trotzdem helfen!

Versuche:
• **"Zeig mir Operations"** - Navigation
• **"Finde Projektplan"** - Suche`;
                }
            }
        } catch (error) {
            responseContent = "Es gab einen Fehler. Bitte versuche es erneut.";
        }

        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: responseContent,
            timestamp: new Date()
        }]);

        setIsLoading(false);
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        await processMessage(userMessage.content);
    };

    if (!pane) return null;

    return (
        <GlassPanel
            title="Chat mit Môra"
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            paneId={id}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-medium">Môra</h3>
                        <p className="text-xs text-emerald-400">Deine KI-Begleiterin</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs text-white/40">
                        <Wand2 size={12} />
                        <span>Disney Fairy Mode</span>
                    </div>
                </div>

                {/* Relevant Memories Context */}
                <AnimatePresence>
                    {showMemories && relevantMemories.length > 0 && (
                        <RelevantMemories
                            memories={relevantMemories}
                            onDismiss={() => setShowMemories(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-white'
                                    : 'bg-white/5 border border-white/10 text-white/90'
                                    }`}>
                                    <div className="flex items-start gap-2">
                                        {msg.role === 'assistant' && (
                                            <Bot size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                                        )}
                                        <div
                                            className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{
                                                __html: msg.content
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                    .replace(/\n/g, '<br/>')
                                            }}
                                        />
                                        {msg.role === 'user' && (
                                            <User size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center text-[10px] text-white/30 mt-2">
                                        <span>{msg.timestamp.toLocaleTimeString()}</span>
                                        {/* Save as Insight Button - only for assistant messages (not welcome) */}
                                        {msg.role === 'assistant' && msg.id !== 'welcome' && (
                                            <SaveInsightButton
                                                content={msg.content}
                                                onSaved={() => markMessageAsSaved(msg.id)}
                                                isSaved={msg.savedAsInsight || false}
                                            />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                <span className="text-sm text-white/60">Môra denkt nach...</span>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10 space-y-2">
                    {/* Memory Hint - shown when user types "merke dir..." etc. */}
                    <AnimatePresence>
                        {memoryHint.show && (
                            <MemoryHint
                                onConfirm={handleMemoryConfirm}
                                onDismiss={() => setMemoryHint({ show: false, content: '' })}
                            />
                        )}
                    </AnimatePresence>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Schreib Mora... (z.B. 'Merke dir...')"
                            className="flex-1 bg-black/40 border border-emerald-500/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 transition-all"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 rounded-xl text-black font-medium transition-colors flex items-center gap-2"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <ChatSuggestions onSelect={setInput} />
                </div>
            </div>
        </GlassPanel>
    );
}
