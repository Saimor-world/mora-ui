import React, { useState, useCallback } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { Zap, Upload, FileText, Image, File, X, Loader2, CheckCircle, AlertCircle, Sparkles, Activity, Cpu, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadFile, fetchSystemStats, type SystemStats } from '@/lib/api/coreClient';
import { toast } from '@/lib/toast';

interface ScannedFile {
    id: string;
    name: string;
    type: string;
    size: number;
    status: 'pending' | 'uploading' | 'analyzing' | 'done' | 'error';
    result?: string;
    nativeFile?: File; // Added to hold real file
}

export const ScannerPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { activeCompanyId } = useMoraStore();
    const pane = getPane(id);

    const [files, setFiles] = useState<ScannedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [scanFolderId, setScanFolderId] = useState<string | null>(null);
    const [stats, setStats] = useState<SystemStats | null>(null);

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

    // Ensure 'Scans' folder exists on mount
    React.useEffect(() => {
        const initScanFolder = async () => {
            if (!activeCompanyId) return;
            try {
                // 1. Try to find existing Scans folder
                const folders = await import('@/lib/api/coreClient').then(m => m.coreGet(`/v1/folders?tenant_id=${activeCompanyId}`));
                if (folders && Array.isArray(folders)) {
                    const existing = folders.find((f: any) => f.name === 'Scans');
                    if (existing) {
                        setScanFolderId(existing.id);
                        return;
                    }
                }

                // 2. Create if missing
                // Need a space first? Default space.
                // Simplified: just try creating at root (folder logic handles space fallback usually?)
                // Actually corePost('/v1/folders') needs space_id.
                // We'll fetch spaces first.
                const spaces = await import('@/lib/api/coreClient').then(m => m.coreGet(`/v1/spaces?tenant_id=${activeCompanyId}`));
                if (spaces && spaces.length > 0) {
                    const newFolder = await import('@/lib/api/coreClient').then(m => m.corePost('/v1/folders', {
                        name: 'Scans',
                        space_id: spaces[0].id,
                        description: 'Inbox for Scanned Documents',
                        icon: 'zap'
                    }));
                    if (newFolder) setScanFolderId(newFolder.id);
                }
            } catch (e) {
                console.error("Failed to init Scan folder", e);
            }
        };
        initScanFolder();
    }, [activeCompanyId]);

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

        setFiles(prev => [...prev, ...newFiles]);
    };

    const processFile = async (fileId: string, fileObject?: File) => {
        setFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'uploading' } : f
        ));

        if (!scanFolderId) {
            toast.error("Scanning System Initializing... please wait.");
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'pending' } : f));
            return;
        }

        // We need the actual File object. 
        // Note: The current UI stores File in memory only if passed?
        // handleDrop creates ScannedFile but drops the File object?
        // No, current handleDrop DOES NOT store the File object in state `files` (ScannedFile interface).
        // I need to update state to store the File object or pass it.
        // I'll update handleDrop to store 'nativeFile' in `ScannedFile`.

        // Wait, I can't update interface easily in a chunk without breaking previous code.
        // I'll assume I update interface in another chunk or here.
        // Actually, let's update ScannedFile interface in a separate chunk first? 
        // No, I'll do it here if possible. 
        // FileObject is needed.

        // ... (See below for fix strategy: Update ScannedFile interface to include `file?: File`)

        if (!fileObject) {
            // If we don't have the file object (e.g. strict state), we can't upload.
            // But handleDrop/handleFileInput has access. 
            // Logic in state must hold the file.  
            // I will mock success if file missing (for UI demo) but try real if present.
            // Actually, I must fix the state to hold the file.

            // ...
            // Let's assume I fix the interface below.

            toast.error("File lost in memory");
            return;
        }

        try {
            await uploadFile(fileObject, scanFolderId);

            // Success
            setFiles(prev => prev.map(f =>
                f.id === fileId ? {
                    ...f,
                    status: 'done',
                    result: 'Uploaded & Autonomous Cognition Started'
                } : f
            ));
            toast.success(`Uploaded: ${fileObject.name}`);

        } catch (e) {
            console.error(e);
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f));
            toast.error("Upload failed");
        }
    };

    const processAllPending = async () => {
        const pending = files.filter(f => f.status === 'pending');
        for (const file of pending) {
            await processFile(file.id, file.nativeFile);
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
    const analyzingCount = files.filter(f => f.status === 'analyzing').length;

    if (!pane) return null;

    return (
        <GlassPanel
            title="Môra AI Scanner"
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
                            <span className="uppercase font-bold">Neural Load:</span>
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
                            Status: <span className="text-emerald-500/50">Optimal Cognition</span>
                        </div>
                    </div>
                )}

                {/* Drop Zone */}
                <div
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
                            <p className="text-xs text-white/30 mt-1">PDFs, images, documents – Môra will analyze them</p>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                {files.length > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">
                            {files.length} file{files.length !== 1 ? 's' : ''} •
                            {pendingCount > 0 && ` ${pendingCount} pending`}
                            {analyzingCount > 0 && ` ${analyzingCount} analyzing`}
                        </span>
                        {pendingCount > 0 && (
                            <button
                                onClick={processAllPending}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-colors"
                            >
                                <Sparkles size={16} />
                                <span className="text-sm">Analyze All</span>
                            </button>
                        )}
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
                                                    Click to upload & analyze
                                                </button>
                                            )}

                                            {file.status === 'analyzing' && (
                                                <div className="flex items-center gap-2 mt-2 text-xs text-purple-400">
                                                    <Loader2 size={12} className="animate-spin" />
                                                    <span>Analyzing with AI...</span>
                                                </div>
                                            )}

                                            {file.status === 'done' && file.result && (
                                                <div className="flex items-start gap-2 mt-2 text-xs text-emerald-400">
                                                    <CheckCircle size={12} className="mt-0.5 shrink-0" />
                                                    <span>{file.result}</span>
                                                </div>
                                            )}

                                            {file.status === 'error' && (
                                                <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
                                                    <AlertCircle size={12} />
                                                    <span>Analysis failed</span>
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
            </div>
        </GlassPanel>
    );
};
