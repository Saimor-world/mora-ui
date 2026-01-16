"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMoraStore } from "@/lib/store/moraState";
import { usePaneStore } from "@/lib/store/paneStore";
import {
    Search,
    Command,
    Folder,
    FileText,
    Settings,
    Users,
    Mail,
    Grid,
    Home,
    Zap,
    MessageSquare,
    Moon,
    LogOut,
    ArrowRight,
    Hash,
    Building2,
    Layers
} from "lucide-react";

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
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Store access
    const {
        departments,
        companies,
        spacesByDepartment,
        activeCompanyId,
        setViewLevel,
        setActiveCompany,
        setViewMode,
        viewMode,
        navigateToDepartment,
        navigateToSpace
    } = useMoraStore();

    const activeCompany = useMemo(() => companies.find(c => c.id === activeCompanyId), [companies, activeCompanyId]);

    const { addPane, getPane, focusPane, restorePane, panes, minimizePane } = usePaneStore();

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

    // Helper to open/focus pane
    const openPane = useCallback((type: string, id: string, title: string, size = { width: 700, height: 500 }) => {
        const existing = getPane(id);
        if (existing) {
            if (existing.minimized) restorePane(id);
            else focusPane(id);
        } else {
            const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
            const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
            addPane({
                id,
                type: type as any,
                title,
                position: {
                    x: Math.floor((windowWidth - size.width) / 2),
                    y: Math.floor((windowHeight - size.height) / 2) - 40
                },
                size,
                minimized: false
            });
        }
        onClose();
    }, [getPane, restorePane, focusPane, addPane, onClose]);

    // Build actions list
    const actions = useMemo<SpotlightAction[]>(() => {
        const result: SpotlightAction[] = [];

        // === QUICK ACTIONS ===
        result.push({
            id: "action-settings",
            label: "Einstellungen öffnen",
            description: "MÔRA-Präferenzen konfigurieren",
            icon: <Settings size={16} className="text-white/60" />,
            category: "action",
            keywords: ["settings", "preferences", "config", "options", "einstellungen"],
            onSelect: () => openPane("settings", "settings-main", "Settings")
        });

        result.push({
            id: "action-finder",
            label: "Finder öffnen",
            description: "Dateien und Knoten durchsuchen",
            icon: <Folder size={16} className="text-blue-400" />,
            category: "action",
            keywords: ["finder", "files", "browse", "explorer", "dateien"],
            onSelect: () => openPane("finder", "finder-main", "Finder", { width: 800, height: 550 })
        });

        result.push({
            id: "action-search",
            label: "Alles durchsuchen",
            description: "Semantische Suche im Arbeitsbereich",
            icon: <Search size={16} className="text-emerald-400" />,
            category: "action",
            keywords: ["search", "find", "query", "suche"],
            onSelect: () => openPane("search", "search-main", "Search", { width: 600, height: 400 })
        });

        result.push({
            id: "action-mail",
            label: "E-Mails öffnen",
            description: "Ihren Posteingang prüfen",
            icon: <Mail size={16} className="text-orange-400" />,
            category: "action",
            keywords: ["mail", "email", "inbox", "gmail", "post"],
            onSelect: () => openPane("mail", "mail-main", "Gmail", { width: 500, height: 600 })
        });

        result.push({
            id: "action-notes",
            label: "Notizen öffnen",
            description: "Schnelle Memos und Notizen",
            icon: <FileText size={16} className="text-yellow-400" />,
            category: "action",
            keywords: ["notes", "memo", "write", "document", "notizen"],
            onSelect: () => openPane("notes", "notes-main", "Notes", { width: 600, height: 500 })
        });

        result.push({
            id: "action-users",
            label: "Team & Benutzer",
            description: "Teammitglieder verwalten",
            icon: <Users size={16} className="text-purple-400" />,
            category: "action",
            keywords: ["users", "team", "members", "people", "benutzer"],
            onSelect: () => openPane("users", "users-main", "Team & Users")
        });

        result.push({
            id: "action-apps",
            label: "App-Bibliothek",
            description: "Alle verfügbaren Anwendungen",
            icon: <Grid size={16} className="text-emerald-400" />,
            category: "action",
            keywords: ["apps", "library", "applications", "apps"],
            onSelect: () => openPane("apps", "apps-main", "App Library", { width: 800, height: 600 })
        });

        result.push({
            id: "action-home",
            label: "Zum Hauptbereich",
            description: "Zurück zum Universum",
            icon: <Home size={16} className="text-white/60" />,
            category: "navigation",
            keywords: ["home", "universe", "dashboard", "main", "start"],
            onSelect: () => {
                // Minimize all panes to show the universe
                panes.forEach(p => !p.minimized && minimizePane(p.id));
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
                description: company.is_demo ? "Demo-Unternehmen erkunden" : "Arbeitsbereich wechseln",
                icon: <Hash size={16} className={company.is_demo ? "text-emerald-400" : "text-mora-gold"} />,
                category: "entity",
                keywords: ["company", "workspace", company.name.toLowerCase(), "firma", "demo"],
                onSelect: () => {
                    setActiveCompany(company.id);
                    setViewMode(company.is_demo ? 'demo' : 'workspace');
                    onClose();
                }
            });
        });

        return result;
    }, [departments, companies, activeCompanyId, spacesByDepartment, openPane, navigateToDepartment, navigateToSpace, panes, minimizePane, onClose, setActiveCompany]);

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
                if (filteredActions[selectedIndex]) {
                    filteredActions[selectedIndex].onSelect();
                }
                break;
            case "Escape":
                e.preventDefault();
                onClose();
                break;
        }
    }, [filteredActions, selectedIndex, onClose]);

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
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                {/* Spotlight Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="relative w-full max-w-[560px] mx-4"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="relative group/spotlight bg-[#0a0f0d]/95 backdrop-blur-2xl border border-emerald-500/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">

                        {/* Animated Border Gradient */}
                        <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-r from-emerald-500/0 via-emerald-500/30 to-emerald-500/0 -translate-x-full group-hover/spotlight:translate-x-full transition-transform duration-[2000ms] ease-in-out" />

                        {/* Search Input Area */}
                        <div className="relative flex items-center gap-3 p-5 border-b border-white/5 bg-white/[0.02]">
                            <div className="relative">
                                <Search size={20} className="text-emerald-500/40" />
                                <motion.div
                                    className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full"
                                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Aktion suchen oder Befehl eingeben..."
                                className="flex-1 bg-transparent text-emerald-50 text-lg placeholder:text-emerald-500/20 focus:outline-none font-light"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <div className="flex items-center gap-2">
                                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-emerald-500/40 font-mono">
                                    <span className="text-xs">⌘</span>
                                    <span>K</span>
                                </kbd>
                            </div>
                        </div>

                        {/* Results List */}
                        <div ref={listRef} className="max-h-[450px] overflow-y-auto custom-scrollbar overflow-x-hidden">
                            {filteredActions.length === 0 ? (
                                <div className="p-12 text-center text-emerald-500/30 flex flex-col items-center gap-3">
                                    <Zap size={32} className="opacity-20 translate-y-2" />
                                    <span className="text-sm italic">Keine Treffer für "{query}"</span>
                                </div>
                            ) : (
                                <div className="py-2">
                                    {/* Grouping Logic (Simplified UI grouping) */}
                                    {['navigation', 'action', 'entity'].map(cat => {
                                        const catActions = filteredActions.filter(a => a.category === cat);
                                        if (catActions.length === 0) return null;

                                        return (
                                            <div key={cat} className="mb-2 last:mb-0">
                                                <div className="px-5 py-2 text-[10px] font-bold tracking-[0.2em] text-emerald-500/30 uppercase flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                                                    {cat === 'navigation' ? 'Navigation' : cat === 'action' ? 'Aktionen' : 'Einträge'}
                                                </div>

                                                {catActions.map((action) => {
                                                    const isSelected = filteredActions[selectedIndex]?.id === action.id;

                                                    return (
                                                        <button
                                                            key={action.id}
                                                            onClick={action.onSelect}
                                                            onMouseEnter={() => setSelectedIndex(filteredActions.findIndex(a => a.id === action.id))}
                                                            className={`w-full group/item relative flex items-center gap-4 px-5 py-3 text-left transition-all duration-200 ${isSelected
                                                                ? "bg-emerald-500/10"
                                                                : "hover:bg-white/[0.03]"
                                                                }`}
                                                        >
                                                            {/* Selection Marker */}
                                                            {isSelected && (
                                                                <motion.div
                                                                    layoutId="selectionBar"
                                                                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-emerald-500 rounded-r-full"
                                                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                                />
                                                            )}

                                                            <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${isSelected
                                                                ? "bg-emerald-500/20 text-emerald-300"
                                                                : "bg-white/5 text-emerald-500/40"
                                                                }`}>
                                                                {action.icon}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
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
                                                                <div className="flex items-center gap-2 pr-2">
                                                                    <span className="text-[10px] text-emerald-500/40 opacity-0 group-hover/item:opacity-100 transition-opacity uppercase font-mono tracking-tighter">Enter</span>
                                                                    <ArrowRight size={14} className="text-emerald-500/50" />
                                                                </div>
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

                        {/* High-End Footer */}
                        <div className="px-5 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] text-emerald-500/30 uppercase tracking-[0.15em] font-medium">
                            <div className="flex items-center gap-6">
                                <span className="flex items-center gap-1.5"><span className="text-emerald-500/60">↑↓</span> Navigieren</span>
                                <span className="flex items-center gap-1.5"><span className="text-emerald-500/60">↵</span> Auswählen</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-emerald-500/60">ESC</span> Schließen
                            </div>
                        </div>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
