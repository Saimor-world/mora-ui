"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Check,
    ShieldAlert,
    FileCheck,
    FolderPlus,
    ArrowRightLeft,
    AlertTriangle,
} from 'lucide-react';
import { corePost } from '@/lib/api/coreClient';
import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';
import { toast } from 'sonner';

interface IntakeContext {
    suggested_category?: string;
    suggested_location?: string;
    detected_patterns?: string[];
    business_summary?: string;
}

interface PendingAction {
    tool_name: string;
    params: Record<string, any>;
    risk_level: string;
    confirmation_token: string;
    action_id: string;
    confirm_endpoint?: string;
    confirm_payload?: Record<string, any>;
    intake_context?: IntakeContext;
}

interface FileActionOperation {
    type: 'create_folder' | 'move_node' | 'rename_node' | string;
    name?: string;
    node_id?: string;
    node_name?: string;
    new_name?: string;
    target_folder_id?: string;
    target_folder_name?: string;
    parent_folder_id?: string | null;
    parent_folder_name?: string | null;
    space_id?: string;
    space_name?: string;
    company_id?: string;
}

interface Props {
    action: PendingAction;
    onConfirmed: (result: any) => void;
    onRejected: () => void;
    onDismiss?: () => void;
    variant?: 'default' | 'intake';
}

const shortenId = (value?: string | null) => {
    if (!value) return null;
    if (value.length <= 12) return value;
    return `${value.slice(0, 8)}...`;
};

const formatTargetLabel = (label?: string | null, id?: string | null, fallback = 'Unbekannt') => {
    return label || shortenId(id) || fallback;
};

const getFileOperations = (params: Record<string, any>): FileActionOperation[] => {
    if (!Array.isArray(params?.operations)) return [];
    return params.operations.filter((operation: unknown): operation is FileActionOperation => {
        return typeof operation === 'object' && operation !== null && typeof (operation as FileActionOperation).type === 'string';
    });
};

