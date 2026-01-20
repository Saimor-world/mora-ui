import React, { useCallback, useEffect, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { Download, RefreshCw, Upload, FileText, CheckCircle } from 'lucide-react';
import { FileUploadZone } from '@/components/organic/FileUploadZone';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';
import { toast } from '@/lib/toast';
import {
    CompanyFileRecord,
    listCompanyFiles,
    uploadCompanyFile,
    downloadCompanyFile,
    requestCreateNodeFromFile,
    rejectCreateNodeFromFile
} from '@/lib/api/filesClient';

interface PendingAction {
    tool_name: string;
    params: Record<string, any>;
    risk_level: string;
    confirmation_token: string;
    action_id: string;
    file_id: string;
    confirm_endpoint?: string;
    confirm_payload?: Record<string, any>;
}

export const FilesPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { activeCompanyId } = useMoraStore();
    const pane = getPane(id);

    const [files, setFiles] = useState<CompanyFileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const loadFiles = useCallback(async () => {
        if (!activeCompanyId) return;
        setIsLoading(true);
        try {
            const items = await listCompanyFiles(activeCompanyId);
            setFiles(items);
        } catch (err) {
            console.error('Failed to load files', err);
        } finally {
            setIsLoading(false);
        }
    }, [activeCompanyId]);

    useEffect(() => {
        if (activeCompanyId) loadFiles();
    }, [activeCompanyId, loadFiles]);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleUpload = async (fileList: File[]) => {
        if (!activeCompanyId) {
            toast.error('Select a company first.');
            setShowUpload(false);
            return;
        }

        setShowUpload(false);
        setIsUploading(true);
        let successCount = 0;
        try {
            for (const file of fileList) {
                try {
                    const uploaded = await uploadCompanyFile(file, activeCompanyId);
                    successCount++;
                    await handleCreateNode(uploaded);
                } catch (err) {
                    console.error(`Upload failed for ${file.name}`, err);
                }
            }
            if (successCount > 0) {
                toast.success(`${successCount} file(s) uploaded`);
                await loadFiles();
            } else {
                toast.error('No files uploaded');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (file: CompanyFileRecord) => {
        try {
            await downloadCompanyFile(file.id, file.filename);
        } catch (err) {
            console.error('Download failed', err);
            toast.error('Download failed');
        }
    };

    const handleCreateNode = async (file: CompanyFileRecord) => {
        try {
            const response = await requestCreateNodeFromFile(file.id);
            if (response?.status === 'pending_confirmation') {
                setPendingAction({
                    tool_name: response.tool_name || 'create_node_from_file',
                    params: {
                        file_id: file.id,
                        company_id: file.company_id,
                        filename: file.filename
                    },
                    risk_level: response.risk_level || 'mutation',
                    confirmation_token: response.confirmation_token,
                    action_id: response.action_id || `file_${file.id}`,
                    file_id: file.id,
                    confirm_endpoint: `/v1/files/${file.id}/confirm-node`,
                    confirm_payload: { confirmation_token: response.confirmation_token }
                });
                return;
            }
            if (response?.status === 'executed') {
                toast.success('Node created');
                window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                return;
            }
            toast.error('Node creation failed');
        } catch (err) {
            console.error('Node creation failed', err);
            toast.error('Node creation failed');
        }
    };

    if (!pane) return null;

    return (
        <>
            <GlassPanel
                title="Files"
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
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <div className="text-sm text-white/60">
                            {activeCompanyId ? `Company: ${activeCompanyId}` : 'Select a company'}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadFiles}
                                className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                            >
                                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={() => setShowUpload(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all text-sm font-medium"
                            >
                                <Upload size={16} />
                                Upload
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {!activeCompanyId && (
                            <div className="flex flex-col items-center justify-center h-48 text-white/30">
                                <FileText size={32} className="mb-2" />
                                <span>Select a company to view uploads.</span>
                            </div>
                        )}

                        {activeCompanyId && isLoading && files.length === 0 && (
                            <div className="flex items-center gap-2 text-white/40">
                                <RefreshCw size={14} className="animate-spin" />
                                <span>Loading files...</span>
                            </div>
                        )}

                        {activeCompanyId && !isLoading && files.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 text-white/30">
                                <FileText size={32} className="mb-2" />
                                <span>No files uploaded yet.</span>
                            </div>
                        )}

                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-black/20 border border-white/5"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 rounded-lg bg-emerald-500/10">
                                        <FileText size={18} className="text-emerald-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm text-white/80 truncate">{file.filename}</div>
                                        <div className="text-xs text-white/40">
                                            {formatSize(file.size)} - {new Date(file.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDownload(file)}
                                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-colors"
                                    >
                                        <Download size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleCreateNode(file)}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                                    >
                                        <CheckCircle size={12} />
                                        Create Node
                                    </button>
                                </div>
                            </div>
                        ))}

                        {pendingAction && (
                            <ConfirmationCard
                                action={pendingAction}
                                onConfirmed={() => {
                                    setPendingAction(null);
                                    toast.success('Node created');
                                    window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                                    loadFiles();
                                }}
                                onRejected={async () => {
                                    const active = pendingAction;
                                    setPendingAction(null);
                                    if (active) {
                                        try {
                                            await rejectCreateNodeFromFile(active.file_id, active.confirmation_token);
                                            toast.info('Node creation rejected');
                                        } catch (err) {
                                            console.error('Reject failed', err);
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>

                    {isUploading && (
                        <div className="px-4 py-2 border-t border-white/5 bg-emerald-900/10 text-xs text-emerald-400 flex items-center gap-2">
                            <RefreshCw size={12} className="animate-spin" />
                            Uploading files...
                        </div>
                    )}
                </div>
            </GlassPanel>

            {showUpload && (
                <FileUploadZone
                    onFilesUploaded={handleUpload}
                    onClose={() => setShowUpload(false)}
                />
            )}
        </>
    );
};

