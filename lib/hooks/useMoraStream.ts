"use client";

import { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useMoraStore } from "@/lib/store/moraState";
import type { OrbState } from "@/lib/api/awarenessClient";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface StreamOptions {
    /** Mindloop / UI context forwarded to backend (space_id, folder_id, …) */
    context?: Record<string, unknown>;
    /** Conversation history (last N turns, excluding the current message) */
    history?: ChatMessage[];
    /** Optional temperature override (0–1) */
    temperature?: number;
    /** Optional max tokens override */
    maxTokens?: number;
}

export interface ResolvedScope {
    company_id?: string;
    department_id?: string;
    space_id?: string;
    folder_id?: string;
    [key: string]: string | undefined;
}

export interface UseMoraStreamReturn {
    /** Whether a stream is in progress */
    isStreaming: boolean;
    /** The currently accumulating AI reply */
    streamingText: string;
    /** Error message if the last stream failed */
    error: string | null;
    /** Full conversation history (user + assistant turns) */
    messages: ChatMessage[];
    /**
     * Send a message and stream the response token-by-token.
     * Returns the full assistant reply once the stream completes.
     */
    sendMessage: (message: string, opts?: StreamOptions) => Promise<string>;
    /** Clear conversation history */
    clearHistory: () => void;
    /** Last resolved scope from v3/chat SSE preamble (null if not yet received) */
    lastResolvedScope: ResolvedScope | null;
    /** Whether backend enforced scope narrowing on last request */
    scopeEnforced: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useMoraStream
 *
 * Connects to the SAIMÔR backend `POST /v1/chat/stream` SSE endpoint and
 * streams AI tokens in real-time.  Each token is appended to `streamingText`
 * so the UI can re-render word-by-word, giving a ChatGPT-style typing effect.
 *
 * Supports full conversation history, Mindloop context injection, and
 * automatic fallback to the regular `/v1/chat` endpoint if streaming fails.
 *
 * @example
 * ```tsx
 * const { sendMessage, streamingText, isStreaming } = useMoraStream();
 *
 * const handleSend = async () => {
 *   await sendMessage("Zeig mir die Risiken in Finance");
 * };
 * ```
 */
export function useMoraStream(): UseMoraStreamReturn {
    const { data: session } = useSession();
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingText, setStreamingText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [lastResolvedScope, setLastResolvedScope] = useState<ResolvedScope | null>(null);
    const [scopeEnforced, setScopeEnforced] = useState(false);

    // Abort controller so callers can cancel in-flight requests
    const abortRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(
        async (message: string, opts: StreamOptions = {}): Promise<string> => {
            // Abort any existing stream
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setIsStreaming(true);
            setStreamingText("");
            setError(null);

            // Add user message to history
            const userMsg: ChatMessage = { role: "user", content: message };
            setMessages((prev) => [...prev, userMsg]);

            // Build the history to forward (all previous turns, not the current one)
            const historyForRequest = opts.history ?? messages;

            const body = JSON.stringify({
                message,
                context: opts.context ?? null,
                history: historyForRequest.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
                include_synthesis: true,
                temperature: opts.temperature ?? 0.7,
                max_tokens: opts.maxTokens ?? null,
            });

            // Resolve the backend URL (env var or relative)
            const baseUrl =
                process.env.NEXT_PUBLIC_CORE_API_URL ||
                process.env.NEXT_PUBLIC_API_URL ||
                "";
            const token = (session as any)?.accessToken ?? (session as any)?.token ?? "";

            let fullText = "";

            // Reset scope state at start of each request
            setScopeEnforced(false);

            // ── Stream helper: attempt an SSE stream against the given URL ─────────
            const attemptStream = async (url: string): Promise<string> => {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body,
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`Stream request failed (${url}): ${response.status}`);
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error("ReadableStream not supported");

                const decoder = new TextDecoder();
                let buf = "";
                let accumulated = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buf += decoder.decode(value, { stream: true });
                    const parts = buf.split("\n\n");
                    buf = parts.pop() ?? "";

                    for (const part of parts) {
                        const line = part.replace(/^data:\s?/, "").trim();
                        if (!line || line === "[DONE]") continue;
                        if (line === "[ERROR]") { setError("Stream error from server"); break; }

                        try {
                            const json = JSON.parse(line) as {
                                token?: string;
                                error?: string;
                                orbState?: OrbState;
                                // v3/chat SSE preamble fields (Codex 3f975e8)
                                resolvedScope?: ResolvedScope;
                                scopePolicy?: string;
                                scope_enforced?: boolean;
                            };
                            if (json.error) { setError(json.error); break; }
                            if (json.orbState) {
                                useMoraStore.getState().setOrbState(json.orbState);
                                continue;
                            }
                            // v3 preamble: scope signal
                            if (json.resolvedScope || json.scopePolicy !== undefined || json.scope_enforced !== undefined) {
                                const scopeData = {
                                    resolved_scope: (json.resolvedScope ?? {}) as Record<string, string | undefined>,
                                    scope_policy: json.scopePolicy ?? 'passthrough',
                                    scope_enforced: json.scope_enforced ?? false,
                                };
                                useMoraStore.getState().setLastChatScope(scopeData);
                                setLastResolvedScope(json.resolvedScope ?? null);
                                setScopeEnforced(json.scope_enforced ?? false);
                                continue;
                            }
                            if (json.token) {
                                accumulated += json.token;
                                setStreamingText((prev) => prev + json.token!);
                            }
                        } catch {
                            // Ignore non-JSON lines
                        }
                    }
                }
                return accumulated;
            };

            try {
                // Primary: v3/chat/stream (Codex 3f975e8 — scope enforcement + resolved_scope)
                // Fallback 1: v1/chat/stream (previous stable)
                let streamUrl = `${baseUrl}/v3/chat/stream`;
                try {
                    fullText = await attemptStream(streamUrl);
                } catch (v3Err) {
                    // v3 failed — try v1 stream
                    streamUrl = `${baseUrl}/v1/chat/stream`;
                    fullText = await attemptStream(streamUrl);
                }

                if (false as boolean) { // unreachable — kept for TypeScript flow
                    throw new Error("unreachable");
                }

            } catch (err: unknown) {
                if ((err as Error).name === "AbortError") {
                    // User cancelled — don't update error state
                    return fullText;
                }
                const msg = err instanceof Error ? err.message : "Streaming failed";
                setError(msg);

                // Final fallback: one-shot non-streaming request to /v1/chat
                try {
                    const fallback = await fetch(`${baseUrl}/v1/chat`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body,
                    });
                    if (fallback.ok) {
                        const data = await fallback.json();
                        fullText = data.reply ?? "";
                        setStreamingText(fullText);
                        setError(null);
                    }
                } catch {
                    // All fallbacks failed — keep original error visible
                }
            } finally {
                setIsStreaming(false);
            }

            // Append assistant reply to history
            if (fullText) {
                const assistantMsg: ChatMessage = {
                    role: "assistant",
                    content: fullText,
                };
                setMessages((prev) => [...prev, assistantMsg]);
            }

            return fullText;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [session, messages]
    );

    const clearHistory = useCallback(() => {
        setMessages([]);
        setStreamingText("");
        setError(null);
    }, []);

    return {
        isStreaming,
        streamingText,
        error,
        messages,
        sendMessage,
        clearHistory,
        lastResolvedScope,
        scopeEnforced,
    };
}

export default useMoraStream;
