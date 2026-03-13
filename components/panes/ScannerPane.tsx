import React, { useState, useCallback, useMemo } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { Zap, Upload, FileText, Image, File, X, Loader2, CheckCircle, AlertCircle, Sparkles, Activity, Cpu, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';
import { fetchSystemStats, type SystemStats } from '@/lib/api/coreClient';
import { toast } from '@/lib/toast';
import { uploadCompanyFile, requestCreateNodeFromFile, confirmCreateNodeFromFile, rejectCreateNodeFromFile } from '@/lib/api/filesClient';

interface IntakeContext {
    suggested_category?: string;
    suggested_location?: string;
    route_mode?: string;
    route_reason?: string;
    route_confidence_score?: number;
    route_confidence_label?: string;
    route_signals?: string[];
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
    file_id: string;
    file_name?: string;
    confirm_endpoint?: string;
    confirm_payload?: Record<string, any>;
    intake_context?: IntakeContext;
}

interface ScannedFile {
    id: string;
    name: string;
    type: string;
    size: number;
    status: 'pending' | 'uploading' | 'review' | 'done' | 'error';
    result?: string;
    nativeFile?: File;
    fileRecordId?: string;
    reviewOutcome?: 'confirmed' | 'rejected';
    intakeContext?: IntakeContext;
}

interface IntakeSeedPayload {
    batchId?: string;
    source?: 'mycelium' | 'scanner';
    initialFiles?: File[];
}

export const ScannerPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { activeCompanyId, user } = useMoraStore();  // Added user for autoExecuteActions
    const pane = getPane(id);

    const [files, setFiles] = useState<ScannedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const seededBatchIdsRef = React.useRef<Set<string>>(new Set());
    const intakeSeed = (pane?.data || {}) as IntakeSeedPayload;

    // Fetch system telemetry for "Godmode" grounding
    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await fetchSystemStats();
                if (data) setStats(data);
            } catch (e) {
                // Silent fail
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Update every 5s
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        const batchId = intakeSeed.batchId;
        const initialFiles = Array.isArray(intakeSeed.initialFiles) ? intakeSeed.initialFiles : [];
        if (!batchId || initialFiles.length === 0 || seededBatchIdsRef.current.has(batchId)) {
            return;
        }

        const seededFiles: ScannedFile[] = initialFiles.map((file) => ({
            id: `seed-${batchId}-${file.name}-${file.size}`,
            name: file.name,
            type: file.type,
            size: file.size,
            status: 'pending',
            nativeFile: file,
        }));

        setFiles((prev) => {
            const unique = new Map<string, ScannedFile>();
            [...prev, ...seededFiles].forEach((file) => unique.set(`${file.name}:${file.size}`, file));
            return Array.from(unique.values());
        });
        seededBatchIdsRef.current.add(batchId);
    }, [intakeSeed.batchId, intakeSeed.initialFiles]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        const newFiles: ScannedFile[] = droppedFiles.map(f => ({
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: f.name,
            type: f.type,
            size: f.size,
            status: 'pending',
            nativeFile: f
        }));

        setFiles(prev => [...prev, ...newFiles]);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        const newFiles: ScannedFile[] = selectedFiles.map(f => ({
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: f.name,
            type: f.type,
            size: f.size,
            status: 'pending',
            nativeFile: f
        }));

        setFiles(prev => {
            const combined = [...prev, ...newFiles];
            const unique = new Map();
            combined.forEach(f => unique.set(f.name + f.size, f)); // Simple dedup by name+size for scanner
            return Array.from(unique.values());
        });
    };

    const buildRoutePath = (intake?: IntakeContext | null) =>
        [
            intake?.target_department_name,
            intake?.target_space_name,
            intake?.target_folder_name,
        ].filter(Boolean).join(' > ') || intake?.suggested_location || 'Ziel nicht erkannt';

    const buildConfidenceWeight = (intake?: IntakeContext | null) => {
        if (typeof intake?.route_confidence_score === 'number') return intake.route_confidence_score;
        if (intake?.route_confidence_label === 'niedrig') return 0.35;
        if (intake?.route_confidence_label === 'hoch') return 0.85;
        return 0.6;
    };

    const buildConfidenceText = (intake?: IntakeContext | null) => {
        const label = intake?.route_confidence_label || 'mittel';
        const base = label === 'hoch' ? 'Hohe Sicherheit' : label === 'niedrig' ? 'Niedrige Sicherheit' : 'Mittlere Sicherheit';
        if (typeof intake?.route_confidence_score === 'number') {
            return `${base} (${Math.round(intake.route_confidence_score * 100)}%)`;
        }
        return base;
    };

    const markFileOutcome = useCallback((fileId: string, outcome: 'confirmed' | 'rejected', result: string) => {
        setFiles(prev => prev.map(f =>
            f.fileRecordId === fileId
                ? { ...f, status: 'done', reviewOutcome: outcome, result }
                : f
        ));
    }, []);

    const confirmPendingAction = useCallback(async (active: PendingAction) => {
        await confirmCreateNodeFromFile(active.file_id, active.confirmation_token);
        markFileOutcome(active.file_id, 'confirmed', 'Eingeordnet');
        window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
        return active;
    }, [markFileOutcome]);

    const rejectPendingAction = useCallback(async (active: PendingAction) => {
        await rejectCreateNodeFromFile(active.file_id, active.confirmation_token);
        markFileOutcome(active.file_id, 'rejected', 'Verworfen');
        return active;
    }, [markFileOutcome]);

    const processFile = async (fileId: string, fileObject?: File) => {
        setFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'uploading' } : f
        ));

        if (!activeCompanyId) {
            toast.error('Bitte zuerst ein Unternehmen auswählen.');
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'pending' } : f));
            return;
        }

        if (!fileObject) {
            toast.error('Datei nicht gefunden.');
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f));
            return;
        }

        try {
            const uploaded = await uploadCompanyFile(fileObject, activeCompanyId);
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, fileRecordId: uploaded.id } : f));

            // P6: Data Sovereignty - respect user's auto-execute preference
            const autoExecute = user?.settings?.autoExecuteActions ?? true;
            const response = await requestCreateNodeFromFile(uploaded.id, { autoExecute });
            if (response?.status === 'pending_confirmation') {
                setFiles(prev => prev.map(f => f.id === fileId ? {
                    ...f,
                    status: 'review',
                    result: 'Wartet auf Einordnung',
                    intakeContext: response.intake_context,
                } : f));
                const nextAction = {
                    tool_name: response.tool_name || 'create_node_from_file',
                    params: {
                        file_id: uploaded.id,
                        company_id: uploaded.company_id,
                        filename: uploaded.filename
                    },
                    risk_level: response.risk_level || 'mutation',
                    confirmation_token: response.confirmation_token,
                    action_id: response.action_id || `file_${uploaded.id}`,
                    file_id: uploaded.id,
                    file_name: uploaded.filename,
                    confirm_endpoint: `/v3/files/${uploaded.id}/confirm-node`,
                    confirm_payload: { confirmation_token: response.confirmation_token },
                    intake_context: response.intake_context,
                };
                setPendingActions(prev => {
                    const sorted = [...prev, nextAction].sort((a, b) => buildConfidenceWeight(a.intake_context) - buildConfidenceWeight(b.intake_context));
                    return sorted;
                });
                return;
            }

            if (response?.status === 'executed') {
                setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'done', result: 'Eingeordnet' } : f));
                window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                toast.success(`Eingeordnet: ${fileObject.name}`);
                return;
            }

            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'done', result: 'Hochgeladen' } : f));
            toast.success(`Hochgeladen: ${fileObject.name}`);
        } catch (e) {
            console.error(e);
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f));
            toast.error('Hochladen fehlgeschlagen.');
        }
    };

    const processAllPending = async () => {
        const pending = files.filter(f => f.status === 'pending');
        if (pending.length === 0) return;

        setIsBatchProcessing(true);
        try {
            for (const file of pending) {
                await processFile(file.id, file.nativeFile);
            }
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const removeFile = (fileId: string) => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return Image;
        if (type.includes('pdf') || type.includes('document')) return FileText;
        return File;
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Hook must be called before any returns
    const isActive = usePaneStore(state => state.activePaneId === id);
    const pendingCount = files.filter(f => f.status === 'pending').length;
    const reviewCount = files.filter(f => f.status === 'review').length;
    const confirmedCount = files.filter(f => f.reviewOutcome === 'confirmed').length;
    const rejectedCount = files.filter(f => f.reviewOutcome === 'rejected').length;
    const activePendingAction = pendingActions[0] || null;
    const routeSummary = useMemo(() => {
        const buckets = new Map<string, { count: number; category?: string; confidenceLabel?: string; confidenceScore?: number }>();
        pendingActions.forEach((action) => {
            const label = buildRoutePath(action.intake_context);
            const current = buckets.get(label) || {
                count: 0,
                category: action.intake_context?.suggested_category,
                confidenceLabel: action.intake_context?.route_confidence_label,
                confidenceScore: action.intake_context?.route_confidence_score,
            };
            current.count += 1;
            if (!current.category && action.intake_context?.suggested_category) {
                current.category = action.intake_context.suggested_category;
            }
            if (!current.confidenceLabel && action.intake_context?.route_confidence_label) {
                current.confidenceLabel = action.intake_context.route_confidence_label;
            }
            if (typeof current.confidenceScore !== 'number' && typeof action.intake_context?.route_confidence_score === 'number') {
                current.confidenceScore = action.intake_context.route_confidence_score;
            }
            buckets.set(label, current);
        });
        return Array.from(buckets.entries())
            .map(([path, meta]) => ({ path, ...meta }))
            .sort((a, b) => (a.confidenceScore ?? buildConfidenceWeight({ route_confidence_label: a.confidenceLabel })) - (b.confidenceScore ?? buildConfidenceWeight({ route_confidence_label: b.confidenceLabel })));
    }, [pendingActions]);

    const batchResultSummary = useMemo(() => {
        const reviewed = files.filter((file) => file.reviewOutcome);
        if (reviewed.length === 0 || pendingActions.length > 0) return null;

        const buckets = new Map<string, { count: number; confirmed: number; rejected: number }>();
        reviewed.forEach((file) => {
            const label = buildRoutePath(file.intakeContext);
            const current = buckets.get(label) || { count: 0, confirmed: 0, rejected: 0 };
            current.count += 1;
            if (file.reviewOutcome === 'confirmed') current.confirmed += 1;
            if (file.reviewOutcome === 'rejected') current.rejected += 1;
            buckets.set(label, current);
        });

        return {
            total: reviewed.length,
            confirmed: reviewed.filter((file) => file.reviewOutcome === 'confirmed').length,
            rejected: reviewed.filter((file) => file.reviewOutcome === 'rejected').length,
            routes: Array.from(buckets.entries()).map(([path, meta]) => ({ path, ...meta })),
        };
    }, [files, pendingActions]);

    const bulkConfirm = async () => {
        if (pendingActions.length === 0) return;
        setIsBatchProcessing(true);
        try {
            const snapshot = [...pendingActions];
            for (const action of snapshot) {
                await confirmPendingAction(action);
            }
            setPendingActions([]);
            toast.success(snapshot.length === 1 ? 'Datei eingeordnet' : `${snapshot.length} Dateien eingeordnet`);
        } catch (error) {
            console.error('Bulk confirm failed', error);
            toast.error('Batch konnte nicht vollstaendig eingeordnet werden.');
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const bulkReject = async () => {
        if (pendingActions.length === 0) return;
        setIsBatchProcessing(true);
        try {
            const snapshot = [...pendingActions];
            for (const action of snapshot) {
                await rejectPendingAction(action);
            }
            setPendingActions([]);
            toast.info(snapshot.length === 1 ? 'Datei verworfen' : `${snapshot.length} Dateien verworfen`);
        } catch (error) {
            console.error('Bulk reject failed', error);
            toast.error('Batch konnte nicht vollstaendig verworfen werden.');
        } finally {
            setIsBatchProcessing(false);
        }
    };

    if (!pane) return null;

    return (
        <GlassPanel
            title="Scanner"
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
            <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
                {/* Godmode Telemetry Ribbon */}
                {stats && (
                    <div className="flex items-center gap-4 px-3 py-2 bg-purple-500/5 border border-purple-500/10 rounded-lg text-[10px] tracking-tight">
                        <div className="flex items-center gap-1.5 text-purple-400">
                            <Activity size={12} />
                            <span className="uppercase font-bold">Mora Load:</span>
                            <span className="text-white/60">{(stats.intelligence.mora_load * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-blue-400">
                            <Cpu size={12} />
                            <span className="uppercase font-bold">CPU:</span>
                            <span className="text-white/60">{stats.metrics.cpu.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                            <HardDrive size={12} />
                            <span className="uppercase font-bold">MEM:</span>
                            <span className="text-white/60">{stats.metrics.memory_usage.toFixed(0)}%</span>
                        </div>
                        <div className="flex-1 text-right text-white/20 uppercase font-medium">
                            Status: <span className="text-emerald-500/50">Telemetry live</span>
                        </div>
                    </div>
                )}

                {/* Drop Zone */}
                <div
                    data-file-drop-zone="local"
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 transition-all text-center ${isDragging
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5'
                        }`}
                >
                    <input
                        type="file"
                        multiple
                        onChange={handleFileInput}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-3">
                        <div className={`p-4 rounded-2xl transition-colors ${isDragging ? 'bg-purple-500/20' : 'bg-purple-500/10'}`}>
                            <Upload size={32} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-white/70 font-medium">Dateien ablegen oder klicken zum Hochladen</p>
                            <p className="text-xs text-white/30 mt-1">PDFs, Bilder, Dokumente – werden in den Dateibaum eingeordnet</p>
                        </div>
                    </div>
                </div>

                {intakeSeed.source === 'mycelium' && files.length > 0 && (
                    <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
                        <div className="flex items-start gap-3">
                            <Sparkles size={16} className="text-emerald-300 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/70 font-bold">
                                    Mycelium Intake
                                </div>
                                <p className="text-sm text-white/75 mt-1 leading-relaxed">
                                    Dateien wurden im Universe aufgenommen. Mora bereitet jetzt Einordnungsvorschlaege vor und fuehrt die
                                    bestaetigte Ablage in den Dateibaum aus.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Bar */}
                {files.length > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">
                            {files.length} {files.length === 1 ? 'Datei' : 'Dateien'}
                            {pendingCount > 0 && <span className="ml-2 text-white/35">· {pendingCount} wartend</span>}
                            {reviewCount > 0 && <span className="ml-2 text-amber-300/60">· {reviewCount} zur Freigabe</span>}
                            {confirmedCount > 0 && <span className="ml-2 text-emerald-400/60">· {confirmedCount} eingeordnet</span>}
                            {rejectedCount > 0 && <span className="ml-2 text-white/30">· {rejectedCount} verworfen</span>}
                        </span>
                        {pendingCount > 0 && (
                            <button
                                onClick={processAllPending}
                                disabled={isBatchProcessing}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-colors"
                            >
                                {isBatchProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                <span className="text-sm">{isBatchProcessing ? 'Verarbeite...' : 'Alle hochladen'}</span>
                            </button>
                        )}
                    </div>
                )}

                {pendingActions.length > 0 && (
                    <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3">
                        <div className="flex items-start gap-3">
                            <Activity size={16} className="text-amber-300 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs uppercase tracking-[0.2em] text-amber-300/70 font-bold">
                                    Einordnung prüfen
                                </div>
                                <p className="text-sm text-white/75 mt-1 leading-relaxed">
                                    {pendingActions.length === 1
                                        ? '1 Datei wartet auf Freigabe vor der Ablage in den Dateibaum.'
                                        : `${pendingActions.length} Dateien warten auf Freigabe. Mora arbeitet den Stapel nach Ihrer Entscheidung einzeln ab.`}
                                </p>
                                {routeSummary.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {routeSummary.map((route) => (
                                            <div
                                                key={route.path}
                                                className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-black/15 px-3 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-sm text-white/80 truncate">{route.path}</div>
                                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40 truncate">
                                                        {route.category && <span className="truncate">{route.category}</span>}
                                                        {route.confidenceLabel && (
                                                            <span className={`rounded-full border px-1.5 py-0.5 ${
                                                                route.confidenceLabel === 'hoch'
                                                                    ? 'border-emerald-400/15 bg-emerald-500/10 text-emerald-100/80'
                                                                    : route.confidenceLabel === 'niedrig'
                                                                        ? 'border-amber-400/15 bg-amber-500/10 text-amber-100/80'
                                                                        : 'border-cyan-400/15 bg-cyan-500/10 text-cyan-100/80'
                                                            }`}>
                                                                {buildConfidenceText({ route_confidence_label: route.confidenceLabel, route_confidence_score: route.confidenceScore })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="shrink-0 rounded-full border border-amber-400/15 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100">
                                                    {route.count}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {pendingActions.length > 1 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            onClick={bulkReject}
                                            disabled={isBatchProcessing}
                                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-colors"
                                        >
                                            Alle verwerfen
                                        </button>
                                        <button
                                            onClick={bulkConfirm}
                                            disabled={isBatchProcessing}
                                            className="px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-100 text-xs font-medium transition-colors"
                                        >
                                            Alle einordnen
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {batchResultSummary && (
                    <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
                        <div className="flex items-start gap-3">
                            <CheckCircle size={16} className="text-emerald-300 mt-0.5 shrink-0" />
                            <div className="min-w-0 w-full">
                                <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/70 font-bold">
                                    Batch abgeschlossen
                                </div>
                                <p className="text-sm text-white/75 mt-1 leading-relaxed">
                                    {batchResultSummary.confirmed} bestaetigt, {batchResultSummary.rejected} verworfen.
                                    {batchResultSummary.total > 1 ? ` ${batchResultSummary.total} Dateien wurden im Intake-Lauf bearbeitet.` : ' 1 Datei wurde im Intake-Lauf bearbeitet.'}
                                </p>
                                <div className="mt-3 space-y-2">
                                    {batchResultSummary.routes.map((route) => (
                                        <div key={route.path} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-black/15 px-3 py-2">
                                            <div className="min-w-0 text-sm text-white/80 truncate">{route.path}</div>
                                            <div className="shrink-0 flex items-center gap-2 text-[11px]">
                                                {route.confirmed > 0 && (
                                                    <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2 py-0.5 text-emerald-100">
                                                        {route.confirmed} ok
                                                    </span>
                                                )}
                                                {route.rejected > 0 && (
                                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/60">
                                                        {route.rejected} verworfen
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* File List */}
                <div className="flex-1 overflow-y-auto space-y-2">
                    <AnimatePresence>
                        {files.map(file => {
                            const Icon = getFileIcon(file.type);

                            return (
                                <motion.div
                                    key={file.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-black/20 border border-white/5 rounded-xl p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-purple-500/10">
                                            <Icon size={20} className="text-purple-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-white/80 truncate">{file.name}</span>
                                                <span className="text-xs text-white/30">{formatSize(file.size)}</span>
                                            </div>

                                            {file.status === 'pending' && (
                                                <button
                                                    onClick={() => processFile(file.id, file.nativeFile)}
                                                    className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                                >
                                                    Hochladen
                                                </button>
                                            )}

                                            {file.status === 'done' && file.result && (
                                                <div className="flex items-start gap-2 mt-2 text-xs text-emerald-400">
                                                    <CheckCircle size={12} className="mt-0.5 shrink-0" />
                                                    <span>{file.result}</span>
                                                </div>
                                            )}

                                            {file.status === 'review' && file.result && (
                                                <div className="flex items-start gap-2 mt-2 text-xs text-amber-300">
                                                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                                                    <span>{file.result}</span>
                                                </div>
                                            )}

                                            {file.status === 'error' && (
                                                <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
                                                    <AlertCircle size={12} />
                                                    <span>Upload failed</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => removeFile(file.id)}
                                            className="p-1 hover:bg-white/5 rounded transition-colors text-white/30 hover:text-white/60"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {files.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <Zap size={32} className="text-purple-400/50" />
                            <p className="text-sm text-white/30">Noch keine Dateien</p>
                        </div>
                    )}
                </div>
                {activePendingAction && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/35 px-1">
                                <span>Freigabe {pendingActions.length > 1 ? `1 / ${pendingActions.length}` : 'bereit'}</span>
                            {activePendingAction.file_name && (
                                <span className="max-w-[60%] truncate text-right normal-case tracking-normal text-white/50">
                                    {activePendingAction.file_name}
                                </span>
                            )}
                        </div>
                        {activePendingAction.intake_context?.route_confidence_label && (
                            <div className="px-1 text-[11px] text-white/45">
                                {buildConfidenceText(activePendingAction.intake_context)}
                            </div>
                        )}
                        <ConfirmationCard
                            action={activePendingAction}
                            variant="intake"
                        onConfirmed={() => {
                            const active = activePendingAction;
                            setPendingActions(prev => prev.slice(1));
                            if (active) {
                                markFileOutcome(active.file_id, 'confirmed', 'Eingeordnet');
                            }
                            toast.success('Datei eingeordnet');
                            window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                        }}
                        onRejected={async () => {
                            const active = activePendingAction;
                            setPendingActions(prev => prev.slice(1));
                            if (active) {
                                try {
                                    await rejectPendingAction(active);
                                    toast.info('Einordnung verworfen.');
                                } catch (err) {
                                    console.error('Reject failed', err);
                                }
                            }
                        }}
                    />
                    </div>
                )}


            </div>
        </GlassPanel>
    );
};

