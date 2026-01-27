import React, { useState, useEffect, useCallback } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { FileText, Folder as FolderIcon, Upload, Loader2, RefreshCw, AlertCircle, ChevronRight, Home, Sparkles, Globe, Circle } from 'lucide-react';
import { setThinking, setFocus, setIdle } from '@/lib/mora/awarenessController';
import { getSemanticallySimilarNodes } from '@/lib/api/coreClient';
import type { CoreTreeNode } from '@/lib/types/core';
import { toast } from '@/lib/toast';
import { FileUploadZone } from '@/components/organic/FileUploadZone';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';
import { SemanticItem } from '@/components/organic/SemanticItem';
import { uploadCompanyFile, requestCreateNodeFromFile, rejectCreateNodeFromFile } from '@/lib/api/filesClient';


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
    file_id: string;
    confirm_endpoint?: string;
    confirm_payload?: Record<string, any>;
    // P6: Guided Intake
    intake_context?: IntakeContext;
}



export const FinderPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const {
        activeCompanyId,
        companies,
        spacesByDepartment,
        loadSpacesForDepartment,
        foldersBySpace,
        loadFoldersForSpace,
        nodesByFolder,
        loadNodesForFolder,
        // DATA CONSISTENCY FIX: Use shared treeData from store instead of local state
        treeData,
        loadTree,
        isLoadingTree
    } = useMoraStore();
    const pane = getPane(id);

    // Quick Access: Filter by department if provided
    const departmentId = pane?.data?.departmentId as string | undefined;
    const departmentName = pane?.data?.departmentName as string | undefined;

    const [files, setFiles] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    // Intelligence: Semantic Resonance
    const [resonanceIds, setResonanceIds] = useState<string[]>([]);
    const [resonanceSourceId, setResonanceSourceId] = useState<string | null>(null);

    const checkResonance = async (nodeId: string) => {
        setResonanceSourceId(nodeId);
        toast.info('Detecting resonance...');
        try {
            const similar = await getSemanticallySimilarNodes(nodeId);
            const ids = similar.map(n => n.id);
            setResonanceIds(ids);
            if (ids.length > 0) {
                toast.success(`Found ${ids.length} related files`);
            }
        } catch (e) {
            console.error("Resonance check failed", e);
        }
    };

    // Navigation
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
    // DATA CONSISTENCY FIX: Use treeData from store instead of local rawTree state
    // This ensures Finder shows the SAME data as Universe (UniverseView)
    const rawTree = treeData || [];

    // Helper to find node in tree
    const findNodeInTree = useCallback((nodes: CoreTreeNode[], targetId: string): CoreTreeNode | null => {
        for (const node of nodes) {
            if (node.id === targetId) return node;
            if (node.children) {
                const found = findNodeInTree(node.children, targetId);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // Helper to build breadcrumbs
    const buildBreadcrumbs = useCallback((nodes: CoreTreeNode[], targetId: string, path: { id: string; name: string }[] = []): { id: string; name: string }[] | null => {
        for (const node of nodes) {
            if (node.id === targetId) return [...path, { id: node.id, name: node.name }];
            if (node.children) {
                const found = buildBreadcrumbs(node.children, targetId, [...path, { id: node.id, name: node.name }]);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // Recursively extract content for current view
    const getCurrentContent = useCallback(() => {
        if (!rawTree.length) return { files: [], folders: [] };

        // Root view (Company level - showing Spaces/Departments)
        if (!currentFolderId) {
            // UNIFIED FILTER: Apply same logic as Universe (deduplication + cap=25)
            // Extract all department nodes from tree
            let deptNodes: any[] = [];
            const roots = Array.isArray(rawTree) ? rawTree : [rawTree];

            roots.forEach(node => {
                if (node.type === 'department') {
                    deptNodes.push(node);
                } else if (node.children) {
                    node.children.forEach((child: any) => {
                        if (child.type === 'department') deptNodes.push(child);
                    });
                }
            });

            // DEDUPLICATION: Remove duplicate department names (same as Universe)
            const uniqueDepts = deptNodes.filter((dept, index, arr) =>
                arr.findIndex(d => d.name.toLowerCase() === dept.name.toLowerCase()) === index
            );

            // CAP AT 25: Same UI/rendering limit as Universe
            const visibleFolders = uniqueDepts.slice(0, 25);
            const visibleFiles: any[] = []; // No files at root level

            return { folders: visibleFolders, files: visibleFiles };
        }

        // Drilled down view
        const targetNode = findNodeInTree(rawTree, currentFolderId);
        if (!targetNode || !targetNode.children) return { files: [], folders: [] };

        const visibleFolders = targetNode.children.filter(n => ['space', 'department', 'folder'].includes(n.type));
        const visibleFiles = targetNode.children.filter(n => !['space', 'department', 'folder'].includes(n.type));

        return { folders: visibleFolders, files: visibleFiles };

    }, [currentFolderId, rawTree, findNodeInTree]);

    // Effect to update view when path changes or tree loads
    useEffect(() => {
        const { files, folders } = getCurrentContent();
        setFiles(files);
        setFolders(folders);

        if (currentFolderId && rawTree.length > 0) {
            const bc = buildBreadcrumbs(rawTree, currentFolderId);
            if (bc) setBreadcrumbs(bc);
        } else {
            setBreadcrumbs([]);
        }
    }, [currentFolderId, rawTree, getCurrentContent, buildBreadcrumbs]);

    // DATA CONSISTENCY FIX: Use loadTree from store instead of direct fetchTree
    // This ensures both Universe and Finder use the same data source
    const loadContent = async () => {
        try {
            await loadTree();
            // After tree loads, handle departmentId navigation if needed
            if (departmentId && treeData) {
                const deptNode = findNodeInTree(treeData, departmentId);
                if (deptNode) setCurrentFolderId(departmentId);
            }
        } catch (e) {
            console.error("Tree load failed", e);
        }
    };

    // Initial Load
    useEffect(() => {
        if (activeCompanyId) loadContent();
    }, [activeCompanyId]);


    // (Removed old extractFolders and separate load logic to unify via Tree)

    const handleUpload = async (fileList: File[]) => {
        if (!activeCompanyId) {
            toast.error('Select a company first.');
            setShowUpload(false);
            return;
        }

        setShowUpload(false);
        setIsUploading(true);

        // P6: Orb reacts - thinking (lila) während Upload/Analyse
        setThinking();

        // P6: Timeline event - intake started (P2-Pattern)
        window.dispatchEvent(new CustomEvent('mora:agency-update', {
            detail: {
                type: 'proposal',
                status: 'started',
                intent: 'intake',
                message: `${fileList[0]?.name || 'Datei'} wird analysiert...`
            }
        }));

        let successCount = 0;
        try {
            for (const file of fileList) {
                try {
                    const uploaded = await uploadCompanyFile(file, activeCompanyId);
                    successCount++;

                    const response = await requestCreateNodeFromFile(uploaded.id);
                    if (response?.status === 'pending_confirmation') {
                        // P6: Orb switches to focus (blau) - waiting for user
                        setFocus();

                        // P6: Timeline event - ready for confirmation
                        const intakeContext = response.intake_context;
                        window.dispatchEvent(new CustomEvent('mora:agency-update', {
                            detail: {
                                type: 'proposal',
                                status: 'complete',
                                intent: 'intake',
                                message: intakeContext?.business_summary || `${uploaded.filename} bereit zur Einordnung`
                            }
                        }));

                        setPendingAction({
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
                            confirm_endpoint: `/v1/files/${uploaded.id}/confirm-node`,
                            confirm_payload: { confirmation_token: response.confirmation_token },
                            // P6: Pass intake_context to ConfirmationCard
                            intake_context: response.intake_context
                        });
                        break;
                    }

                    if (response?.status === 'executed') {
                        window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                        // P6: Auto-executed, return to idle
                        setIdle();
                    }
                } catch (e) {
                    console.error(`Failed to upload ${file.name}:`, e);
                    // P6: Timeline event - failed
                    window.dispatchEvent(new CustomEvent('mora:agency-update', {
                        detail: {
                            type: 'proposal',
                            status: 'failed',
                            intent: 'intake',
                            message: `Upload fehlgeschlagen: ${file.name}`
                        }
                    }));
                }
            }
            if (successCount > 0 && !pendingAction) {
                toast.success(`${successCount} file(s) uploaded`);
                loadContent();
            } else if (successCount === 0) {
                toast.error('Failed to upload files');
                setIdle();
            }
        } catch (e) {
            toast.error('Upload error');
            setIdle();
        } finally {
            setIsUploading(false);
        }
    };

    if (!pane) return null;

    return (
        <>
            <GlassPanel
                title={departmentName ? `Dateien - ${departmentName}` : "Finder"}
                width={pane.size.width}
                height={pane.size.height}
                initialX={pane.position.x}
                initialY={pane.position.y}
                onPositionChange={(x, y) => {
                    updatePanePosition(id, x, y);
                }}
                onResize={(w, h) => {
                    updatePaneSize(id, w, h);
                }}
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
                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <div className="flex items-center gap-2 text-sm text-white/50">
                            <button onClick={() => setCurrentFolderId(null)} className="hover:text-white transition-colors">
                                <Home size={16} />
                            </button>
                            {breadcrumbs.length > 0 && <ChevronRight size={14} />}
                            {breadcrumbs.map((bc, i) => (
                                <div key={bc.id} className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentFolderId(bc.id)}
                                        className={`hover:text-white transition-colors ${i === breadcrumbs.length - 1 ? 'text-white' : ''}`}
                                    >
                                        {bc.name}
                                    </button>
                                    {i < breadcrumbs.length - 1 && <ChevronRight size={14} />}
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadContent}
                                className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                            >
                                {/* DATA CONSISTENCY FIX: Use isLoadingTree from store */}
                                <RefreshCw size={16} className={(isLoading || isLoadingTree) ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={() => setShowUpload(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all text-sm font-medium"
                            >
                                <Upload size={16} />
                                Upload Files
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {/* DATA CONSISTENCY FIX: Use isLoadingTree from store */}
                        {(isLoading || isLoadingTree) && files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/30">
                                <Loader2 size={32} className="animate-spin" />
                                <span>Loading content...</span>
                            </div>
                        ) : files.length === 0 && folders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4 text-white/30">
                                <AlertCircle size={48} />
                                <p>No files found. Upload your first document!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-4">
                                {/* Folders */}
                                {folders.map(folder => (
                                    <SemanticItem
                                        key={folder.id}
                                        relevance={0.05}
                                        onClick={() => setCurrentFolderId(folder.id)}
                                        className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors flex flex-col gap-2 cursor-pointer group relative"
                                    >
                                        <div className="flex justify-between items-start">
                                            {folder.type === 'department' ? (
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-emerald-400/20 blur-sm rounded-full" />
                                                    <Globe size={32} className="text-emerald-400 relative z-10" />
                                                </div>
                                            ) : folder.type === 'space' ? (
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-cyan-400/20 blur-sm rounded-full" />
                                                    <Circle size={28} className="text-cyan-400 relative z-10" />
                                                </div>
                                            ) : (
                                                <FolderIcon size={32} className="text-blue-400/80 group-hover:text-blue-400" />
                                            )}

                                            {folder.type === 'department' && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">PLANET</span>
                                            )}
                                            {folder.type === 'space' && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] border border-cyan-500/30">MOON</span>
                                            )}
                                        </div>
                                        <span className="text-sm text-white/80 truncate font-medium">{folder.name}</span>
                                    </SemanticItem>
                                ))}

                                {/* Files */}
                                {files.map(file => {
                                    const isResonant = resonanceIds.includes(file.id);
                                    // Heavy gravity for resonant items!
                                    const relevance = isResonant ? 1.0 : 0.05;

                                    return (
                                        <SemanticItem
                                            key={file.id}
                                            relevance={relevance}
                                            className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all flex flex-col gap-2 cursor-pointer group relative"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // 1. Trigger Semantic Resonance (The Magic)
                                                checkResonance(file.id);

                                                // 2. Open file in DocumentPane
                                                const paneId = `doc-${file.id}`;
                                                const { openPane } = usePaneStore.getState();
                                                openPane({
                                                    id: paneId,
                                                    type: 'document',
                                                    title: file.name || 'Document',
                                                    size: { width: 800, height: 600 },
                                                    data: {
                                                        nodeId: file.id,
                                                        content: file.content,
                                                        name: file.name,
                                                        type: file.type,
                                                        metadata: file.metadata
                                                    }
                                                });
                                            }}
                                        >
                                            {/* Resonance Glow Effect */}
                                            {resonanceIds.includes(file.id) && (
                                                <div className="absolute inset-0 rounded-xl border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] pointer-events-none animate-pulse" />
                                            )}
                                            {resonanceSourceId === file.id && (
                                                <div className="absolute inset-0 rounded-xl border border-emerald-500/50 bg-emerald-500/5 pointer-events-none" />
                                            )}
                                            <div className="flex justify-between items-start">
                                                <FileText size={32} className="text-emerald-400/80 group-hover:text-emerald-400" />
                                                {file.metadata?.size && (
                                                    <span className="text-[10px] text-white/30">{(file.metadata.size / 1024).toFixed(0)}KB</span>
                                                )}
                                            </div>
                                            <span className="text-sm text-white/80 truncate" title={file.name}>{file.name}</span>
                                            <div className="text-xs text-white/30 truncate">{new Date(file.created_at || Date.now()).toLocaleDateString()}</div>

                                            {/* Type Badge */}
                                            {file.type === 'video' && (
                                                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/30">VIDEO</span>
                                            )}
                                            {file.type === 'document' && (
                                                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] border border-blue-500/30">DOC</span>
                                            )}

                                            {/* Resonance Badge */}
                                            {resonanceIds.includes(file.id) && (
                                                <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-amber-400/90 bg-black/60 px-1.5 py-0.5 rounded border border-amber-400/30 shadow-lg z-10">
                                                    <Sparkles size={8} />
                                                    RESONANCE
                                                </span>
                                            )}
                                        </SemanticItem>
                                    );
                                })}
                            </div>
                        )}
                    </div>


                    {pendingAction && (
                        <ConfirmationCard
                            action={pendingAction}
                            variant="intake"
                            onConfirmed={() => {
                                setPendingAction(null);
                                // P6: Orb returns to idle after confirmation
                                setIdle();
                                loadContent();
                            }}
                            onRejected={async () => {
                                const active = pendingAction;
                                setPendingAction(null);
                                // P6: Orb returns to idle after reject
                                setIdle();
                                if (active) {
                                    try {
                                        await rejectCreateNodeFromFile(active.file_id, active.confirmation_token);
                                        toast.info('Node creation rejected');
                                    } catch (err) {
                                        console.error('Reject failed', err);
                                    }
                                }
                            }}
                            onDismiss={() => {
                                // P6: "Später" - dismiss UI without policy reject
                                // Pending stays pending (token still valid for 5 min)
                                setPendingAction(null);
                                setIdle();
                                toast.info('Einordnung verschoben');
                            }}
                        />
                    )}

                    {/* Status Footer */}
                    {isUploading && (
                        <div className="px-4 py-2 border-t border-white/5 bg-emerald-900/10 text-xs text-emerald-400 flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" />
                            Uploading files to secure storage...
                        </div>
                    )}
                </div>
            </GlassPanel>

            {/* Upload Modal */}
            {showUpload && (
                <FileUploadZone
                    onFilesUploaded={handleUpload}
                    onClose={() => setShowUpload(false)}
                />
            )}

        </>
    );
};
