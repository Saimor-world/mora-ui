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

interface RouteLearning {
    confirmed_count?: number;
    corrected_count?: number;
    rejected_count?: number;
    /** Integer heuristic score — treat as opaque, not a 0..1 percentage */
    strength?: number;
}

interface IntakeContext {
    suggested_category?: string;
    suggested_location?: string;
    detected_patterns?: string[];
    business_summary?: string;
    route_mode?: string;
    route_reason?: string;
    route_confidence_score?: number;
    route_confidence_label?: string;
    route_signals?: string[];
    route_explanation?: FileIntakeRouteExplanation;
    route_learning?: RouteLearning;
    target_company_name?: string;
    target_department_name?: string;
    target_space_name?: string;
    target_folder_name?: string;
}

interface FileIntakeRouteExplanation {
    kind?: string;
    headline?: string;
    reason?: string;
    signal_labels?: string[];
    learning_summary?: string;
}

interface FileIntakeDestination {
    company_id?: string;
    company_name?: string;
    department_id?: string;
    department_name?: string;
    space_id?: string;
    space_name?: string;
    folder_id?: string;
    folder_name?: string;
    label?: string;
}

interface FileIntakeNext {
    mode?: 'review' | 'open' | string;
    label?: string;
    message?: string;
}

interface FileIntakeDestinationSummary {
    company_name?: string;
    department_name?: string;
    space_name?: string;
    folder_name?: string;
    label?: string;
}

interface FileIntakeRouteDecision {
    mode?: 'accepted' | 'changed' | 'rejected' | string;
    label?: string;
    message?: string;
    suggested_destination?: FileIntakeDestinationSummary;
    selected_destination?: FileIntakeDestinationSummary;
}

interface PendingAction {
    tool_name: string;
    params: Record<string, any>;
    risk_level: string;
    confirmation_token: string;
    action_id: string;
    folder_id?: string;
    confirm_endpoint?: string;
    confirm_payload?: Record<string, any>;
    intake_context?: IntakeContext;
    destination?: FileIntakeDestination;
    route_summary?: string;
    route_resolution?: 'act' | 'choose' | string;
    route_candidates?: Array<Record<string, any>>;
    route_choice_headline?: string;
    route_choice_reason?: string;
    route_decision?: FileIntakeRouteDecision;
    next?: FileIntakeNext;
}

interface ContentChange {
    before_preview?: string;
    after_preview?: string;
    before_length?: number;
    after_length?: number;
    delta_chars?: number;
    change_kind?: string;
    summary?: string;
}

