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
    route_learning?: RouteLearning;
    target_company_name?: string;
    target_department_name?: string;
    target_space_name?: string;
    target_folder_name?: string;
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
    type: 'create_folder' | 'move_node' | 'rename_node' | 'create_note' | 'create_draft' | 'update_note_content' | string;
    name?: string;
    title?: string;
    content?: string;
    content_preview?: string;
    destination_label?: string;
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
    firmenkontext:                  'Unternehmenskontext',
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
    create_node_from_file: 'Datei einordnen',
    confirm_action: 'Aktion bestätigen',
    undo: 'Aktion rückgängig machen',
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
    const isContentOnlyOp = useMemo(
        () =>
            (createNoteOps.length > 0 || createDraftOps.length > 0 || updateNoteContentOps.length > 0) &&
            createFolderOps.length === 0 &&
            moveNodeOps.length === 0 &&
            renameNodeOps.length === 0,
        [createNoteOps, createDraftOps, updateNoteContentOps, createFolderOps, moveNodeOps, renameNodeOps]
    );
    const isContentUpdateOnlyOp = useMemo(
        () =>
            updateNoteContentOps.length > 0 &&
            createNoteOps.length === 0 &&
            createDraftOps.length === 0 &&
            createFolderOps.length === 0 &&
            moveNodeOps.length === 0 &&
            renameNodeOps.length === 0,
        [updateNoteContentOps, createNoteOps, createDraftOps, createFolderOps, moveNodeOps, renameNodeOps]
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
        }
        return parts.length > 0 ? parts.join(' und ') : 'Dateioperation prüfen';
    }, [action.params, createFolderOps, moveNodeOps, renameNodeOps, createNoteOps, createDraftOps, updateNoteContentOps]);

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
                toast.success(isIntake ? 'Eingeordnet' : isFileOp ? 'Aktion ausgeführt' : 'Action approved.');
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
                        {updateNoteContentOps.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-100">
                                <FileCheck size={12} />
                                {updateNoteContentOps.length} Inhalt{updateNoteContentOps.length === 1 ? '' : 'e'} aktualisieren
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
                                            {operation.destination_label || 'Aktueller Kontext'}
                                        </span>
                                    </div>
                                    {operation.previous_content_preview && (
                                        <div className="space-y-1">
                                            <div className="text-white/45">Vorher</div>
                                            <div className="rounded-md bg-white/5 border border-white/5 px-2.5 py-2 text-white/70 text-xs leading-relaxed">
                                                {operation.previous_content_preview}
                                            </div>
                                        </div>
                                    )}
                                    {operation.content_preview && (
                                        <div className="space-y-1">
                                            <div className="text-white/45">Neu</div>
                                            <div className="rounded-md bg-white/5 border border-white/5 px-2.5 py-2 text-white/70 text-xs leading-relaxed">
                                                {operation.content_preview}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-xs text-white/55 italic leading-relaxed">
                        {isContentOnlyOp
                            ? isContentUpdateOnlyOp
                                ? 'MORA ändert diesen Inhalt erst nach Ihrer Bestätigung. Der aktuelle Firmenkontext bleibt dabei verbindlich.'
                                : 'MORA erstellt diesen Inhalt erst nach Ihrer Bestätigung. Der aktuelle Firmenkontext bleibt dabei verbindlich.'
                            : 'MORA führt diese Änderung erst nach Ihrer Bestätigung aus. Der aktuelle Firmenkontext bleibt dabei verbindlich.'}
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
        const routePath = [
            intake.target_department_name,
            intake.target_space_name,
            intake.target_folder_name,
        ].filter(Boolean).join(' > ') || intake.suggested_location;
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
                    <div className="flex-1">
                        <p className="text-white font-medium text-sm">{intake.business_summary}</p>
                        <div className="mt-2 rounded-lg border border-emerald-500/15 bg-black/20 p-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-emerald-300/60">
                                <span>Mycelium Routing</span>
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                    {/* Learned-route badge — semantically primary, visually restrained */}
                                    {intake.route_mode === 'learned_route' && (
                                        <span className="rounded-full border border-violet-400/25 bg-violet-500/15 px-2 py-0.5 normal-case tracking-normal text-[10px] text-violet-200">
                                            Aus früheren Einordnungen gelernt
                                        </span>
                                    )}
                                    {intake.route_confidence_label && (
                                        <span className={`rounded-full border px-2 py-0.5 normal-case tracking-normal ${confidenceTone}`}>
                                            {confidenceLabel === 'hoch' ? 'Hohe' : confidenceLabel === 'niedrig' ? 'Niedrige' : 'Mittlere'} Sicherheit
                                            {typeof intake.route_confidence_score === 'number' && (
                                                <span className="ml-1 text-white/55">
                                                    {Math.round(intake.route_confidence_score * 100)}%
                                                </span>
                                            )}
                                        </span>
                                    )}
                                    {intake.suggested_category && (
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 normal-case tracking-normal text-white/60">
                                            {intake.suggested_category}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-white/80">
                                Ziel: <span className="text-emerald-100">{routePath}</span>
                            </p>
                            {intake.route_reason && (
                                <p className="text-[11px] text-white/50 leading-relaxed">{intake.route_reason}</p>
                            )}
                            {intake.route_confidence_label === 'niedrig' && (
                                <div className="rounded-md border border-amber-400/15 bg-amber-500/8 px-2.5 py-2 text-[11px] text-amber-100/90 leading-relaxed">
                                    Niedrige Sicherheit: Bitte Ziel und Begründung besonders sorgfältig prüfen, bevor die Datei eingeordnet wird.
                                </div>
                            )}
                            {intake.route_signals && intake.route_signals.length > 0 && (() => {
                                const labels = intake.route_signals.map(formatSignal);
                                const MAX_INLINE = 3;
                                const visible = labels.slice(0, MAX_INLINE);
                                const overflow = labels.length - MAX_INLINE;
                                const line = overflow > 0
                                    ? `${visible.join(', ')} +${overflow} weitere`
                                    : visible.join(', ');
                                return (
                                    <p className="text-[11px] text-white/45 leading-relaxed">
                                        Erkannt anhand: {line}
                                    </p>
                                );
                            })()}
                            {/* Route learning copy — calm, operational, not anthropomorphic */}
                            {intake.route_learning && (intake.route_learning.confirmed_count ?? 0) > 0 && (() => {
                                const { confirmed_count = 0, corrected_count = 0 } = intake.route_learning!;
                                const isThin = confirmed_count <= 1 && corrected_count === 0;
                                return (
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] text-white/45 leading-relaxed">
                                            Dieser Pfad wurde bereits {confirmed_count}-mal bestätigt oder korrigiert.
                                        </p>
                                        {corrected_count > 0 && (
                                            <p className="text-[11px] text-white/40 leading-relaxed">
                                                Davon wurden {corrected_count}-mal manuelle Korrekturen übernommen.
                                            </p>
                                        )}
                                        {isThin && (
                                            <p className="text-[11px] text-white/35 italic leading-relaxed">
                                                Die Einordnung ist noch im Aufbau.
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
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
                        Später
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
