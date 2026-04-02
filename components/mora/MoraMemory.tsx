"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Brain,
    Search,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Sparkles,
    ChevronRight,
    RefreshCw,
    BookOpen,
    Lightbulb,
    Heart,
    Target,
    Shield,
} from "lucide-react";
import {
    searchMemory as searchMemoryApi,
    getMemoryPending,
} from "@/lib/api/coreClient";
import { toast } from "sonner";
import { useMoraStore } from "@/lib/store/moraState";
import { useMemory } from "@/lib/hooks/useMemory";
import type {
    MemorySearchResult as MemoryEntry,
    ReviewItem,
    MemoryMetrics
} from "@/lib/types/memory";
// ===========================================================================
const categoryIcons: Record<string, React.ElementType> = {
    preference: Heart,
    fact: BookOpen,
    goal: Target,
    policy: Shield,
    context: Lightbulb,
    default: Brain,
};

const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || categoryIcons.default;
};

const riskColors: Record<string, string> = {
    low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    high: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

// ===========================================================================
// ===========================================================================
// ===========================================================================
interface MemorySearchProps {
    compact?: boolean;
    companyId?: string | null;
}

export const MemorySearch: React.FC<MemorySearchProps> = ({ compact = false, companyId }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MemoryEntry[]>([]);
    const [recent, setRecent] = useState<MemoryEntry[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingRecent, setIsLoadingRecent] = useState(false);

    const runMemorySearch = useCallback(async () => {
        if (!companyId) {
            setResults([]);
            return;
        }
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const data = await searchMemoryApi(query, 10, companyId);
            if (data && Array.isArray(data)) {
                setResults(data);
            } else {
                setResults([]);
            }
        } catch (err) {
            console.error("[MemorySearch] Error:", err);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [query, companyId]);

    const loadRecent = useCallback(async () => {
        if (!companyId) {
            setRecent([]);
            return;
        }
        setIsLoadingRecent(true);
        try {
            const data = await searchMemoryApi("", 10, companyId);
            setRecent(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("[MemorySearch] Recent load error:", err);
            setRecent([]);
        } finally {
            setIsLoadingRecent(false);
        }
    }, [companyId]);

    useEffect(() => {
        void loadRecent();
    }, [loadRecent]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                runMemorySearch();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, runMemorySearch]);

    const shownEntries = query.length >= 2 ? results : recent;
    const isShowingSearch = query.length >= 2;

    return (
        <div className="space-y-2">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Gedaechtnis durchsuchen..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 transition-colors"
                />
                {isSearching && (
                    <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-400 animate-spin" />
                )}
            </div>

            {/* Results */}
            {!isShowingSearch && (
                <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-white/30">Kuerzlich gelernt</span>
                    {isLoadingRecent && <RefreshCw className="h-3 w-3 text-emerald-400 animate-spin" />}
                </div>
            )}
            {shownEntries.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {shownEntries.map((entry) => {
                        const Icon = getCategoryIcon(entry.category || "default");
                        return (
                            <div
                                key={entry.id}
                                className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors"
                            >
                                <Icon className="h-3.5 w-3.5 text-emerald-400/60 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white/80 line-clamp-2">{entry.summary}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] text-white/30">{entry.source}</span>
                                        {entry.score && (
                                            <span className="text-[9px] text-emerald-400/50">
                                                {Math.round(entry.score * 100)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isShowingSearch && results.length === 0 && !isSearching && (
                <div className="text-center py-4 text-white/30 text-xs">
                    Keine Erinnerungen gefunden
                </div>
            )}
            {!isShowingSearch && !isLoadingRecent && recent.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                    <Brain className="w-5 h-5 text-white/15" />
                    <span className="text-xs text-white/30">Noch keine Erkenntnisse gespeichert</span>
                </div>
            )}
        </div>
    );
};

// ===========================================================================
// ===========================================================================
// ===========================================================================
interface ReviewQueueProps {
    compact?: boolean;
    companyId?: string | null;
    onUpdate?: () => void;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ compact = false, companyId, onUpdate }) => {
    const { pendingItems: items, isLoading, approve, reject } = useMemory(companyId);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        const success = await approve(id);
        if (success) onUpdate?.();
        setProcessingId(null);
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        await reject(id);
        setProcessingId(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 text-emerald-400 animate-spin" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-4">
                <CheckCircle className="h-6 w-6 text-emerald-500/30 mx-auto mb-2" />
                <p className="text-xs text-white/30">Keine offenen Reviews</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider text-white/30">
                    {items.length} Insight{items.length !== 1 ? "s" : ""} zur Pruefung
                </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {items.map((item) => {
                    const Icon = getCategoryIcon(item.category);
                    const colorClass = riskColors[item.risk_level] || riskColors.low;
                    const isProcessing = processingId === item.id;

                    return (
                        <div
                            key={item.id}
                            className={`p-2.5 rounded-lg border ${colorClass} transition-all ${isProcessing ? "opacity-50" : ""
                                }`}
                        >
                            <div className="flex items-start gap-2">
                                <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white/80 line-clamp-2">{item.insight}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] text-white/40 capitalize">
                                            {item.category}
                                        </span>
                                        <span className="text-[9px] text-white/30">
                                            {item.risk_level === "high" ? "Wichtig" : "Normal"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                <button
                                    onClick={() => handleApprove(item.id)}
                                    disabled={isProcessing}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-medium transition-colors disabled:opacity-50"
                                >
                                    <CheckCircle className="h-3 w-3" />
                                    Lernen
                                </button>
                                <button
                                    onClick={() => handleReject(item.id)}
                                    disabled={isProcessing}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/50 text-[10px] font-medium transition-colors disabled:opacity-50"
                                >
                                    <XCircle className="h-3 w-3" />
                                    Ablehnen
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ===========================================================================
// ===========================================================================
// ===========================================================================
interface MemoryStatsProps {
    compact?: boolean;
    companyId?: string | null;
}

export const MemoryStats: React.FC<MemoryStatsProps> = ({ compact = false, companyId }) => {
    const { metrics, isLoading } = useMemory(companyId);

    if (!companyId) {
        return (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-white/35">
                Kein Kontext aktiv. Konto-Gedaechtnis bleibt sichtbar, Organisationsmetriken sind ausgeblendet.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-xs text-white/40 p-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400/70" />
                Lade Organisationsmetriken...
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-white/35">
                Keine Organisationsmetriken verfuegbar.
            </div>
        );
    }

    const episodicMemories =
        metrics?.episodic_memories && typeof metrics.episodic_memories === 'object'
            ? metrics.episodic_memories
            : {};
    const totalEpisodic = Object.values(episodicMemories).reduce((a, b: number) => a + b, 0);

    const stats = [
        { label: "Erinnerungen", value: totalEpisodic, color: "emerald" },
        { label: "Fakten", value: metrics.structured_facts, color: "blue" },
        { label: "Offen", value: metrics.pending_reviews, color: metrics.pending_reviews > 0 ? "amber" : "white" },
        { label: "Neu (7d)", value: metrics.recent_learns_7d, color: "violet" },
    ];

    const colorMap: Record<string, string> = {
        emerald: "text-emerald-400",
        blue: "text-blue-400",
        amber: "text-amber-400",
        violet: "text-violet-400",
        white: "text-white/40",
    };

    return (
        <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-4"} gap-1.5`}>
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="bg-white/[0.02] rounded-lg p-2 border border-white/[0.04]"
                >
                    <div className={`text-sm font-light ${colorMap[stat.color]}`}>
                        {stat.value}
                    </div>
                    <div className="text-[8px] text-white/30 uppercase tracking-wider">
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ===========================================================================
// ===========================================================================
// ===========================================================================
interface MoraMemoryProps {
    compact?: boolean;
    showSearch?: boolean;
    showQueue?: boolean;
    showStats?: boolean;
    companyId?: string | null;
}

export const MoraMemory: React.FC<MoraMemoryProps> = ({
    compact = false,
    showSearch = true,
    showQueue = true,
    showStats = true,
    companyId = null,
}) => {
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const resolvedCompanyId = companyId ?? activeCompanyId ?? null;
    const [activeTab, setActiveTab] = useState<"search" | "queue" | "stats">("search");
    const [refreshKey, setRefreshKey] = useState(0);

    const tabs = [
        { id: "search" as const, label: "Suchen", icon: Search, show: showSearch },
        { id: "queue" as const, label: "Review", icon: AlertTriangle, show: showQueue },
        { id: "stats" as const, label: "Metriken", icon: Brain, show: showStats },
    ].filter((t) => t.show);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-400" />
                    <span className="text-xs font-medium text-white/80">
                        {resolvedCompanyId ? 'Organisations-Memory' : 'Konto-Gedaechtnis'}
                    </span>
                </div>
                <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${activeTab === tab.id
                                    ? "bg-violet-500/20 text-violet-300"
                                    : "text-white/40 hover:text-white/60"
                                    }`}
                            >
                                <Icon className="h-3 w-3" />
                                {!compact && tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            {activeTab === "search" && showSearch && <MemorySearch compact={compact} companyId={resolvedCompanyId} />}
            {activeTab === "queue" && showQueue && (
                <ReviewQueue compact={compact} companyId={resolvedCompanyId} onUpdate={() => setRefreshKey((k) => k + 1)} />
            )}
            {activeTab === "stats" && showStats && <MemoryStats key={refreshKey} compact={compact} companyId={resolvedCompanyId} />}
        </div>
    );
};

export default MoraMemory;
