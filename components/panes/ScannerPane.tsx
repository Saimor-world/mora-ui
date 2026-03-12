import React, { useState, useCallback } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { Zap, Upload, FileText, Image, File, X, Loader2, CheckCircle, AlertCircle, Sparkles, Activity, Cpu, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';
import { fetchSystemStats, type SystemStats } from '@/lib/api/coreClient';
import { toast } from '@/lib/toast';
import { uploadCompanyFile, requestCreateNodeFromFile, rejectCreateNodeFromFile } from '@/lib/api/filesClient';



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

    const processFile = async (fileId: string, fileObject?: File) => {
        setFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'uploading' } : f
        ));

        if (!activeCompanyId) {
            toast.error('Select a company first.');
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'pending' } : f));
            return;
        }

        if (!fileObject) {
            toast.error('File missing');
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
                setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'review', result: 'Wartet auf Einordnung' } : f));
                setPendingActions(prev => [...prev, {
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
                    confirm_payload: { confirmation_token: response.confirmation_token }
                }]);
                return;
            }

            if (response?.status === 'executed') {
                setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'done', result: 'Node created' } : f));
                window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                toast.success(`Uploaded: ${fileObject.name}`);
                return;
            }

            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'done', result: 'Uploaded to Files' } : f));
            toast.success(`Uploaded: ${fileObject.name}`);
        } catch (e) {
            console.error(e);
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f));
            toast.error('Upload failed');
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
    const activePendingAction = pendingActions[0] || null;

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
                            <p className="text-white/70 font-medium">Drop files here or click to upload</p>
                            <p className="text-xs text-white/30 mt-1">PDFs, images, documents - uploaded to Files</p>
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
                            {files.length} file{files.length !== 1 ? 's' : ''}
                            {pendingCount > 0 && ` ${pendingCount} pending`}
                            {reviewCount > 0 && ` ${reviewCount} in review`}
                        </span>
                        {pendingCount > 0 && (
                            <button
                                onClick={processAllPending}
                                disabled={isBatchProcessing}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-colors"
                            >
                                {isBatchProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                <span className="text-sm">{isBatchProcessing ? 'Verarbeite...' : 'Upload All'}</span>
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
                                    Batch Review
                                </div>
                                <p className="text-sm text-white/75 mt-1 leading-relaxed">
                                    {pendingActions.length === 1
                                        ? '1 Datei wartet auf Freigabe vor der Ablage in den Dateibaum.'
                                        : `${pendingActions.length} Dateien warten auf Freigabe. Mora arbeitet den Stapel nach Ihrer Entscheidung einzeln ab.`}
                                </p>
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
                                                    Click to upload
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
                            <p className="text-sm text-white/30">No files uploaded yet</p>
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
                        <ConfirmationCard
                            action={activePendingAction}
                        onConfirmed={() => {
                            const active = activePendingAction;
                            setPendingActions(prev => prev.slice(1));
                            if (active) {
                                setFiles(prev => prev.map(f =>
                                    f.fileRecordId === active.file_id
                                        ? { ...f, status: 'done', result: 'Node created' }
                                        : f
                                ));
                            }
                            toast.success('Node created');
                            window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                        }}
                        onRejected={async () => {
                            const active = activePendingAction;
                            setPendingActions(prev => prev.slice(1));
                            if (active) {
                                try {
                                    await rejectCreateNodeFromFile(active.file_id, active.confirmation_token);
                                    setFiles(prev => prev.map(f =>
                                        f.fileRecordId === active.file_id
                                            ? { ...f, status: 'done', result: 'Node creation rejected' }
                                            : f
                                    ));
                                    toast.info('Node creation rejected');
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

