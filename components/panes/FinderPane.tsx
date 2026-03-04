import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { FileText, Folder as FolderIcon, Upload, UploadCloud, Loader2, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Home, Sparkles, Globe, Circle, LayoutGrid, List, Search, Plus, Trash2, Box, Image as ImageIcon, Link as LinkIcon, CheckSquare, Network, Edit, Copy, Scissors, ExternalLink, Clipboard, CornerUpLeft, Share2 } from 'lucide-react';
import { setThinking, setFocus, setIdle } from '@/lib/mora/awarenessController';
import { getSemanticallySimilarNodes, fetchFolderContext, getEntityContext, FolderContext } from '@/lib/api/coreClient';
import type { CoreTreeNode } from '@/lib/types/core';
import { toast } from '@/lib/toast';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';
import { SemanticItem } from '@/components/organic/SemanticItem';
import { uploadCompanyFile, requestCreateNodeFromFile, rejectCreateNodeFromFile, getFileNode } from '@/lib/api/filesClient';
import { useSemanticConstellation } from '@/lib/hooks/useSemanticConstellation';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Helper: Merge lists and deduplicate by ID
const mergeUnique = <T extends { id: string }>(...lists: (T[] | undefined | null)[]): T[] => {
    const map = new Map<string, T>();
    lists.forEach(list => {
        if (list) {
            list.forEach(item => {
                if (item?.id) map.set(item.id, item);
            });
        }
    });
    return Array.from(map.values());
};


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
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const {
        activeCompanyId,
        companies,
        setViewLevel,
        setActiveDepartment,
        setActiveSpace,
        setActiveFolder,
        spacesByDepartment,
        loadSpacesForDepartment,
        foldersBySpace,
        loadFoldersForSpace,
        nodesByFolder,
        loadNodesForFolder,
        // DATA CONSISTENCY FIX: Use shared treeData from store instead of local state
        treeData,
        loadTree,
        isLoadingTree,
        addFolder,
        user,  // For autoExecuteActions setting
        loadedNodes,
        loadChildren,
        updateNode, deleteNode, updateFolder, deleteFolder, updateSpace, deleteSpace, addNode
    } = useMoraStore();
    const pane = getPane(id);

    // UNIFIED FINDER: Can start at any level
    // Quick Access: Filter by department if provided
    const departmentId = pane?.data?.departmentId as string | undefined;
    const departmentName = pane?.data?.departmentName as string | undefined;
    // Space-level start (for Moon clicks)
    const startSpaceId = pane?.data?.spaceId as string | undefined;
    // Folder-level start (for direct folder access)
    const startFolderId = pane?.data?.folderId as string | undefined;
    // Optional company hint from caller (used when store has no active company yet)
    const paneCompanyId = pane?.data?.companyId as string | undefined;
    // Auto-show upload on open
    const autoShowUpload = pane?.data?.showUpload as boolean | undefined;
    // Initial search query
    const initialQuery = pane?.data?.query as string | undefined;
    // Global search mode - search across ALL levels (Windows Explorer style)
    const globalSearch = pane?.data?.globalSearch as boolean | undefined;

    const [files, setFiles] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(autoShowUpload || false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    // Context Menu & Clipboard
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: any; type: 'folder' | 'file' | 'background' } | null>(null);
    const [clipboard, setClipboard] = useState<{ id: string; item: any; mode: 'copy' | 'cut' } | null>(null);

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent, item: any, type: 'folder' | 'file' | 'background') => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, item, type });
    }, []);

    const handleRename = async () => {
        if (!contextMenu?.item) return;
        const newName = prompt("Rename:", contextMenu.item.name || contextMenu.item.title);
        if (!newName) return;
        try {
            if (contextMenu.type === 'folder' || contextMenu.item.type === 'space' || contextMenu.item.type === 'department') {
                if (contextMenu.item.type === 'space') await updateSpace(contextMenu.item.id, { name: newName });
                else if (contextMenu.item.type === 'folder') await updateFolder(contextMenu.item.id, { name: newName });
                else toast.error("Cannot rename departments here");
            } else {
                await updateNode(contextMenu.item.id, { title: newName });
            }
            loadContent();
            toast.success('Renamed successfully');
        } catch (e: any) { toast.error(e.message || 'Rename failed'); }
        setContextMenu(null);
    };

    const handleDelete = async () => {
        if (!contextMenu?.item || !confirm(`Delete ${contextMenu.item.name || contextMenu.item.title}?`)) return;
        try {
            if (contextMenu.type === 'folder' || contextMenu.item.type === 'space') {
                if (contextMenu.item.type === 'space') await deleteSpace(contextMenu.item.id);
                else await deleteFolder(contextMenu.item.id);
            } else {
                await deleteNode(contextMenu.item.id);
            }
            loadContent();
            toast.success('Deleted');
        } catch (e: any) { toast.error(e.message || 'Delete failed'); }
        setContextMenu(null);
    };

    const handleCopy = () => {
        if (!contextMenu?.item) return;
        setClipboard({ id: contextMenu.item.id, item: contextMenu.item, mode: 'copy' });
        toast.success('Copied to clipboard');
        setContextMenu(null);
    };

    const handleCut = () => {
        if (!contextMenu?.item) return;
        setClipboard({ id: contextMenu.item.id, item: contextMenu.item, mode: 'cut' });
        toast.success('Cut to clipboard');
        setContextMenu(null);
    };

    const handlePaste = async () => {
        if (!clipboard) return;
        try {
            const targetFolderId = currentFolderId; // Null for root/company
            if (clipboard.mode === 'cut') {
                // Move
                if (clipboard.item.type === 'folder' || clipboard.item.type === 'space') {
                    // Folder move not fully supported in pure API yet without parent update
                    toast.info("Moving folders not yet supported");
                } else {
                    await updateNode(clipboard.id, { folder_id: targetFolderId || undefined });
                    toast.success('Element verschoben');
                }
            } else {
                // Copy (Duplicate) - Requires creating new node
                if (['folder', 'space', 'department'].includes(clipboard.item.type)) {
                    toast.info("Folder duplication not supported");
                } else {
                    if (!resolvedCompanyId) {
                        toast.error('Select a company first.');
                        return;
                    }
                    await addNode({
                        company_id: resolvedCompanyId,
                        folder_id: targetFolderId || undefined,
                        title: `${clipboard.item.name || clipboard.item.title} (Copy)`,
                        type: clipboard.item.type,
                        content: clipboard.item.content || '',
                        metadata: clipboard.item.metadata || {}
                    } as any);
                    toast.success('File duplicated');
                }
            }
            void loadContent();
            setClipboard(null);
        } catch (e: any) { toast.error(e.message || 'Paste failed'); }
        setContextMenu(null);
    };

    const handleOpen = () => {
        if (!contextMenu?.item) return;
        if (contextMenu.type === 'folder' || contextMenu.item.type === 'space') {
            navigateToFolder(contextMenu.item.id);
        } else {
            openPane({
                id: `doc-${contextMenu.item.id}`,
                type: 'document',
                title: contextMenu.item.name || 'Document',
                size: { width: 800, height: 600 },
                data: { nodeId: contextMenu.item.id, content: contextMenu.item.content, name: contextMenu.item.name, type: contextMenu.item.type }
            });
        }
        setContextMenu(null);
    };

    const handleOpenInUniverse = useCallback(() => {
        if (!contextMenu?.item) return;

        const item = contextMenu.item as any;
        const itemType = (item.type || (contextMenu.type === 'file' ? 'node' : 'folder')) as string;
        const departmentIdFromItem = item.department_id ?? null;
        const spaceIdFromItem = item.space_id ?? null;
        const folderIdFromItem = itemType === 'folder' ? item.id : (item.folder_id ?? null);

        if (itemType === 'department') {
            const departmentId = item.id ?? departmentIdFromItem;
            if (!departmentId) {
                toast.error('Department konnte nicht im Universe geöffnet werden');
                setContextMenu(null);
                return;
            }
            setActiveDepartment(departmentId);
            setActiveSpace(null);
            setActiveFolder(null);
            setViewLevel('department');
            void loadSpacesForDepartment(departmentId);
            toast.success('Department im Universe geöffnet');
            setContextMenu(null);
            return;
        }

        if (itemType === 'space') {
            const spaceId = item.id ?? spaceIdFromItem;
            if (!spaceId) {
                toast.error('Space konnte nicht im Universe geöffnet werden');
                setContextMenu(null);
                return;
            }
            if (departmentIdFromItem) setActiveDepartment(departmentIdFromItem);
            setActiveSpace(spaceId);
            setActiveFolder(null);
            setViewLevel('space');
            void loadFoldersForSpace(spaceId);
            toast.success('Space im Universe geöffnet');
            setContextMenu(null);
            return;
        }

        const fallbackCurrent = currentFolderIdRef.current;
        const folderId = folderIdFromItem ?? fallbackCurrent;
        if (!folderId) {
            toast.error('Kein Ordnerkontext für Universe-Navigation verfügbar');
            setContextMenu(null);
            return;
        }

        if (departmentIdFromItem) setActiveDepartment(departmentIdFromItem);
        if (spaceIdFromItem) setActiveSpace(spaceIdFromItem);
        setActiveFolder(folderId);
        setViewLevel('folder');
        void loadNodesForFolder(folderId);
        toast.success(itemType === 'folder' ? 'Ordner im Universe geöffnet' : 'Dateikontext im Universe geöffnet');
        setContextMenu(null);
    }, [
        contextMenu,
        loadFoldersForSpace,
        loadNodesForFolder,
        loadSpacesForDepartment,
        setActiveDepartment,
        setActiveFolder,
        setActiveSpace,
        setViewLevel,
    ]);

    // UNIFIED FINDER: View modes (like SpacePane had) + Graph view for semantic network
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'graph'>('grid');
    const [graphZoom, setGraphZoom] = useState(0.85);
    const [graphPan, setGraphPan] = useState({ x: 0, y: 0 });
    const graphDragRef = useRef<{ isDragging: boolean, startX: number, startY: number, initialPan: { x: number, y: number } }>({ isDragging: false, startX: 0, startY: 0, initialPan: { x: 0, y: 0 } });
    const [searchQuery, setSearchQuery] = useState(initialQuery || '');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Create folder modal
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Intelligence: Semantic Resonance
    const [resonanceIds, setResonanceIds] = useState<string[]>([]);
    const [resonanceSourceId, setResonanceSourceId] = useState<string | null>(null);

    // P6: Semantic Constellation (Living Knowledge)
    const { connections, fetchConstellation, clearConstellation } = useSemanticConstellation();

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
        } catch (e: any) {
            // Silence 500 errors if semantic service is offline
            if (e.status !== 500) {
                console.error("Resonance check failed", e);
            }
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            // Reset input so same file can be re-selected
            e.target.value = '';
            await handleUpload(selectedFiles);
        }
    };

    // Navigation
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [backStack, setBackStack] = useState<Array<string | null>>([]);
    const [forwardStack, setForwardStack] = useState<Array<string | null>>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string; type: string }[]>([]);
    const [folderContext, setFolderContext] = useState<FolderContext | null>(null);
    const [contextHint, setContextHint] = useState<string | null>(null);
    const currentFolderIdRef = useRef<string | null>(null);
    const contextCacheRef = useRef<Map<string, { ctx: FolderContext | null; hint: string | null }>>(new Map());

    useEffect(() => {
        currentFolderIdRef.current = currentFolderId;
    }, [currentFolderId]);

    const resetNavigationRoot = useCallback((folderId: string | null) => {
        currentFolderIdRef.current = folderId;
        setBackStack([]);
        setForwardStack([]);
        setCurrentFolderId(folderId);
    }, []);

    const navigateToFolder = useCallback((targetFolderId: string | null, mode: 'push' | 'replace' = 'push') => {
        const current = currentFolderIdRef.current;
        if (current === targetFolderId) return;
        if (mode === 'push') {
            setBackStack((prev) => [...prev, current]);
            setForwardStack([]);
        }
        currentFolderIdRef.current = targetFolderId;
        setCurrentFolderId(targetFolderId);
    }, []);

    const navigateBack = useCallback(() => {
        setBackStack((prev) => {
            if (prev.length === 0) return prev;
            const next = prev[prev.length - 1];
            const trimmed = prev.slice(0, -1);
            setForwardStack((forwardPrev) => [currentFolderIdRef.current, ...forwardPrev]);
            currentFolderIdRef.current = next ?? null;
            setCurrentFolderId(next ?? null);
            return trimmed;
        });
    }, []);

    const navigateForward = useCallback(() => {
        setForwardStack((prev) => {
            if (prev.length === 0) return prev;
            const [next, ...rest] = prev;
            setBackStack((backPrev) => [...backPrev, currentFolderIdRef.current]);
            currentFolderIdRef.current = next ?? null;
            setCurrentFolderId(next ?? null);
            return rest;
        });
    }, []);

    const navigateUp = useCallback(() => {
        if (!currentFolderIdRef.current) return;
        if (breadcrumbs.length > 1) {
            navigateToFolder(breadcrumbs[breadcrumbs.length - 2].id);
            return;
        }
        navigateToFolder(null);
    }, [breadcrumbs, navigateToFolder]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            const editable = !!target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
                return;
            }

            // Do not hijack navigation keys while typing
            if (editable) return;

            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateBack();
                return;
            }
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                navigateForward();
                return;
            }
            if (e.altKey && e.key === 'ArrowUp') {
                e.preventDefault();
                navigateUp();
                return;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [navigateBack, navigateForward, navigateUp]);

    /**
     * Click-race guard for folder navigation.
     * Framer Motion's gesture system can absorb native `dblclick` on animated elements.
     * Instead we track two rapid clicks ourselves: first click selects, second click
     * within DOUBLE_CLICK_MS navigates forward — deterministic in all view modes.
     */
    const DOUBLE_CLICK_MS = 300;
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastClickedFolderRef = useRef<string | null>(null);

    const handleFolderClick = useCallback((e: React.MouseEvent, folderId: string) => {
        e.stopPropagation();
        if (
            lastClickedFolderRef.current === folderId &&
            clickTimerRef.current !== null
        ) {
            // Second click within window → navigate forward
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            lastClickedFolderRef.current = null;
            navigateToFolder(folderId);
        } else {
            // First click → select only; arm timer
            if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
            setSelectedNodeId(folderId);
            lastClickedFolderRef.current = folderId;
            clickTimerRef.current = setTimeout(() => {
                clickTimerRef.current = null;
                lastClickedFolderRef.current = null;
            }, DOUBLE_CLICK_MS);
        }
    }, [navigateToFolder]);

    // DEEP VIEW STATE
    const [isDeepView, setIsDeepView] = useState(false);

    const resolvedCompanyId = useMemo(() => {
        if (activeCompanyId) return activeCompanyId;
        if (paneCompanyId) return paneCompanyId;
        if (companies.length === 1) return companies[0].id;
        return null;
    }, [activeCompanyId, paneCompanyId, companies]);

    useEffect(() => {
        contextCacheRef.current.clear();
    }, [resolvedCompanyId]);

    const currentPathLabel = useMemo(() => {
        const parts: string[] = [];

        if (folderContext?.path?.company?.name) parts.push(folderContext.path.company.name);
        if (folderContext?.path?.department?.name) parts.push(folderContext.path.department.name);
        if (folderContext?.path?.space?.name) parts.push(folderContext.path.space.name);
        if (Array.isArray(folderContext?.path?.breadcrumbs)) {
            folderContext.path.breadcrumbs.forEach((b) => {
                if (b?.name) parts.push(b.name);
            });
        }
        if (parts.length > 0) return parts.join(' / ');

        if (breadcrumbs.length > 0) {
            return breadcrumbs.map((b) => b.name).filter(Boolean).join(' / ');
        }
        return 'Home';
    }, [folderContext, breadcrumbs]);

    const handleCopyPath = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(currentPathLabel);
            toast.success('Pfad kopiert');
        } catch {
            toast.error('Pfad konnte nicht kopiert werden');
        }
    }, [currentPathLabel]);

    // DATA CONSISTENCY FIX: Stabilize rawTree to prevent infinite loops (useEffect deps)
    const rawTree = useMemo(() => treeData || [], [treeData]);

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
    const buildBreadcrumbs = useCallback((nodes: CoreTreeNode[], targetId: string, path: { id: string; name: string; type: string }[] = []): { id: string; name: string; type: string }[] | null => {
        for (const node of nodes) {
            // Include type in the path object
            if (node.id === targetId) return [...path, { id: node.id, name: node.name, type: node.type }];
            if (node.children) {
                const found = buildBreadcrumbs(node.children, targetId, [...path, { id: node.id, name: node.name, type: node.type }]);
                if (found) return found;
            }
        }
        return null;
    }, []);

    const resolveUploadFolderId = useCallback((): string | undefined => {
        if (currentFolderId) {
            const currentNode = findNodeInTree(rawTree, currentFolderId);
            if (currentNode?.type === 'folder') return currentFolderId;
        }
        if (startFolderId) {
            const startNode = findNodeInTree(rawTree, startFolderId);
            if (startNode?.type === 'folder') return startFolderId;
        }
        return undefined;
    }, [currentFolderId, findNodeInTree, rawTree, startFolderId]);

    // Recursively extract content for current view
    const getCurrentContent = useCallback(() => {
        // Fallback structures from store
        const flatSpaces = spacesByDepartment || {};
        const flatFolders = foldersBySpace || {};
        const flatNodes = nodesByFolder || {};

        // 0. SEARCH / GLOBAL VIEW
        if (globalSearch || searchQuery) {
            const results = { files: [] as any[], folders: [] as any[] };
            const q = searchQuery.toLowerCase();

            const traverse = (nodeList: any[], path: string = '') => {
                if (!nodeList || !Array.isArray(nodeList)) return;
                for (const node of nodeList) {
                    if (!node) continue;
                    const name = node.name || node.title || '';
                    const matches = name.toLowerCase().includes(q);
                    const currentPath = path ? `${path} > ${name}` : name;

                    if (matches || globalSearch) {
                        const nodeWithMeta = { ...node, foundIn: path };
                        if (['department', 'space', 'folder'].includes(node.type)) {
                            results.folders.push(nodeWithMeta);
                        } else {
                            results.files.push(nodeWithMeta);
                        }
                    }
                    if (node.children && Array.isArray(node.children)) {
                        traverse(node.children, currentPath);
                    }
                }
            };

            const roots = Array.isArray(rawTree) ? rawTree : [rawTree];
            traverse(roots);

            // If global search but no results from tree, check nodesByCompany
            if (globalSearch && results.files.length === 0 && resolvedCompanyId) {
                const companyNodes = useMoraStore.getState().nodesByCompany[resolvedCompanyId] || [];
                companyNodes.forEach(node => {
                    results.files.push({ ...node, name: node.title || node.name });
                });
            }

            return results;
        }

        // 1. ROOT VIEW (Home / Company level)
        if (!currentFolderId) {
            let items: any[] = [];

            // Prefer Tree Roots
            const roots = Array.isArray(rawTree) ? rawTree : [rawTree];
            roots.forEach(node => {
                if (node.type === 'department') items.push(node);
                else if (node.children) {
                    node.children.forEach((child: any) => {
                        if (child.type === 'department') items.push(child);
                    });
                }
            });

            // Fallback to Departments list
            // Fallback to Departments list
            const depts = useMoraStore.getState().departments || [];

            // STRICT MERGE: Tree items + Departments list
            const uniqueItems = mergeUnique(items, depts);

            return { folders: uniqueItems.slice(0, 25), files: [] };
        }

        // 2. DRILLED DOWN VIEW vs DEEP VIEW
        if (isDeepView && resolvedCompanyId) {
            // DEEP VIEW: Show ALL files in the company, ignoring folders
            const allNodes = useMoraStore.getState().nodesByCompany[resolvedCompanyId] || [];
            return {
                folders: [],
                files: allNodes.filter(n => !['folder', 'space', 'department'].includes(n.type))
                    .map(n => ({ ...n, name: n.title || n.name }))
            };
        }

        const targetNode = findNodeInTree(rawTree, currentFolderId);
        let folders: any[] = [];
        let files: any[] = [];

        // STRATEGY: Combine Tree Children + Flat Store Data (Union) to ensure we see EVERYTHING
        // 1. Get from Tree
        if (targetNode && targetNode.children) {
            targetNode.children.forEach(n => {
                if (['space', 'department', 'folder'].includes(n.type)) folders.push(n);
                else files.push(n);
            });
        }

        // 2. Get from Flat Stores (The "Source of Truth" for loaded content)
        // Check if current ID is a Department -> Show its Spaces
        const spaces = flatSpaces[currentFolderId];
        if (spaces) {
            spaces.forEach(s => folders.push(s));
        }

        // Check if current ID is a Space -> Show its Folders
        const sFolders = foldersBySpace[currentFolderId];
        if (sFolders) {
            sFolders.forEach(f => folders.push(f));
        }

        // Check if current ID is a Folder -> Show its Nodes
        const nodes = nodesByFolder[currentFolderId];
        if (nodes) {
            nodes.forEach(n => files.push({ ...n, name: n.title || n.name }));
        }

        // Deduplicate final results by ID
        const folderMap = new Map();
        folders.forEach(f => { if (f?.id) folderMap.set(f.id, f); });
        const fileMap = new Map();
        files.forEach(f => { if (f?.id) fileMap.set(f.id, f); });

        return {
            folders: Array.from(folderMap.values()),
            files: Array.from(fileMap.values())
        };
    }, [currentFolderId, rawTree, findNodeInTree, spacesByDepartment, foldersBySpace, nodesByFolder, isDeepView, resolvedCompanyId, globalSearch, searchQuery]);

    // Effect to update breadcrumbs only when necessary
    useEffect(() => {
        if (currentFolderId && rawTree.length > 0) {
            const bc = buildBreadcrumbs(rawTree, currentFolderId);
            if (bc) setBreadcrumbs(bc);
        } else {
            setBreadcrumbs([]);
        }
    }, [currentFolderId, rawTree, buildBreadcrumbs]);

        // Fetch server-side full path context for persistent breadcrumb bar.
    // PRIMARY: /v3/folders/{id}/context - strict folder paths only.
    // FALLBACK: /v3/{id}/context - generic entity resolver, safe for any id.
    //   Returns {resolved:false} instead of 404 if id is unknown.
    useEffect(() => {
        if (!currentFolderId) {
            setFolderContext(null);
            setContextHint(null);
            return;
        }
        if (!UUID_RE.test(currentFolderId)) {
            setFolderContext(null);
            setContextHint('Kontext konnte nicht eindeutig aufgeloest werden.');
            return;
        }

        const cached = contextCacheRef.current.get(currentFolderId);
        if (cached) {
            setFolderContext(cached.ctx);
            setContextHint(cached.hint);
            return;
        }

        const currentNode = findNodeInTree(rawTree, currentFolderId);
        const knownFolderFromSpaces = Object.values(foldersBySpace)
            .flat()
            .some((f) => f?.id === currentFolderId);
        const isDirectFolderStart =
            !currentNode &&
            startFolderId === currentFolderId &&
            knownFolderFromSpaces;
        const isFolderContext = currentNode?.type === 'folder' || isDirectFolderStart;

        let cancelled = false;
        const storeCache = (ctx: FolderContext | null, hint: string | null) => {
            contextCacheRef.current.set(currentFolderId, { ctx, hint });
            setFolderContext(ctx);
            setContextHint(hint);
        };

        if (isFolderContext) {
            // Path 1: strict folder context (breadcrumb-quality data)
            fetchFolderContext(currentFolderId)
                .then((ctx) => {
                    if (cancelled) return;
                    storeCache(ctx, ctx ? null : 'Ordnerkontext aktuell nicht verfuegbar.');
                })
                .catch(() => {
                    if (!cancelled) {
                        storeCache(null, 'Ordnerkontext aktuell nicht verfuegbar.');
                    }
                });
        } else {
            // Path 2: generic entity context - no 404 noise
            getEntityContext(currentFolderId)
                .then((ec) => {
                    if (cancelled) return;
                    if (ec?.resolved && ec.path) {
                        // Adapt EntityContext shape to FolderContext if path is available
                        storeCache({
                            scope: ec.entity_type ?? 'entity',
                            folder: { id: currentFolderId, name: ec.name ?? currentFolderId },
                            path: ec.path,
                            counts: { nodes: 0, subfolders: 0 },
                        }, null);
                    } else if (ec && !ec.resolved) {
                        storeCache(null, 'Kontext-ID nicht aufloesbar, Inhalte bleiben verfuegbar.');
                    } else {
                        storeCache(null, 'Kontext konnte nicht aufgeloest werden.');
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        storeCache(null, 'Kontext konnte nicht aufgeloest werden.');
                    }
                });
        }
        return () => { cancelled = true; };
    }, [currentFolderId, findNodeInTree, foldersBySpace, rawTree, startFolderId]);

    useEffect(() => {
        if (!contextHint) return;
        const timeout = window.setTimeout(() => setContextHint(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [contextHint, currentFolderId]);

    // Effect to handle view content and lazy loading
    useEffect(() => {
        if (currentFolderId) {
            const targetNode = findNodeInTree(rawTree, currentFolderId);

            if (targetNode) {
                const hasChildren = targetNode.children && targetNode.children.length > 0;
                const isLoaded = loadedNodes.has(targetNode.id);

                if (['department', 'space', 'folder'].includes(targetNode.type)) {
                    if (!hasChildren && !isLoaded) {
                        setIsLoading(true);
                        loadChildren(targetNode.id, targetNode.type as any)
                            .finally(() => setIsLoading(false));
                        return;
                    }
                }
            } else if (!nodesByFolder[currentFolderId]) {
                // Direct folder context can be valid even before full tree resolution.
                setIsLoading(true);
                loadNodesForFolder(currentFolderId)
                    .finally(() => setIsLoading(false));
                return;
            }
        }

        const content = getCurrentContent();
        setFiles(content.files);
        setFolders(content.folders);
    }, [currentFolderId, rawTree, getCurrentContent, findNodeInTree, loadedNodes, loadChildren, nodesByFolder, loadNodesForFolder]);

    // SIDE EFFECT: Load ALL company nodes when "Deep View" is enabled
    useEffect(() => {
        if (isDeepView && resolvedCompanyId) {
            useMoraStore.getState().loadNodesForCompany(resolvedCompanyId);
        }
    }, [isDeepView, resolvedCompanyId]);

    // DATA CONSISTENCY FIX: Use loadTree from store instead of direct fetchTree
    // This ensures both Universe and Finder use the same data source
    const loadContent = useCallback(async (opts?: { preferCache?: boolean }) => {
        try {
            const existingTree = useMoraStore.getState().treeData;
            const shouldReuseTree = opts?.preferCache === true && Array.isArray(existingTree) && existingTree.length > 0;
            if (globalSearch && resolvedCompanyId) {
                await useMoraStore.getState().loadNodesForCompany(resolvedCompanyId);
            }
            if (!shouldReuseTree) {
                await loadTree(undefined, resolvedCompanyId || undefined);
            }
        } catch (e) {
            console.error("Tree load failed", e);
        }
    }, [globalSearch, loadTree, resolvedCompanyId]);

    // UNIFIED FINDER: Navigate to starting point based on pane data
    const appliedStartKeyRef = useRef<string>('');
    useEffect(() => {
        if (!treeData?.length) return;
        const startKey = `${startFolderId || ''}|${startSpaceId || ''}|${departmentId || ''}`;
        if (appliedStartKeyRef.current === startKey) return;

        // Priority: startFolderId > startSpaceId > departmentId > root
        if (startFolderId) {
            resetNavigationRoot(startFolderId);
            const folderNode = findNodeInTree(treeData, startFolderId);
            if (!folderNode) {
                void loadNodesForFolder(startFolderId);
            }
        } else if (startSpaceId) {
            // Find the space in tree and navigate to it
            const spaceNode = findNodeInTree(treeData, startSpaceId);
            if (spaceNode) {
                resetNavigationRoot(startSpaceId);
            }
        } else if (departmentId) {
            resetNavigationRoot(departmentId);
        }
        appliedStartKeyRef.current = startKey;
    }, [treeData, startFolderId, startSpaceId, departmentId, findNodeInTree, loadNodesForFolder, resetNavigationRoot]);

    // Sync search query from pane data (important for Chat -> Finder updates)
    useEffect(() => {
        if (initialQuery) {
            setSearchQuery(initialQuery);
        }
    }, [initialQuery]);

    const handleUpload = useCallback(async (fileList: File[]) => {
        if (!resolvedCompanyId) {
            toast.error('Select a company first.');
            setShowUpload(false);
            return;
        }

        setShowUpload(false);
        setIsUploading(true);
        setUploadProgress({ current: 0, total: fileList.length, filename: fileList[0]?.name || 'file' });

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

        const targetFolderId = resolveUploadFolderId();
        const targetFolderName = targetFolderId ? (findNodeInTree(rawTree, targetFolderId)?.name || 'current folder') : 'company root';
        let successCount = 0;
        let hasPendingConfirmation = false;
        let hasPerFileError = false;
        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                setUploadProgress({ current: i + 1, total: fileList.length, filename: file.name });
                try {
                    const uploaded = await uploadCompanyFile(file, resolvedCompanyId);
                    successCount++;

                    // P6: Data Sovereignty - respect user's auto-execute preference
                    const autoExecute = user?.settings?.autoExecuteActions ?? true;
                    const response = await requestCreateNodeFromFile(uploaded.id, {
                        autoExecute,
                        folderId: targetFolderId
                    });
                    if (response?.status === 'pending_confirmation') {
                        hasPendingConfirmation = true;
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

                        // We still use the ConfirmationCard for fine-tuning/policy reasons, but now it's clearly for the file we just dropped

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

                        // Prefer folder_id from API response (backend knows exact placement).
                        // Fall back to pre-computed targetFolderId, then poll GET /node as last resort.
                        let resolvedFolderId: string | undefined =
                            response.folder_id || targetFolderId || undefined;

                        if (!resolvedFolderId) {
                            try {
                                const nodeStatus = await getFileNode(uploaded.id);
                                if (nodeStatus.status === 'linked' && nodeStatus.folder_id) {
                                    resolvedFolderId = nodeStatus.folder_id;
                                }
                            } catch {
                                // best-effort — silently ignore if endpoint unavailable
                            }
                        }

                        if (resolvedFolderId) {
                            const folderName = findNodeInTree(rawTree, resolvedFolderId)?.name || resolvedFolderId;
                            // Load nodes FIRST so the store already has data
                            // when navigateToFolder triggers the content-display effect.
                            // This prevents the empty-flash (flicker) between old and new content.
                            await loadNodesForFolder(resolvedFolderId);
                            navigateToFolder(resolvedFolderId);
                            // Override the generic end-of-loop toast with a precise one
                            toast.success(`${file.name} → ${folderName}`);
                            successCount = 0; // suppress duplicate success toast below
                        }

                        // P6: Auto-executed, return to idle
                        setIdle();
                    }
                } catch (e: any) {
                    const errMsg = e?.message || 'Upload fehlgeschlagen';
                    console.error(`Failed to upload ${file.name}:`, e);
                    // Show specific error to the user (e.g. "Empty files are not allowed")
                    toast.error(`${file.name}: ${errMsg}`);
                    hasPerFileError = true;
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
            if (successCount > 0 && !hasPendingConfirmation) {
                toast.success(`${successCount} file(s) uploaded to ${targetFolderName}`);
                await loadContent();
            } else if (successCount === 0 && !hasPerFileError) {
                // Only show generic error if no per-file error toast was already displayed
                toast.error('Failed to upload files');
                setIdle();
            }
        } catch (e: any) {
            toast.error(e.message || 'Upload error');
            setIdle();
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
        }
    }, [loadContent, resolveUploadFolderId, resolvedCompanyId, user?.settings?.autoExecuteActions, findNodeInTree, rawTree, loadNodesForFolder, navigateToFolder]);

    // Integrated Drag & Drop Handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only leave if we're actually leaving the container, not just entering a child
        const rect = e.currentTarget.getBoundingClientRect();
        if (
            e.clientX <= rect.left ||
            e.clientX >= rect.right ||
            e.clientY <= rect.top ||
            e.clientY >= rect.bottom
        ) {
            setIsDragging(false);
        }
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(Array.from(e.dataTransfer.files));
        }
    }, [handleUpload]);

    // Initial Load
    useEffect(() => {
        if (resolvedCompanyId) {
            void loadContent({ preferCache: true });
        }
    }, [resolvedCompanyId, loadContent]);

    // Recursive search helper
    const deepSearch = useCallback((nodes: CoreTreeNode[], query: string): { files: any[], folders: any[] } => {
        const results = { files: [] as any[], folders: [] as any[] };
        const q = query.toLowerCase();

        const traverse = (nodeList: CoreTreeNode[], path: string = '') => {
            for (const node of nodeList) {
                const matches = (node.name || '').toLowerCase().includes(q);
                // Track breadcrumb-style path
                const currentPath = path ? `${path} > ${node.name}` : node.name;

                if (matches) {
                    // Attach the path where we found it (excluding the item name itself for the label)
                    const nodeWithMeta = { ...node, foundIn: path };
                    // Check if it's a container type
                    if (['department', 'space', 'folder'].includes(node.type)) {
                        results.folders.push(nodeWithMeta);
                    } else {
                        // All other types (node, note, document, etc.) go to files
                        results.files.push(nodeWithMeta);
                    }
                }
                if (node.children && node.children.length > 0) {
                    traverse(node.children, currentPath);
                }
            }
        };

        traverse(nodes);
        return results;
    }, []);

    // Ensure tree is loaded when search is attempted
    const [searchTriggeredLoad, setSearchTriggeredLoad] = useState(false);
    useEffect(() => {
        if (searchQuery.trim() && rawTree.length === 0 && !isLoadingTree && !searchTriggeredLoad) {
            setSearchTriggeredLoad(true);
            loadTree().finally(() => setSearchTriggeredLoad(false));
        }
    }, [searchQuery, rawTree.length, isLoadingTree, searchTriggeredLoad, loadTree]);

    // Filter items by search query (RECURSIVE)
    // Always search the full tree for consistent results
    const filteredContent = useMemo(() => {
        const q = searchQuery.trim();
        if (!q) return { files, folders };

        // Always search full tree for search queries (not just current folder)
        // This ensures "Handbuch" is found regardless of navigation state
        if (rawTree.length > 0) {
            return deepSearch(rawTree, q);
        }

        // Fallback: search local files/folders if tree not available
        const localResults = { files: [] as any[], folders: [] as any[] };
        const lq = q.toLowerCase();
        files.forEach(f => { if ((f.name || '').toLowerCase().includes(lq)) localResults.files.push(f); });
        folders.forEach(f => { if ((f.name || '').toLowerCase().includes(lq)) localResults.folders.push(f); });
        return localResults;
    }, [files, folders, searchQuery, rawTree, deepSearch]);

    const filteredFiles = filteredContent.files;
    const filteredFolders = filteredContent.folders;

    // Get current level type for UI hints
    const currentLevelType = useMemo(() => {
        if (!currentFolderId) return 'company';
        const node = findNodeInTree(treeData || [], currentFolderId);
        return node?.type || 'folder';
    }, [currentFolderId, treeData, findNodeInTree]);


    // (Removed old extractFolders and separate load logic to unify via Tree)


    // Determine dynamic title
    const finderTitle = useMemo(() => {
        if (breadcrumbs.length > 0) {
            return breadcrumbs[breadcrumbs.length - 1].name;
        }
        if (departmentName) return departmentName;
        // P7: Default to "Finder" for cleaner branding
        return 'Finder';
    }, [breadcrumbs, departmentName]);

    // Type Icons Mapping (same as SpacePane)
    const TYPE_ICONS: Record<string, any> = {
        document: FileText,
        image: ImageIcon,
        link: LinkIcon,
        task: CheckSquare,
        folder: FolderIcon,
        other: Box,
        note: FileText,
        intel_report: FileText,
    };

    if (!pane) return null;

    return (
        <>
            <GlassPanel
                title={finderTitle}
                width={pane.size.width}
                height={pane.size.height}
                initialX={pane.position.x}
                initialY={pane.position.y}
                paneId={id}
                onPositionChange={(x, y) => {
                    updatePanePosition(id, x, y);
                }}
                onResize={(w, h) => {
                    updatePaneSize(id, w, h);
                }}
                showBackButton={false}
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
                {/* Hidden file input for upload buttons */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                />

                <div
                    className="flex flex-col h-full relative"
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={onDrop}
                >
                    {/* INTEGRATED DROP ZONE OVERLAY */}
                    {isDragging && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-emerald-500/10 backdrop-blur-[2px] border-2 border-dashed border-emerald-500/50 rounded-xl animate-in fade-in duration-200 pointer-events-none">
                            <div className="flex flex-col items-center gap-3 bg-black/60 p-8 rounded-2xl border border-emerald-500/30 shadow-2xl scale-110">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <Upload className="w-8 h-8 text-emerald-400 animate-bounce" />
                                </div>
                                <div className="text-center">
                                    <p className="text-emerald-100 font-bold text-lg">Drop to add to Mycelium</p>
                                    <p className="text-emerald-400/70 text-sm">Target: {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : 'Inbox'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* UNIFIED TOOLBAR - RESPONSIVE */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 px-3 md:px-6 py-2 md:py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-md">
                        {/* nav-group: exactly one Back/Forward/Up set — do not duplicate */}
                        <div className="flex items-center gap-1.5 shrink-0" data-testid="finder-nav-group">
                            <button
                                onClick={navigateBack}
                                disabled={backStack.length === 0}
                                aria-label="Navigate back"
                                className={`p-1.5 rounded-lg border transition-colors ${backStack.length > 0 ? 'border-white/10 text-white/60 hover:text-white hover:bg-white/5' : 'border-white/5 text-white/20 cursor-not-allowed'}`}
                                title="Back (Alt+Left)"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                onClick={navigateForward}
                                disabled={forwardStack.length === 0}
                                aria-label="Navigate forward"
                                className={`p-1.5 rounded-lg border transition-colors ${forwardStack.length > 0 ? 'border-white/10 text-white/60 hover:text-white hover:bg-white/5' : 'border-white/5 text-white/20 cursor-not-allowed'}`}
                                title="Forward (Alt+Right)"
                            >
                                <ChevronRight size={14} />
                            </button>
                            <button
                                onClick={navigateUp}
                                disabled={!currentFolderId}
                                aria-label="Navigate up"
                                className={`p-1.5 rounded-lg border transition-colors ${currentFolderId ? 'border-white/10 text-white/60 hover:text-white hover:bg-white/5' : 'border-white/5 text-white/20 cursor-not-allowed'}`}
                                title="Up (Alt+Up)"
                            >
                                <CornerUpLeft size={14} />
                            </button>
                        </div>
                        {/* Breadcrumbs (API-first, fallback to local) */}
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth min-w-0 flex-1">
                            <button
                                onClick={() => navigateToFolder(null)}
                                className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg transition-all text-xs md:text-sm group shrink-0 ${!currentFolderId ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                            >
                                <Home size={14} className={!currentFolderId ? 'text-emerald-400' : 'text-white/40'} />
                                <span className="font-medium tracking-tight">{folderContext?.path?.company?.name || 'Home'}</span>
                            </button>

                            {folderContext?.path?.department && (
                                <React.Fragment>
                                    <span className="text-white/20 text-xs shrink-0 mx-0.5">/</span>
                                    <button
                                        onClick={() => navigateToFolder(folderContext.path.department?.id || null)}
                                        className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg transition-all text-xs md:text-sm group shrink-0 ${currentFolderId === folderContext.path.department.id ? 'text-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                                    >
                                        <Globe size={13} className="text-emerald-500/60" />
                                        <span className="font-medium tracking-tight max-w-[100px] md:max-w-none truncate">{folderContext.path.department.name}</span>
                                    </button>
                                </React.Fragment>
                            )}

                            {folderContext?.path?.space && (
                                <React.Fragment>
                                    <span className="text-white/20 text-xs shrink-0 mx-0.5">/</span>
                                    <button
                                        onClick={() => navigateToFolder(folderContext.path.space?.id || null)}
                                        className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg transition-all text-xs md:text-sm group shrink-0 ${(currentFolderId === folderContext.path.space.id || (currentFolderId === folderContext.path.department?.id && !folderContext.path.space)) ? 'text-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                                    >
                                        <Circle size={12} className="text-cyan-500/60" />
                                        <span className="font-medium tracking-tight max-w-[100px] md:max-w-none truncate">{folderContext.path.space.name}</span>
                                    </button>
                                </React.Fragment>
                            )}

                            {folderContext?.path?.breadcrumbs?.map((seg: any, i: number) => (
                                <React.Fragment key={seg.id || i}>
                                    <span className="text-white/20 text-xs shrink-0 mx-0.5">/</span>
                                    <button
                                        onClick={() => navigateToFolder(seg.id)}
                                        className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg transition-all text-xs md:text-sm group shrink-0 ${(currentFolderId === seg.id) ? 'text-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                                    >
                                        <FolderIcon size={13} className="text-blue-500/60" />
                                        <span className="font-medium tracking-tight max-w-[100px] md:max-w-none truncate">{seg.name}</span>
                                    </button>
                                </React.Fragment>
                            ))}

                            {!folderContext?.path && breadcrumbs.map((bc, idx) => {
                                const prevBc = idx > 0 ? breadcrumbs[idx - 1] : null;
                                const isDuplicateName = prevBc && bc.name?.toLowerCase() === prevBc.name?.toLowerCase();
                                const displayName = isDuplicateName && bc.type === 'space' ? 'Allgemein' : bc.name;
                                return (
                                    <React.Fragment key={bc.id}>
                                        <span className="text-white/20 text-xs shrink-0 mx-0.5">/</span>
                                        <button
                                            onClick={() => navigateToFolder(bc.id)}
                                            className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg transition-all text-xs md:text-sm group shrink-0 ${idx === breadcrumbs.length - 1 ? 'text-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                                        >
                                            {bc.type === 'department' ? <Globe size={13} className="text-emerald-500/60" /> : bc.type === 'space' ? <Circle size={12} className="text-cyan-500/60" /> : <FolderIcon size={13} className="text-blue-500/60" />}
                                            <span className="font-medium tracking-tight max-w-[100px] md:max-w-none truncate">{displayName}</span>
                                        </button>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        {/* Actions Row */}
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap lg:flex-nowrap">
                            {/* Search - Hidden on mobile, shown on md+ */}
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="pl-9 pr-4 py-1.5 rounded-lg bg-black/20 border border-white/5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30 w-28 lg:w-32 focus:w-40 lg:focus:w-48 transition-all"
                                />
                            </div>

                            {/* Deep View Toggle - Hidden on mobile */}
                            <button
                                onClick={() => setIsDeepView(!isDeepView)}
                                className={`hidden md:flex p-1.5 px-2 lg:px-3 rounded-lg items-center gap-1.5 lg:gap-2 transition-all border text-xs ${isDeepView ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-black/40 border-white/5 text-white/40 hover:text-white'}`}
                                title={isDeepView ? "Exit Deep View" : "Show All Documents"}
                            >
                                <Sparkles size={14} />
                                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">Deep</span>
                            </button>

                            {/* View Mode Toggles */}
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white/70'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white/70'}`}
                                    title="List View"
                                >
                                    <List size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('graph')}
                                    className={`hidden md:block p-1.5 rounded-lg transition-all ${viewMode === 'graph' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white/70'}`}
                                    title="Semantic Graph"
                                >
                                    <Share2 size={16} />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2 md:pl-3">
                                <button
                                    onClick={handleCopyPath}
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                                    title="Copy Path"
                                >
                                    <Copy size={16} />
                                </button>
                                <button
                                    onClick={() => loadContent()}
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw size={16} className={(isLoading || isLoadingTree) ? 'animate-spin' : ''} />
                                </button>

                                {currentLevelType !== 'company' && currentLevelType !== 'department' && (
                                    <button
                                        onClick={() => setIsCreateFolderOpen(true)}
                                        className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 transition-all"
                                        title="New Folder"
                                    >
                                        <Plus size={16} />
                                    </button>
                                )}

                                <button
                                    onClick={() => currentFolderId && fileInputRef.current?.click()}
                                    disabled={!currentFolderId}
                                    title={!currentFolderId ? 'Navigiere in einen Ordner um Dateien hochzuladen' : 'Upload'}
                                    className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg transition-all text-xs md:text-sm font-bold shadow-lg ${currentFolderId ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' : 'bg-emerald-500/20 text-emerald-500/40 cursor-not-allowed opacity-50'}`}
                                >
                                    <Upload size={14} />
                                    <span className="hidden sm:inline">Upload</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {contextHint && (
                        <div className="px-3 md:px-6 pb-2 pt-0.5">
                            <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200/90">
                                <AlertCircle size={11} />
                                <span>{contextHint}</span>
                            </div>
                        </div>
                    )}

                    {/* Content Container with Animation */}
                    <div className="flex-1 overflow-y-auto p-6 bg-black/40 relative" onClick={() => setSelectedNodeId(null)} onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, null, 'background')}>
                        <AnimatePresence mode="wait">
                            {/* Loading State */}
                            {(isLoading || isLoadingTree) && filteredFiles.length === 0 && filteredFolders.length === 0 ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center h-full gap-4 text-white/30"
                                >
                                    <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                                    <span className="text-sm font-light tracking-[0.2em] uppercase">Synchronizing Mycelium...</span>
                                </motion.div>
                            ) : filteredFiles.length === 0 && filteredFolders.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center h-full gap-4 text-emerald-500/20"
                                >
                                    <div className="w-24 h-24 rounded-full bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 ring-1 ring-emerald-500/20">
                                        <Search size={48} className="opacity-40 text-emerald-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-light text-emerald-400/40 tracking-wide">{searchQuery ? 'No resonance found' : 'No signals detected'}</p>
                                        <p className="text-xs text-emerald-500/30 mt-2 uppercase tracking-widest">Drop files to initiate intake</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={currentFolderId || 'root'}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="h-full"
                                >
                                    {viewMode === 'grid' ? (
                                        /* GRID VIEW - RESPONSIVE */
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
                                            {/* Folders */}
                                            {filteredFolders.map(folder => {
                                                const isSelected = selectedNodeId === folder.id;
                                                return (
                                                    <motion.div
                                                        key={folder.id}
                                                        layoutId={`item-${folder.id}`}
                                                        onClick={(e: React.MouseEvent) => handleFolderClick(e, folder.id)}
                                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, folder, 'folder')}
                                                        whileHover={{ y: -2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 cursor-pointer group relative ${isSelected
                                                            ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_20px_40px_rgba(0,0,0,0.3),0_0_20px_rgba(16,185,129,0.1)]'
                                                            : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.08] hover:border-white/10'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            {folder.type === 'department' ? (
                                                                <div className="relative w-10 h-10 flex items-center justify-center">
                                                                    <div className="absolute inset-0 bg-emerald-400/20 blur-md rounded-full" />
                                                                    <Globe size={24} className="text-emerald-400 relative z-10" />
                                                                </div>
                                                            ) : folder.type === 'space' ? (
                                                                <div className="relative w-10 h-10 flex items-center justify-center">
                                                                    <div className="absolute inset-0 bg-cyan-400/20 blur-md rounded-full" />
                                                                    <Circle size={20} className="text-cyan-400 relative z-10" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-10 h-10 flex items-center justify-center">
                                                                    <FolderIcon size={24} className={isSelected ? 'text-emerald-400' : 'text-blue-400/80 group-hover:text-blue-400'} />
                                                                </div>
                                                            )}

                                                            {folder.type === 'department' && (
                                                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold tracking-tighter border border-emerald-500/20 uppercase">Planet</span>
                                                            )}
                                                            {folder.type === 'space' && (
                                                                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-bold tracking-tighter border border-cyan-500/20 uppercase">Moon</span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className={`text-sm truncate font-medium block ${isSelected ? 'text-white' : 'text-white/80'}`}>{folder.name}</span>
                                                            {folder.type === 'folder' && (
                                                                <span className="text-[10px] text-white/30 uppercase tracking-[0.1em]">Shared Folder</span>
                                                            )}
                                                        </div>

                                                        {/* Simple selection indicator */}
                                                        {isSelected && (
                                                            <motion.div
                                                                layoutId="selection-ring"
                                                                className="absolute inset-0 border-2 border-emerald-500/40 rounded-2xl pointer-events-none"
                                                                initial={false}
                                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                            />
                                                        )}
                                                    </motion.div>
                                                );
                                            })}

                                            {/* Files */}
                                            {filteredFiles.map(file => {
                                                const isResonant = resonanceIds.includes(file.id);
                                                const isSelected = selectedNodeId === file.id;
                                                const Icon = TYPE_ICONS[file.type] || FileText;

                                                return (
                                                    <motion.div
                                                        key={file.id}
                                                        layoutId={`item-${file.id}`}
                                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedNodeId(file.id); }}
                                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, file, 'file')}
                                                        onDoubleClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            checkResonance(file.id);
                                                            openPane({
                                                                id: `doc-${file.id}`,
                                                                type: 'document',
                                                                title: file.name || 'Document',
                                                                size: { width: 800, height: 600 },
                                                                data: { nodeId: file.id, content: file.content, name: file.name, type: file.type, metadata: file.metadata }
                                                            });
                                                        }}
                                                        whileHover={{ y: -2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 cursor-pointer group relative ${isSelected
                                                            ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_20px_40px_rgba(0,0,0,0.3),0_0_20px_rgba(16,185,129,0.1)]'
                                                            : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.08] hover:border-white/10'
                                                            }`}
                                                    >
                                                        {/* Resonance Glow (Background) */}
                                                        {isResonant && (
                                                            <div className="absolute inset-0 rounded-2xl bg-amber-500/5 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)] pointer-events-none animate-pulse" />
                                                        )}

                                                        <div className="flex justify-between items-start">
                                                            <div className="w-10 h-10 flex items-center justify-center">
                                                                <Icon size={24} className={isSelected ? 'text-emerald-400' : 'text-emerald-400/80 group-hover:text-emerald-400'} />
                                                            </div>
                                                            {file.metadata?.size && (
                                                                <span className="text-[10px] text-white/30 font-mono">{(file.metadata.size / 1024).toFixed(0)}KB</span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className={`text-sm truncate block ${isSelected ? 'text-white font-medium' : 'text-white/80'}`} title={file.name}>
                                                                {file.name}
                                                                {file.name.match(/[_-](EN|DE|FR|ES|IT)\b/i) && (
                                                                    <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-white/10 text-white/70 tracking-wider align-middle">
                                                                        {file.name.match(/[_-](EN|DE|FR|ES|IT)\b/i)[1].toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] text-white/30 uppercase tracking-tighter">{file.type || 'system'}</span>
                                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                                <span className="text-[9px] text-white/30">{new Date(file.created_at || Date.now()).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>

                                                        {/* Resonance Overlay */}
                                                        {isResonant && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="absolute top-2 right-2 flex items-center gap-1.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 backdrop-blur-md shadow-lg z-10"
                                                            >
                                                                <Sparkles size={8} />
                                                                RESONANT
                                                            </motion.div>
                                                        )}

                                                        {/* Simple selection indicator */}
                                                        {isSelected && (
                                                            <motion.div
                                                                layoutId="selection-ring"
                                                                className="absolute inset-0 border-2 border-emerald-500/40 rounded-2xl pointer-events-none"
                                                                initial={false}
                                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                            />
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : viewMode === 'graph' ? (
                                        /* GRAPH VIEW - Semantic Network Mini-Universe */
                                        <div
                                            className="relative w-full h-full min-h-[400px] overflow-hidden cursor-grab active:cursor-grabbing"
                                            onWheel={(e) => {
                                                if (viewMode === 'graph') {
                                                    e.preventDefault();
                                                    setGraphZoom(z => Math.max(0.2, Math.min(3, z - e.deltaY * 0.001)));
                                                }
                                            }}
                                            onMouseDown={(e) => {
                                                if (e.button !== 0) return;
                                                graphDragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, initialPan: graphPan };
                                            }}
                                            onMouseMove={(e) => {
                                                if (!graphDragRef.current.isDragging) return;
                                                const dx = e.clientX - graphDragRef.current.startX;
                                                const dy = e.clientY - graphDragRef.current.startY;
                                                setGraphPan({ x: graphDragRef.current.initialPan.x + dx, y: graphDragRef.current.initialPan.y + dy });
                                            }}
                                            onMouseUp={() => { graphDragRef.current.isDragging = false; }}
                                            onMouseLeave={() => { graphDragRef.current.isDragging = false; }}
                                        >
                                            <div className="absolute bottom-16 right-4 flex flex-col gap-2 z-50">
                                                <button onClick={() => setGraphZoom(z => Math.min(3, z + 0.2))} className="p-2 bg-black/40 border border-white/10 rounded-lg hover:bg-white/10 text-white/70">+</button>
                                                <button onClick={() => setGraphZoom(z => Math.max(0.2, z - 0.2))} className="p-2 bg-black/40 border border-white/10 rounded-lg hover:bg-white/10 text-white/70">-</button>
                                                <button onClick={() => { setGraphZoom(1); setGraphPan({ x: 0, y: 0 }); }} className="p-2 bg-black/40 border border-white/10 rounded-lg hover:bg-white/10 text-white/70">Reset</button>
                                            </div>
                                            <div
                                                className="absolute inset-0 transition-transform duration-75 ease-out origin-center"
                                                style={{ transform: `translate(${graphPan.x}px, ${graphPan.y}px) scale(${graphZoom})` }}
                                            >
                                                {/* Center core: Current Context */}
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-30">
                                                    <div className="relative w-12 h-12 rounded-xl border-2 border-emerald-400/50 bg-emerald-500/20 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center">
                                                        {currentFolderId ? <FolderIcon size={24} className="text-emerald-400" /> : <Home size={24} className="text-emerald-400" />}
                                                    </div>
                                                    <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-md border border-white/10 backdrop-blur-sm">
                                                        {folderContext?.path?.breadcrumbs?.slice(-1)[0]?.name || folderContext?.path?.space?.name || folderContext?.path?.department?.name || 'Home'}
                                                    </span>
                                                </div>
                                                {/* Center core */}
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 blur-sm opacity-50" />
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 shadow-lg" />

                                                {/* Render folders/spaces as orbiting nodes */}
                                                {filteredFolders.map((folder, i) => {
                                                    const count = Math.max(filteredFolders.length, 1);
                                                    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                                                    const radius = 150 + (i % 3) * 42;
                                                    const x = Math.cos(angle) * radius;
                                                    const y = Math.sin(angle) * radius;
                                                    const isSelected = selectedNodeId === folder.id;

                                                    return (
                                                        <div
                                                            key={folder.id}
                                                            className={`absolute cursor-pointer transition-all duration-300 group ${isSelected ? 'z-20 scale-110' : 'z-10 hover:scale-105'
                                                                }`}
                                                            style={{
                                                                left: `calc(50% + ${x}px)`,
                                                                top: `calc(50% + ${y}px)`,
                                                                transform: 'translate(-50%, -50%)'
                                                            }}
                                                            onClick={(e) => handleFolderClick(e, folder.id)} onContextMenu={(e) => handleContextMenu(e, folder, "folder")}
                                                        >
                                                            {/* Connection line to center */}
                                                            <svg
                                                                className="absolute pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity"
                                                                style={{
                                                                    width: Math.abs(x) + 20,
                                                                    height: Math.abs(y) + 20,
                                                                    left: x < 0 ? 0 : -x,
                                                                    top: y < 0 ? 0 : -y,
                                                                    overflow: 'visible'
                                                                }}
                                                            >
                                                                <line
                                                                    x1={x < 0 ? Math.abs(x) : 0}
                                                                    y1={y < 0 ? Math.abs(y) : 0}
                                                                    x2={x < 0 ? 0 : x}
                                                                    y2={y < 0 ? 0 : y}
                                                                    stroke={folder.type === 'department' ? '#10b981' : folder.type === 'space' ? '#06b6d4' : '#3b82f6'}
                                                                    strokeWidth="1"
                                                                    strokeDasharray="4 4"
                                                                />
                                                            </svg>

                                                            {/* Node */}
                                                            <div className={`p-3 rounded-xl border-2 backdrop-blur-sm ${isSelected
                                                                ? 'bg-emerald-500/30 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                                                : folder.type === 'department'
                                                                    ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                                                                    : folder.type === 'space'
                                                                        ? 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20'
                                                                        : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                                                                }`}>
                                                                {folder.type === 'department' ? (
                                                                    <Globe size={24} className="text-emerald-400" />
                                                                ) : folder.type === 'space' ? (
                                                                    <Circle size={24} className="text-cyan-400" />
                                                                ) : (
                                                                    <FolderIcon size={24} className="text-blue-400" />
                                                                )}
                                                            </div>

                                                            {/* Label */}
                                                            <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium transition-colors ${isSelected ? 'text-emerald-400' : 'text-white/60 group-hover:text-white'
                                                                }`}>
                                                                {folder.name.length > 12 ? folder.name.slice(0, 12) + '...' : folder.name}
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Files shown as smaller stars further out */}
                                                {filteredFiles.slice(0, 10).map((file, i) => {
                                                    const fileCount = Math.max(filteredFiles.slice(0, 10).length, 1);
                                                    const angle = (i / fileCount) * Math.PI * 2 - Math.PI / 2;
                                                    const radius = filteredFolders.length > 0
                                                        ? 175 + (i % 3) * 22
                                                        : 130 + (i % 3) * 18;
                                                    const x = Math.cos(angle) * radius;
                                                    const y = Math.sin(angle) * radius;
                                                    const isResonant = resonanceIds.includes(file.id);

                                                    return (
                                                        <div
                                                            key={file.id}
                                                            className="absolute cursor-pointer opacity-60 hover:opacity-100 transition-all"
                                                            style={{
                                                                left: `calc(50% + ${x}px)`,
                                                                top: `calc(50% + ${y}px)`,
                                                                transform: 'translate(-50%, -50%)'
                                                            }}
                                                            onClick={() => {
                                                                checkResonance(file.id);
                                                                openPane({
                                                                    id: `doc-${file.id}`,
                                                                    type: 'document',
                                                                    title: file.name || 'Document',
                                                                    size: { width: 800, height: 600 },
                                                                    data: { nodeId: file.id, content: file.content, name: file.name, type: file.type, metadata: file.metadata }
                                                                });
                                                            }} onContextMenu={(e) => handleContextMenu(e, file, "file")}
                                                            title={file.name}
                                                            onMouseEnter={() => {
                                                                // Map current node positions for the constellation engine
                                                                fetchConstellation(file.id, new Map());
                                                            }}
                                                            onMouseLeave={clearConstellation}
                                                        >
                                                            <div className={`w-3 h-3 rounded-full ${isResonant || connections.some(c => c.id.includes(file.id))
                                                                ? 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)] scale-125'
                                                                : 'bg-white/40 hover:bg-emerald-400'
                                                                } transition-all duration-300`} />
                                                        </div>
                                                    );
                                                })}

                                                {/* Legend */}
                                                <div className="absolute bottom-4 left-4 flex items-center justify-center flex-wrap gap-4 text-[10px] text-white/60 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl z-50 shadow-2xl">
                                                    <div className="font-medium text-emerald-400/80 mr-2 uppercase tracking-widest hidden sm:block">Legend</div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                        <span>Planet</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                                        <span>Moon</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                                                        <span>Folder</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-white/40" />
                                                        <span>File</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* LIST VIEW */
                                        <div className="flex flex-col gap-1">
                                            {/* Folders */}
                                            {filteredFolders.map(folder => {
                                                const isSelected = selectedNodeId === folder.id;
                                                return (
                                                    <div
                                                        key={folder.id}
                                                        onClick={(e: React.MouseEvent) => handleFolderClick(e, folder.id)}
                                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, folder, 'folder')}
                                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                                                            ? 'bg-emerald-500/20 border-emerald-500/50'
                                                            : 'bg-white/5 border-white/5 hover:border-emerald-500/30 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {folder.type === 'department' ? (
                                                            <Globe size={18} className="text-emerald-400" />
                                                        ) : folder.type === 'space' ? (
                                                            <Circle size={18} className="text-cyan-400" />
                                                        ) : (
                                                            <FolderIcon size={18} className={isSelected ? 'text-emerald-400' : 'text-blue-400'} />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <span className={`text-sm block truncate ${isSelected ? 'text-white font-medium' : 'text-white/70'}`}>{folder.name}</span>
                                                            {folder.foundIn && (
                                                                <span className="text-[10px] text-emerald-400/40 block truncate">in {folder.foundIn}</span>
                                                            )}
                                                        </div>
                                                        {folder.type && (
                                                            <span className="text-[10px] text-white/30 uppercase shrink-0">{folder.type}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Files */}
                                            {filteredFiles.map(file => {
                                                const isSelected = selectedNodeId === file.id;
                                                const isResonant = resonanceIds.includes(file.id);
                                                const Icon = TYPE_ICONS[file.type] || FileText;

                                                return (
                                                    <div
                                                        key={file.id}
                                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedNodeId(file.id); }}
                                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, file, 'file')}
                                                        onDoubleClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            checkResonance(file.id);
                                                            openPane({
                                                                id: `doc-${file.id}`,
                                                                type: 'document',
                                                                title: file.name || 'Document',
                                                                size: { width: 800, height: 600 },
                                                                data: { nodeId: file.id, content: file.content, name: file.name, type: file.type, metadata: file.metadata }
                                                            });
                                                        }}
                                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                                                            ? 'bg-emerald-500/20 border-emerald-500/50'
                                                            : isResonant
                                                                ? 'bg-amber-500/10 border-amber-500/30'
                                                                : 'bg-white/5 border-white/5 hover:border-emerald-500/30 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <Icon size={18} className={isSelected ? 'text-emerald-400' : 'text-white/60'} />
                                                        <div className="flex-1 min-w-0">
                                                            <span className={`text-sm block truncate ${isSelected ? 'text-white font-medium' : 'text-white/70'}`}>{file.name}</span>
                                                            {file.foundIn && (
                                                                <span className="text-[10px] text-emerald-400/40 block truncate">in {file.foundIn}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-white/30 shrink-0">{new Date(file.created_at || Date.now()).toLocaleDateString()}</span>
                                                        {isResonant && <Sparkles size={14} className="text-amber-400" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>


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

                        {/* Upload Progress Footer */}
                        {isUploading && (
                            <div className="px-4 py-3 border-t border-white/5 bg-emerald-900/10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                                        <Loader2 size={12} className="animate-spin" />
                                        <span className="font-medium">Uploading...</span>
                                    </div>
                                    {uploadProgress && (
                                        <span className="text-[10px] text-emerald-400/60">
                                            {uploadProgress.current} / {uploadProgress.total}
                                        </span>
                                    )}
                                </div>
                                {uploadProgress && (
                                    <>
                                        <div className="h-1 bg-black/30 rounded-full overflow-hidden mb-1.5">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                                                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-white/40 truncate">{uploadProgress.filename}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Context Menu */}
                    {contextMenu && (
                        <div
                            className="fixed z-[9999] bg-zinc-900 border border-white/10 rounded-lg shadow-2xl py-1 min-w-[160px] text-sm text-white/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 origin-top-left"
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            {contextMenu.item ? (
                                <>
                                    <div className="px-3 py-1.5 border-b border-white/5 text-xs text-white/40 font-medium truncate max-w-[200px]">
                                        {contextMenu.item.name || contextMenu.item.title || 'Item'}
                                    </div>
                                    <button onClick={handleOpen} className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center gap-2 transition-colors">
                                        <ExternalLink size={14} /> Open
                                    </button>
                                    <button onClick={handleOpenInUniverse} className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2 transition-colors">
                                        <Globe size={14} /> Im Universe öffnen
                                    </button>
                                    <button onClick={handleRename} className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center gap-2 transition-colors">
                                        <Edit size={14} /> Rename
                                    </button>
                                    <button onClick={handleCopy} className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center gap-2 transition-colors">
                                        <Copy size={14} /> Copy
                                    </button>
                                    <button onClick={handleCut} className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center gap-2 transition-colors">
                                        <Scissors size={14} /> Cut
                                    </button>
                                    <div className="h-px bg-white/5 my-1" />
                                    <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 hover:text-red-400 flex items-center gap-2 transition-colors text-red-300">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => loadContent()} className="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2">
                                        <RefreshCw size={14} /> Refresh
                                    </button>
                                    {clipboard && (
                                        <button onClick={handlePaste} className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center gap-2">
                                            <Clipboard size={14} /> Paste Item
                                        </button>
                                    )}
                                    <button onClick={() => setIsCreateFolderOpen(true)} className="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2">
                                        <FolderIcon size={14} /> New Folder
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </GlassPanel>

            {/* Removed separate FileUploadZone modal to unify experience */}

            {/* Create Folder Modal */}
            {
                isCreateFolderOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
                        <div className="bg-[#0a1a12] border border-emerald-500/20 rounded-2xl p-6 w-[400px] shadow-2xl">
                            <h3 className="text-lg font-medium text-white mb-4">New Folder</h3>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!newFolderName.trim() || !currentFolderId) return;
                                try {
                                    // Determine if we're in a space or folder
                                    const node = findNodeInTree(treeData || [], currentFolderId);
                                    if (node?.type === 'space') {
                                        await addFolder({
                                            space_id: currentFolderId,
                                            name: newFolderName.trim(),
                                            color: '#10b981'
                                        });
                                    } else {
                                        // TODO: Create subfolder API
                                        toast.info('Subfolder creation coming soon');
                                    }
                                    setNewFolderName('');
                                    setIsCreateFolderOpen(false);
                                    loadContent();
                                    toast.success('Folder created');
                                } catch (err: any) {
                                    toast.error(err?.message || 'Failed to create folder');
                                }
                            }}>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Folder name..."
                                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:border-emerald-500/50 outline-none mb-4"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setIsCreateFolderOpen(false); setNewFolderName(''); }}
                                        className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

        </>
    );
};

