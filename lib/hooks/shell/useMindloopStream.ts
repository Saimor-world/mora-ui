/**
 * useMindloopStream - Global Mind Loop SSE wiring
 *
 * Subscribes to `/v3/mindloop/stream` and maps intelligence events
 * to visible Orb states so Mora feels alive outside the chat stream.
 */

import { useEffect } from "react";
import { getCoreBaseUrl } from "@/lib/api/coreClient";
import { useOrbStore } from "@/lib/store/orbStore";
import type { OrbState } from "@/lib/api/awarenessClient";

type StreamEvent = {
    id?: string;
    event_type?: string;
    payload?: Record<string, unknown>;
};

const AUTH_COOKIE = "mora_auth_token";
const SESSION_COOKIE = "mora_session";

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

function resolveToken(): string | null {
    const cookieToken = readCookie(AUTH_COOKIE);
    if (cookieToken) return cookieToken;
    if (typeof window !== "undefined" && isLocalhost()) {
        const devToken = localStorage.getItem("saimor_dev_token");
        if (devToken) return devToken;
    }
    return (
        process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT ||
        process.env.NEXT_PUBLIC_API_TOKEN ||
        null
    );
}

function hasCoreSession(): boolean {
    return !!readCookie(SESSION_COOKIE);
}

function normalizeAwarenessState(raw: unknown): OrbState | null {
    if (typeof raw !== "string") return null;
    const value = raw.toLowerCase().trim();
    if (value === "warning") return "alert";
    if (value === "active") return "focus";
    if (value === "watching") return "watching";
    if (value === "idle" || value === "watch" || value === "focus" || value === "thinking" || value === "alert" || value === "insight" || value === "demo" || value === "curious" || value === "learning") {
        return value as OrbState;
    }
    return null;
}

function mapEventToOrbState(event: StreamEvent): { state: OrbState; ttlMs: number } | null {
    const eventType = (event.event_type || "").toLowerCase();
    const payload = event.payload || {};

    if (eventType === "potential_risk") {
        return { state: "alert", ttlMs: 9000 };
    }
    if (eventType === "context_shift") {
        return { state: "watch", ttlMs: 3500 };
    }
    if (eventType === "related_objects_cluster") {
        return { state: "curious", ttlMs: 4000 };
    }
    if (eventType === "semantic") {
        return { state: "insight", ttlMs: 4500 };
    }
    if (eventType === "awareness") {
        const awareness =
            normalizeAwarenessState(payload.state) ||
            normalizeAwarenessState(payload.awareness_state) ||
            normalizeAwarenessState(payload.awarenessTrigger);
        if (awareness) {
            return { state: awareness, ttlMs: awareness === "alert" ? 8000 : 3000 };
        }
    }
    if (eventType === "system") {
        const severity = Number(payload.severity || 0);
        if (severity >= 0.8) {
            return { state: "alert", ttlMs: 8000 };
        }
    }
    return null;
}

export function useMindloopStream(enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;

        const token = resolveToken();
        const hasSession = hasCoreSession();
        if (!token && !hasSession) return;

        const controller = new AbortController();
        const decoder = new TextDecoder();
        let idleTimer: NodeJS.Timeout | null = null;

        const applyState = (state: OrbState, ttlMs: number) => {
            const store = useOrbStore.getState();
            store.setOrbState(state);

            if (idleTimer) {
                clearTimeout(idleTimer);
                idleTimer = null;
            }
            idleTimer = setTimeout(() => {
                const current = useOrbStore.getState().orbState;
                if (current === state && state !== "demo") {
                    useOrbStore.getState().setOrbState("idle");
                }
            }, ttlMs);
        };

        const connect = async () => {
            try {
                const response = await fetch(`${getCoreBaseUrl()}/v3/mindloop/stream`, {
                    method: "GET",
                    headers: token ? {
                        Authorization: `Bearer ${token}`,
                    } : undefined,
                    credentials: "include",
                    signal: controller.signal,
                });
                if (!response.ok || !response.body) return;

                const reader = response.body.getReader();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const chunks = buffer.split("\n\n");
                    buffer = chunks.pop() || "";

                    for (const chunk of chunks) {
                        if (!chunk.trim() || chunk.startsWith(":")) continue;
                        const line = chunk.replace(/^data:\s?/, "").trim();
                        if (!line || line === "[DONE]") continue;

                        try {
                            const event = JSON.parse(line) as StreamEvent;
                            const mapped = mapEventToOrbState(event);
                            if (mapped) {
                                applyState(mapped.state, mapped.ttlMs);
                            }
                        } catch {
                            // Ignore malformed stream frames and continue.
                        }
                    }
                }
            } catch (err: unknown) {
                // Stream is best-effort; silent fallback to polling-based awareness.
            }
        };

        void connect();

        return () => {
            controller.abort();
            if (idleTimer) clearTimeout(idleTimer);
        };
    }, [enabled]);
}
