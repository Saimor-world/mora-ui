import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2, Clock3, Loader2, PlayCircle, ShieldAlert, XCircle } from 'lucide-react';
import { useActionEvents, type ActionStatus } from '@/lib/hooks/useActionEvents';
import { useMoraStore } from '@/lib/store/moraState';

const statusIconMap: Record<ActionStatus, React.ReactNode> = {
    proposed: <Clock3 size={14} className="text-blue-400" />,
    running: <PlayCircle size={14} className="text-emerald-400 animate-pulse" />,
    pending_confirmation: <Clock3 size={14} className="text-amber-400" />,
    done: <CheckCircle2 size={14} className="text-emerald-500" />,
    failed: <XCircle size={14} className="text-red-400" />,
    rejected: <ShieldAlert size={14} className="text-slate-300" />,
    expired: <Clock3 size={14} className="text-slate-400" />,
};

const statusLabelMap: Record<ActionStatus, string> = {
    proposed: 'Vorgeschlagen',
    running: 'Laeuft',
    pending_confirmation: 'Wartet auf Bestaetigung',
    done: 'Abgeschlossen',
    failed: 'Fehlgeschlagen',
    rejected: 'Verworfen',
    expired: 'Abgelaufen',
};

const intentLabelMap: Record<string, string> = {
    create_folder: 'Ordner erstellen',
    move_node: 'Datei verschieben',
    rename_node: 'Datei umbenennen',
    confirm_action: 'Aktion bestaetigen',
    undo: 'Aktion rueckgaengig machen',
};

