"use client";

import { parseFrame } from "@/lib/types/moraFrame";
import { useState, useCallback, useRef, useEffect } from "react";
import { getCoreBaseUrl } from "@/lib/api/coreClient";
import type { LastChatScopeState, ScopeContract, UiScopeHints } from "@/lib/types/mora";
import { useOrbStore } from "@/lib/store/orbStore";
import { useChatStore } from "@/lib/store/chatStore";
import type { OrbState } from "@/lib/api/awarenessClient";
import { useRuntimeSession } from "@/lib/auth/runtimeSession";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface StreamOptions {
    context?: Record<string, unknown>;
    history?: ChatMessage[];
    temperature?: number;
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
    isStreaming: boolean;
    streamingText: string;
    error: string | null;
    /** Latest request error, available immediately after awaiting sendMessage. */
    getError: () => string | null;
    messages: ChatMessage[];
    sendMessage: (message: string, opts?: StreamOptions) => Promise<string>;
    clearHistory: () => void;
    lastResolvedScope: ResolvedScope | null;
    scopeEnforced: boolean;
}

const AUTH_COOKIE = "mora_auth_token";
const SESSION_COOKIE = "mora_session";

type ScopePolicyPayload = {
    policy?: string;
    enforced?: boolean;
};

type StreamFrame = {
    token?: string;
    error?: string;
    orbState?: OrbState;
    resolvedScope?: ResolvedScope;
    resolved_scope?: ResolvedScope;
    scopePolicy?: string | ScopePolicyPayload;
    scope_policy?: string | ScopePolicyPayload;
    scope_enforced?: boolean;
    scopeEnforced?: boolean;
    scopeContract?: ScopeContract;
    scope_contract?: ScopeContract;
    uiScopeHints?: UiScopeHints;
    ui_scope_hints?: UiScopeHints;
    // Answer provenance — MR18/MR19: live in backend /v3/chat/stream preamble
    answerSource?: string;
    answer_source?: string;
    answerSourceMode?: string;
    answer_source_mode?: string;
    answerScopeLabel?: string;
    answer_scope_label?: string;
};

function readCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const value = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`));
    if (!value) return null;
    const [, raw] = value.split("=");
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

function isLocalhost(): boolean {
    if (typeof window === "undefined") return false;
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function resolveToken(session: any): string {
    const sessionToken =
        session?.accessToken ??
        session?.token ??
        session?.user?.accessToken ??
        session?.user?.token ??
        "";
    if (sessionToken) return sessionToken;

    const cookieToken = readCookie(AUTH_COOKIE) || readCookie("saimor_auth");
    if (cookieToken) return cookieToken;

    if (typeof window !== "undefined" && isLocalhost()) {
        const devToken = localStorage.getItem("saimor_dev_token");
        if (devToken) return devToken;
    }

    return "";
}

function hasCoreSession(): boolean {
    return !!readCookie(SESSION_COOKIE);
}

function parseScopePolicy(scopePolicy: string | ScopePolicyPayload | undefined): { policy: string; enforcedFromPolicy?: boolean } {
    if (typeof scopePolicy === "string") {
        return { policy: scopePolicy };
    }
    if (scopePolicy && typeof scopePolicy === "object") {
        return {
            policy: scopePolicy.policy ?? "passthrough",
            enforcedFromPolicy: typeof scopePolicy.enforced === "boolean" ? scopePolicy.enforced : undefined,
        };
    }
    return { policy: "passthrough" };
}

function extractScopeUpdate(frame: StreamFrame): LastChatScopeState | null {
    const resolvedScope = frame.resolvedScope ?? frame.resolved_scope;
    const scopePolicyRaw = frame.scopePolicy ?? frame.scope_policy;
    const scopeContract = frame.scopeContract ?? frame.scope_contract;
    const uiScopeHints = frame.uiScopeHints ?? frame.ui_scope_hints ?? scopeContract?.ui_scope_hints;

    const hasScopePayload =
        !!resolvedScope ||
        scopePolicyRaw !== undefined ||
        frame.scope_enforced !== undefined ||
        frame.scopeEnforced !== undefined ||
        !!scopeContract ||
        !!uiScopeHints;
    if (!hasScopePayload) return null;

    const { policy, enforcedFromPolicy } = parseScopePolicy(scopePolicyRaw);
    const enforced =
        frame.scope_enforced ??
        frame.scopeEnforced ??
        scopeContract?.enforced ??
        enforcedFromPolicy ??
        false;

    return {
        resolved_scope: (resolvedScope ?? {}) as Record<string, string | undefined>,
        scope_policy: policy,
        scope_enforced: enforced,
        scope_contract: scopeContract,
        ui_scope_hints: uiScopeHints,
    };
}

export function useMoraStream(): UseMoraStreamReturn {
    const { data: session } = useRuntimeSession();
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingText, setStreamingText] = useState("");
    const [error, setErrorState] = useState<string | null>(null);
    const errorRef = useRef<string | null>(null);
    const setError = useCallback((next: string | null) => {
        errorRef.current = next;
        setErrorState(next);
    }, []);
    const getError = useCallback(() => errorRef.current, []);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [lastResolvedScope, setLastResolvedScope] = useState<ResolvedScope | null>(null);
    const [scopeEnforced, setScopeEnforced] = useState(false);

    const abortRef = useRef<AbortController | null>(null);
    useEffect(() => () => abortRef.current?.abort(), []);

    const sendMessage = useCallback(
        async (message: string, opts: StreamOptions = {}): Promise<string> => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setIsStreaming(true);
            setStreamingText("");
            setError(null);

            const token = resolveToken(session as any);
            const hasSession = hasCoreSession();
            if (!token && !hasSession) {
                setIsStreaming(false);
                setError("Nicht angemeldet. Bitte neu einloggen.");
                return "";
            }

            const userMsg: ChatMessage = { role: "user", content: message };
            setMessages((prev) => [...prev, userMsg]);

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

            const baseUrl = getCoreBaseUrl();
            let fullText = "";
            setScopeEnforced(false);

            const attemptStream = async (url: string): Promise<string> => {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: "include",
                    body,
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const requestError = new Error(`Stream request failed (${url}): ${response.status}`) as Error & { status?: number };
                    requestError.status = response.status;
                    throw requestError;
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error("ReadableStream not supported");

                const decoder = new TextDecoder();
                let buffer = "";
                let accumulated = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (controller.signal.aborted) return accumulated;
                    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
                    if (done && buffer.trim()) buffer += "\n\n";
                    const chunks = buffer.split(/\r?\n\r?\n/);
                    buffer = chunks.pop() ?? "";

                    for (const chunk of chunks) {
                        const line = chunk.split(/\r?\n/).filter(l => l.startsWith("data:")).map(l => l.replace(/^data:\s?/, "")).join("\n").trim();
                        if (!line) continue;
                        if (line === "[DONE]") { await reader.cancel(); return accumulated; }
                        if (line === "[ERROR]") {
                            setError("Stream error from server");
                            await reader.cancel();
                            return accumulated;
                        }

                        try {
                            const json = JSON.parse(line) as StreamFrame;

                            if (json.error) {
                                setError(json.error);
                                await reader.cancel();
                                return accumulated;
                            }

                            if (json.orbState) {
                                useOrbStore.getState().setOrbState(json.orbState);
                                continue;
                            }

                            const scopeUpdate = extractScopeUpdate(json);
                            if (scopeUpdate) {
                                useChatStore.getState().setLastChatScope(scopeUpdate);
                                setLastResolvedScope(
                                    Object.keys(scopeUpdate.resolved_scope).length > 0
                                        ? (scopeUpdate.resolved_scope as ResolvedScope)
                                        : null
                                );
                                setScopeEnforced(scopeUpdate.scope_enforced);
                            }

                            // MR18/MR19: Extract answer provenance from same preamble frame.
                            const rawSource = json.answerSource ?? json.answer_source;
                            const rawMode = json.answerSourceMode ?? json.answer_source_mode ?? null;
                            const rawLabel = json.answerScopeLabel ?? json.answer_scope_label;
                            if (rawSource !== undefined || rawLabel !== undefined || rawMode !== null) {
                                const VALID_SOURCES = new Set(['memory', 'context', 'inference']);
                                const validSource = VALID_SOURCES.has(rawSource ?? '')
                                    ? (rawSource as 'memory' | 'context' | 'inference')
                                    : null;
                                useOrbStore.getState().setAnswerProvenance(
                                    validSource,
                                    rawMode,
                                    rawLabel ?? null,
                                );
                            }

                            const typed = parseFrame(json);
                            const delta = typed?.kind === "thought" ? typed.text : typeof json.token === "string" ? json.token : "";
                            if (delta) {
                                accumulated += delta;
                                setStreamingText(accumulated);
                            }
                        } catch {
                            // Ignore malformed/non-JSON chunks
                        }
                    }
                    if (done) break;
                }

                return accumulated;
            };

            try {
                const v3StreamUrl = `${baseUrl}/v3/chat/stream`;
                fullText = await attemptStream(v3StreamUrl);
            } catch (err: unknown) {
                if ((err as Error).name === "AbortError") {
                    return fullText;
                }

                const status = (err as Error & { status?: number }).status;
                if (status === 401 || status === 403) {
                    setError("Nicht authorisiert. Bitte neu anmelden.");
                    setIsStreaming(false);
                    return fullText;
                }

                const msg = err instanceof Error ? err.message : "Streaming failed";
                setError(msg);
            } finally {
                if (abortRef.current === controller) setIsStreaming(false);
            }

            if (fullText) {
                const assistantMsg: ChatMessage = {
                    role: "assistant",
                    content: fullText,
                };
                setMessages((prev) => [...prev, assistantMsg]);
            } else if (!controller.signal.aborted && !errorRef.current) {
                setError('MÔRA hat keine Antwort geliefert.');
            }

            return fullText;
        },
        [session, messages, setError]
    );

    const clearHistory = useCallback(() => {
        setMessages([]);
        setStreamingText("");
        setError(null);
    }, [setError]);

    return {
        isStreaming,
        streamingText,
        error,
        getError,
        messages,
        sendMessage,
        clearHistory,
        lastResolvedScope,
        scopeEnforced,
    };
}

export default useMoraStream;