interface FileActionOperation {
    type: 'create_folder' | 'move_node' | 'rename_node' | 'create_note' | 'create_draft' | 'update_note_content' | string;
    name?: string;
    title?: string;
    content?: string;
    content_preview?: string;
    destination_label?: string;
    destination_summary?: string;
    node_id?: string;
    node_name?: string;
    new_name?: string;
    previous_content_preview?: string;
    target_folder_id?: string;
    target_folder_name?: string;
    parent_folder_id?: string | null;
    parent_folder_name?: string | null;
    space_id?: string;
    space_name?: string;
    company_id?: string;
    /** Structured diff contract from Core 6b1b301 — primary source for before/after previews */
    content_change?: ContentChange;
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

const formatDestinationLabel = (destination?: FileIntakeDestination | null, fallback?: string | null) => {
    const path = [destination?.department_name, destination?.space_name, destination?.folder_name]
        .filter(Boolean)
        .join(' > ');
    return destination?.label || path || fallback || 'Ziel offen';
};

const formatDestinationSummary = (destination?: FileIntakeDestinationSummary | null, fallback = 'Ziel offen') => {
    const path = [destination?.department_name, destination?.space_name, destination?.folder_name]
        .filter(Boolean)
        .join(' > ');
    return destination?.label || path || fallback;
};

const formatIntakeTargetLabel = (intake?: IntakeContext | null, fallback = 'Ziel offen') => {
    const path = [
        intake?.target_department_name,
        intake?.target_space_name,
        intake?.target_folder_name,
    ].filter(Boolean).join(' > ');
    return path || intake?.suggested_location || fallback;
};

/** Maps live Mycelium signal keys → human-readable German labels */
const signalLabelMap: Record<string, string> = {
    frueher_aehnlich_eingeordnet:   'Ähnliche Dateien eingeordnet',
    manuell_korrigierter_verlauf:   'Manuell korrigierter Verlauf',
    wiederkehrendes_dateimuster:    'Wiederkehrendes Dateimuster',
    explizites_upload_ziel:         'Explizites Upload-Ziel',
    ordner_im_aktuellen_kontext:    'Ordner im aktuellen Kontext',
    firmenweite_inbox:              'Firmenweite Inbox',
    neuer_dateieingang:             'Neuer Dateieingang',
    standard_space:                 'Standard-Bereich',
    keine_explizite_feinzuteilung:  'Kein spezifisches Ziel',
    abteilungskontext:              'Abteilungskontext',
    kein_zielordner_verfuegbar:     'Kein Zielordner verfügbar',
    firmenkontext:                  'Organisationskontext',
    struktur_noch_nicht_verfuegbar: 'Struktur noch nicht verfügbar',
    manuell_gesetzt:                'Manuell festgelegt',
};

/** Returns a human-readable label for a signal key.
 *  Known keys → German label. Unknown keys → Title Cased words (spaces). */
const formatSignal = (signal: string): string =>
    signalLabelMap[signal] ??
    signal.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const intentLabelMap: Record<string, string> = {
    create_folder: 'Ordner erstellen',
    move_node: 'Datei verschieben',
    rename_node: 'Datei umbenennen',
    create_note: 'Notiz erstellen',
    create_draft: 'Entwurf erstellen',
    update_note_content: 'Inhalt aktualisieren',
    create_node_from_file: 'Inhalt aus Datei erzeugen',
    confirm_action: 'Aktion bestätigen',
    undo: 'Aktion rückgängig machen',
};

const getFileOperations = (params: Record<string, any>): FileActionOperation[] => {
    if (!Array.isArray(params?.operations)) return [];
    return params.operations.filter((operation: unknown): operation is FileActionOperation => {
        return typeof operation === 'object' && operation !== null && typeof (operation as FileActionOperation).type === 'string';
    });
};

/**
 * Render a before/after content diff block.
 * Prefers the structured `content_change` contract; falls back to legacy fields.
 */
function renderContentDiff(
    before: string | null | undefined,
    after: string | null | undefined
): React.ReactNode {
    if (!before && !after) return null;
    return (
        <div className="rounded-md border border-white/10 bg-black/20 overflow-hidden">
            {before && (
                <div className="px-2.5 py-2 border-b border-white/10">
                    <div className="text-[10px] uppercase tracking-wider text-red-300/70 mb-1">Bisheriger Inhalt</div>
                    <div className="text-xs leading-relaxed text-white/55 line-clamp-3">{before}</div>
                </div>
            )}
            {after && (
                <div className="px-2.5 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-1">Neuer Inhalt</div>
                    <div className="text-xs leading-relaxed text-white/85">{after}</div>
                </div>
            )}
        </div>
    );
}

export const ConfirmationCard: React.FC<Props> = ({ action, onConfirmed, onRejected, onDismiss, variant }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const hasDispatchedPresenceRef = useRef<string | null>(null);

    const isIntake = variant === 'intake' || !!action.intake_context;
    const isFileOp = action.tool_name === 'create_folder' || action.tool_name === 'move_node' || action.tool_name === 'rename_node' || action.tool_name === 'create_note' || action.tool_name === 'create_draft' || action.tool_name === 'update_note_content';
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
    const createNoteOps = useMemo(
        () => fileOperations.filter((operation) => operation.type === 'create_note'),
        [fileOperations]
    );
    const createDraftOps = useMemo(
        () => fileOperations.filter((operation) => operation.type === 'create_draft'),
        [fileOperations]
    );
    const updateNoteContentOps = useMemo(
        () => fileOperations.filter((operation) => operation.type === 'update_note_content'),
        [fileOperations]
    );
    // True when backend promotes content-update fields to top level of params
    // (single-operation confirmations, no operations array required)
    const hasTopLevelUpdateOp = action.tool_name === 'update_note_content' && updateNoteContentOps.length === 0;
    const isContentOnlyOp = useMemo(
        () =>
            (createNoteOps.length > 0 || createDraftOps.length > 0 || updateNoteContentOps.length > 0 || hasTopLevelUpdateOp) &&
            createFolderOps.length === 0 &&
            moveNodeOps.length === 0 &&
            renameNodeOps.length === 0,
        [createNoteOps, createDraftOps, updateNoteContentOps, hasTopLevelUpdateOp, createFolderOps, moveNodeOps, renameNodeOps]
    );
    const isContentUpdateOnlyOp = useMemo(
        () =>
            (updateNoteContentOps.length > 0 || hasTopLevelUpdateOp) &&
            createNoteOps.length === 0 &&
            createDraftOps.length === 0 &&
            createFolderOps.length === 0 &&
            moveNodeOps.length === 0 &&
            renameNodeOps.length === 0,
        [updateNoteContentOps, hasTopLevelUpdateOp, createNoteOps, createDraftOps, createFolderOps, moveNodeOps, renameNodeOps]
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
        if (createNoteOps.length > 0) {
            parts.push(`${createNoteOps.length} Notiz${createNoteOps.length === 1 ? '' : 'en'} erstellen`);
        }
        if (createDraftOps.length > 0) {
            parts.push(`${createDraftOps.length} Entwurf${createDraftOps.length === 1 ? '' : 'e'} erstellen`);
        }
        if (updateNoteContentOps.length > 0) {
            parts.push(`${updateNoteContentOps.length} Inhalt${updateNoteContentOps.length === 1 ? '' : 'e'} aktualisieren`);
        } else if (hasTopLevelUpdateOp) {
            parts.push('1 Inhalt aktualisieren');
        }
        return parts.length > 0 ? parts.join(' und ') : 'Dateioperation prüfen';
    }, [action.params, createFolderOps, moveNodeOps, renameNodeOps, createNoteOps, createDraftOps, updateNoteContentOps, hasTopLevelUpdateOp]);

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
                toast.success(isIntake ? 'Inhalt angelegt' : isFileOp ? 'Aktion ausgeführt' : 'Action approved.');
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
                toast.error(isFileOp ? 'Aktion konnte nicht ausgeführt werden.' : 'Action failed. Nothing was created.');
                console.error('Confirmation failed:', res);
            }
        } catch (e) {
            console.error('Confirmation failed', e);
            toast.error(isFileOp ? 'Aktion konnte nicht ausgeführt werden.' : 'Action failed. Nothing was created.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!isFileOp) {
            onRejected();
            return;
        }

        setIsProcessing(true);
        try {
            const res = await corePost('/v3/actions/reject', {
                confirmation_token: action.confirmation_token,
                session_id: action.params?.session_id || action.params?.trace_id || action.action_id,
            });
            const success = res?.rejected === true || res?.data?.rejected === true || res?.result?.status === 'rejected';
            if (success) {
                toast.success('Aktion verworfen');
                onRejected();
            } else {
                toast.error('Aktion konnte nicht verworfen werden.');
            }
        } catch (e) {
            console.error('Reject failed', e);
            toast.error('Aktion konnte nicht verworfen werden.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDismiss = () => {
        if (onDismiss) {
            onDismiss();
        } else {
            void handleReject();
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
                        <h4 className="text-amber-100 text-sm font-medium">Aktionsplan prüfen</h4>
                        <p className="text-[10px] text-amber-200/60 uppercase tracking-widest mt-0.5">
                            {isContentOnlyOp
                                ? isContentUpdateOnlyOp
                                    ? 'Inhalt ändern – Bestätigung erforderlich'
                                    : 'Inhalt erstellen – Bestätigung erforderlich'
                                : 'Dateibaum-Änderung – Bestätigung erforderlich'}
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
                        {createNoteOps.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-100">
                                <FileCheck size={12} />
                                {createNoteOps.length} Notiz{createNoteOps.length === 1 ? '' : 'en'} erstellen
                            </span>
                        )}
                        {createDraftOps.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-100">
                                <FileCheck size={12} />
                                {createDraftOps.length} Entwurf{createDraftOps.length === 1 ? '' : 'e'} erstellen
                            </span>
                        )}
                        {(updateNoteContentOps.length > 0 || hasTopLevelUpdateOp) && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-100">
                                <FileCheck size={12} />
                                {updateNoteContentOps.length > 0 ? updateNoteContentOps.length : 1} Inhalt{updateNoteContentOps.length === 1 || hasTopLevelUpdateOp ? '' : 'e'} aktualisieren
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

                        {createNoteOps.map((operation, index) => (
                            <div key={`create-note-${index}`} className="rounded-lg border border-amber-500/15 bg-black/20 p-3">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber-200/70 mb-2">
                                    <FileCheck size={14} />
                                    <span>Notiz erstellen</span>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Titel</span>
                                        <span className="text-right text-white/90 break-words">{operation.title || 'Unbenannt'}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Ziel</span>
                                        <span className="text-right text-white/75 break-words">{operation.destination_label || formatTargetLabel(operation.parent_folder_name, operation.parent_folder_id, 'Aktueller Kontext')}</span>
                                    </div>
                                    {operation.content_preview && (
                                        <div className="rounded-md bg-white/5 border border-white/5 px-2.5 py-2 text-white/70 text-xs leading-relaxed">
                                            {operation.content_preview}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {createDraftOps.map((operation, index) => (
                            <div key={`create-draft-${index}`} className="rounded-lg border border-indigo-500/15 bg-black/20 p-3">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-indigo-200/70 mb-2">
                                    <FileCheck size={14} />
                                    <span>Entwurf erstellen</span>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Titel</span>
                                        <span className="text-right text-white/90 break-words">{operation.title || 'Unbenannt'}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Ziel</span>
                                        <span className="text-right text-white/75 break-words">{operation.destination_label || formatTargetLabel(operation.parent_folder_name, operation.parent_folder_id, 'Aktueller Kontext')}</span>
                                    </div>
                                    {operation.content_preview && (
                                        <div className="rounded-md bg-white/5 border border-white/5 px-2.5 py-2 text-white/70 text-xs leading-relaxed">
                                            {operation.content_preview}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {updateNoteContentOps.map((operation, index) => (
                            <div key={`update-note-content-${index}`} className="rounded-lg border border-orange-500/15 bg-black/20 p-3">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-orange-200/70 mb-2">
                                    <FileCheck size={14} />
                                    <span>Inhalt aktualisieren</span>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Dokument</span>
                                        <span className="text-right text-white/90 break-words">
                                            {operation.node_name || formatTargetLabel(undefined, operation.node_id, 'Notiz / Entwurf')}
                                        </span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-white/45">Ziel</span>
                                        <span className="text-right text-white/75 break-words">
                                            {operation.destination_label || operation.destination_summary || 'Aktueller Kontext'}
                                        </span>
                                    </div>
                                    {renderContentDiff(
                                        operation.content_change?.before_preview || operation.previous_content_preview,
                                        operation.content_change?.after_preview || operation.content_preview
                                    )}
                                </div>
                            </div>
                        ))}
                        {hasTopLevelUpdateOp && (
                            <div className="rounded-lg border border-orange-500/15 bg-black/20 p-3">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-orange-200/70 mb-2">
                                    <FileCheck size={14} />
                                    <span>Inhalt aktualisieren</span>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    {typeof action.params?.node_name === 'string' && (
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-white/45">Dokument</span>
                                            <span className="text-right text-white/90 break-words">
                                                {action.params.node_name}
                                            </span>
                                        </div>
                                    )}
                                    {typeof action.params?.destination_summary === 'string' && (
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-white/45">Ziel</span>
                                            <span className="text-right text-white/75 break-words">
                                                {action.params.destination_summary}
                                            </span>
                                        </div>
                                    )}
                                    {renderContentDiff(
                                        (action.params.content_change as ContentChange | undefined)?.before_preview || action.params.previous_content_preview,
                                        (action.params.content_change as ContentChange | undefined)?.after_preview || action.params.content_preview
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-xs text-white/55 italic leading-relaxed">
                        {isContentOnlyOp
                            ? isContentUpdateOnlyOp
                                ? 'MORA aendert diesen Inhalt erst nach Ihrer Bestaetigung. Der aktuelle Organisationskontext bleibt dabei verbindlich.'
                                : 'MORA erstellt diesen Inhalt erst nach Ihrer Bestaetigung. Der aktuelle Organisationskontext bleibt dabei verbindlich.'
                            : 'MORA fuehrt diese Aenderung erst nach Ihrer Bestaetigung aus. Der aktuelle Organisationskontext bleibt dabei verbindlich.'}
                    </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-black/20 border-t border-white/5">
                    <button
                        onClick={() => { void handleReject(); }}
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
                        Ausführen
                    </button>
                </div>
            </motion.div>
        );
    }

    if (isIntake && intake) {
        const routeExplanation = intake.route_explanation;
        const routeSummary = action.route_summary || routeExplanation?.headline || formatIntakeTargetLabel(intake, intake.business_summary || 'Ziel offen');
        const routeWhere = formatDestinationLabel(action.destination, formatIntakeTargetLabel(intake));
        const routeWhyHeadline = routeExplanation?.headline || intake.route_reason;
        const routeWhyReason = routeExplanation?.reason || intake.route_reason;
        const routeWhySignals = routeExplanation?.signal_labels || intake.route_signals || [];
        const routeLearningSummary = routeExplanation?.learning_summary;
        const routeDecision = action.route_decision;
        const routeDecisionMode = routeDecision?.mode || 'accepted';
        const routeDecisionLabel = routeDecision?.label
            || (routeDecisionMode === 'rejected'
                ? 'Einordnung verworfen'
                : routeDecisionMode === 'changed'
                    ? 'Ziel manuell geändert'
                    : 'Vorschlag akzeptiert');
        const routeDecisionMessage = routeDecision?.message
            || (routeDecisionMode === 'rejected'
                ? 'Die Einordnung wurde nicht freigegeben.'
                : routeDecisionMode === 'changed'
                    ? 'Das Ziel wurde vor der Freigabe angepasst.'
                    : 'Der Vorschlag wurde ohne Zielwechsel übernommen.');
        const routeDecisionTone = routeDecisionMode === 'rejected'
            ? 'border-red-400/20 bg-red-500/10 text-red-100'
            : routeDecisionMode === 'changed'
                ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
        const routeDecisionFrom = formatDestinationSummary(routeDecision?.suggested_destination, routeWhere);
        const routeDecisionTo = formatDestinationSummary(routeDecision?.selected_destination, routeWhere);
        const routeNext = action.next;
        const routeResolutionLabel = action.route_resolution === 'choose'
            ? 'Zielwahl offen'
            : action.route_resolution === 'act'
                ? 'Direkt einordnen'
                : 'Einordnung bereit';
        const confidenceLabel = intake.route_confidence_label || 'mittel';
        const confidenceTone = confidenceLabel === 'hoch'
            ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
            : confidenceLabel === 'niedrig'
                ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100';
        return (
            <motion.div
                id={cardTargetId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden"
            >
                <div className="px-4 py-3 flex items-start gap-3">
                    <FileCheck className="text-white/60 shrink-0 mt-0.5" size={18} />
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{routeSummary}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/55">
                                {routeResolutionLabel}
                            </span>
                            {intake.route_mode === 'learned_route' && (
                                <span className="rounded-full border border-violet-400/25 bg-violet-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-violet-200">
                                    Gelernter Pfad
                                </span>
                            )}
                            {intake.route_confidence_label && (
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${confidenceTone}`}>
                                    {confidenceLabel === 'hoch' ? 'Hohe' : confidenceLabel === 'niedrig' ? 'Niedrige' : 'Mittlere'} Sicherheit
                                    {typeof intake.route_confidence_score === 'number' && (
                                        <span className="ml-1 text-white/55">
                                            {Math.round(intake.route_confidence_score * 100)}%
                                        </span>
                                    )}
                                </span>
                            )}
                            {intake.suggested_category && (
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/60">
                                    {intake.suggested_category}
                                </span>
                            )}
                            {Array.isArray(action.route_candidates) && action.route_candidates.length > 1 && (
                                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-100">
                                    {action.route_candidates.length} Optionen
                                </span>
                            )}
                        </div>

                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <div className="rounded-lg border border-white/8 bg-black/15 p-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Was</div>
                                <div className="mt-1 text-sm text-white/88 leading-relaxed">
                                    {routeSummary}
                                </div>
                            </div>

                            <div className="rounded-lg border border-white/8 bg-black/15 p-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Warum dort</div>
                                <div className="mt-1 space-y-1.5 text-sm text-white/78 leading-relaxed">
                                    {routeWhyHeadline && (
                                        <div className="text-white/90">
                                            {routeWhyHeadline}
                                        </div>
                                    )}
                                    {routeWhyReason && (
                                        <div className="text-white/62">
                                            {routeWhyReason}
                                        </div>
                                    )}
                                    {routeWhySignals.length > 0 && (
                                        <div className="text-[11px] text-white/42">
                                            Signale: {routeWhySignals.map(formatSignal).slice(0, 3).join(', ')}
                                            {routeWhySignals.length > 3 ? ` +${routeWhySignals.length - 3} weitere` : ''}
                                        </div>
                                    )}
                                    {routeLearningSummary && (
                                        <div className="text-[11px] text-white/38">
                                            {routeLearningSummary}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-white/8 bg-black/15 p-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Ziel</div>
                                <div className="mt-1 text-sm text-white/88 leading-relaxed">
                                    {routeWhere}
                                </div>
                                {action.destination && (
                                    <div className="mt-1 text-[11px] text-white/42 leading-relaxed">
                                        {[action.destination.company_name, action.destination.department_name, action.destination.space_name, action.destination.folder_name]
                                            .filter(Boolean)
                                            .join(' > ')}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-lg border border-white/8 bg-black/15 p-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Naechster Schritt</div>
                                <div className="mt-1 text-sm text-white/88 leading-relaxed">
                                    {routeNext?.label || 'Einordnung bestaetigen'}
                                </div>
                                <div className="mt-1 text-[11px] text-white/46 leading-relaxed">
                                    {routeNext?.message || 'Pruefe die Einordnung und bestaetige oder korrigiere das Ziel.'}
                                </div>
                            </div>
                        </div>

                        {routeDecision && (
                            <div className={`mt-3 rounded-lg border px-3 py-3 ${routeDecisionTone}`}>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-current/20 bg-black/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                                        {routeDecisionLabel}
                                    </span>
                                    <span className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                                        Audit
                                    </span>
                                </div>
                                <div className="mt-2 text-sm text-white/88 leading-relaxed">
                                    {routeDecisionMessage}
                                </div>
                                {routeDecisionMode === 'changed' && (
                                    <div className="mt-2 text-[11px] text-white/58 leading-relaxed">
                                        Von: <span className="text-white/82">{routeDecisionFrom}</span>
                                        {' '}nach{' '}
                                        <span className="text-white/82">{routeDecisionTo}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {intake.route_confidence_label === 'niedrig' && (
                            <div className="mt-3 rounded-md border border-amber-400/15 bg-amber-500/8 px-2.5 py-2 text-[11px] text-amber-100/90 leading-relaxed">
                                Niedrige Sicherheit: Ziel und Begruendung vor der Freigabe nochmal pruefen.
                            </div>
                        )}

                        {intake.route_learning && (intake.route_learning.confirmed_count ?? 0) > 0 && (() => {
                            const { confirmed_count = 0, corrected_count = 0 } = intake.route_learning!;
                            const isThin = confirmed_count <= 1 && corrected_count === 0;
                            return (
                                <div className="mt-3 space-y-0.5 text-[11px] leading-relaxed text-white/45">
                                    <div>
                                        Dieser Pfad wurde bereits {confirmed_count}-mal bestaetigt oder korrigiert.
                                    </div>
                                    {corrected_count > 0 && (
                                        <div>
                                            Davon wurden {corrected_count}-mal manuelle Korrekturen uebernommen.
                                        </div>
                                    )}
                                    {isThin && (
                                        <div className="italic text-white/35">
                                            Die Einordnung ist noch im Aufbau.
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
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
            className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl overflow-hidden"
        >
            <div className="bg-amber-500/10 px-4 py-3 flex items-start gap-3">
                <ShieldAlert className="text-amber-300 shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="text-amber-100 text-sm font-medium">Freigabe erforderlich</h4>
                    <p className="text-[10px] text-amber-200/60 uppercase tracking-widest mt-0.5">
                        {intentLabelMap[action.tool_name] || action.tool_name.replaceAll('_', ' ')} – Aktion bestätigen
                    </p>
                </div>
            </div>

            <div className="p-4 space-y-3">
                <div className="text-sm text-white/75 leading-relaxed">
                    {typeof action.params?.summary === 'string'
                        ? action.params.summary
                        : 'Mora möchte eine Aktion ausführen. Bitte bestätigen oder ablehnen.'}
                </div>
                <div className="text-xs text-white/40 leading-relaxed">
                    Diese Aktion wird erst nach Ihrer Bestätigung ausgeführt.
                </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-black/20 border-t border-white/5">
                <button
                    onClick={() => { void handleReject(); }}
                    disabled={isProcessing}
                    className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs font-medium"
                >
                    Ablehnen
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
                    Bestätigen
                </button>
            </div>
        </motion.div>
    );
};
