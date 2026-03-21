"use client";

/**
 * TerminalPane - MORA Command Line Interface
 * 
 * A terminal emulator for power users and MORA commands.
 * Supports both system commands and MORA AI commands.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { GlassPanel } from "@/components/layers/GlassPanel";
import { usePaneStore } from "@/lib/store/paneStore";
import { Terminal as TerminalIcon, ChevronRight, Sparkles } from "lucide-react";
import { corePost, coreGet, fetchFoldersByCompany, getCoreBaseUrl } from "@/lib/api/coreClient";
import { buildChatContext } from "@/lib/api/moraAgentClient";
import { useMoraStore } from "@/lib/store/moraState";

interface TerminalLine {
    id: string;
    type: "input" | "output" | "error" | "system" | "mora";
    content: string;
    timestamp: Date;
}

interface TerminalPaneProps {
    id?: string;
}

const AUTH_COOKIE = "mora_auth_token";
const SESSION_COOKIE = "mora_session";

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
    if (!value) return null;
    const [, raw] = value.split('=');
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

function hasTerminalAuth(): boolean {
    if (typeof window === 'undefined') return false;
    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    return !!(
        readCookie(AUTH_COOKIE) ||
        readCookie(SESSION_COOKIE) ||
        (isLocalhost ? localStorage.getItem('saimor_dev_token') : null)
    );
}

function getRealtimeDiagnosticsUrl(): string {
    if (typeof window === 'undefined') return 'wss://api.saimor.world/v3/realtime/subscribe';

    const coreWsUrl = process.env.NEXT_PUBLIC_CORE_WS_URL?.trim();
    if (coreWsUrl) {
        return `${coreWsUrl.replace(/\/+$/, '')}/v3/realtime/subscribe`;
    }

    const coreApiUrl = (process.env.NEXT_PUBLIC_CORE_API_URL || '/api/core').trim().replace(/\/+$/, '');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    if (coreApiUrl.startsWith('/')) {
        if (['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
            return 'ws://localhost:8081/v3/realtime/subscribe';
        }
        const apiHost = window.location.host.startsWith('hq.')
            ? window.location.host.replace(/^hq\./, 'api.')
            : 'api.saimor.world';
        return `${protocol}//${apiHost}/v3/realtime/subscribe`;
    }

    return `${coreApiUrl.replace(/^http/, 'ws')}/v3/realtime/subscribe`;
}

type ConnectionState = "checking" | "ready" | "unauthenticated" | "offline";

// MORA command definitions
const MORA_COMMANDS: Record<string, { description: string; handler: (args: string[]) => Promise<string> }> = {
    help: {
        description: "Zeigt alle verfuegbaren Befehle",
        handler: async () => {
            return [
                "SAIMOR OS Terminal v2.0",
                "",
                "MORA:",
                "  mora <frage>     - Frage an MORA stellen",
                "  search <term>    - Semantische Suche",
                "  providers        - Verfuegbare AI-Provider",
                "  analyze          - Workspace-Analyse starten",
                "",
                "LOKAL:",
                "  status           - Terminal- und Verbindungsstatus",
                "  whoami           - Angemeldeter Nutzer und Rolle",
                "  version          - Version anzeigen",
                "  hostname         - Browser-Host und Origin",
                "  ipconfig         - Browser-Verbindungsdiagnose",
                "",
                "LIVE DATA:",
                "  dir / ls / list  - Zugaengliche Firmenordner",
                "",
                "SONSTIGES:",
                "  clear            - Terminal leeren",
                "  help             - Diese Hilfe",
            ].join("\n");
        }
    },
    version: {
        description: "Version anzeigen",
        handler: async () => "MORA OS v2.0.0-beta | Kernel: Organic Neural Core | Build: 2026.01.07"
    },
    whoami: {
        description: "Benutzerinfo anzeigen",
        handler: async () => {
            const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
            const readCookie = (name: string) => {
                const match = document.cookie.split('; ').find(r => r.startsWith(`${name}=`));
                return match ? match.split('=')[1] : null;
            };
            const token = readCookie('mora_auth_token') || readCookie('saimor_auth') || (isLocalhost ? localStorage.getItem('saimor_dev_token') : null);
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    return `User: ${payload.sub || 'unknown'}\nRole: ${payload.role || 'member'}\nTenant: ${payload.tenant_id || 'default'}`;
                } catch {
                    return "User: authenticated\nRole: unknown";
                }
            }
            return "Not authenticated";
        }
    },
    stats: {
        description: "Statistiken anzeigen",
        handler: async () => {
            const panes = usePaneStore.getState().panes;
            return `
Active Panes: ${panes.length}
Open Windows: ${panes.filter(p => !p.minimized).length}
Minimized: ${panes.filter(p => p.minimized).length}
Session Start: ${new Date().toLocaleTimeString('de-DE')}
`;
        }
    },
    providers: {
        description: "Verfuegbare AI Provider anzeigen",
        handler: async () => {
            try {
                const data = await coreGet("/v3/chat/providers", { isOptional: true });
                if (!data || !data.providers) {
                    return "No provider info available.";
                }
                const lines: string[] = ["AI PROVIDERS:"];
                for (const [name, info] of Object.entries<any>(data.providers)) {
                    const status = info?.healthy ? "online" : "offline";
                    const err = info?.error ? ` (${info.error})` : "";
                    lines.push(`${name}: ${status}${err}`);
                }
                if (data.recommended) {
                    lines.push(`recommended: ${data.recommended}`);
                }
                return lines.join("\n");
            } catch (e: any) {
                return `Provider lookup failed: ${e?.message || e}`;
            }
        }
    }
};

export function TerminalPane({ id = "terminal-main" }: TerminalPaneProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);
    const user = useMoraStore((state) => state.user);
    const activeCompanyId = useMoraStore((state) => state.activeCompanyId);
    const companies = useMoraStore((state) => state.companies);
    const activeCompanyName = React.useMemo(
        () => companies.find((company) => company.id === activeCompanyId)?.name || null,
        [companies, activeCompanyId]
    );

    const [lines, setLines] = useState<TerminalLine[]>([
        {
            id: "welcome",
            type: "system",
            content: "MORA Terminal v2.0 - Tippe 'help' fuer verfuegbare Befehle.",
            timestamp: new Date()
        }
    ]);
    const [currentInput, setCurrentInput] = useState("");
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState>("checking");

    const inputRef = useRef<HTMLInputElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    const focusInput = () => {
        inputRef.current?.focus();
    };

    const addLine = useCallback((type: TerminalLine["type"], content: string) => {
        setLines(prev => [...prev, {
            id: `line-${Date.now()}-${Math.random()}`,
            type,
            content,
            timestamp: new Date()
        }]);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const bootstrap = async () => {
            if (!user) {
                setConnectionState("unauthenticated");
                setLines([
                    {
                        id: "welcome",
                        type: "system",
                        content: "MORA Terminal v2.0 - Tippe 'help' fuer verfuegbare Befehle.",
                        timestamp: new Date()
                    },
                    {
                        id: "auth-required",
                        type: "error",
                        content: "Terminal gesperrt: Bitte zuerst mit einem aktiven Workspace anmelden.",
                        timestamp: new Date()
                    }
                ]);
                return;
            }

            setConnectionState("checking");

            try {
                const probe = await coreGet("/v3/chat/providers", { isOptional: true });
                if (cancelled) return;

                if (probe) {
                    setConnectionState("ready");
                    setLines([
                        {
                            id: "welcome",
                            type: "system",
                            content: "MORA Terminal v2.0 - Tippe 'help' fuer verfuegbare Befehle.",
                            timestamp: new Date()
                        },
                        {
                            id: "ready",
                            type: "system",
                            content: activeCompanyId
                                ? `Verbunden als ${user.email || user.name || "Nutzer"} im Workspace ${activeCompanyName || activeCompanyId}.`
                                : `Verbunden als ${user.email || user.name || "Nutzer"}.`,
                            timestamp: new Date()
                        }
                    ]);
                } else {
                    setConnectionState("offline");
                    setLines([
                        {
                            id: "welcome",
                            type: "system",
                            content: "MORA Terminal v2.0 - Tippe 'help' fuer verfuegbare Befehle.",
                            timestamp: new Date()
                        },
                        {
                            id: "offline",
                            type: "error",
                            content: "Core gerade nicht erreichbar. Lokale Info-Befehle bleiben verfuegbar.",
                            timestamp: new Date()
                        }
                    ]);
                }
            } catch {
                if (cancelled) return;
                setConnectionState("offline");
                setLines([
                    {
                        id: "welcome",
                        type: "system",
                        content: "MORA Terminal v2.0 - Tippe 'help' fuer verfuegbare Befehle.",
                        timestamp: new Date()
                    },
                    {
                        id: "offline",
                        type: "error",
                        content: "Core gerade nicht erreichbar. Lokale Info-Befehle bleiben verfuegbar.",
                        timestamp: new Date()
                    }
                ]);
            }
        };

        void bootstrap();

        return () => {
            cancelled = true;
        };
    }, [activeCompanyId, activeCompanyName, user]);

    const buildConnectionOutput = useCallback(() => {
        if (typeof window === "undefined") {
            return "Browser-Verbindungsdaten sind hier nicht verfuegbar.";
        }

        return [
            "BROWSER-VERBINDUNG",
            `Browser: ${navigator.onLine ? "online" : "offline"}`,
            `UI Origin: ${window.location.origin}`,
            `Core API URL: ${getCoreBaseUrl()}`,
            `Realtime URL: ${getRealtimeDiagnosticsUrl()}`,
            "",
            "Hinweis: Die lokale Rechner-Netzwerkkonfiguration wird hier nicht angezeigt.",
        ].join("\n");
    }, []);

    const buildHostnameOutput = useCallback(() => {
        if (typeof window === "undefined") {
            return "Hostdaten sind hier nicht verfuegbar.";
        }

        return [
            "BROWSER-HOST",
            `Hostname: ${window.location.hostname}`,
            `Origin: ${window.location.origin}`,
        ].join("\n");
    }, []);

    const buildStatusOutput = useCallback(() => {
        const panes = usePaneStore.getState().panes;
        return [
            "TERMINAL STATUS",
            `Verbindung: ${connectionState === "ready" ? "verbunden" : connectionState === "offline" ? "offline" : connectionState === "checking" ? "prueft" : "gesperrt"}`,
            `Browser: ${navigator.onLine ? "online" : "offline"}`,
            `Input: ${connectionState === "unauthenticated" ? "gesperrt" : "bereit"}`,
            `Nutzer: ${user?.email || user?.name || "unbekannt"}`,
            `Rolle: ${user?.role || "unbekannt"}`,
            `Company: ${activeCompanyName || activeCompanyId || "-"}`,
            `Aktive Fenster: ${panes.filter((entry) => !entry.minimized).length}`,
        ].join("\n");
    }, [activeCompanyId, activeCompanyName, connectionState, user]);

    const requireOnline = useCallback((label: string) => {
        if (connectionState === "ready") return true;
        addLine("error", connectionState === "checking"
            ? `${label} braucht noch einen Moment, weil die Verbindung noch geprueft wird.`
            : `${label} braucht eine Core-Verbindung, die gerade offline ist.`);
        return false;
    }, [addLine, connectionState]);

    const executeCommand = async (cmd: string) => {
        const trimmed = cmd.trim();
        if (!trimmed) return;

        addLine("input", `$ ${trimmed}`);
        setCommandHistory(prev => [...prev, trimmed]);
        setHistoryIndex(-1);
        setCurrentInput("");
        setIsProcessing(true);

        try {
            const parts = trimmed.split(" ");
            const rawCommand = parts[0].toLowerCase();
            const command = rawCommand === "ls" || rawCommand === "list" ? "dir" : rawCommand;
            const args = parts.slice(1);

            if (command === "clear") {
                setLines([{
                    id: "cleared",
                    type: "system",
                    content: "Terminal geleert.",
                    timestamp: new Date()
                }]);
                setIsProcessing(false);
                return;
            }

            if (connectionState === "unauthenticated") {
                addLine("error", "Terminal gesperrt: Bitte zuerst mit einem aktiven Workspace anmelden.");
                setIsProcessing(false);
                return;
            }

            if (MORA_COMMANDS[command]) {
                if (command === "providers" && !requireOnline("AI-Provider")) {
                    setIsProcessing(false);
                    return;
                }
                const result = await MORA_COMMANDS[command].handler(args);
                addLine("output", result);
            }
            else if (command === "status") {
                addLine("output", buildStatusOutput());
            }
            else if (command === "dir") {
                if (!activeCompanyId) {
                    addLine("error", "Kein aktiver Workspace gesetzt.");
                } else if (requireOnline("Ordnerliste")) {
                    addLine("system", "Lade zugaengliche Ordner...");
                    try {
                        const folders = await fetchFoldersByCompany(activeCompanyId);
                        if (!folders.length) {
                            addLine("output", "WORKSPACE ORDNER:\n\n  Keine Ordner verfuegbar");
                        } else {
                            const rendered = folders
                                .slice(0, 20)
                                .map((folder) => {
                                    const count = typeof folder.node_count === "number" ? `${folder.node_count} Dok.` : "-";
                                    return `  ${(folder.name || "Ordner").padEnd(28, " ")} ${count}`;
                                })
                                .join("\n");
                            addLine("output", `WORKSPACE ORDNER:\n\n${rendered}\n\n  ${folders.length} Ordner zugaenglich`);
                        }
                    } catch (e: any) {
                        addLine("error", `Ordner konnten nicht geladen werden: ${e?.message || "Unbekannter Fehler"}`);
                    }
                }
            }
            else if (command === "hostname") {
                addLine("output", buildHostnameOutput());
            }
            else if (command === "ipconfig") {
                addLine("output", buildConnectionOutput());
            }
            else if (command === "ping") {
                addLine("error", "'ping' ist im Browser nicht unterstuetzt - kein direkter TCP-Zugriff moeglich.");
            }
            else if (command === "git" && args[0] === "status") {
                addLine("error", "'git status' ist hier nicht verfuegbar.");
            }
            // ... (providers block hidden for brevity) ...
            else if (command === "root" || command === "admin") {
                addLine("system", "LEVEL: ROOT ACCESS GRANTED");
                addLine("output", "Welcome, Architect. Access to all system nodes confirmed.");
            }
            else if (command === "mora") {
                const question = args.join(" ");
                if (!question) {
                    addLine("error", "Usage: mora <deine Frage>");
                } else if (requireOnline("MORA")) {
                    addLine("mora", "MORA denkt nach...");
                    try {
                        const response = await corePost("/v3/chat", {
                            message: question,
                            context: buildChatContext({ session_id: "terminal" }),
                            include_synthesis: true
                        });
                        if (response?.reply) {
                            const provider = response.provider ? ` [${response.provider}]` : '';
                            addLine("mora", `MORA${provider}: ${response.reply}`);
                        } else {
                            addLine("error", "MORA: Keine Antwort erhalten");
                        }
                    } catch (e: any) {
                        addLine("error", `Fehler: ${e.message || 'LLM nicht erreichbar'}`);
                    }
                }
            }
            else if (command === "ollama") {
                const prompt = args.join(" ");
                if (!prompt) {
                    addLine("error", "Usage: ollama <prompt>");
                } else if (requireOnline("Ollama")) {
                    addLine("system", "Sende an Ollama...");
                    try {
                        const response = await corePost("/v3/chat", {
                            message: prompt,
                            provider_preference: "ollama",
                            context: buildChatContext({ session_id: "terminal_ollama" })
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
            }
            else if (command === "analyze") {
                addLine("system", "Starte Workspace-Analyse...");
                if (requireOnline("Analyse")) {
                    try {
                        const response = await corePost("/v1/autonomous/analyze", { deep: false });
                        addLine("output", `Analyse: ${response?.tasks_processed || 0} Tasks verarbeitet`);
                    } catch (e) {
                        addLine("error", "Analyse fehlgeschlagen");
                    }
                }
            }
            else if (command === "search") {
                const query = args.join(" ");
                if (!query) {
                    addLine("error", "Usage: search <suchbegriff>");
                } else if (requireOnline("Suche")) {
                    addLine("system", `Suche nach "${query}"...`);
                    try {
                        // Use Hybrid search (Semantic + Keyword)
                        const response = await corePost(`/v3/search/hybrid?query=${encodeURIComponent(query)}`, {}, { isOptional: true });
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
            }
            else {
                addLine("error", `Unbekannter Befehl: '${trimmed}' - tippe 'help' fuer verfuegbare Befehle.`);
            }
        } catch (error: any) {
            addLine("error", `Fehler: ${error.message || error}`);
        } finally {
            setIsProcessing(false);
        }
    };

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

    const getLineStyle = (type: TerminalLine["type"]) => {
        switch (type) {
            case "input": return "text-emerald-400";
            case "output": return "text-emerald-100/80";
            case "error": return "text-red-400";
            case "system": return "text-amber-400/80";
            case "mora": return "text-mora-gold";
            default: return "text-white/60";
        }
    };

    if (!pane) return null;

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
                    <div className="flex-1 text-center text-xs text-white/30 font-medium">
                        {useMoraStore.getState().user?.email || 'user@saimor.io'}:~
                    </div>
                    {/* Spacer to balance traffic lights */}
                    <div className="w-[42px]" />
                </div>

                <div
                    ref={terminalRef}
                    className="flex-1 overflow-y-auto p-4 space-y-1"
                >
                    {lines.map(line => (
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
                            connectionState === "unauthenticated"
                                ? "Anmeldung erforderlich"
                                : connectionState === "offline"
                                    ? "Offline: lokale Befehle funktionieren"
                                    : connectionState === "checking"
                                        ? "Verbindung wird geprueft"
                                        : "Befehl eingeben"
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
