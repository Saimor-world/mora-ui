import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { FileText, Folder as FolderIcon, Upload, Loader2, RefreshCw, AlertCircle, ChevronRight, Home } from 'lucide-react';
import { fetchNodesByCompany, fetchTree, uploadFile } from '@/lib/api/coreClient';
import type { CoreTreeNode } from '@/lib/types/core';
import { toast } from '@/lib/toast';
import { FileUploadZone } from '@/components/organic/FileUploadZone';

import { MOCK_DATA } from '@/lib/data/mockData';

export const FinderPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane } = usePaneStore();
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

    // Navigation path for browsing
    const [currentPath, setCurrentPath] = useState<{ type: 'department' | 'space' | 'folder'; id: string; name: string }[]>([]);

    // Recursively extract folders from tree (including Spaces and Departments as containers)
    const extractFolders = (nodes: CoreTreeNode[]): any[] => {
        let results: any[] = [];
        for (const node of nodes) {
            if (['folder', 'space', 'department'].includes(node.type)) {
                results.push(node);
            }
            if (node.children) {
                results = [...results, ...extractFolders(node.children)];
            }
        }
        return results;
    };

    const loadContent = async () => {
        setIsLoading(true);

        try {
            // QUICK ACCESS MODE: Load Spaces for specific department
            if (departmentId) {
                // Load Spaces for this department if not already loaded
                if (!spacesByDepartment[departmentId]) {
                    await loadSpacesForDepartment(departmentId);
                }

                // Get Spaces from store
                const departmentSpaces = spacesByDepartment[departmentId] || [];

                // Show Spaces as folders
                const spaceFolders = departmentSpaces.map(space => ({
                    id: space.id,
                    name: space.name,
                    type: 'space',
                    color: '#3B82F6',
                    departmentId: departmentId
                }));

                setFolders(spaceFolders);
                setFiles([]); // Spaces are containers, files are inside folders within spaces
                setIsLoading(false);
                return;
            }

            // GLOBAL MODE: Load all data for company (original logic)
            if (!activeCompanyId) {
                setIsLoading(false);
                return;
            }

            const activeCompany = companies.find(c => c.id === activeCompanyId);
            const targetId = activeCompanyId;
            const isDemo = activeCompany?.is_demo || activeCompany?.name.includes('Coffee');

            // 1. Load Real Data
            let allFiles: any[] = [];
            let allFolders: any[] = [];

            if (targetId) {
                const nodes = await fetchNodesByCompany(targetId);
                if (nodes) allFiles = [...nodes];
            }

            const tree = await fetchTree();
            if (tree) {
                allFolders = extractFolders(tree);
            }

            // 2. Inject Mock Data if Demo Mode (and missing real data)
            if (isDemo) {
                // Add Mock Nodes
                const mockNodes = MOCK_DATA.demo.nodes;
                const existingIds = new Set(allFiles.map(f => f.id));
                const newMockNodes = mockNodes.filter(n => !existingIds.has(n.id));
                allFiles = [...allFiles, ...newMockNodes];

                // Add Mock Structure (Spaces/Folders) as Folders
                const mockSpaces = Object.values(MOCK_DATA.demo.spaces).flat().map(s => ({
                    id: s.id, type: 'space', name: s.name, color: '#3B82F6', departmentId: (s as any).departmentId
                }));
                const mockFolders = Object.values(MOCK_DATA.demo.folders).flat().map(f => ({
                    id: f.id, type: 'folder', name: f.name, color: '#6366f1', spaceId: (f as any).spaceId
                }));

                const existingFolderIds = new Set(allFolders.map(f => f.id));
                const newMockFolders = [...mockSpaces, ...mockFolders].filter(f => !existingFolderIds.has(f.id));
                allFolders = [...allFolders, ...newMockFolders];
            }

            setFiles(allFiles);
            setFolders(allFolders);

        } catch (e) {
            console.error('Finder load error:', e);
            toast.error('Failed to load files');
        } finally {
            setIsLoading(false);
        }
    };

    // Load content when department changes or when Finder opens
    useEffect(() => {
        loadContent();
    }, [activeCompanyId, departmentId, spacesByDepartment[departmentId || '']]);

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
                width={900}
                height={600}
                onClose={() => removePane(id)}
                onMinimize={() => minimizePane(id)}
                onFocus={() => focusPane(id)}
                isActive={true}
                zIndex={pane.zIndex}
                showCloseButton
                showMinimizeButton
                draggable
            >
                <div className="flex flex-col h-full">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <div className="flex items-center gap-2 text-sm text-white/50">
                            <FolderIcon size={16} />
                            <span>{folders.length} Folders</span>
                            <span className="mx-2">•</span>
                            <FileText size={16} />
                            <span>{files.length} Files</span>
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
                                    <div key={folder.id} className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors flex flex-col gap-2 cursor-pointer group relative">
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
                                    </div>
                                ))}

                                {/* Files */}
                                {files.map(file => (
                                    <div
                                        key={file.id}
                                        className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all flex flex-col gap-2 cursor-pointer group relative"
                                        onClick={() => {
                                            // Open file in DocumentPane
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
                                    >
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
                                    </div>
                                ))}
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
        </>
    );
};
