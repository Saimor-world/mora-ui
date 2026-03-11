"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { coreGet } from "@/lib/api/coreClient";
import { realtime } from "@/lib/api/realtimeClient";
import { useMoraStore } from "@/lib/store/moraState";
import { usePaneStore } from "@/lib/store/paneStore";
import { useHilToggle } from "@/lib/hooks/useHilToggle";
import { Activity, RefreshCw, Check, Info, ChevronRight, Clock } from "lucide-react";
import { toast } from "@/lib/toast";
import { dispatchMoraPresence } from "@/lib/mora/presenceEvents";

interface MindLoopEvent {
    id: string | number;
    timestamp?: string;
    created_at?: string;
    event_type: string;
    source: string;
    payload?: Record<string, any>;
}

interface MindLoopResponse {
    events: MindLoopEvent[];
    total?: number;
    count?: number;
    timestamp?: string;
}

type FeedScope = "company" | "department";

type FeedAction = {
    type: "open_node" | "navigate_department" | "navigate_space" | "navigate_folder" | "navigate_company";
    label: string;
    nodeId?: string;
    nodeName?: string;
    folderId?: string;
    folderName?: string;
    spaceId?: string;
    spaceName?: string;
    departmentId?: string;
    departmentName?: string;
    companyId?: string;
    companyName?: string;
};

interface MoraUpdatesFeedProps {
    scope: FeedScope;
    title?: string;
    maxEvents?: number;
    compact?: boolean;
    showHeader?: boolean;
    showHilToggle?: boolean;
    className?: string;
}

const EVENT_LABELS: Record<string, string> = {
    semantic: "Semantic Insight",
    awareness: "Awareness Signal",
    system: "System Signal",
    context_shift: "Context Shift",
    potential_risk: "Potential Risk",
    related_objects_cluster: "Related Cluster",
    data_change: "Data Change",
    system_alert: "System Alert",
    insight: "Insight",
    signal: "Signal",
};

const getEventLabel = (eventType: string) => {
    return EVENT_LABELS[eventType] || eventType.replace(/_/g, " ");
};

const pickPayloadValue = (payload: Record<string, any> | undefined, ...keys: string[]) => {
    if (!payload) return undefined;
    for (const key of keys) {
        const value = payload[key];
        if (value) return value;
    }
    return undefined;
};

const extractNodeId = (payload: Record<string, any> | undefined) => {
    if (!payload) return undefined;
    const direct = pickPayloadValue(payload, "node_id", "nodeId");
    if (direct) return direct;

    const candidates = ["node_ids", "nodes", "critical_nodes", "nodes_list", "node_list"];
    for (const key of candidates) {
        const value = payload[key];
        if (Array.isArray(value) && value.length > 0) {
            const first = value[0];
            if (typeof first === "string") return first;
            if (typeof first === "object" && first) {
                const nested = first.id || first.node_id || first.nodeId;
                if (nested) return nested;
            }
        }
    }
    return undefined;
};

