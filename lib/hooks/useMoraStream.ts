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

            try {
                const response = await fetch(`${baseUrl}/v1/chat/stream`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body,
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`Stream request failed: ${response.status}`);
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error("ReadableStream not supported");

                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // SSE messages are separated by double newlines
                    const parts = buffer.split("\n\n");
                    buffer = parts.pop() ?? ""; // keep incomplete tail

                    for (const part of parts) {
                        const line = part.replace(/^data:\s?/, "").trim();
                        if (!line || line === "[DONE]") continue;
                        if (line === "[ERROR]") {
                            setError("Stream error from server");
                            break;
                        }

                        try {
                            const json = JSON.parse(line) as {
                                token?: string;
                                error?: string;
                                orbState?: OrbState;
                            };
                            if (json.error) {
                                setError(json.error);
                                break;
                            }
                            // SSE preamble: backend sends orbState before first token
                            // e.g. {"orbState": "curious"} — wire it to the Mora Orb
                            if (json.orbState) {
                                useMoraStore.getState().setOrbState(json.orbState);
                                continue;
                            }
                            if (json.token) {
                                fullText += json.token;
                                setStreamingText((prev) => prev + json.token!);
                            }
                        } catch {
                            // Ignore non-JSON lines (e.g. keep-alive pings)
                        }
                    }
                }
            } catch (err: unknown) {
                if ((err as Error).name === "AbortError") {
                    // User cancelled — don't update error state
                    return fullText;
                }
                const msg = err instanceof Error ? err.message : "Streaming failed";
                setError(msg);

                // Graceful fallback: one-shot request to /v1/chat
                try {
                    const baseUrl =
                        process.env.NEXT_PUBLIC_CORE_API_URL ||
                        process.env.NEXT_PUBLIC_API_URL ||
                        "";
                    const token = (session as any)?.accessToken ?? (session as any)?.token ?? "";
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
                    // Fallback also failed — keep original error visible
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
    };
}

export default useMoraStream;
