"use client";

/**
 * TerminalPane - Remote Core Terminal
 *
 * Remote terminal surface for core-backed commands and server truth.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { GlassPanel } from "@/components/layers/GlassPanel";
import { usePaneStore } from "@/lib/store/paneStore";
import { Terminal as TerminalIcon, ChevronRight, Sparkles } from "lucide-react";
import { corePost, coreGet } from "@/lib/api/coreClient";
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

type ConnectionState = "checking" | "ready" | "unauthenticated" | "offline";

interface TerminalTruth {
    host_label?: string;
    role?: string;
    mode?: string;
    cwd?: string;
    session_id?: string;
    exit_code?: number;
    stdout?: string;
    stderr?: string;
    stream_chunks?: string[];
}

// MORA command definitions
const MORA_COMMANDS: Record<string, { description: string; handler: (args: string[]) => Promise<string> }> = {
    help: {
        description: "Zeigt alle verfuegbaren Befehle",
        handler: async () => {
            return [
                "REMOTE CORE TERMINAL",
                "",
                "REMOTE:",
                "  status           - Servertruth anzeigen",
                "  whoami           - Aktuelle Rolle anzeigen",
                "  version          - Version anzeigen",
                "  clear            - Terminal leeren",
                "  help             - Diese Hilfe",
                "",
                "REMOTE COMMANDS:",
                "  mora <frage>     - Remote LLM Anfrage",
                "  search <term>    - Semantische Suche",
                "  providers        - Verfuegbare AI-Provider",
                "  analyze          - Workspace-Analyse starten",
                "",
                "FUTURE SERVER-TRUTH:",
                "  dir / ls / list  - Wartet auf Server cwd/session_id",
                "",
                "Hinweis: Befehle ohne Servertruth werden als absent/unknown angezeigt.",
            ].join("\n");
        }
    },
    version: {
        description: "Version anzeigen",
        handler: async () => "REMOTE CORE TERMINAL | UI passt sich an Servertruth an"
    },
    whoami: {
        description: "Benutzerinfo anzeigen",
        handler: async () => {
            const readCookie = (name: string) => {
                const match = document.cookie.split('; ').find(r => r.startsWith(`${name}=`));
                return match ? match.split('=')[1] : null;
            };
            const token = readCookie('mora_auth_token') || readCookie('saimor_auth');
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
    const terminalTruth = React.useMemo(() => (pane?.data || {}) as Partial<TerminalTruth>, [pane?.data]);

    const [lines, setLines] = useState<TerminalLine[]>([
        {
            id: "welcome",
            type: "system",
            content: "Remote Core Terminal - Tippe 'help' fuer verfuegbare Befehle.",
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
                        content: "Remote Core Terminal - Tippe 'help' fuer verfuegbare Befehle.",
                        timestamp: new Date()
                    },
                    {
                        id: "auth-required",
                        type: "error",
                        content: "Terminal gesperrt: Anmeldung fehlt.",
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
                            content: "Remote Core Terminal - Tippe 'help' fuer verfuegbare Befehle.",
                            timestamp: new Date()
                        },
                        {
                            id: "ready",
                            type: "system",
                            content: `Remote server bereit. Rolle: ${terminalTruth.role || user.role || "unknown"} | Modus: ${terminalTruth.mode || "stateless"}.`,
                            timestamp: new Date()
                        }
                    ]);
                } else {
                    setConnectionState("offline");
                    setLines([
                        {
                            id: "welcome",
                            type: "system",
                            content: "Remote Core Terminal - Tippe 'help' fuer verfuegbare Befehle.",
                            timestamp: new Date()
                        },
                        {
                            id: "offline",
                            type: "error",
                            content: "Core gerade nicht erreichbar. Servertruth-Befehle bleiben unverfuegbar.",
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
                        content: "Remote Core Terminal - Tippe 'help' fuer verfuegbare Befehle.",
                        timestamp: new Date()
                    },
                    {
                        id: "offline",
                        type: "error",
                        content: "Core gerade nicht erreichbar. Servertruth-Befehle bleiben unverfuegbar.",
                        timestamp: new Date()
                    }
                ]);
            }
        };

        void bootstrap();

        return () => {
            cancelled = true;
        };
    }, [terminalTruth, user]);

    const buildStatusOutput = useCallback(() => {
        const panes = usePaneStore.getState().panes;
        return [
            "REMOTE CORE STATUS",
            `Remote server: ${connectionState === "ready" ? "bereit" : connectionState === "offline" ? "offline" : connectionState === "checking" ? "prueft" : "gesperrt"}`,
            `Rolle: ${terminalTruth.role || user?.role || "unknown"}`,
            `Modus: ${terminalTruth.mode || "stateless"}`,
            `host_label: ${terminalTruth.host_label || "unknown"}`,
            `cwd: ${terminalTruth.cwd || "unknown"}`,
            `session_id: ${terminalTruth.session_id || "unknown"}`,
            `exit_code: ${typeof terminalTruth.exit_code === "number" ? terminalTruth.exit_code : "unknown"}`,
            `stdout: ${terminalTruth.stdout ? "present" : "absent"}`,
            `stderr: ${terminalTruth.stderr ? "present" : "absent"}`,
            `stream_chunks: ${terminalTruth.stream_chunks?.length ? String(terminalTruth.stream_chunks.length) : "absent"}`,
            `Input: ${connectionState === "unauthenticated" ? "gesperrt" : "bereit"}`,
            `Aktive Fenster: ${panes.filter((entry) => !entry.minimized).length}`,
        ].join("\n");
    }, [connectionState, terminalTruth, user]);

    const requireOnline = useCallback((label: string) => {
        if (connectionState === "ready") return true;
        addLine("error", connectionState === "checking"
            ? `${label} braucht noch einen Moment, weil die Remote-Verbindung noch geprueft wird.`
            : `${label} braucht eine Remote-Core-Verbindung, die gerade offline ist.`);
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
                addLine("error", "Der Remote-Core liefert noch keinen cwd/session_id. Verzeichnislisten werden hier erst angezeigt, wenn der Server sie real liefert.");
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
                            context: buildChatContext(),
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
                            context: buildChatContext()
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
                        Core Terminal | Remote server | Rolle: {terminalTruth.role || user?.role || 'unknown'} | Modus: {terminalTruth.mode || 'stateless'}
                    </div>
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
