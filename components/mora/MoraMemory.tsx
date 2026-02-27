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
import { coreGet, corePost } from "@/lib/api/coreClient";
import { toast } from "sonner";
import { useMoraStore } from "@/lib/store/moraState";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
interface MemoryEntry {
    id: string;
    summary: string;
    tags: string[];
    timestamp: string;
    source: string;
    score?: number;
    category?: string;
}

interface ReviewItem {
    id: string;
    insight: string;
    category: string;
    risk_level: string;
    status: string;
    created_at: string;
}

interface MemoryMetrics {
    episodic_memories: Record<string, number>;
    structured_facts: number;
    pending_reviews: number;
    recent_learns_7d: number;
    memory_ttl_days: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY ICONS
// ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY SEARCH
// ═══════════════════════════════════════════════════════════════════════════
interface MemorySearchProps {
    compact?: boolean;
    companyId?: string | null;
}

export const MemorySearch: React.FC<MemorySearchProps> = ({ compact = false, companyId }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MemoryEntry[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const searchMemory = useCallback(async () => {
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
            const companyQuery = companyId ? `&company_id=${encodeURIComponent(companyId)}` : "";
            const data = await coreGet(`/v1/memory/search?q=${encodeURIComponent(query)}&limit=10${companyQuery}`, { isOptional: true });
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

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                searchMemory();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, searchMemory]);

    return (
        <div className="space-y-2">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Gedächtnis durchsuchen..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 transition-colors"
                />
                {isSearching && (
                    <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-400 animate-spin" />
                )}
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {results.map((entry) => {
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

            {query.length >= 2 && results.length === 0 && !isSearching && (
                <div className="text-center py-4 text-white/30 text-xs">
                    Keine Erinnerungen gefunden
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// REVIEW QUEUE
// ═══════════════════════════════════════════════════════════════════════════
interface ReviewQueueProps {
    compact?: boolean;
    companyId?: string | null;
    onUpdate?: () => void;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ compact = false, companyId, onUpdate }) => {
    const [items, setItems] = useState<ReviewItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadQueue = useCallback(async () => {
        if (!companyId) {
            setItems([]);
            setIsLoading(false);
            return;
        }
        try {
            const companyQuery = companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";
            const data = await coreGet(`/v1/memory/pending${companyQuery}`, { isOptional: true });
            if (data && Array.isArray(data)) {
                setItems(data);
            }
        } catch (err) {
            console.error("[ReviewQueue] Error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    const handleApprove = async (id: string) => {
        if (!companyId) return;
        setProcessingId(id);
        try {
            const companyQuery = companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";
            await corePost(`/v1/memory/approve/${id}${companyQuery}`, {});
            toast.success("Insight gelernt und gespeichert");
            setItems((prev) => prev.filter((item) => item.id !== id));
            onUpdate?.();
        } catch (err) {
            toast.error("Fehler beim Speichern");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!companyId) return;
        setProcessingId(id);
        try {
            const companyQuery = companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";
            await corePost(`/v1/memory/reject/${id}${companyQuery}`, {});
            toast.info("Insight abgelehnt");
            setItems((prev) => prev.filter((item) => item.id !== id));
        } catch (err) {
            toast.error("Fehler beim Ablehnen");
        } finally {
            setProcessingId(null);
        }
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
                    {items.length} Insight{items.length !== 1 ? "s" : ""} zur Prüfung
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
                            className={`p-2.5 rounded-lg border ${colorClass} transition-all ${
                                isProcessing ? "opacity-50" : ""
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

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY STATS
// ═══════════════════════════════════════════════════════════════════════════
interface MemoryStatsProps {
    compact?: boolean;
    companyId?: string | null;
}

export const MemoryStats: React.FC<MemoryStatsProps> = ({ compact = false, companyId }) => {
    const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadMetrics = async () => {
            if (!companyId) {
                setMetrics(null);
                setIsLoading(false);
                return;
            }
            try {
                const companyQuery = companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";
                const data = await coreGet(`/v1/memory/metrics${companyQuery}`, { isOptional: true });
                if (data && !data.error) {
                    setMetrics(data);
                }
            } catch (err) {
                console.error("[MemoryStats] Error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadMetrics();
        const interval = setInterval(loadMetrics, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [companyId]);

    if (isLoading || !metrics) {
        return null;
    }

    const totalEpisodic = Object.values(metrics.episodic_memories).reduce((a, b) => a + b, 0);

    const stats = [
        { label: "Erinnerungen", value: totalEpisodic, color: "emerald" },
        { label: "Fakten", value: metrics.structured_facts, color: "blue" },
        { label: "Pending", value: metrics.pending_reviews, color: metrics.pending_reviews > 0 ? "amber" : "white" },
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
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
    const resolvedCompanyId = companyId || activeCompanyId || null;
    const [activeTab, setActiveTab] = useState<"search" | "queue" | "stats">("search");
    const [refreshKey, setRefreshKey] = useState(0);

    const tabs = [
        { id: "search" as const, label: "Suchen", icon: Search, show: showSearch },
        { id: "queue" as const, label: "Review", icon: AlertTriangle, show: showQueue },
        { id: "stats" as const, label: "Stats", icon: Brain, show: showStats },
    ].filter((t) => t.show);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-400" />
                    <span className="text-xs font-medium text-white/80">Mora&#39;s Gedächtnis</span>
                </div>
                <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${
                                    activeTab === tab.id
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
