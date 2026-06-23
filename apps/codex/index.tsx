'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, Terminal, Timer, Trash2 } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { renderMarkdown } from '@/lib/chat/format';
import { usePaneStore } from '@/lib/store/paneStore';
import { buildChatContext } from '@/lib/api/moraAgentClient';
import { useMoraStream, type ChatMessage } from '@/lib/hooks/useMoraStream';
import type { AppProps } from '@/lib/apps/types';

const SESSION_KEY = 'saimor.codex.messages';

function loadPersistedMessages(): ChatMessage[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.sessionStorage.getItem(SESSION_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((m) => m?.role && m?.content) : [];
    } catch {
        return [];
    }
}

function persistMessages(messages: ChatMessage[]) {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
        /* non-fatal */
    }
}

export default function CodexApp({ paneId, initialData }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore((s) => s.activePaneId === paneId);

    const [input, setInput] = useState('');
    const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const initialMessage = (initialData?.initialMessage as string | undefined)?.trim();
    const initialProcessed = useRef(false);

    const {
        isStreaming,
        streamingText,
        error,
        messages,
        sendMessage,
        clearHistory,
    } = useMoraStream();

    useEffect(() => {
        const persisted = loadPersistedMessages();
        if (persisted.length > 0) {
            setLocalMessages(persisted);
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        persistMessages(localMessages);
    }, [localMessages, hydrated]);

    const transcript = useMemo(() => {
        const merged = [...localMessages];
        for (const message of messages) {
            const last = merged[merged.length - 1];
            if (last?.role === message.role && last.content === message.content) continue;
            merged.push(message);
        }
        return merged;
    }, [localMessages, messages]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [transcript, streamingText, isStreaming]);

    const runPrompt = useCallback(async (prompt: string) => {
        const trimmed = prompt.trim();
        if (!trimmed || isStreaming) return;

        const userMessage: ChatMessage = { role: 'user', content: trimmed };
        const nextHistory = [...transcript, userMessage];
        setLocalMessages(nextHistory);
        setInput('');

        const reply = await sendMessage(trimmed, {
            history: nextHistory.slice(0, -1),
            context: {
                ...buildChatContext(),
                agent: 'codex',
                persona: 'engineering',
                pane_id: paneId,
            },
            temperature: 0.35,
        });

        if (reply.trim()) {
            setLocalMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        }
    }, [isStreaming, paneId, sendMessage, transcript]);

    useEffect(() => {
        if (!hydrated || !initialMessage || initialProcessed.current) return;
        initialProcessed.current = true;
        void runPrompt(initialMessage);
    }, [hydrated, initialMessage, runPrompt]);

    const handleClear = useCallback(() => {
        clearHistory();
        setLocalMessages([]);
        if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(SESSION_KEY);
        }
    }, [clearHistory]);

    const openTerminal = useCallback(() => {
        openPane({
            id: 'terminal-main',
            type: 'terminal',
            title: 'Terminal',
            size: { width: 820, height: 520 },
        });
    }, [openPane]);

    const openWorkSession = useCallback(() => {
        openPane({
            id: 'work-session-main',
            type: 'work-session',
            title: 'Arbeitssitzung',
            size: { width: 900, height: 640 },
        });
    }, [openPane]);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Codex"
            paneId={paneId}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            onClose={() => removePane(paneId)}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex h-full min-h-0 flex-col" data-testid="codex-app">
                <header className="mb-3 flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-indigo-200/55">
                            <Bot size={14} className="text-indigo-200/70" />
                            Engineering Agent
                        </div>
                        <p className="mt-1 text-sm text-white/72">
                            Code, Refactors und Systemarbeit — Session bleibt in diesem Tab erhalten.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={openTerminal}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/62 transition-colors hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-white/85"
                        >
                            <Terminal size={12} />
                            Terminal
                        </button>
                        <button
                            type="button"
                            onClick={openWorkSession}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/62 transition-colors hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-white/85"
                        >
                            <Timer size={12} />
                            Sitzung
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/45 transition-colors hover:border-rose-300/20 hover:bg-rose-500/[0.08] hover:text-rose-100/80"
                            aria-label="Codex-Verlauf leeren"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </header>

                <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {transcript.length === 0 && !isStreaming && (
                        <div className="rounded-2xl border border-indigo-300/12 bg-indigo-500/[0.06] px-4 py-5 text-sm leading-relaxed text-white/58">
                            Beschreibe die Aufgabe — Bugfix, Refactor, Deploy-Hilfe oder Architektur. Codex antwortet fokussiert
                            auf Engineering und kann Terminal oder Arbeitssitzung als nächsten Schritt vorschlagen.
                        </div>
                    )}

                    {transcript.map((message, index) => (
                        <div
                            key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
                            className={`rounded-2xl border px-4 py-3 ${
                                message.role === 'user'
                                    ? 'border-indigo-300/16 bg-indigo-500/[0.08] text-white/82'
                                    : 'border-white/[0.08] bg-white/[0.03] text-white/72'
                            }`}
                        >
                            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/32">
                                {message.role === 'user' ? 'Du' : 'Codex'}
                            </div>
                            {message.role === 'assistant' ? (
                                <div
                                    className="prose prose-invert max-w-none text-sm leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                                />
                            ) : (
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                            )}
                        </div>
                    ))}

                    {isStreaming && (
                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white/72">
                            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/32">
                                <Loader2 size={12} className="animate-spin" />
                                Codex
                            </div>
                            {streamingText ? (
                                <div
                                    className="prose prose-invert max-w-none text-sm leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }}
                                />
                            ) : (
                                <p className="text-sm text-white/45">Denkt nach…</p>
                            )}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-100/80">
                        {error}
                    </div>
                )}

                <form
                    className="mt-3 flex items-end gap-2 border-t border-white/[0.06] pt-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void runPrompt(input);
                    }}
                >
                    <textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                void runPrompt(input);
                            }
                        }}
                        rows={2}
                        placeholder="Codex eine Engineering-Aufgabe stellen…"
                        className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white/82 outline-none transition-colors placeholder:text-white/28 focus:border-indigo-300/30"
                        aria-label="Codex Eingabe"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isStreaming}
                        className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-indigo-300/20 bg-indigo-500/15 text-indigo-100 transition-colors hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Nachricht senden"
                    >
                        {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </GlassPanel>
    );
}