const formatTime = (ts?: string): string => {
    if (!ts) return '--:--';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '--:--';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

type ActionEventLike = {
    status: ActionStatus;
    intent?: string;
    message: string | null;
    error: string | null;
    payload: Record<string, unknown>;
};

function extractPayloadString(payload: Record<string, unknown>, key: string): string | null {
    const value = payload?.[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function formatActionTitle(evt: ActionEventLike): string {
    const payloadTool = extractPayloadString(evt.payload, 'tool_name');
    const intent = payloadTool || evt.intent || 'system_action';
    return intentLabelMap[intent] || intent.replace(/_/g, ' ');
}

function formatActionMessage(evt: ActionEventLike): string | null {
    if (evt.error) return evt.error;
    if (evt.message) return evt.message;

    const payloadSummary = extractPayloadString(evt.payload, 'summary');
    if (payloadSummary) {
        if (evt.status === 'done') return `${statusLabelMap.done}: ${payloadSummary}`;
        if (evt.status === 'rejected') return `${statusLabelMap.rejected}: ${payloadSummary}`;
        return payloadSummary;
    }

    const result = evt.payload?.result;
    if (result && typeof result === 'object' && result !== null) {
        const resultSummary = extractPayloadString(result as Record<string, unknown>, 'summary');
        if (resultSummary) return resultSummary;
    }

    return statusLabelMap[evt.status] || null;
}

export const ActionTray: React.FC = () => {
    const isStandardMode = useMoraStore((s) => s.isStandardMode);
    const [isOpen, setIsOpen] = useState(false);
    const { events, isLoading } = useActionEvents(true);

    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        [events]
    );
    const activeCount = sortedEvents.filter((e) => !['done', 'failed', 'rejected', 'expired'].includes(e.status)).length;
    const renderStatusIcon = (status: ActionStatus) =>
        statusIconMap[status] ?? <Clock3 size={14} className="text-slate-400" />;

    return (
        <div className="relative z-[250]">
            <motion.button
                onClick={() => setIsOpen((v) => !v)}
                className={`relative p-3 rounded-xl transition-all group border ${isOpen
                    ? isStandardMode
                        ? 'bg-[#0078D4]/10 text-[#0078D4] border-[#0078D4]/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : isStandardMode
                        ? 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-[#0078D4]/40 hover:text-[#0078D4]'
                        : 'bg-white/[0.05] border-white/10 text-white/70 hover:bg-white/[0.08] hover:border-white/20'
                    }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Action tray"
            >
                <Activity size={20} className={isOpen ? '' : 'group-hover:text-inherit'} />
                {activeCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 text-[9px] text-white font-bold items-center justify-center">
                            {activeCount > 9 ? '9+' : activeCount}
                        </span>
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-[-1]"
                            onClick={() => setIsOpen(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`absolute bottom-full mb-3 right-0 w-80 border shadow-2xl rounded-2xl overflow-hidden origin-bottom-right ${isStandardMode
                                ? 'bg-white border-gray-200'
                                : 'bg-black/95 backdrop-blur-xl border-white/10'
                                }`}
                        >
                            <div className={`px-4 py-3 border-b flex justify-between items-center ${isStandardMode ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-white/[0.02]'
                                }`}>
                                <div className="flex items-center gap-2">
                                    <Activity size={16} className={isStandardMode ? 'text-[#0078D4]' : 'text-blue-400'} />
                                    <h3 className={`text-sm font-semibold ${isStandardMode ? 'text-gray-800' : 'text-white/90'}`}>
                                        Actions
                                    </h3>
                                </div>
                                <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${isStandardMode ? 'text-gray-600 bg-gray-200' : 'text-white/40 bg-white/[0.05]'
                                    }`}>
                                    Live
                                </span>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto p-2">
                                {isLoading && (
                                    <div className="py-6 px-4 text-center">
                                        <Loader2 size={18} className="mx-auto animate-spin mb-2 text-blue-400" />
                                        <div className={`text-xs ${isStandardMode ? 'text-gray-500' : 'text-white/50'}`}>
                                            Loading actions...
                                        </div>
                                    </div>
                                )}

                                {!isLoading && sortedEvents.length === 0 && (
                                    <div className="py-8 px-4 text-center">
                                        <Activity size={24} className={`mx-auto mb-2 ${isStandardMode ? 'text-gray-300' : 'text-white/20'}`} />
                                        <div className={`text-sm ${isStandardMode ? 'text-gray-500' : 'text-white/50'}`}>
                                            No active actions
                                        </div>
                                        <div className={`text-[10px] mt-1 ${isStandardMode ? 'text-gray-400' : 'text-white/30'}`}>
                                            Mora is currently idle
                                        </div>
                                    </div>
                                )}

                                {!isLoading && sortedEvents.length > 0 && (
                                    <div className="space-y-1">
                                        {sortedEvents.map((evt) => (
                                            <div
                                                key={`${evt.action_id}:${evt.timestamp}`}
                                                className={`flex items-start gap-3 p-3 rounded-xl transition-colors border ${isStandardMode
                                                    ? 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                                                    : 'hover:bg-white/[0.04] border-transparent hover:border-white/[0.05]'
                                                    }`}
                                            >
                                                <div className="mt-0.5">{renderStatusIcon(evt.status)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className={`text-xs font-medium truncate mr-2 ${isStandardMode ? 'text-gray-800' : 'text-white/90'}`}>
                                                            {formatActionTitle(evt)}
                                                        </div>
                                                        <div className={`text-[9px] whitespace-nowrap ${isStandardMode ? 'text-gray-500' : 'text-white/40'}`}>
                                                            {formatTime(evt.timestamp)}
                                                        </div>
                                                    </div>
                                                    <div className={`text-[9px] uppercase tracking-wider mb-1 ${isStandardMode ? 'text-gray-500' : 'text-white/35'}`}>
                                                        {statusLabelMap[evt.status] || evt.status}
                                                    </div>
                                                    {formatActionMessage(evt) && (
                                                        <div className={`text-[10px] leading-tight ${isStandardMode ? 'text-gray-600' : 'text-white/60'}`}>
                                                            {formatActionMessage(evt)}
                                                        </div>
                                                    )}
                                                    {evt.error && (
                                                        <div className="text-[10px] text-red-500 leading-tight mt-1">
                                                            {evt.error}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
