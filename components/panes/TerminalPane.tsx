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

// MORA command definitions
const MORA_COMMANDS: Record<string, { description: string; handler: (args: string[]) => Promise<string> }> = {
    help: {
        description: "Zeigt alle verfuegbaren Befehle",
        handler: async () => {
            return [
                "SAIMOR OS Terminal v2.0",
                "",
                "SYSTEM COMMANDS:",
                "  help          - Diese Hilfe anzeigen",
                "  clear         - Terminal leeren",
                "  status        - Systemstatus (CPU, RAM, Access Level)",
                "  whoami        - Aktuelle Benutzerinfo",
                "  version       - Version anzeigen",
                "",
                "SHELL COMMANDS (Core Terminal):",
                "  dir           - Verzeichnisinhalt",
                "  ls, list      - Alias fuer dir",
                "  hostname      - Hostname anzeigen",
                "  ping <host>   - Netzwerk-Diagnose",
                "  git status    - Git Repository Status",
                "",
                "AI COMMANDS:",
                "  mora <frage>  - Frage an MA'RA stellen (via LLM)",
                "  providers     - Verfuegbare AI Provider anzeigen",
                "  search <term> - Semantische Suche",
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

const BROWSER_UNSUPPORTED_COMMANDS = new Set(['ipconfig']);

type ShellRoutingResult =
    | { routable: true; command: string; display: string }
    | { routable: false; reason: string };

const normalizeShellCommand = (command: string, args: string[]): ShellRoutingResult => {
    if (command === 'ls' || command === 'list') {
        return { routable: true, command: 'dir', display: 'dir' };
    }

    if (command === 'git' && args[0] === 'status') {
        return { routable: true, command: 'git status', display: 'git status' };
    }

    if (command === 'dir' || command === 'hostname' || command === 'ping') {
        return { routable: true, command, display: command };
    }

    if (BROWSER_UNSUPPORTED_COMMANDS.has(command)) {
        return { routable: false, reason: `Der Befehl "${command}" ist im Browser-Terminal nicht verfuegbar.` };
    }

    return {
        routable: false,
        reason: `Der Befehl "${command}" wird im Browser-Terminal nicht ausgefuehrt. Verwende Hilfe fuer verfuegbare Befehle.`,
    };
};

export function TerminalPane({ id = "terminal-main" }: TerminalPaneProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);

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
            const command = parts[0].toLowerCase();
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

            if (MORA_COMMANDS[command]) {
                const result = await MORA_COMMANDS[command].handler(args);
                addLine("output", result);
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
                } else {
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
                } else {
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
                try {
                    const response = await corePost("/v1/autonomous/analyze", { deep: false });
                    addLine("output", `Analyse: ${response?.tasks_processed || 0} Tasks verarbeitet`);
                } catch (e) {
                    addLine("error", "Analyse fehlgeschlagen");
                }
            }
            else if (command === "search") {
                const query = args.join(" ");
                if (!query) {
                    addLine("error", "Usage: search <suchbegriff>");
                } else {
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
                const shell = normalizeShellCommand(command, args);

                if (!shell.routable) {
                    addLine("error", shell.reason);
                } else {
                    setIsProcessing(true);
                    try {
                        addLine("system", `Ausfuehrung im Core-Terminal: ${shell.display}`);
                        const res = await corePost("/v1/terminal/execute", { command: shell.command });

                        if (res?.success) {
                            if (res.output) {
                                addLine("output", res.output);
                            } else {
                                addLine("system", "Befehl ausgefuehrt, aber ohne Ausgabe.");
                            }
                        } else {
                            addLine("error", res?.output || `Der Befehl "${shell.display}" konnte im Core-Terminal nicht ausgefuehrt werden.`);
                        }
                    } catch (e: any) {
                        addLine("error", `Core-Terminal nicht erreichbar: ${e.message || "Unknown Core Error"}`);
                    }
                }
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
                        disabled={isProcessing}
                        placeholder=""
                        className="flex-1 bg-transparent text-emerald-100 placeholder:text-emerald-500/30 focus:outline-none disabled:opacity-50 font-mono"
                        autoFocus
                    />
                </div>
            </div>
        </GlassPanel>
    );
}

export default TerminalPane;
