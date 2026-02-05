'use client';

/**
 * ChatPane - Mora AI Conversation Interface
 * 
 * MASTERBIBEL: Môra is your Disney fairy AI companion.
 * This pane allows direct conversation with Môra (via Ollama/Gemini/etc).
 * 
 * Commands like "show me department XY" trigger cursor navigation.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { corePost } from '@/lib/api/coreClient';
import { moraAgentClient } from '@/lib/api/moraAgentClient';
import { parseAIResponse, executeCursorCommands } from '@/lib/ai/cursorBridge';
import { Send, Sparkles, Loader2, Bot, User, Wand2 } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
}

interface ChatPaneProps {
    id?: string;
}

export function ChatPane({ id = 'chat-main' }: ChatPaneProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const { departments } = useMoraStore();
    const pane = getPane(id);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hallo! Ich bin Môra, deine KI-Begleiterin. 🧚‍♀️

Ich kann dir helfen:
• **"Zeig mir Abteilung XY"** - Ich navigiere dorthin
• **"Was gibt es Neues?"** - Aktuelle Updates
• **"Finde Dokumente über..."** - Suche im Wissen

Was kann ich für dich tun?`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const initialMessageProcessed = useRef(false);

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

        let responseContent = '';

        try {
            if (intent.type === 'navigate' && intent.target) {
                responseContent = executeNavigation(intent.target);
            } else if (intent.type === 'global_search') {
                responseContent = executeSearch('', true);
            } else if (intent.type === 'search' && intent.target) {
                responseContent = executeSearch(intent.target);
            } else {
                // Call Mora Agent API
                try {
                    const agentResponse = await moraAgentClient.chat({
                        message: content,
                        session_id: 'chat_pane'
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
                                    <div className="text-[10px] text-white/30 mt-2">
                                        {msg.timestamp.toLocaleTimeString()}
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
                <div className="p-4 border-t border-white/10">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Schreib Môra..."
                            className="flex-1 bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 transition-all"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 rounded-xl text-black font-medium transition-colors flex items-center gap-2"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <div className="flex gap-2 mt-2">
                        {['Zeig mir Operations', 'Was gibt es Neues?', 'Finde Projektplan'].map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => setInput(suggestion)}
                                className="text-xs px-3 py-1.5 bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-full text-emerald-100/60 hover:text-emerald-300 transition-all"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </GlassPanel>
    );
}
