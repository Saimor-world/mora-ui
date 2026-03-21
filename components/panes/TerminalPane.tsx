"use client";

/**
 * TerminalPane - Core Terminal (Session-based)
 *
 * Session create:     POST /v3/terminal/session        → session_id, host_label, platform, cwd, role, mode, history[]
 * Session recover:    GET  /v3/terminal/session/{id}   → server-owned history[] (authoritative transcript)
 * Command execution:  POST /v3/terminal/session/{id}/input → stdout, stderr, exit_code, denied_reason, cwd
 * Session close:      POST /v3/terminal/session/{id}/close (fire-and-forget on pane unmount)
 *
 * Connection model:
 *   checking        — createTerminalSession() in flight
 *   ready           — session active; transcript hydrated from server history[]
 *   offline         — Core unreachable at startup; MORA meta-commands still work (no shell)
 *   disconnected    — session was ready, then Core became unreachable mid-session; 'reconnect' to recover
 *   unauthenticated — no user in store; input locked
 *
 * No PTY. No streaming. No interactive process support. Request/response only.
 *
 * Local-only commands (no server needed):
 *   help, clear, version, whoami, stats, status
 *
 * MORA-API commands (need Core, not shell):
 *   mora, search, analyze, ollama, providers
 *
 * Remote shell (everything else → POST /v3/terminal/session/{id}/input):
 *   ls, pwd, cat, ps, ... — server responds truthfully with cwd tracking
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { GlassPanel } from "@/components/layers/GlassPanel";
import { usePaneStore } from "@/lib/store/paneStore";
import {
    corePost,
    coreGet,
    createTerminalSession,
    executeSessionInput,
    closeTerminalSession,
} from "@/lib/api/coreClient";
import type { TerminalSession, TerminalInputResult } from "@/lib/api/coreClient";
import { buildChatContext } from "@/lib/api/moraAgentClient";
import { useMoraStore } from "@/lib/store/moraState";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TerminalLine {
    id: string;
    type: "input" | "output" | "error" | "system" | "mora";
    content: string;
    timestamp: Date;
}

interface TerminalPaneProps {
    id?: string;
}

type ConnectionState = "checking" | "ready" | "offline" | "disconnected" | "unauthenticated";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeLine(type: TerminalLine["type"], content: string): TerminalLine {
    return {
        id: `line-${Date.now()}-${Math.random()}`,
        type,
        content,
        timestamp: new Date(),
    };
}

// ── Local-only MORA commands ──────────────────────────────────────────────────
// These never leave the browser. Everything else is routed to the session shell.

const MORA_COMMANDS: Record<string, { description: string; handler: (args: string[]) => Promise<string> }> = {
    help: {
        description: "Zeigt alle verfuegbaren Befehle",
        handler: async () =>
            [
                "CORE TERMINAL — Remote Linux Server (Session)",
                "",
                "LOKAL:",
                "  status           - Session-Identität & Verbindungsstatus",
                "  whoami           - Angemeldete Rolle & Nutzer",
                "  version          - Version anzeigen",
                "  clear            - Terminal leeren",
                "  help             - Diese Hilfe",
                "",
                "MORA:",
                "  mora <frage>     - Frage an MORA stellen",
                "  search <term>    - Semantische Suche",
                "  providers        - Verfügbare AI-Provider",
                "  analyze          - Workspace-Analyse starten",
                "",
                "SHELL (Remote Session):",
                "  ls, pwd, cd, cat, ps, ...  - Ausführung auf dem Core-Server",
                "  cwd wird zwischen Befehlen beibehalten (supports_cwd: true)",
                "",
                "Hinweis: Alle Shell-Befehle laufen in einer persistenten Session.",
            ].join("\n"),
    },
    version: {
        description: "Version anzeigen",
        handler: async () => "MORA OS v2.0.0-beta | Core Terminal | Build: 2026.03",
    },
    whoami: {
        description: "Angemeldete Rolle und Nutzer anzeigen",
        handler: async () => {
            const { user, activeCompanyId } = useMoraStore.getState();
            if (!user) return "Nicht angemeldet";
            return [
                `Nutzer:    ${user.email ?? "unbekannt"}`,
                `Rolle:     ${user.role ?? "member"}`,
                `Company:   ${activeCompanyId ?? "keine"}`,
            ].join("\n");
        },
    },
    stats: {
        description: "Fenster-Statistiken",
        handler: async () => {
            const panes = usePaneStore.getState().panes;
            return [
                `Aktive Fenster:    ${panes.filter((p) => !p.minimized).length}`,
                `Minimiert:         ${panes.filter((p) => p.minimized).length}`,
                `Gesamt:            ${panes.length}`,
            ].join("\n");
        },
    },
    providers: {
        description: "Verfuegbare AI-Provider (benötigt Core-Verbindung)",
        handler: async () => {
            try {
                const data = await coreGet("/v3/chat/providers", { isOptional: true });
                if (!data || !data.providers) return "Keine Provider-Info verfügbar.";
                const lines: string[] = ["AI PROVIDER:"];
                for (const [name, info] of Object.entries<any>(data.providers)) {
                    const status = info?.healthy ? "online" : "offline";
                    const err = info?.error ? ` (${info.error})` : "";
                    lines.push(`  ${name}: ${status}${err}`);
                }
                if (data.recommended) lines.push(`  empfohlen: ${data.recommended}`);
                return lines.join("\n");
            } catch (e: any) {
                return `Provider-Abfrage fehlgeschlagen: ${e?.message || e}`;
            }
        },
    },
};

const MORA_COMMANDS_NETWORK = new Set(["providers"]);

// ── Component ──────────────────────────────────────────────────────────────────

export function TerminalPane({ id = "terminal-main" }: TerminalPaneProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } =
        usePaneStore();
    const pane = getPane(id);
    const user = useMoraStore((state) => state.user);

    const [connectionState, setConnectionState] = useState<ConnectionState>("checking");
    const connectionStateRef = useRef<ConnectionState>("checking");
    const [session, setSession] = useState<TerminalSession | null>(null);
    const sessionRef = useRef<TerminalSession | null>(null);

    const setConn = useCallback((s: ConnectionState) => {
        connectionStateRef.current = s;
        setConnectionState(s);
    }, []);

    const [lines, setLines] = useState<TerminalLine[]>([
        makeLine("system", "Core Terminal — verbinde mit Server..."),
    ]);
    const [currentInput, setCurrentInput] = useState("");
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isProcessing, setIsProcessing] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    const addLine = useCallback((type: TerminalLine["type"], content: string) => {
        setLines((prev) => [...prev, makeLine(type, content)]);
    }, []);

    // ── Bootstrap: create session → get identity + server history[] ──────────
    useEffect(() => {
        let cancelled = false;

        const bootstrap = async () => {
            if (!user) {
                setConn("unauthenticated");
                setLines([
                    makeLine("system", "Core Terminal — Remote Linux Server"),
                    makeLine("error", "Terminal gesperrt: Anmeldung fehlt."),
                ]);
                return;
            }

            const sess = await createTerminalSession();
            if (cancelled) return;

            if (!sess) {
                setConn("offline");
                setLines([
                    makeLine("system", "Core Terminal — Remote Linux Server"),
                    makeLine("error", "Remote Core Terminal nicht verfügbar — keine Shell-Verbindung möglich."),
                    makeLine("system", "MORA-Befehle verfügbar: help, status, whoami, version, clear."),
                ]);
                return;
            }

            sessionRef.current = sess;
            setSession(sess);
            setConn("ready");

            // Welcome banner with real server identity
            const bannerLines: TerminalLine[] = [
                makeLine(
                    "system",
                    [
                        `Core Terminal — ${sess.host_label ?? "Remote"} (${sess.platform ?? "linux"})`,
                        `Session: ${sess.session_id} | ${sess.cwd ?? "/"} | Rolle: ${sess.role ?? user.role ?? "?"} | ${sess.mode ?? "stateless"}`,
                        "Tippe 'help' für verfügbare Befehle.",
                    ].join("\n")
                ),
            ];

            // Hydrate server-owned transcript history[]
            const historyLines: TerminalLine[] = [];
            for (const entry of sess.history ?? []) {
                historyLines.push(makeLine("input", `$ ${entry.command}`));
                if (entry.denied_reason) {
                    historyLines.push(makeLine("error", `Verweigert: ${entry.denied_reason}`));
                } else {
                    if (entry.stdout?.trim()) historyLines.push(makeLine("output", entry.stdout.trimEnd()));
                    if (entry.stderr?.trim()) historyLines.push(makeLine("error", entry.stderr.trimEnd()));
                    if (!entry.stdout?.trim() && !entry.stderr?.trim() && typeof entry.exit_code === "number" && entry.exit_code !== 0) {
                        historyLines.push(makeLine("system", `exit ${entry.exit_code}`));
                    }
                }
            }

            if (historyLines.length > 0) {
                const sep = makeLine(
                    "system",
                    `── Verlauf wiederhergestellt (${sess.history.length} Einträge vom Server) ──`
                );
                setLines([...bannerLines, sep, ...historyLines]);
            } else {
                setLines([...bannerLines]);
            }
        };

        void bootstrap();
        return () => { cancelled = true; };
    }, [user, setConn]);

    // ── Session cleanup on unmount ────────────────────────────────────────────
    useEffect(() => {
        return () => {
            const sid = sessionRef.current?.session_id;
            if (sid) void closeTerminalSession(sid);
        };
    }, []);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    const focusInput = () => inputRef.current?.focus();

    // ── Helpers ──────────────────────────────────────────────────────────────

    const buildStatusOutput = useCallback(() => {
        const sess = sessionRef.current;
        const panes = usePaneStore.getState().panes;
        const conn = connectionStateRef.current;
        const connLabel =
            conn === "ready"        ? "verbunden" :
            conn === "offline"      ? "nicht verfügbar (Session-Start fehlgeschlagen)" :
            conn === "disconnected" ? "getrennt (Session abgelaufen — 'reconnect')" :
            conn === "checking"     ? "prüft..." :
                                      "gesperrt";

        return [
            "CORE TERMINAL STATUS",
            `Verbindung: ${connLabel}`,
            `Session-ID: ${sess?.session_id ?? "keine"}`,
            `Server: ${sess?.host_label ?? "unbekannt"} (${sess?.platform ?? "unbekannt"})`,
            `Arbeitsverzeichnis: ${sess?.cwd ?? "unbekannt"}`,
            `Rolle: ${sess?.role ?? user?.role ?? "unbekannt"}`,
            `Modus: ${sess?.mode ?? "stateless"}`,
            `execution_model: ${sess?.execution_model ?? "session_request_response"}`,
            `supports_sessions: ${sess?.supports_sessions === true ? "ja" : "nein"}`,
            `supports_cwd: ${sess?.supports_cwd === true ? "ja" : "nein"}`,
            `supports_streaming: ${sess?.supports_streaming === true ? "ja" : "nein"}`,
            `Aktive Fenster: ${panes.filter((p) => !p.minimized).length}`,
        ].join("\n");
    }, [user]);

    /**
     * Render a structured session input result into terminal lines.
     *
     * - denied_reason → red "Verweigert:" prefix (policy rejection, not a shell error)
     * - stdout → output (green/dim)
     * - stderr → error (red) even when exit_code=0
     * - exit_code != 0 → dim "exit N" after output
     * - no output at all → "(kein Output) exit N"
     */
    const renderInputResult = useCallback((result: TerminalInputResult) => {
        if (result.denied_reason) {
            addLine("error", `Verweigert: ${result.denied_reason}`);
            return;
        }
        if (result.stdout?.trim()) {
            addLine("output", result.stdout.trimEnd());
        }
        if (result.stderr?.trim()) {
            addLine("error", result.stderr.trimEnd());
        }
        if (!result.stdout?.trim() && !result.stderr?.trim()) {
            addLine("system", `(kein Output) exit ${result.exit_code ?? 0}`);
        } else if (typeof result.exit_code === "number" && result.exit_code !== 0) {
            addLine("system", `exit ${result.exit_code}`);
        }
    }, [addLine]);

    const requireOnline = useCallback((label: string): boolean => {
        const conn = connectionStateRef.current;
        if (conn === "ready") return true;
        addLine(
            "error",
            conn === "checking"
                ? `${label}: Remote-Verbindung wird noch geprüft — kurz warten.`
                : conn === "disconnected"
                ? `${label}: Session getrennt — gib 'reconnect' ein.`
                : `${label}: Remote Core Terminal nicht verfügbar.`
        );
        return false;
    }, [addLine]);

    // ── Command execution ────────────────────────────────────────────────────

    const executeCommand = useCallback(async (cmd: string) => {
        const trimmed = cmd.trim();
        if (!trimmed) return;

        addLine("input", `$ ${trimmed}`);
        setCommandHistory((prev) => [...prev, trimmed]);
        setHistoryIndex(-1);
        setCurrentInput("");
        setIsProcessing(true);

        try {
            const parts = trimmed.split(" ");
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);

            // ── Always-local ────────────────────────────────────────────────

            if (command === "clear") {
                setLines([makeLine("system", "Terminal geleert.")]);
                setIsProcessing(false);
                return;
            }

            if (connectionStateRef.current === "unauthenticated") {
                addLine("error", "Terminal gesperrt: Bitte zuerst anmelden.");
                setIsProcessing(false);
                return;
            }

            if (command === "status") {
                addLine("output", buildStatusOutput());
                setIsProcessing(false);
                return;
            }

            if (MORA_COMMANDS[command]) {
                if (MORA_COMMANDS_NETWORK.has(command) && !requireOnline(command)) {
                    setIsProcessing(false);
                    return;
                }
                const result = await MORA_COMMANDS[command].handler(args);
                addLine("output", result);
                setIsProcessing(false);
                return;
            }

            // ── MORA API commands ───────────────────────────────────────────

            if (command === "mora") {
                const question = args.join(" ");
                if (!question) {
                    addLine("error", "Usage: mora <deine Frage>");
                } else if (requireOnline("MORA")) {
                    addLine("mora", "MORA denkt nach...");
                    try {
                        const response = await corePost("/v3/chat", {
                            message: question,
                            context: buildChatContext({ session_id: "terminal" }),
                            include_synthesis: true,
                        });
                        if (response?.reply) {
                            const provider = response.provider ? ` [${response.provider}]` : "";
                            addLine("mora", `MORA${provider}: ${response.reply}`);
                        } else {
                            addLine("error", "MORA: Keine Antwort erhalten");
                        }
                    } catch (e: any) {
                        addLine("error", `Fehler: ${e.message || "LLM nicht erreichbar"}`);
                    }
                }
                setIsProcessing(false);
                return;
            }

            if (command === "ollama") {
                const prompt = args.join(" ");
                if (!prompt) {
                    addLine("error", "Usage: ollama <prompt>");
                } else if (requireOnline("Ollama")) {
                    addLine("system", "Sende an Ollama...");
                    try {
                        const response = await corePost("/v3/chat", {
                            message: prompt,
                            provider_preference: "ollama",
                            context: buildChatContext({ session_id: "terminal_ollama" }),
                        });
                        if (response?.reply) {
                            addLine("mora", `Ollama: ${response.reply}`);
                        } else {
                            addLine("error", "Keine Antwort von Ollama");
                        }
                    } catch (e: any) {
                        addLine("error", `Ollama Fehler: ${e.message || e}`);
                    }
                }
                setIsProcessing(false);
                return;
            }

            if (command === "analyze") {
                if (requireOnline("Analyse")) {
                    addLine("system", "Starte Workspace-Analyse...");
                    try {
                        const response = await corePost("/v1/autonomous/analyze", { deep: false });
                        addLine("output", `Analyse: ${response?.tasks_processed || 0} Tasks verarbeitet`);
                    } catch {
                        addLine("error", "Analyse fehlgeschlagen");
                    }
                }
                setIsProcessing(false);
                return;
            }

            if (command === "search") {
                const query = args.join(" ");
                if (!query) {
                    addLine("error", "Usage: search <suchbegriff>");
                } else if (requireOnline("Suche")) {
                    addLine("system", `Suche nach "${query}"...`);
                    try {
                        const response = await corePost(
                            `/v3/search/hybrid?query=${encodeURIComponent(query)}`,
                            {},
                            { isOptional: true }
                        );
                        if (response?.results?.length > 0) {
                            addLine("output", `${response.results.length} Ergebnisse:`);
                            response.results.slice(0, 5).forEach((r: any) => {
                                addLine("output", `  - ${r.title || r.name || r.id}`);
                            });
                        } else {
                            addLine("output", "Keine Ergebnisse gefunden");
                        }
                    } catch {
                        addLine("error", "Suche fehlgeschlagen");
                    }
                }
                setIsProcessing(false);
                return;
            }

            // ── Reconnect — restore a lost session ──────────────────────────

            if (command === "reconnect") {
                setConn("checking");
                addLine("system", "Verbinde neu mit Core Terminal...");
                const newSess = await createTerminalSession();
                if (!newSess) {
                    setConn("disconnected");
                    addLine("error", "Reconnect fehlgeschlagen. Core Terminal nicht erreichbar.");
                    addLine("system", "Eingabe 'reconnect' erneut versuchen oder Terminal schließen.");
                } else {
                    sessionRef.current = newSess;
                    setSession(newSess);
                    setConn("ready");
                    addLine("system", `Neue Session: ${newSess.session_id} | ${newSess.cwd ?? "/"} | ${newSess.host_label ?? "Remote"}`);
                }
                setIsProcessing(false);
                return;
            }

            // ── Remote shell via session ────────────────────────────────────

            if (!requireOnline(trimmed)) {
                setIsProcessing(false);
                return;
            }

            const sid = sessionRef.current?.session_id;
            if (!sid) {
                addLine("error", "Keine aktive Session — Terminal neu öffnen.");
                setIsProcessing(false);
                return;
            }

            const result = await executeSessionInput(sid, trimmed);
            if (!result) {
                setConn("disconnected");
                addLine("error", "Session getrennt. Core Terminal nicht mehr erreichbar.");
                addLine("system", "Eingabe 'reconnect' zum Neuverbinden oder Terminal schließen.");
            } else {
                renderInputResult(result);
                // Update tracked cwd if the server reports a change
                if (result.cwd && sessionRef.current) {
                    sessionRef.current = { ...sessionRef.current, cwd: result.cwd };
                    setSession((prev) => prev ? { ...prev, cwd: result.cwd! } : prev);
                }
            }
        } catch (error: any) {
            addLine("error", `Fehler: ${error.message || error}`);
        } finally {
            setIsProcessing(false);
        }
    }, [addLine, buildStatusOutput, requireOnline, renderInputResult]);

    // ── Keyboard handling ────────────────────────────────────────────────────

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isProcessing) {
            executeCommand(currentInput);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
            } else {
                setHistoryIndex(-1);
                setCurrentInput("");
            }
        }
    };

    // ── Styling ──────────────────────────────────────────────────────────────

    const getLineStyle = (type: TerminalLine["type"]) => {
        switch (type) {
            case "input":   return "text-emerald-400";
            case "output":  return "text-emerald-100/80";
            case "error":   return "text-red-400";
            case "system":  return "text-amber-400/80";
            case "mora":    return "text-mora-gold";
            default:        return "text-white/60";
        }
    };

    if (!pane) return null;

    const titleLabel = session
        ? `Core Terminal | ${session.host_label ?? "Remote"} | ${session.cwd ?? "/"} | ${session.session_id}`
        : `Core Terminal | Remote | Rolle: ${user?.role ?? "?"}`;

    return (
        <GlassPanel
            title="Terminal"
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
            <div
                className="flex flex-col h-full bg-[#0a0a0a] font-mono text-sm cursor-text"
                onClick={focusInput}
            >
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-black/50">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <div className="flex-1 text-center text-xs text-white/30 font-medium truncate">
                        {titleLabel}
                    </div>
                    <div className="w-[42px]" />
                </div>

                <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 space-y-1">
                    {lines.map((line) => (
                        <div
                            key={line.id}
                            className={`whitespace-pre-wrap break-words ${getLineStyle(line.type)}`}
                        >
                            {line.content}
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 bg-black/30">
                    <span className="text-emerald-500 font-bold">$</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isProcessing || connectionState === "unauthenticated"}
                        placeholder={
                            connectionState === "unauthenticated" ? "Anmeldung erforderlich" :
                            connectionState === "disconnected"    ? "Session getrennt — 'reconnect' eingeben" :
                            connectionState === "offline"         ? "Core nicht verfügbar — MORA-Befehle aktiv" :
                            connectionState === "checking"        ? "Verbindung wird geprüft..." :
                                                                    "Befehl eingeben (oder 'help')"
                        }
                        className="flex-1 bg-transparent text-emerald-100 placeholder:text-emerald-500/30 focus:outline-none disabled:opacity-50 font-mono"
                        autoFocus
                    />
                </div>
            </div>
        </GlassPanel>
    );
}

export default TerminalPane;
