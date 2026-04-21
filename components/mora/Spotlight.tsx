"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Search,
    Settings,
    Grid,
    Home,
    ArrowRight,
    Hash,
    Building2,
    Layers,
    Users,
    Mail,
    Calendar,
    Terminal,
    StickyNote,
    Folder,
    ScanLine,
    Wrench,
    Brain,
} from "lucide-react";
import { useNavStore } from "@/lib/store/navStore";
import { useDepartments } from "@/lib/queries/useDepartments";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useCompanies } from "@/lib/queries/useCompanies";
import { useTree } from "@/lib/queries/useTree";
import { dispatchMoraPresence } from "@/lib/mora/presenceEvents";
import { usePaneStore } from "@/lib/store/paneStore";
import { parseAIResponse, executeCursorCommands } from "@/lib/ai/cursorBridge";
import { Loader2, Sparkles, Bot, User } from "lucide-react";
import { executeAgenticLoop } from "@/lib/api/cognitionClient";
import { openMoraCenter } from '@/lib/utils/openMoraCenter';

/**
 * SPOTLIGHT - Global Command Palette (Cmd+K)
 * 
 * Raycast/VS Code style command palette for quick actions and navigation.
 * - Fuzzy search across all workspace entities
 * - Quick actions (open panes, navigate, search)
 * - Keyboard navigation
 * - Context-aware suggestions
 */



interface SpotlightAction {
    id: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    category: "navigation" | "action" | "entity" | "recent";
    keywords?: string[];
    onSelect: () => void;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const Spotlight: React.FC<Props> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [moraResponse, setMoraResponse] = useState<string | null>(null);
    const [isMoraThinking, setIsMoraThinking] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const { data: departments = [] } = useDepartments(activeCompanyId);
    const { data: companiesData = [] } = useCompanies();
    const { data: treeData = [] } = useTree(activeCompanyId);
    const companies = companiesData;
    const activeDepartmentId = useNavStore((s) => s.activeDepartmentId);
    const activeSpaceId = useNavStore((s) => s.activeSpaceId);
    const activeFolderId = useNavStore((s) => s.activeFolderId);
    const viewLevel = useNavStore((s) => s.viewLevel);
    const navigateToCore = useNavStore((s) => s.navigateToCore);
    const setActiveCompany = useNavStore((s) => s.setActiveCompany);
    const setViewMode = useNavStore((s) => s.setViewMode);
    const navigateToDepartment = useNavStore((s) => s.navigateToDepartment);
    const navigateToSpace = useNavStore((s) => s.navigateToSpace);

    const { openPane, panes, minimizePane } = usePaneStore();

    const spacesByDepartment = useMemo(() => {
        const derived: Record<string, Array<{ id: string; name: string }>> = {};
        const visit = (nodes: any[]) => {
            nodes.forEach((node) => {
                if (node?.type === "department" && Array.isArray(node.children)) {
                    derived[node.id] = node.children
                        .filter((child: any) => child?.type === "space")
                        .map((child: any) => ({ id: child.id, name: child.name }));
                }
                if (Array.isArray(node?.children)) visit(node.children);
            });
        };
        if (Array.isArray(treeData)) visit(treeData as any[]);
        return derived;
    }, [treeData]);

