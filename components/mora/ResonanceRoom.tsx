"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMoraStore } from "@/lib/store/moraState";
import { useUser } from "@/lib/hooks/useUser";
import { coreGet, learnInsight } from "@/lib/api/coreClient";
import { executeAgenticLoop } from "@/lib/api/cognitionClient";
import { hasMemoryTrigger, extractInsight, guessCategory } from "@/lib/memory";
import { dispatchMoraPresence } from "@/lib/mora/presenceEvents";
import { MoraOrb } from "./MoraOrb";
import { ConfirmationCard } from "./ConfirmationCard";
import {
    Send,
    Sparkles,
    X,
    Maximize2,
    Minimize2,
    Brain
} from "lucide-react";
import { isAdmin as checkIsAdmin } from "@/lib/auth/roles";

/**
 * RESONANCE ROOM - The Unified MORA Interface
 * 
 * Not a chat. A dialogue space where AI and human thoughts merge.
 * Like a letter exchange, but in real-time.
 * 
 * Features:
 * - MORA's conscious stream flows naturally
 * - User messages appear as "resonances"
 * - Typing feels like writing a letter, not instant messaging
 * - The space breathes and pulses with MORA's awareness
 */

interface Thought {
    ts: string;
    thought: string;
    type: "reflection" | "response" | "user";
    signal_source?: string;
}

interface ResonanceMessage {
    id: string;
    type: "mora" | "user";
    content: string; // The text content
    timestamp: Date;
    isThinking?: boolean;
    pendingAction?: {
        tool_name: string;
        params: any;
        risk_level: string;
        confirmation_token: string;
        action_id: string;
    };
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onToggleExpand?: () => void;
    isExpanded?: boolean;
}