export const MoraUpdatesFeed: React.FC<MoraUpdatesFeedProps> = ({
    scope,
    title = "Was gibt es Neues?",
    maxEvents = 12,
    compact = false,
    showHeader = true,
    showHilToggle = true,
    className,
}) => {
    const {
        activeCompanyId,
        activeDepartmentId,
        navigateToCore,
        navigateToDepartment,
        navigateToSpace,
        navigateToFolder,
        loadNodeDetails,
    } = useMoraStore();
    const { openPane } = usePaneStore();
    const { hilEnabled, setHilEnabled } = useHilToggle();

    const [events, setEvents] = useState<MindLoopEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | number | null>(null);
    const [pendingAction, setPendingAction] = useState<{ event: MindLoopEvent; action: FeedAction } | null>(null);

    const contextCompanyId = activeCompanyId || undefined;
    const contextDepartmentId = activeDepartmentId || undefined;

    const fetchEvents = useCallback(async () => {
        if (!contextCompanyId) {
            setError("Missing company context.");
            return;
        }
        if (scope === "department" && !contextDepartmentId) {
            setError("Missing department context.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set("limit", String(maxEvents));
            params.set("company_id", contextCompanyId);
            if (scope === "department" && contextDepartmentId) {
                params.set("department_id", contextDepartmentId);
            }
            const res: MindLoopResponse = await coreGet(`/v3/mindloop/events?${params.toString()}`);
            setEvents(res?.events || []);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch updates");
        } finally {
            setLoading(false);
        }
    }, [contextCompanyId, contextDepartmentId, scope, maxEvents]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        const interval = setInterval(fetchEvents, 15000);
        return () => clearInterval(interval);
    }, [fetchEvents]);

    useEffect(() => {
        if (!contextCompanyId) return;

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const scheduleRefresh = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                void fetchEvents();
            }, 250);
        };

        const handleMindloopEvent = (event: MindLoopEvent) => {
            const payload = typeof event?.payload === "object" ? event.payload : undefined;
            const eventCompanyId = pickPayloadValue(payload, "company_id", "companyId");
            const eventDepartmentId = pickPayloadValue(payload, "department_id", "departmentId");

            if (eventCompanyId && eventCompanyId !== contextCompanyId) return;
            if (scope === "department" && contextDepartmentId && eventDepartmentId && eventDepartmentId !== contextDepartmentId) return;
            if (!eventCompanyId && scope === "department" && contextDepartmentId && !eventDepartmentId) return;

            scheduleRefresh();
        };

        realtime.on("mindloop_event", handleMindloopEvent);
        return () => {
            realtime.off("mindloop_event", handleMindloopEvent);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [contextCompanyId, contextDepartmentId, scope, fetchEvents]);

    const visibleEvents = useMemo(() => {
        if (scope !== "department" || !contextDepartmentId) return events;
        return events.filter((event) => {
            const payload = typeof event.payload === "object" ? event.payload : undefined;
            const dept = pickPayloadValue(payload, "department_id", "departmentId");
            return dept === contextDepartmentId;
        });
    }, [events, scope, contextDepartmentId]);

    const getEventSummary = (event: MindLoopEvent) => {
        const payload = typeof event.payload === "object" ? event.payload : undefined;
        return (
            pickPayloadValue(payload, "title", "summary") ||
            pickPayloadValue(payload, "intent", "message") ||
            pickPayloadValue(payload, "description") ||
            pickPayloadValue(payload, "action", "trigger", "reason") ||
            getEventLabel(event.event_type)
        );
    };

    const getEventActionLabel = (event: MindLoopEvent) => {
        const payload = typeof event.payload === "object" ? event.payload : undefined;
        return pickPayloadValue(payload, "action", "intent", "trigger", "reason", "event");
    };

    const filteredEvents = useMemo(() => {
        const noiseActions = new Set([
            "loadCompanies",
            "loadDepartments",
            "loadSpaces",
            "loadFolders",
            "loadNodes",
            "loadTree"
        ]);
        const cleaned = visibleEvents.filter((event) => {
            const payload = typeof event.payload === "object" ? event.payload : undefined;
            const action = pickPayloadValue(payload, "action", "intent", "trigger");
            if (action && noiseActions.has(String(action))) return false;
            return true;
        });
        const seen = new Set<string>();
        const deduped: MindLoopEvent[] = [];
        cleaned.forEach((event) => {
            const payload = typeof event.payload === "object" ? event.payload : undefined;
            const action = pickPayloadValue(payload, "action", "intent", "trigger");
            const nodeId = extractNodeId(payload);
            const key = [event.event_type, action || "", nodeId || ""].join("|");
            if (seen.has(key)) return;
            seen.add(key);
            deduped.push(event);
        });
        return deduped;
    }, [visibleEvents]);

    const dedupedEvents = useMemo(() => {
        const seen = new Set<string>();
        return filteredEvents.filter((event) => {
            const summary = getEventSummary(event);
            const timestamp = event.created_at || event.timestamp;
            const bucket = timestamp ? Math.floor(new Date(timestamp).getTime() / 60000) : 0;
            const key = `${event.event_type}|${event.source}|${summary}|${bucket}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [filteredEvents]);

    const prioritizedEvents = useMemo(() => {
        const nonAwareness = dedupedEvents.filter((event) => event.event_type !== "awareness");
        return nonAwareness.length > 0 ? nonAwareness : dedupedEvents;
    }, [dedupedEvents]);

    const buildAction = (event: MindLoopEvent): FeedAction | null => {
        const payload = typeof event.payload === "object" ? event.payload : undefined;
        const entityType = pickPayloadValue(payload, "entity_type", "entityType");
        const entityId = pickPayloadValue(payload, "entity_id", "entityId");

        const nodeId = extractNodeId(payload) || (entityType === "node" ? entityId : undefined);
        const nodeName = pickPayloadValue(payload, "node_name", "nodeName", "title", "name", "summary");
        const folderId = pickPayloadValue(payload, "folder_id", "folderId") || (entityType === "folder" ? entityId : undefined);
        const folderName = pickPayloadValue(payload, "folder_name", "folderName", "title", "name");
        const spaceId = pickPayloadValue(payload, "space_id", "spaceId") || (entityType === "space" ? entityId : undefined);
        const spaceName = pickPayloadValue(payload, "space_name", "spaceName", "title", "name");
        const departmentId = pickPayloadValue(payload, "department_id", "departmentId") || (entityType === "department" ? entityId : undefined);
        const departmentName = pickPayloadValue(payload, "department_name", "departmentName", "title", "name");
        const companyId = pickPayloadValue(payload, "company_id", "companyId") || (entityType === "company" ? entityId : undefined);
        const companyName = pickPayloadValue(payload, "company_name", "companyName", "title", "name");

        if (nodeId) {
            return {
                type: "open_node",
                label: "Navigate + Open",
                nodeId,
                nodeName,
                folderId,
                folderName,
                spaceId,
                spaceName,
                departmentId,
                departmentName,
                companyId,
                companyName,
            };
        }
        if (folderId) {
            return {
                type: "navigate_folder",
                label: "Navigate",
                folderId,
                folderName,
                spaceId,
                spaceName,
                departmentId,
                departmentName,
                companyId,
                companyName,
            };
        }
        if (spaceId) {
            return {
                type: "navigate_space",
                label: "Navigate",
                spaceId,
                spaceName,
                departmentId,
                departmentName,
                companyId,
                companyName,
            };
        }
        if (departmentId) {
            return {
                type: "navigate_department",
                label: "Navigate",
                departmentId,
                departmentName,
                companyId,
                companyName,
            };
        }
        if (companyId) {
            return {
                type: "navigate_company",
                label: "Navigate",
                companyId,
                companyName,
            };
        }
        return null;
    };

    const executeAction = async (action: FeedAction) => {
        try {
            const primaryPresenceTarget = action.folderId
                ? {
                    targetId: action.folderId,
                    targetType: 'folder' as const,
                    message: action.folderName ? `Navigiere zu ${action.folderName}` : 'Navigiere zum Ordner',
                }
                : action.spaceId
                    ? {
                        targetId: action.spaceId,
                        targetType: 'space' as const,
                        message: action.spaceName ? `Navigiere zu ${action.spaceName}` : 'Navigiere zum Space',
                    }
                    : action.departmentId
                        ? {
                            targetId: action.departmentId,
                            targetType: 'department' as const,
                            message: action.departmentName ? `Navigiere zu ${action.departmentName}` : 'Navigiere zum Bereich',
                        }
                        : action.type === "navigate_company" && action.companyId
                            ? {
                                targetId: action.companyId,
                                targetType: 'company' as const,
                                message: action.companyName ? `Navigiere zu ${action.companyName}` : 'Navigiere zur Firma',
                            }
                            : null;

            if (primaryPresenceTarget) {
                dispatchMoraPresence({
                    action: 'navigate',
                    targetId: primaryPresenceTarget.targetId,
                    targetType: primaryPresenceTarget.targetType,
                    message: primaryPresenceTarget.message,
                    source: 'system'
                });
            }

            if (action.departmentId) {
                navigateToDepartment(action.departmentId);
            }
            if (action.spaceId) {
                navigateToSpace(action.spaceId);
            }
            if (action.folderId) {
                navigateToFolder(action.folderId);
            }
            if (action.type === "navigate_company") {
                navigateToCore();
            }
            if (action.type === "open_node" && action.nodeId) {
                await loadNodeDetails(action.nodeId);
                openPane({
                    id: `doc-${action.nodeId}`,
                    type: "document",
                    title: "Document",
                    size: { width: 600, height: 700 },
                    data: { nodeId: action.nodeId },
                });
            }
        } catch (err) {
            console.error("[MoraUpdatesFeed] action failed", err);
            toast.error("Action failed. Try again.");
        }
    };

    const confirmAction = async () => {
        if (!pendingAction) return;
        await executeAction(pendingAction.action);
        setPendingAction(null);
    };

    const formatTime = (iso?: string) => {
        if (!iso) return "";
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (iso?: string) => {
        if (!iso) return "";
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    };

    return (
        <div className={`h-full flex flex-col ${compact ? "rounded-xl" : "rounded-2xl"} border border-white/10 bg-black/40 backdrop-blur-xl ${className ?? ""}`}>
            {showHeader && (
                <div className={`flex items-center justify-between ${compact ? "px-3 py-2" : "px-4 py-3"} border-b border-white/10`}>
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-50">{title}</span>
                        <span className="text-[10px] text-emerald-400/70 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                            {prioritizedEvents.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {showHilToggle && (
                            <button
                                onClick={() => setHilEnabled(!hilEnabled)}
                                className={`text-[9px] px-2 py-1 rounded-full transition-colors ${hilEnabled
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                                    }`}
                                title="Human-in-the-loop toggle"
                            >
                                {hilEnabled ? "Apply w/ Confirm" : "Auto Apply"}
                            </button>
                        )}
                        <button
                            onClick={fetchEvents}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="px-4 py-2 text-xs text-red-400 bg-red-500/10 border-b border-white/10">
                    {error}
                </div>
            )}

            <div className={`flex-1 overflow-y-auto ${compact ? "p-3" : "p-4"} space-y-3`}>
                {prioritizedEvents.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                        <Activity className="w-5 h-5 text-white/15" />
                        <span className="text-xs text-white/30">Keine aktuellen Aktivitäten</span>
                    </div>
                )}
                {prioritizedEvents.map((event) => {
                    const payload = typeof event.payload === "object" ? event.payload : undefined;
                    const action = buildAction(event);
                    const summary = getEventSummary(event);
                    const actionLabel = getEventActionLabel(event);
                    const timestamp = event.created_at || event.timestamp;
                    const scopedCompany = pickPayloadValue(payload, "company_id", "companyId");
                    const scopedDept = pickPayloadValue(payload, "department_id", "departmentId");
                    const scopedSpace = pickPayloadValue(payload, "space_id", "spaceId");
                    const scopedFolder = pickPayloadValue(payload, "folder_id", "folderId");
                    const scopedNode = extractNodeId(payload);

                    return (
                        <div key={event.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.03]">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-emerald-300/80">
                                        <span>{getEventLabel(event.event_type)}</span>
                                        {actionLabel && <span className="text-white/40">{actionLabel}</span>}
                                        <span className="text-white/40">{event.source}</span>
                                    </div>
                                    <div className="text-sm text-white/90 leading-snug">
                                        {summary}
                                    </div>
                                </div>
                                <div className="text-[9px] text-white/40 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDate(timestamp)}</span>
                                    <span>{formatTime(timestamp)}</span>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                                <button
                                    onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                                    className="text-[10px] text-emerald-300/70 hover:text-emerald-200 flex items-center gap-1"
                                >
                                    <Info className="w-3 h-3" />
                                    Explain
                                </button>
                                <button
                                    onClick={() => {
                                        if (!action) return;
                                        if (hilEnabled) {
                                            setPendingAction({ event, action });
                                        } else {
                                            executeAction(action);
                                        }
                                    }}
                                    disabled={!action}
                                    className={`text-[10px] px-2 py-1 rounded-full transition-colors flex items-center gap-1 ${action
                                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                        : "bg-white/5 text-gray-500 cursor-not-allowed"
                                        }`}
                                >
                                    {action ? action.label : "No action"}
                                    {action && <ChevronRight className="w-3 h-3" />}
                                </button>
                            </div>

                            {expandedId === event.id && (
                                <div className="mt-3 text-[10px] text-white/50 space-y-1">
                                    <div>event_id: {String(event.id).slice(0, 12)}</div>
                                    <div>company_id: {scopedCompany || "n/a"}</div>
                                    <div>department_id: {scopedDept || "n/a"}</div>
                                    <div>space_id: {scopedSpace || "n/a"}</div>
                                    <div>folder_id: {scopedFolder || "n/a"}</div>
                                    <div>node_id: {scopedNode || "n/a"}</div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {pendingAction && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-[90%] max-w-sm bg-[#050a08]/95 border border-white/10 rounded-2xl p-4 shadow-2xl">
                        <div className="text-xs uppercase tracking-widest text-emerald-400/70">Confirmation required</div>
                        <div className="mt-2 text-sm text-white/90">
                            {pickPayloadValue(pendingAction.event.payload, "title", "summary", "intent") || getEventLabel(pendingAction.event.event_type)}
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setPendingAction(null)}
                                className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/60 hover:bg-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MoraUpdatesFeed;




