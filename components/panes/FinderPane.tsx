import React, { useState, useEffect, useCallback } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { FileText, Folder as FolderIcon, Upload, Loader2, RefreshCw, AlertCircle, ChevronRight, Home, Sparkles } from 'lucide-react';
import { fetchNodesByCompany, fetchTree, uploadFile, getSemanticallySimilarNodes } from '@/lib/api/coreClient';
import type { CoreTreeNode } from '@/lib/types/core';
import { toast } from '@/lib/toast';
import { FileUploadZone } from '@/components/organic/FileUploadZone';
import { SemanticItem } from '@/components/organic/SemanticItem';
import { ContextActionMenu, AIAction } from '@/components/organic/ContextActionMenu';
import { getNodeActions } from '@/lib/api/coreClient';



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
        loadNodesForFolder
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

    // Intelligence: Semantic Resonance
    const [resonanceIds, setResonanceIds] = useState<string[]>([]);
    const [resonanceSourceId, setResonanceSourceId] = useState<string | null>(null);

    // Intelligence: AI Context Actions
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
    const [contextActions, setContextActions] = useState<AIAction[]>([]);
    const [loadingActions, setLoadingActions] = useState(false);

    const handleContextMenu = async (e: React.MouseEvent, nodeId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
        setLoadingActions(true);
        setContextActions([]);

        try {
            const actions = await getNodeActions(nodeId);
            setContextActions(actions);
        } catch (err) {
            console.error("Failed to load actions", err);
        } finally {
            setLoadingActions(false);
        }
    };

    const handleActionSelect = (action: AIAction) => {
        console.log("Selected Action:", action);
        toast.success(`Executing: ${action.label}`);
        setContextMenu(null);

        // TODO: Implement actual handlers (Chat, Summarize, etc.)
        if (action.action_type === 'chat') {
            // Open chat pane with context...
        }
    };

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
    const [rawTree, setRawTree] = useState<CoreTreeNode[]>([]);

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
            // Filter tree for active company if needed, or just show top level
            // fetchTree likely returns company roots or spaces.
            // Assuming rawTree is list of root items (Spaces usually).
            const visibleFolders = rawTree.filter(n => ['space', 'department', 'folder'].includes(n.type));
            const visibleFiles = rawTree.filter(n => !['space', 'department', 'folder'].includes(n.type));
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

    // Load ALL Tree Data once
    const loadContent = async () => {
        setIsLoading(true);
        try {
            const tree = await fetchTree();
            // Filter tree by activeCompanyId if tree contains multiple companies
            // Assuming fetchTree returns global tree or company scoped. 
            // Phase 4 usually scoped `fetchTree` to user/company.
            if (tree) {
                setRawTree(tree);
                if (departmentId) {
                    // Find department in tree and set it as init
                    const deptNode = findNodeInTree(tree, departmentId);
                    if (deptNode) setCurrentFolderId(departmentId);
                }
            }
        } catch (e) {
            console.error("Tree load failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial Load
    useEffect(() => {
        if (activeCompanyId) loadContent();
    }, [activeCompanyId]);


    // (Removed old extractFolders and separate load logic to unify via Tree)

    const handleUpload = async (fileList: File[]) => {
        if (folders.length === 0) {
            toast.error('No folders found. Create a department/space first.');
            setShowUpload(false);
            return;
        }

        setShowUpload(false);
        setIsUploading(true);
        const targetFolderId = folders[0].id; // Default to first folder for now

        let successCount = 0;
        try {
            for (const file of fileList) {
                try {
                    await uploadFile(file, targetFolderId);
                    successCount++;
                } catch (e) {
                    console.error(`Failed to upload ${file.name}:`, e);
                }
            }
            if (successCount > 0) {
                toast.success(`${successCount} files uploaded successfully`);
                loadContent();
            } else {
                toast.error('Failed to upload files');
            }
        } catch (e) {
            toast.error('Upload error');
        } finally {
            setIsUploading(false);
        }
    };

    if (!pane) return null;

    return (
        <>
            <GlassPanel
                title={departmentName ? `Dateien — ${departmentName}` : "Finder"}
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
                                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
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
                        {isLoading && files.length === 0 ? (
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
                                            <FolderIcon size={32} className="text-blue-400/80 group-hover:text-blue-400" />
                                            {folder.type === 'department' && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30">DEPT</span>
                                            )}
                                            {folder.type === 'space' && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] border border-cyan-500/30">SPACE</span>
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
                                                const { addPane, focusPane } = usePaneStore.getState();
                                                addPane({
                                                    id: paneId,
                                                    type: 'document',
                                                    title: file.name || 'Document',
                                                    data: {
                                                        nodeId: file.id,
                                                        content: file.content,
                                                        name: file.name,
                                                        type: file.type,
                                                        metadata: file.metadata
                                                    },
                                                    minimized: false,
                                                    size: { width: 800, height: 600 },
                                                    position: {
                                                        x: window.innerWidth / 2 - 400,
                                                        y: window.innerHeight / 2 - 400
                                                    }
                                                });
                                                focusPane(paneId);
                                            }}
                                            // Trigger AI Context Menu
                                            onContextMenu={(e) => handleContextMenu(e as any, file.id)}
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

            {/* AI Context Menu */}
            {contextMenu && (
                <ContextActionMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    actions={contextActions}
                    loading={loadingActions}
                    onSelect={handleActionSelect}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </>
    );
};