export const ConfirmationCard: React.FC<Props> = ({ action, onConfirmed, onRejected, onDismiss, variant }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const hasDispatchedPresenceRef = useRef<string | null>(null);

    const isIntake = variant === 'intake' || !!action.intake_context;
    const isFileOp = action.tool_name === 'create_folder' || action.tool_name === 'move_node' || action.tool_name === 'rename_node';
    const intake = action.intake_context;
    const cardTargetId = useMemo(() => `confirmation-card-${action.action_id}`, [action.action_id]);
    const fileOperations = useMemo(() => getFileOperations(action.params), [action.params]);
    const createFolderOps = useMemo(
        () => fileOperations.filter((operation) => operation.type === 'create_folder'),
        [fileOperations]
    );
    const moveNodeOps = useMemo(
        () => fileOperations.filter((operation) => operation.type === 'move_node'),
        [fileOperations]
    );
    const renameNodeOps = useMemo(
        () => fileOperations.filter((operation) => operation.type === 'rename_node'),
        [fileOperations]
    );
    const filePlanSummary = useMemo(() => {
        const explicitSummary = typeof action.params?.summary === 'string' ? action.params.summary : null;
        if (explicitSummary) return explicitSummary;

        const parts: string[] = [];
        if (createFolderOps.length > 0) {
            parts.push(`${createFolderOps.length} Ordner`);
        }
        if (moveNodeOps.length > 0) {
            parts.push(`${moveNodeOps.length} Datei${moveNodeOps.length === 1 ? '' : 'en'} verschieben`);
        }
        if (renameNodeOps.length > 0) {
            parts.push(`${renameNodeOps.length} Datei${renameNodeOps.length === 1 ? '' : 'en'} umbenennen`);
        }
        return parts.length > 0 ? parts.join(' und ') : 'Dateioperation pruefen';
    }, [action.params, createFolderOps, moveNodeOps, renameNodeOps]);

    useEffect(() => {
        if (!action.action_id || hasDispatchedPresenceRef.current === action.action_id) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            if (!document.getElementById(cardTargetId)) return;

            dispatchMoraPresence({
                action: 'point',
                targetId: cardTargetId,
                message: isIntake
                    ? 'Bitte Einordnung pruefen'
                    : isFileOp
                        ? 'Aktionsausfuehrung bestaetigen'
                        : 'Bestaetigung erforderlich',
                duration: 2600,
                source: 'system',
            });
            hasDispatchedPresenceRef.current = action.action_id;
        }, 550);

        return () => window.clearTimeout(timeoutId);
    }, [action.action_id, cardTargetId, isIntake, isFileOp]);

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            const endpoint = action.confirm_endpoint || (isFileOp ? '/v3/actions/confirm' : '/v3/actions/execute');
            const payload = action.confirm_payload || (isFileOp
                ? {
                    confirm_token: action.confirmation_token,
                    session_id: action.params?.session_id || action.params?.trace_id || action.action_id,
                }
                : {
                    tool_name: action.tool_name,
                    params: action.params,
                    confirmation_token: action.confirmation_token,
                    trace_id: action.action_id,
                });

            const res = await corePost(endpoint, payload);
            const success =
                (typeof res?.success === 'boolean' && res.success) ||
                res?.status === 'executed' ||
                res?.confirmed === true ||
                res?.result;

            if (success) {
                toast.success(isIntake ? 'Eingeordnet' : isFileOp ? 'Aktion ausgefuehrt' : 'Action approved.');
                if (typeof window !== 'undefined' && action.tool_name === 'create_node_from_file') {
                    window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                    window.dispatchEvent(new CustomEvent('mora:agency-update', {
                        detail: {
                            type: 'action',
                            status: 'complete',
                            intent: 'intake',
                            message: intake?.business_summary || 'Erfolgreich eingeordnet',
                        },
                    }));
                }
                onConfirmed(res?.data || res?.result || res);
            } else {
                toast.error(isFileOp ? 'Aktion konnte nicht ausgefuehrt werden.' : 'Action failed. Nothing was created.');
                console.error('Confirmation failed:', res);
            }
        } catch (e) {
            console.error('Confirmation failed', e);
            toast.error(isFileOp ? 'Aktion konnte nicht ausgefuehrt werden.' : 'Action failed. Nothing was created.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDismiss = () => {
        if (onDismiss) {
            onDismiss();
        } else {
            onRejected();
        }
    };

    if (isFileOp) {
        return (
            <motion.div
                id={cardTargetId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl overflow-hidden"
            >
                <div className="bg-amber-500/10 px-4 py-3 flex items-start gap-3">
                    <AlertTriangle className="text-amber-300 shrink-0 mt-0.5" size={18} />
                    <div className="min-w-0">
                        <h4 className="text-amber-100 text-sm font-medium">Aktionsplan pruefen</h4>
                        <p className="text-[10px] text-amber-200/60 uppercase tracking-widest mt-0.5">
                            Dateibaum-Aenderung - Bestaetigung erforderlich
                        </p>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    <div className="text-sm text-white/85 leading-relaxed">{filePlanSummary}</div>

                    <div className="flex flex-wrap gap-2">
                        {createFolderOps.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200">
                                <FolderPlus size={12} />
                                {createFolderOps.length} Ordner
                            </span>
                        )}
                        {moveNodeOps.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-100">
                                <ArrowRightLeft size={12} />
                                {moveNodeOps.length} Datei{moveNodeOps.length === 1 ? '' : 'en'} verschieben
                            </span>
                        )}
                        {renameNodeOps.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-100">
                                <FileCheck size={12} />
                                {renameNodeOps.length} Datei{renameNodeOps.length === 1 ? '' : 'en'} umbenennen
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/60">
                            <ShieldAlert size={12} />
                            Risiko {action.risk_level}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {createFolderOps.map((operation, index) => (
                            <div key={`create-folder-${index}`} className="rounded-lg border border-emerald-500/15 bg-black/20 p-3">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-300/70 mb-2">
                                    <FolderPlus size={14} />
                                    <span>Ordner erstellen</span>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Name</span>
                                        <span className="text-right text-white/90 break-words">{operation.name || 'Unbenannt'}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Ziel</span>
                                        <span className="text-right text-white/75">
                                            {operation.parent_folder_name
                                                ? `Ordner ${operation.parent_folder_name}`
                                                : operation.space_name
                                                    ? `Space ${operation.space_name}`
                                                    : operation.parent_folder_id
                                                        ? `Ordner ${shortenId(operation.parent_folder_id)}`
                                                        : operation.space_id
                                                            ? `Space ${shortenId(operation.space_id)}`
                                                            : 'Aktueller Kontext'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {moveNodeOps.map((operation, index) => (
                            <div key={`move-node-${index}`} className="rounded-lg border border-cyan-500/15 bg-black/20 p-3">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/70 mb-2">
                                    <ArrowRightLeft size={14} />
                                    <span>Datei verschieben</span>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Element</span>
                                        <span className="text-right text-white/90 break-words">
                                            {formatTargetLabel(operation.node_name, operation.node_id, 'Datei / Node')}
                                        </span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Zielordner</span>
                                        <span className="text-right text-white/75 break-words">
                                            {formatTargetLabel(operation.target_folder_name, operation.target_folder_id, 'Zielordner')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {renameNodeOps.map((operation, index) => (
                            <div key={`rename-node-${index}`} className="rounded-lg border border-violet-500/15 bg-black/20 p-3">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-violet-200/70 mb-2">
                                    <FileCheck size={14} />
                                    <span>Datei umbenennen</span>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Element</span>
                                        <span className="text-right text-white/90 break-words">
                                            {formatTargetLabel(operation.node_name, operation.node_id, 'Datei / Node')}
                                        </span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Neuer Name</span>
                                        <span className="text-right text-white/75 break-words">
                                            {operation.new_name || 'Unbenannt'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-xs text-white/55 italic leading-relaxed">
                        MORA fuehrt diese Aenderung erst nach Ihrer Bestaetigung aus. Der aktuelle Firmenkontext bleibt dabei verbindlich.
                    </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-black/20 border-t border-white/5">
                    <button
                        onClick={onRejected}
                        disabled={isProcessing}
                        className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs font-medium"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="flex-1 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-100 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <span className="w-3 h-3 border-2 border-amber-200/30 border-t-amber-100 rounded-full animate-spin" />
                        ) : (
                            <Check size={14} />
                        )}
                        Ausfuehren
                    </button>
                </div>
            </motion.div>
        );
    }

    if (isIntake && intake) {
        return (
            <motion.div
                id={cardTargetId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden"
            >
                <div className="px-4 py-3 flex items-start gap-3">
                    <FileCheck className="text-white/60 shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                        <p className="text-white font-medium text-sm">{intake.business_summary}</p>
                        <p className="text-white/50 text-xs mt-1">Vorschlag: {intake.suggested_location}</p>
                        {intake.detected_patterns && intake.detected_patterns.length > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                                {intake.detected_patterns.map((pattern, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-0.5 text-[10px] rounded bg-white/5 text-white/40 border border-white/5"
                                    >
                                        {pattern}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 p-3 border-t border-white/5">
                    <button
                        onClick={handleDismiss}
                        disabled={isProcessing}
                        className="text-white/40 hover:text-white/60 text-xs font-medium transition-colors px-3 py-2"
                    >
                        Spaeter
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center gap-2"
                    >
                        {isProcessing ? (
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Check size={14} />
                        )}
                        Einordnen
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            id={cardTargetId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl overflow-hidden"
        >
            <div className="bg-red-500/10 px-4 py-3 flex items-start gap-3">
                <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="text-red-200 text-sm font-medium">Sicherheits-Warnung</h4>
                    <p className="text-[10px] text-red-300/60 uppercase tracking-widest mt-0.5">
                        Mutation {action.risk_level} - Autorisierung erforderlich
                    </p>
                </div>
            </div>

            <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-emerald-500/60">
                    <span className="uppercase tracking-wide">Aktion</span>
                    <span className="font-mono text-emerald-100">{action.tool_name}</span>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-[10px] uppercase text-emerald-500/40 mb-1">Parameter</div>
                    <pre className="text-xs font-mono text-emerald-500/80 whitespace-pre-wrap">
                        {JSON.stringify(action.params, null, 2)}
                    </pre>
                </div>

                <div className="text-xs text-emerald-200/60 italic leading-relaxed">
                    Diese Aktion veraendert Daten im System. Bitte bestaetigen Sie, dass Sie dies ausfuehren moechten.
                </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-black/20 border-t border-white/5">
                <button
                    onClick={onRejected}
                    disabled={isProcessing}
                    className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs font-medium"
                >
                    Abbrechen
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={isProcessing}
                    className="flex-1 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:text-red-200 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                        <Check size={14} />
                    )}
                    Genehmigen
                </button>
            </div>
        </motion.div>
    );
};