    // Reset Mora state on open/close or query change (if query clears @mora)
    useEffect(() => {
        if (!isOpen) {
            setMoraResponse(null);
            setIsMoraThinking(false);
        }
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
                setQuery("");
                setSelectedIndex(0);
            }, 100);
        }
    }, [isOpen]);

    // Handle Mora Chat
    const handleMoraChat = useCallback(async (message: string) => {
        setIsMoraThinking(true);
        setMoraResponse(null);

        try {
            const activeContext = activeFolderId
                ? { entityId: activeFolderId, entityType: 'folder' as const }
                : activeSpaceId
                    ? { entityId: activeSpaceId, entityType: 'space' as const }
                    : activeDepartmentId
                        ? { entityId: activeDepartmentId, entityType: 'department' as const }
                        : { entityId: undefined, entityType: undefined };

            const response = await executeAgenticLoop(message, {
                level: viewLevel || 'company',
                entityId: activeContext.entityId,
                entityType: activeContext.entityType,
                companyId: activeCompanyId || undefined,
            });

            if (response?.final_message) {
                const { cleanContent, commands } = parseAIResponse(response.final_message);

                if (commands.length > 0) {
                    executeCursorCommands(commands);
                }

                if (response.final_state === 'S4_CONFIRM' && response.pending_confirmations.length > 0) {
                    const pending = response.pending_confirmations[0];
                    setMoraResponse(`${cleanContent}\n\nBestätigung noetig: ${pending.what_will_change}`);
                } else {
                    setMoraResponse(cleanContent);
                }
            } else {
                setMoraResponse("Ich kann den Auftrag gerade nicht sauber ausfuehren. Versuche es erneut.");
            }
        } catch (error) {
            console.error("Mora Spotlight Error:", error);
            setMoraResponse("Verbindungsfehler beim Arbeitslauf.");
        } finally {
            setIsMoraThinking(false);
        }
    }, [activeCompanyId, activeDepartmentId, activeFolderId, activeSpaceId, viewLevel]);

    // Helper to open/focus pane
    const openFromSpotlight = useCallback((type: string, id: string, title: string, size = { width: 700, height: 500 }) => {
        openPane({
            id,
            type: type as any,
            title,
            size
        });
        onClose();
    }, [openPane, onClose]);



    // Build actions list
    const actions = useMemo<SpotlightAction[]>(() => {
        const result: SpotlightAction[] = [];

        // === QUICK ACTIONS ===
        result.push({
            id: "action-settings",
            label: "Settings",
            description: "Local system preferences",
            icon: <Settings size={16} className="text-white/60" />,
            category: "action",
            keywords: ["settings", "preferences", "config", "options", "einstellungen"],
            onSelect: () => openFromSpotlight("settings", "settings-main", "Settings")
        });



        result.push({
            id: "action-search",
            label: "Search",
            description: "Local search",
            icon: <Search size={16} className="text-emerald-400" />,
            category: "action",
            keywords: ["search", "find", "query", "suche"],
            onSelect: () => openFromSpotlight("search", "search-main", "Search", { width: 600, height: 400 })
        });

        result.push({
            id: "action-memory",
            label: 'Mora Center',
            description: "Erinnerungen, Signale und Kontext öffnen",
            icon: <Brain size={16} className="text-violet-400" />,
            category: "action",
            keywords: ["memory", "gedächtnis", "erinnerung", "lernen", "brain", "wissen"],
            onSelect: () => {
                openMoraCenter(openPane, 'memory');
                onClose();
            }
        });

        result.push({
            id: "action-grid",
            label: "Grid View",
            description: "Read-only node grid",
            icon: <Grid size={16} className="text-emerald-400" />,
            category: "action",
            keywords: ["grid", "nodes", "overview"],
            onSelect: () => openFromSpotlight("grid", "grid-main", "Grid View", { width: 800, height: 600 })
        });

        result.push({
            id: "action-finder",
            label: "Finder",
            description: "Browse folders and files",
            icon: <Folder size={16} className="text-emerald-300" />,
            category: "action",
            keywords: ["finder", "folders", "files"],
            onSelect: () => openFromSpotlight("finder", "finder-main", "Finder", { width: 900, height: 620 })
        });

        result.push({
            id: "action-notes",
            label: "Notes",
            description: "Personal notes",
            icon: <StickyNote size={16} className="text-yellow-400" />,
            category: "action",
            keywords: ["notes", "note", "memo"],
            onSelect: () => openFromSpotlight("notes", "notes-main", "Notes", { width: 860, height: 620 })
        });

        result.push({
            id: "action-scanner",
            label: "Scanner",
            description: "Upload + analyze files",
            icon: <ScanLine size={16} className="text-purple-400" />,
            category: "action",
            keywords: ["scanner", "scan", "upload"],
            onSelect: () => openFromSpotlight("scanner", "scanner-main", "Scanner", { width: 840, height: 600 })
        });

        result.push({
            id: "action-team",
            label: "Team",
            description: "Team presence & chat",
            icon: <Users size={16} className="text-emerald-400" />,
            category: "action",
            keywords: ["team", "presence", "chat"],
            onSelect: () => openFromSpotlight("team", "team-main", "Team", { width: 780, height: 620 })
        });

        result.push({
            id: "action-users",
            label: "Users",
            description: "Team members & invites",
            icon: <Users size={16} className="text-emerald-300" />,
            category: "action",
            keywords: ["users", "members", "roles"],
            onSelect: () => openFromSpotlight("users", "users-main", "Team & Users", { width: 760, height: 600 })
        });

        result.push({
            id: "action-mail",
            label: "Mail",
            description: "Secure mail gateway",
            icon: <Mail size={16} className="text-red-400" />,
            category: "action",
            keywords: ["mail", "email", "inbox"],
            onSelect: () => openFromSpotlight("mail", "mail-main", "Secure Mail", { width: 860, height: 640 })
        });

        result.push({
            id: "action-calendar",
            label: "Calendar",
            description: "Events and scheduling",
            icon: <Calendar size={16} className="text-orange-400" />,
            category: "action",
            keywords: ["calendar", "events", "schedule"],
            onSelect: () => openFromSpotlight("calendar", "calendar-main", "Calendar", { width: 840, height: 620 })
        });

        result.push({
            id: "action-terminal",
            label: "Terminal",
            description: "Command line interface",
            icon: <Terminal size={16} className="text-mora-gold" />,
            category: "action",
            keywords: ["terminal", "cli", "commands"],
            onSelect: () => openFromSpotlight("terminal", "terminal-main", "Terminal", { width: 860, height: 560 })
        });

        result.push({
            id: "action-integrations",
            label: "Integrations",
            description: "Connected services",
            icon: <Wrench size={16} className="text-blue-300" />,
            category: "action",
            keywords: ["integrations", "connectors"],
            onSelect: () => openFromSpotlight("integrations", "integrations-main", "Integrations", { width: 760, height: 560 })
        });

        result.push({
            id: "action-apps",
            label: "App Library",
            description: "Installed apps",
            icon: <Grid size={16} className="text-emerald-400" />,
            category: "action",
            keywords: ["apps", "library", "applications"],
            onSelect: () => openFromSpotlight("apps", "apps-main", "App Library", { width: 800, height: 600 })
        });

        result.push({
            id: "action-home",
            label: "Home",
            description: "Back to universe",
            icon: <Home size={16} className="text-white/60" />,
            category: "navigation",
            keywords: ["home", "universe", "dashboard", "main", "start"],
            onSelect: () => {
                panes.forEach(p => !p.minimized && minimizePane(p.id));
                navigateToCore();
                setActiveCompany(activeCompanyId || null);
                onClose();
            }
        });

        // === DEPARTMENTS (PLANETS) ===
        departments.forEach(dept => {
            result.push({
                id: `dept-${dept.id}`,
                label: dept.name,
                description: "Navigate to department",
                icon: <Building2 size={16} className="text-emerald-500" />,
                category: "entity",
                keywords: ["department", "planet", dept.name.toLowerCase()],
                onSelect: () => {
                    dispatchMoraPresence({ action: 'navigate', targetId: dept.id, targetType: 'department', message: `Navigiere zu ${dept.name}`, source: 'system' });
                    navigateToDepartment(dept.id);
                    onClose();
                }
            });

            // Add spaces for this department
            const spaces = spacesByDepartment[dept.id] || [];
            spaces.forEach(space => {
                result.push({
                    id: `space-${space.id}`,
                    label: space.name,
                    description: `Space in ${dept.name}`,
                    icon: <Layers size={16} className="text-blue-400" />,
                    category: "entity",
                    keywords: ["space", "moon", space.name.toLowerCase(), dept.name.toLowerCase()],
                    onSelect: () => {
                        dispatchMoraPresence({ action: 'navigate', targetId: space.id, targetType: 'space', message: `Navigiere zu ${space.name}`, source: 'system' });
                        navigateToSpace(space.id);
                        onClose();
                    }
                });
            });
        });

        // === COMPANIES ===
        companies.forEach(company => {
            result.push({
                id: `company-${company.id}`,
                label: company.name,
                description: company.is_demo ? 'Demo-Instanz erkunden' : 'Organisation wechseln',
                icon: <Hash size={16} className={company.is_demo ? "text-emerald-400" : "text-mora-gold"} />,
                category: "entity",
                keywords: ["company", "kontext", company.name.toLowerCase(), "firma", "demo"],
                onSelect: () => {
                    setActiveCompany(company.id);
                    onClose();
                }
            });
        });

        return result;
    }, [departments, companies, activeCompanyId, spacesByDepartment, openFromSpotlight, navigateToCore, navigateToDepartment, navigateToSpace, openPane, panes, minimizePane, onClose, setActiveCompany]);

    // Filter actions based on query
    const filteredActions = useMemo(() => {
        if (!query.trim()) {
            // Show top actions when no query
            return actions.slice(0, 8);
        }

        const lowerQuery = query.toLowerCase();
        return actions.filter(action => {
            const labelMatch = action.label.toLowerCase().includes(lowerQuery);
            const descMatch = action.description?.toLowerCase().includes(lowerQuery);
            const keywordMatch = action.keywords?.some(k => k.includes(lowerQuery));
            return labelMatch || descMatch || keywordMatch;
        }).slice(0, 10);
    }, [actions, query]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredActions.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case "Enter":
                e.preventDefault();
                // Check if user is chatting with Mora
                if (query.trim().toLowerCase().startsWith("@mora")) {
                    const message = query.replace(/^@mora\s*/i, "").trim();
                    if (message) {
                        if (message) {
                            handleMoraChat(message);
                            return;
                        }
                    }
                }

                if (filteredActions[selectedIndex]) {
                    filteredActions[selectedIndex].onSelect();
                }
                break;
            case "Escape":
                e.preventDefault();
                onClose();
                break;
        }
    }, [filteredActions, handleMoraChat, onClose, query, selectedIndex]);

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredActions.length]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selectedEl?.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    // Global keyboard shortcut
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                if (isOpen) {
                    onClose();
                }
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh]"
                onClick={onClose}
            >
                {/* Backdrop - Organic Blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#030806]/80 backdrop-blur-md"
                />

                {/* Resonance Field Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="relative w-full max-w-[640px] mx-4"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="relative group/spotlight bg-[#0a0f0d]/90 backdrop-blur-2xl border border-emerald-500/20 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden">

                        {/* ORGANIC FIELD: Breathing Background */}
                        <motion.div
                            className="absolute inset-0 opacity-10 pointer-events-none bg-gradient-to-br from-emerald-500/20 via-transparent to-mora-gold/20"
                            animate={{ opacity: [0.05, 0.15, 0.05] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />

                        {/* Animated Border Gradient */}
                        <div className="absolute inset-0 pointer-events-none opacity-30 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0 -translate-x-full group-hover/spotlight:translate-x-full transition-transform duration-[2000ms] ease-in-out" />

                        {/* HEADER: Search Input Area */}
                        <div className="relative flex items-center gap-4 p-6 border-b border-white/5 bg-white/[0.01]">
                            <div className="relative w-6 h-6 flex items-center justify-center">
                                <Search size={22} className="text-emerald-400 relative z-10" />
                                <motion.div
                                    className="absolute inset-0 bg-emerald-500/30 blur-md rounded-full"
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </div>

                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Resonanz erzeugen..."
                                className="flex-1 bg-transparent text-emerald-50 text-xl font-light placeholder:text-emerald-500/20 focus:outline-none tracking-wide"
                                autoComplete="off"
                                spellCheck={false}
                            />

                            <div className="flex items-center gap-2">
                                {/* Interaction Mode Indicator */}
                                {query.trim().toLowerCase().startsWith("@mora") && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-xs text-emerald-300 font-medium tracking-wide">Direkter Draht</span>
                                    </motion.div>
                                )}

                                <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-emerald-500/40 font-mono tracking-widest uppercase">
                                    Môra Core
                                </div>
                            </div>
                        </div>

                        {/* RESULTS: The Field or Chat Interface */}
                        {(isMoraThinking || moraResponse) ? (
                            <div className="max-h-[500px] h-[400px] overflow-y-auto custom-scrollbar p-6">
                                <div className="space-y-6">
                                    {/* User Query Mirror (Opt) */}
                                    <div className="flex justify-end">
                                        <div className="max-w-[80%] bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-tr-sm p-3 text-sm text-emerald-100/80">
                                            {query.replace(/^@mora\s*/i, "").trim()}
                                        </div>
                                    </div>

                                    {/* Mora Response */}
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-mora-gold/20 to-mora-gold/5 flex items-center justify-center border border-mora-gold/30 shadow-[0_0_15px_-3px_rgba(234,179,8,0.3)]">
                                            {isMoraThinking ? (
                                                <Loader2 size={16} className="text-mora-gold animate-spin" />
                                            ) : (
                                                <Bot size={16} className="text-mora-gold" />
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            {isMoraThinking ? (
                                                <div className="flex items-center gap-2 h-8">
                                                    <span className="text-sm text-mora-gold/60 animate-pulse font-light tracking-wide">Analysiere Resonanz...</span>
                                                </div>
                                            ) : (
                                                <div className="prose prose-invert prose-sm max-w-none">
                                                    <p className="text-sm text-emerald-100/90 leading-relaxed font-light whitespace-pre-wrap">
                                                        {moraResponse}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {!isMoraThinking && (
                                        <div className="pl-12 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setQuery("@mora ");
                                                    setMoraResponse(null);
                                                    inputRef.current?.focus();
                                                }}
                                                className="text-[10px] px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 text-emerald-500/60 hover:text-emerald-400 transition-all uppercase tracking-wider"
                                            >
                                                Antworten
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setQuery("");
                                                    setMoraResponse(null);
                                                    inputRef.current?.focus();
                                                }}
                                                className="text-[10px] px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 text-emerald-500/60 hover:text-red-400 transition-all uppercase tracking-wider"
                                            >
                                                Schließen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div ref={listRef} className="max-h-[500px] overflow-y-auto custom-scrollbar overflow-x-hidden p-2">
                                {filteredActions.length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center gap-4 text-emerald-500/30">
                                        <div className="relative w-16 h-16 flex items-center justify-center">
                                            <div className="absolute inset-0 border border-emerald-500/20 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                                            <div className="absolute inset-0 border border-emerald-500/10 rounded-full animate-ping opacity-20" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                                            <Search size={24} className="opacity-40" />
                                        </div>
                                        <span className="text-sm font-light tracking-widest uppercase opacity-60">Warte auf Signal...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {/* Grouping Logic */}
                                        {['navigation', 'action', 'entity'].map(cat => {
                                            const catActions = filteredActions.filter(a => a.category === cat);
                                            if (catActions.length === 0) return null;

                                            return (
                                                <div key={cat} className="mb-4 first:mt-2">
                                                    <div className="px-4 py-2 text-[9px] font-bold tracking-[0.2em] text-emerald-500/30 uppercase flex items-center gap-2">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                                                        {cat === 'navigation' ? 'Navigations-Ebenen' : cat === 'action' ? 'System-Aktionen' : 'Kontext-Elemente'}
                                                    </div>

                                                    {catActions.map((action) => {
                                                        const isSelected = filteredActions[selectedIndex]?.id === action.id;

                                                        return (
                                                            <button
                                                                key={action.id}
                                                                onClick={action.onSelect}
                                                                onMouseEnter={() => setSelectedIndex(filteredActions.findIndex(a => a.id === action.id))}
                                                                className={`w-full group/item relative flex items-center gap-4 px-4 py-3 mx-1 rounded-xl text-left transition-all duration-200 ${isSelected
                                                                    ? "bg-white/[0.04] translate-x-1"
                                                                    : "hover:bg-white/[0.02]"
                                                                    }`}
                                                                style={{ width: 'calc(100% - 8px)' }}
                                                            >
                                                                {/* Active Glow */}
                                                                {isSelected && (
                                                                    <motion.div
                                                                        layoutId="activeGlow"
                                                                        className="absolute inset-0 bg-emerald-500/5 rounded-xl border border-emerald-500/10 pointer-events-none"
                                                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                                    />
                                                                )}

                                                                <div className={`relative flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${isSelected
                                                                    ? "bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                                                                    : "bg-white/5 text-emerald-500/40"
                                                                    }`}>
                                                                    {action.icon}
                                                                </div>

                                                                <div className="flex-1 min-w-0 z-10">
                                                                    <div className={`text-sm font-medium transition-colors ${isSelected ? "text-emerald-50" : "text-emerald-50/60"}`}>
                                                                        {action.label}
                                                                    </div>
                                                                    {action.description && (
                                                                        <div className={`text-xs truncate transition-colors ${isSelected ? "text-emerald-400/60" : "text-emerald-500/20"}`}>
                                                                            {action.description}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {isSelected && (
                                                                    <motion.div
                                                                        layoutId="enterKey"
                                                                        className="flex items-center gap-2 pr-2"
                                                                        initial={{ opacity: 0 }}
                                                                        animate={{ opacity: 1 }}
                                                                    >
                                                                        <ArrowRight size={14} className="text-emerald-400" />
                                                                    </motion.div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FOOTER: Minimalist Status */}
                        <div className="px-6 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-[9px] text-emerald-500/30 uppercase tracking-[0.15em] font-medium">
                            <div className="flex items-center gap-4">
                                <span>Resonance Field v2.0</span>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-60">
                                <span className="text-emerald-500/60">ESC</span> to Close
                            </div>
                        </div>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};