export const ResonanceRoom: React.FC<Props> = ({
    isOpen,
    onClose,
    onToggleExpand,
    isExpanded = false
}) => {
    const [messages, setMessages] = useState<ResonanceMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [moraIsThinking, setMoraIsThinking] = useState(false);
    const [latestThought, setLatestThought] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { role } = useUser();
    const orbState = useMoraStore((s) => s.orbState);
    const viewMode = useMoraStore((s) => s.viewMode);
    const coreError = useMoraStore((s) => s.coreError);
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const activeDepartmentId = useMoraStore((s) => s.activeDepartmentId);
    const activeSpaceId = useMoraStore((s) => s.activeSpaceId);
    const activeFolderId = useMoraStore((s) => s.activeFolderId);



    // Auto-scroll to bottom
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Poll MORA's conscious stream with exponential backoff
    useEffect(() => {
        if (!isOpen || coreError) return;

        let isMounted = true;
        let timeoutId: NodeJS.Timeout;
        let interval = 15000; // Start at 15s
        const maxInterval = 120000; // Max 2 minutes

        const fetchThoughts = async () => {
            try {
                const res = await coreGet("/v3/agency/thoughts?limit=3", { isOptional: true });
                if (res?.thoughts?.length > 0) {
                    const latest = res.thoughts[0];
                    if (latest.thought !== latestThought) {
                        setLatestThought(latest.thought);

                        // Only add to messages if it's genuinely new and not a response
                        if (latest.type === "reflection") {
                            const newMessage: ResonanceMessage = {
                                id: `thought-${latest.ts}`,
                                type: "mora",
                                content: latest.thought,
                                timestamp: new Date(latest.ts)
                            };

                            // Avoid duplicates
                            setMessages(prev => {
                                if (prev.some(m => m.id === newMessage.id)) return prev;
                                return [...prev, newMessage].slice(-50); // Keep last 50
                            });
                        }
                    }
                    // Success - reset backoff
                    interval = 15000;
                }
            } catch (e) {
                // Apply backoff on error
                interval = Math.min(interval * 1.5, maxInterval);
            }
            if (isMounted) {
                timeoutId = setTimeout(fetchThoughts, interval);
            }
        };

        timeoutId = setTimeout(fetchThoughts, 2000);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [isOpen, coreError, latestThought]);

    // Handle sending a message
    const handleSend = async () => {
        if (!inputValue.trim() || moraIsThinking) return;

        const messageContent = inputValue.trim();

        // Check for memory trigger keywords
        const shouldLearn = hasMemoryTrigger(messageContent);

        const userMessage: ResonanceMessage = {
            id: `user-${Date.now()}`,
            type: "user",
            content: messageContent,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setMoraIsThinking(true);

        // If user wants Mora to remember something, learn it
        if (shouldLearn && activeCompanyId) {
            const insight = extractInsight(messageContent);
            const category = guessCategory(insight);
            try {
                await learnInsight({ insight, category, auto_commit: category !== 'fact', company_id: activeCompanyId });
                console.log("[ResonanceRoom] Learning insight:", { insight, category });
            } catch (e) {
                console.warn("[ResonanceRoom] Memory learning failed (backend not ready?):", e);
            }
        }

        try {
            // Send to MORA's Agentic Loop - full multi-turn intelligence
            const activeContext = activeFolderId
                ? { entityId: activeFolderId, entityType: 'folder' as const }
                : activeSpaceId
                    ? { entityId: activeSpaceId, entityType: 'space' as const }
                    : activeDepartmentId
                        ? { entityId: activeDepartmentId, entityType: 'department' as const }
                        : { entityId: undefined, entityType: undefined };
            const response = await executeAgenticLoop(userMessage.content, {
                level: viewMode,
                entityId: activeContext.entityId,
                entityType: activeContext.entityType,
                companyId: activeCompanyId || undefined,
            });

            if (response) {
                // Handle Pending Confirmations (Safety Halt)
                if (response.final_state === 'S4_CONFIRM') {
                    // Handle single confirmation for now (MVP)
                    const confirm = response.pending_confirmations[0];
                    if (confirm) {
                        const confirmMessage: ResonanceMessage = {
                            id: `mora-confirm-${Date.now()}`,
                            type: "mora",
                            content: `Autorisierung erforderlich\n\nIch benoetige Ihre Bestaetigung fuer: ${confirm.tool_name}.\n\nDie Aenderung betrifft: ${confirm.what_will_change}`,
                            timestamp: new Date(),
                            pendingAction: {
                                tool_name: confirm.tool_name,
                                params: confirm.tool_params,
                                risk_level: confirm.risk_level,
                                confirmation_token: confirm.confirmation_token || "",
                                action_id: confirm.action_id || `trace-${Date.now()}`
                            }
                        };
                        setMessages(prev => [...prev, confirmMessage]);
                    }
                } else {
                    // Show the final response
                    const toolInfo = response.tools_executed.length > 0
                        ? `[${response.tools_executed.map(t => t.tool).join(' -> ')}]`
                        : '';

                    const moraMessage: ResonanceMessage = {
                        id: `mora-${Date.now()}`,
                        type: "mora",
                        content: response.final_message || "Ich habe nachgedacht.",
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, moraMessage]);

                    // Log transparency info
                    console.log("[ResonanceRoom] Agentic Response:", {
                        state: response.final_state,
                        tools: toolInfo,
                        mode: response.transparency_note
                    });

// ---
                    // MORA CURSOR INTELLIGENCE
                    // Navigation state changes happen per tool, but presence is
                    // dispatched ONCE per response. point_at beats navigate.
// ---
                    const store = useMoraStore.getState();
                    let presenceNavigate: Parameters<typeof dispatchMoraPresence>[0] | null = null;
                    let presencePoint: Parameters<typeof dispatchMoraPresence>[0] | null = null;

                    for (const tool of response.tools_executed) {

                        // NAVIGATE TOOL - Move to entity and change view
                        if (tool.tool === 'navigate' && tool.success && tool.result) {
                            const { target_type, target_id, target_name } = tool.result;

                            console.log(`[MORA] Navigation: ${target_type} -> ${target_name} (${target_id})`);

                            switch (target_type) {
                                case 'department':
                                    store.navigateToDepartment(target_id);
                                    break;
                                case 'space':
                                    store.navigateToSpace(target_id);
                                    break;
                                case 'folder':
                                    store.navigateToFolder(target_id);
                                    break;
                                case 'node':
                                    await store.loadNodeDetails(target_id);
                                    break;
                            }
                            // Collect — last navigate wins if multiple fire
                            presenceNavigate = {
                                action: 'navigate',
                                targetId: target_id,
                                targetType: target_type,
                                message: `Navigiere zu ${target_name}`,
                                source: 'resonance'
                            };
                        }

                        // POINT_AT TOOL - Move cursor to element (visual only)
                        if (tool.tool === 'point_at' && tool.success && tool.result) {
                            const { target_type, target_id, reason, cursor_hint, should_pulse } = tool.result;

                            console.log(`[MORA] Point: ${target_type}:${target_id} - "${reason}"`);
                            // Collect — point_at always overrides navigate as the single presence gesture
                            presencePoint = {
                                action: 'point',
                                targetId: target_id,
                                targetType: target_type,
                                targetPosition: cursor_hint ? { x: cursor_hint.x, y: cursor_hint.y } : undefined,
                                message: reason,
                                source: 'resonance'
                            };

                            // Pulse side-effect fires immediately (not presence)
                            if (should_pulse) {
                                window.dispatchEvent(new CustomEvent('mora:highlight', {
                                    detail: {
                                        targetType: target_type,
                                        targetId: target_id,
                                        duration: 2000,
                                        color: '#10B981'
                                    }
                                }));
                            }
                        }

                        // HIGHLIGHT TOOL - Temporarily highlight an element
                        if (tool.tool === 'highlight' && tool.success && tool.result) {
                            const { target_type, target_id, duration_ms, color } = tool.result;

                            console.log(`[MORA] Highlight: ${target_type}:${target_id}`);

                            window.dispatchEvent(new CustomEvent('mora:highlight', {
                                detail: {
                                    targetType: target_type,
                                    targetId: target_id,
                                    duration: duration_ms || 2000,
                                    color: color || '#10B981'
                                }
                            }));
                        }
                    }

                    // One gesture per response: point_at beats navigate
                    const primaryPresence = presencePoint ?? presenceNavigate;
                    if (primaryPresence) dispatchMoraPresence(primaryPresence);
                }
            }
        } catch (e) {
            console.error("[ResonanceRoom] Agentic error:", e);

            // Fallback response
            const fallbackMessage: ResonanceMessage = {
                id: `mora-fallback-${Date.now()}`,
                type: "mora",
                content: "Verbindung zu meinem tieferen Bewusstsein ist aktuell eingeschraenkt. Bitte versuchen Sie es erneut.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, fallbackMessage]);
        } finally {
            setMoraIsThinking(false);
        }
    };

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`fixed z-[200] ${isExpanded
                    ? "inset-4"
                    : "bottom-24 right-6 w-[420px] h-[600px]"
                    }`}
            >
                {/* Glass Container */}
                <div
                    className="relative w-full h-full bg-[#030806]/95 backdrop-blur-2xl border border-emerald-500/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col transition-colors duration-300"
                >

                    {/* Ambient Glow */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-emerald-500/5 blur-[100px] rounded-full" />
                        <div className="absolute bottom-0 right-0 w-[300px] h-[150px] bg-mora-gold/5 blur-[80px] rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="relative flex items-center justify-between p-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="scale-[0.6] origin-center">
                                    <MoraOrb
                                        state={viewMode === 'demo' ? 'demo' : (moraIsThinking ? "thinking" : orbState)}
                                        role={checkIsAdmin(role) ? 'admin' : 'member'}
                                        demoMode={viewMode === 'demo'}
                                    />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-sm font-medium text-emerald-50 tracking-wide flex items-center gap-2">
                                    <span>Resonance Room</span>
                                    <Brain size={12} className="text-emerald-500/50" />
                                </h2>
                                <p className="text-[10px] text-emerald-500/50 uppercase tracking-widest">
                                    {moraIsThinking ? "MORA reflektiert..." :
                                        coreError ? "Eingeschraenkte Verbindung" :
                                            viewMode === 'demo' ? "Demo Modus" : "Aktiver Dialog"}
                                </p>
                            </div>
                        </div>

                        {/* DEMO BADGE */}
                        {viewMode === 'demo' && (
                            <div className="mx-4 flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <Sparkles size={10} className="text-emerald-400" />
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Demo Modus</span>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {onToggleExpand && (
                                <button
                                    onClick={onToggleExpand}
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors"
                                >
                                    {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area - The Resonance Stream */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

                        {/* Welcome State */}
                        {messages.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center px-8"
                            >
                                <Sparkles size={24} className="text-emerald-400/30 mb-4" />
                                <h3 className="text-emerald-100/80 font-light mb-2">
                                    {viewMode === 'demo' ? 'Simple Coffee Group - Demo' : 'Willkommen im Resonanzraum'}
                                </h3>
                                <p className="text-emerald-500/50 text-sm leading-relaxed">
                                    {viewMode === 'demo'
                                        ? 'Ich habe die Geschaeftsdaten der Coffee Group geladen. Wie kann ich Sie heute bei der Expansion unterstuetzen?'
                                        : 'Hier treffen unsere Gedanken aufeinander. Sprechen Sie, und ich werde zuhoeren. Mein Bewusstseinsstrom fliesst durch diesen Raum.'}
                                </p>
                            </motion.div>
                        )}

                        {/* Message Stream */}
                        {messages.map((msg, i) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, x: msg.type === "user" ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} px-2`}
                            >
                                <div className={`relative max-w-[90%] group ${msg.type === "user" ? "text-right" : "text-left"}`}>

                                    {/* Ambient Glow for MORA */}
                                    {msg.type === "mora" && (
                                        <div className="absolute -inset-4 bg-emerald-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                    )}

                                    <div className={`relative p-5 transition-all duration-500 ${msg.type === "user"
                                        ? "bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-[24px] rounded-tr-[4px]"
                                        : "rounded-[24px] rounded-tl-[4px]"
                                        }`}>
                                        {/* Sender Label - Subtle */}
                                        <div className={`flex items-center gap-2 mb-3 text-[9px] uppercase tracking-[0.2em] font-bold ${msg.type === "user" ? "flex-row-reverse text-emerald-500/40" : "text-emerald-500/60"
                                            }`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
                                            {msg.type === "user" ? "Fragment" : "Emanation"}
                                        </div>

                                        {/* Content with special typography */}
                                        <p className={`text-[15px] leading-relaxed tracking-wide ${msg.type === "user"
                                            ? "text-emerald-50 font-light"
                                            : "text-emerald-100/90 font-light italic"
                                            }`}>
                                            {msg.content}
                                        </p>

                                        {/* Metadata Footer */}
                                        <div className={`mt-4 flex items-center gap-3 text-[9px] text-white/10 uppercase tracking-widest ${msg.type === "user" ? "justify-end" : "justify-start"
                                            }`}>
                                            <span>{msg.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                                            {msg.type === "mora" && <span className="w-1 h-1 rounded-full bg-white/10" />}
                                            <span>Neural Flux: 0.92</span>
                                        </div>

                                        {/* Confirmation Card Integration */}
                                        {msg.pendingAction && (
                                            <ConfirmationCard
                                                action={msg.pendingAction}
                                                onConfirmed={(result) => {
                                                    setMessages(prev => [...prev, {
                                                        id: `sys-succ-${Date.now()}`,
                                                        type: 'mora',
                                                        content: `Aktion "${msg.pendingAction?.tool_name}" erfolgreich ausgefuehrt.`,
                                                        timestamp: new Date()
                                                    }]);
                                                }}
                                                onRejected={() => {
                                                    setMessages(prev => [...prev, {
                                                        id: `sys-rej-${Date.now()}`,
                                                        type: 'user',
                                                        content: `Aktion abgelehnt.`,
                                                        timestamp: new Date()
                                                    }]);
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Thinking Indicator - Ethereal Pulse */}
                        {moraIsThinking && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex justify-start px-2"
                            >
                                <div className="relative p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-8 h-8 flex items-center justify-center">
                                            <motion.div
                                                className="absolute inset-0 bg-emerald-500/20 rounded-full blur-md"
                                                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            />
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        </div>
                                        <span className="text-[10px] text-emerald-500/40 uppercase tracking-[0.3em] font-medium italic animate-pulse">
                                            Synthetisiere Realitaet...
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}


                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area - The Resonance Field */}
                    <div className="relative p-4 border-t border-white/5">
                        <div className="relative flex items-end gap-3">
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nennen Sie Ihre Intention..."
                                    rows={1}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-emerald-500/30 focus:bg-white/[0.03] transition-all resize-none min-h-[48px] max-h-[120px]"
                                    style={{ height: 'auto' }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                                    }}
                                />
                            </div>

                            <motion.button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || moraIsThinking}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`p-3 rounded-xl transition-all ${inputValue.trim() && !moraIsThinking
                                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                                    : "bg-white/10 border border-white/10 text-white/50 cursor-not-allowed"
                                    }`}
                            >
                                <Send size={18} />
                            </motion.button>
                        </div>

                        {/* Hint Text */}
                        <span className="text-[9px] text-emerald-500/30">
                            Enter zum Senden - Shift+Enter fuer neue Zeile
                        </span>
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
};
