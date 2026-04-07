import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { CommandReceipt } from '@/components/ui/CommandReceipt';
import { AmbiguityChoiceSurface } from '@/components/ui/AmbiguityChoiceSurface';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import { FileText, Folder as FolderIcon, Upload, UploadCloud, Loader2, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Home, Sparkles, Globe, Circle, LayoutGrid, List, Search, Plus, Trash2, Box, Image as ImageIcon, Link as LinkIcon, CheckSquare, Network, Edit, Copy, Scissors, ExternalLink, Clipboard, CornerUpLeft, Share2, Paperclip } from 'lucide-react';
import { setThinking, setIdle } from '@/lib/mora/awarenessController';
import { getSemanticallySimilarNodes, fetchFolderContext, getEntityContext, FolderContext } from '@/lib/api/coreClient';
import type { CoreTreeNode } from '@/lib/types/core';
import { toast } from '@/lib/toast';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';
import { SemanticItem } from '@/components/organic/SemanticItem';
import {
    uploadCompanyFile,
    listCompanyFiles,
    rejectCreateNodeFromFile,
    getFileNode,
    downloadCompanyFile,
    type CompanyFileRecord,
    type FileIntakeDestination,
    type FileIntakeNext,
    type FileIntakeRouteCandidate,
} from '@/lib/api/filesClient';
import { useSemanticConstellation } from '@/lib/hooks/useSemanticConstellation';
import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';
import { realtime } from '@/lib/api/realtimeClient';
import type { FinderNavigationContext, DocumentNavigationContext } from '@/lib/utils/searchOpen';
import { toOpenableSearchResult, type OpenableSearchResult } from '@/lib/utils/searchOpen';
import { dispatchMyceliumBatchComplete } from '@/lib/utils/moraExplanation';
import { VisibilityBadge } from '@/components/content/VisibilityBadge';
import {
    getContentDisplayName,
    getContentSecondaryLabel,
    getContentTypeLabel,
    getNodeOpenActionLabel,
    getNodeSourceFileId,
    getSourceFileOpenActionLabel,
    getSourceFileSecondaryLabel,
    openNodeLike,
    openSourceFileLike,
} from '@/lib/utils/contentOpen';

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
    route_mode?: string;
    route_reason?: string;
    route_confidence_score?: number;
    route_confidence_label?: string;
    route_signals?: string[];
    target_company_name?: string;
    target_department_name?: string;
    target_space_name?: string;
    target_folder_name?: string;
    route_explanation?: {
        kind?: string;
        headline?: string;
        reason?: string;
        signal_labels?: string[];
        learning_summary?: string;
    };
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
    file_id: string;
    confirm_endpoint?: string;
    confirm_payload?: Record<string, any>;
    // P6: Guided Intake
    intake_context?: IntakeContext;
    destination?: FileIntakeDestination;
    route_decision?: FileIntakeRouteDecision;
    route_summary?: string;
    route_resolution?: 'act' | 'choose' | string;
    route_candidates?: FileIntakeRouteCandidate[];
    route_choice_headline?: string;
    route_choice_reason?: string;
    next?: FileIntakeNext;
}

interface IntakeChoiceResult extends OpenableSearchResult {
    route_destination?: {
        company_name?: string;
        department_name?: string;
        space_name?: string;
        folder_name?: string;
        label?: string;
    };
    route_explanation?: {
        headline?: string;
        reason?: string;
        signal_labels?: string[];
        learning_summary?: string;
    };
    route_reason?: string;
    route_signals?: string[];
    route_confidence_label?: string;
    route_confidence_score?: number;
}

function toIntakeChoiceResult(candidate: FileIntakeRouteCandidate, fallbackIndex: number): IntakeChoiceResult {
    const folderId = candidate.target_folder_id || candidate.destination?.folder_id;
    const base = toOpenableSearchResult({
        id: folderId || candidate.target_space_id || candidate.target_department_id || `finder-intake-choice-${fallbackIndex}`,
        title: candidate.label || candidate.target_folder_name || candidate.suggested_location || 'Ziel',
        type: folderId ? 'folder' : candidate.target_space_id ? 'space' : candidate.target_department_id ? 'department' : 'folder',
        scope_path: candidate.label || candidate.suggested_location,
        path: candidate.label || candidate.suggested_location,
        company_id: candidate.target_company_id || candidate.destination?.company_id,
        department_id: candidate.target_department_id || candidate.destination?.department_id,
        space_id: candidate.target_space_id || candidate.destination?.space_id,
        folder_id: folderId,
        score: candidate.route_confidence_score,
    });
    return {
        ...base,
        route_destination: candidate.destination || undefined,
        route_explanation: candidate.route_explanation || undefined,
        route_reason: candidate.route_reason,
        route_signals: candidate.route_signals,
        route_confidence_label: candidate.route_confidence_label,
        route_confidence_score: candidate.route_confidence_score,
    };
}



export const FinderPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, openPane, updatePane, updatePanePosition, updatePaneSize } = usePaneStore();
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
    const navigationContext = pane?.data?.navigationContext as FinderNavigationContext | undefined;

    const [files, setFiles] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [companyFiles, setCompanyFiles] = useState<CompanyFileRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(autoShowUpload || false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const safeCompanies = useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);

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
        if (contextMenu.item.type === 'file') {
            toast.info('Dateien koennen hier noch nicht umbenannt werden');
            setContextMenu(null);
            return;
        }
        const newName = prompt("Umbenennen:", contextMenu.item.name || contextMenu.item.title);
        if (!newName) return;
        try {
            if (contextMenu.type === 'folder' || contextMenu.item.type === 'space' || contextMenu.item.type === 'department') {
                if (contextMenu.item.type === 'space') await updateSpace(contextMenu.item.id, { name: newName });
                else if (contextMenu.item.type === 'folder') await updateFolder(contextMenu.item.id, { name: newName });
                else toast.error("Bereiche koennen hier nicht umbenannt werden");
            } else {
                await updateNode(contextMenu.item.id, { title: newName });
            }
            loadContent();
            toast.success('Umbenannt');
        } catch (e: any) { toast.error(e.message || 'Umbenennen fehlgeschlagen'); }
        setContextMenu(null);
    };

    const handleDelete = async () => {
        if (!contextMenu?.item || !confirm(`${contextMenu.item.name || contextMenu.item.title} wirklich loeschen?`)) return;
        if (contextMenu.item.type === 'file') {
            toast.info('Dateien koennen hier noch nicht geloescht werden');
            setContextMenu(null);
            return;
        }
        try {
            if (contextMenu.type === 'folder' || contextMenu.item.type === 'space') {
                if (contextMenu.item.type === 'space') await deleteSpace(contextMenu.item.id);
                else await deleteFolder(contextMenu.item.id);
            } else {
                await deleteNode(contextMenu.item.id);
            }
            loadContent();
            toast.success('Geloescht');
        } catch (e: any) { toast.error(e.message || 'Loeschen fehlgeschlagen'); }
        setContextMenu(null);
    };

    const canOpenSourceFile = useCallback((item: any) => item?.type !== 'file' && Boolean(getNodeSourceFileId(item)), []);

    const handleOpenSourceFile = useCallback(async (item: any) => {
        const fileId = getNodeSourceFileId(item);
        if (!fileId) {
            toast.info('Keine Quelle hinterlegt');
            return;
        }
        try {
            await downloadCompanyFile(fileId, item?.metadata?.original_filename || getContentDisplayName(item));
        } catch (error: any) {
            toast.error(error?.message || 'Quelle konnte nicht geoeffnet werden');
        }
    }, []);

    const openFinderNode = useCallback((item: any) => {
        if (item?.type === 'file') {
            void openSourceFileLike(item, openPane, {
                paneId: item.linked_node_id ? `doc-${item.linked_node_id}` : undefined,
                title: item.name || item.title || 'Datei',
                folderId: item.folder_id ?? undefined,
                companyId: activeCompanyId ?? paneCompanyId ?? item?.company_id ?? undefined,
                navigationContext: navigationContext ? {
                    title: navigationContext.title,
                    message: navigationContext.message,
                    label: navigationContext.label,
                    path: navigationContext.path,
                    source: navigationContext.source,
                    folderId: item.folder_id ?? undefined,
                    timestamp: Date.now(),
                } satisfies DocumentNavigationContext : undefined,
            }).catch((error: any) => {
                toast.error(error?.message || 'Datei konnte nicht geoeffnet werden');
            });
            return;
        }

        const resolvedFolderId = currentFolderIdRef.current ?? item?.folder_id ?? undefined;
        const result = openNodeLike(item, openPane, {
            paneId: `doc-${item.id}`,
            title: item.name || item.title || 'Dokument',
            folderId: resolvedFolderId,
            companyId: activeCompanyId ?? paneCompanyId ?? item?.company_id ?? undefined,
            navigationContext: navigationContext ? {
                title: navigationContext.title,
                message: navigationContext.message,
                label: navigationContext.label,
                path: navigationContext.path,
                source: navigationContext.source,
                folderId: resolvedFolderId,
                timestamp: Date.now(),
            } satisfies DocumentNavigationContext : undefined,
        });
        if (result.mode === 'external-link') {
            toast.success('Link im Browser geoeffnet');
        }
    }, [activeCompanyId, navigationContext, openPane, paneCompanyId]);

    const handleCopy = () => {
        if (!contextMenu?.item) return;
        setClipboard({ id: contextMenu.item.id, item: contextMenu.item, mode: 'copy' });
        toast.success('In Zwischenablage kopiert');
        setContextMenu(null);
    };

    const handleCut = () => {
        if (!contextMenu?.item) return;
        setClipboard({ id: contextMenu.item.id, item: contextMenu.item, mode: 'cut' });
        toast.success('Zum Verschieben markiert');
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
                    toast.info("Ordner koennen hier noch nicht verschoben werden");
                } else {
                    await updateNode(clipboard.id, { folder_id: targetFolderId || undefined });
                    toast.success('Element verschoben');
                }
            } else {
                // Copy (Duplicate) - Requires creating new node
                if (['folder', 'space', 'department'].includes(clipboard.item.type)) {
                    toast.info("Ordner koennen hier noch nicht dupliziert werden");
                } else {
                    if (!resolvedCompanyId) {
                        toast.error('Bitte zuerst eine Organisation waehlen.');
                        return;
                    }
                    await addNode({
                        company_id: resolvedCompanyId,
                        folder_id: targetFolderId || undefined,
                        title: `${clipboard.item.name || clipboard.item.title} (Kopie)`,
                        type: clipboard.item.type,
                        content: clipboard.item.content || '',
                        metadata: clipboard.item.metadata || {}
                    } as any);
                    toast.success('Inhalt dupliziert');
                }
            }
            void loadContent();
            setClipboard(null);
        } catch (e: any) { toast.error(e.message || 'Einfuegen fehlgeschlagen'); }
        setContextMenu(null);
    };

    const handleOpen = () => {
        if (!contextMenu?.item) return;
        if (contextMenu.type === 'folder' || contextMenu.item.type === 'space') {
            navigateToFolder(contextMenu.item.id);
        } else {
            openFinderNode(contextMenu.item);
        }
        setContextMenu(null);
    };

    const handleOpenInUniverse = useCallback(async () => {
        if (!contextMenu?.item) return;

        const item = contextMenu.item as any;
        const itemType = (item.type || (contextMenu.type === 'file' ? 'node' : 'folder')) as string;

        let resolvedDepartmentId = item.department_id ?? null;
        let resolvedSpaceId = item.space_id ?? null;
        let resolvedFolderId = itemType === 'folder' ? item.id : (item.folder_id ?? null);

        // Resolve context using v3 generic resolver when item metadata is incomplete.
        // This avoids accidental jumps into legacy FolderLayer.
        if (!resolvedDepartmentId || !resolvedSpaceId || (itemType !== 'department' && itemType !== 'space' && !resolvedFolderId)) {
            const probeIds = Array.from(
                new Set(
                    [item.id, item.folder_id, currentFolderIdRef.current]
                        .filter((probe): probe is string => typeof probe === 'string' && UUID_RE.test(probe))
                )
            );

            for (const probeId of probeIds) {
                try {
                    const ec = await getEntityContext(probeId);
                    if (!ec?.resolved) continue;

                    if (!resolvedDepartmentId) {
                        resolvedDepartmentId = ec.path?.department?.id ?? null;
                    }
                    if (!resolvedSpaceId) {
                        resolvedSpaceId = ec.path?.space?.id ?? null;
                    }
                    if (!resolvedFolderId) {
                        const tail = ec.path?.breadcrumbs?.[ec.path.breadcrumbs.length - 1]?.id ?? null;
                        resolvedFolderId = (ec.entity_type === 'folder' ? ec.entity_id ?? null : null) ?? tail ?? null;
                    }

                    if (resolvedDepartmentId || resolvedSpaceId || resolvedFolderId) {
                        break;
                    }
                } catch {
                    // Non-blocking: keep best effort from local context.
                }
            }
        }

        if (itemType === 'department') {
            const departmentId = item.id ?? resolvedDepartmentId;
            if (!departmentId) {
                toast.error('Department konnte nicht im Universe geoeffnet werden');
                setContextMenu(null);
                return;
            }
            setActiveDepartment(departmentId);
            setActiveSpace(null);
            setActiveFolder(null);
            setViewLevel('department');
            void loadSpacesForDepartment(departmentId);
            toast.success('Department im Universe geoeffnet');
            setContextMenu(null);
            return;
        }

        if (itemType === 'space') {
            const spaceId = item.id ?? resolvedSpaceId;
            if (!spaceId) {
                toast.error('Bereich konnte nicht im Universe geoeffnet werden');
                setContextMenu(null);
                return;
            }
            if (resolvedDepartmentId) setActiveDepartment(resolvedDepartmentId);
            setActiveSpace(spaceId);
            setActiveFolder(null);
            setViewLevel('space');
            void loadFoldersForSpace(spaceId);
            toast.success('Bereich im Universe geoeffnet');
            setContextMenu(null);
            return;
        }

        const folderId = resolvedFolderId ?? currentFolderIdRef.current;
        if (!folderId) {
            toast.error('Kein Ordnerkontext fuer Universe-Navigation verfuegbar');
            setContextMenu(null);
            return;
        }

        if (resolvedDepartmentId) setActiveDepartment(resolvedDepartmentId);
        if (resolvedSpaceId) setActiveSpace(resolvedSpaceId);
        // Keep Universe in L2/L3 layers. Finder owns folder navigation locally.
        setActiveFolder(null);
        setViewLevel(resolvedSpaceId ? 'space' : (resolvedDepartmentId ? 'department' : 'core'));
        if (resolvedSpaceId) {
            void loadFoldersForSpace(resolvedSpaceId);
        } else if (resolvedDepartmentId) {
            void loadSpacesForDepartment(resolvedDepartmentId);
        }
        void loadNodesForFolder(folderId);

        openPane({
            id: 'finder-main',
            type: 'finder',
            title: 'Finder',
            size: { width: 1280, height: 820 },
            data: {
                folderId,
                spaceId: resolvedSpaceId ?? undefined,
                departmentId: resolvedDepartmentId ?? undefined,
                companyId: activeCompanyId ?? paneCompanyId ?? undefined
            }
        });

        toast.success(itemType === 'folder' ? 'Ordner im Universe geoeffnet' : 'Dateikontext im Universe geoeffnet');
        setContextMenu(null);
    }, [
        contextMenu,
        loadFoldersForSpace,
        loadNodesForFolder,
        loadSpacesForDepartment,
        openPane,
        activeCompanyId,
        paneCompanyId,
        setActiveDepartment,
        setActiveFolder,
        setActiveSpace,
        setViewLevel,
    ]);

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
        toast.info('Aehnliche Inhalte werden gesucht...');
        try {
            const similar = await getSemanticallySimilarNodes(nodeId);
            const ids = similar.map(n => n.id);
            setResonanceIds(ids);
            if (ids.length > 0) {
                toast.success(`${ids.length} verwandte Inhalte gefunden`);
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
     * within DOUBLE_CLICK_MS navigates forward -- deterministic in all view modes.
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
            // Second click within window -> navigate forward
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            lastClickedFolderRef.current = null;
            navigateToFolder(folderId);
        } else {
            // First click -> select only; arm timer
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
        if (paneCompanyId) return paneCompanyId;
        if (activeCompanyId) return activeCompanyId;
        if (safeCompanies.length === 1) return safeCompanies[0].id;
        return null;
    }, [activeCompanyId, paneCompanyId, safeCompanies]);
    const resolvedCompanyName = useMemo(() => {
        if (!resolvedCompanyId) return null;
        return safeCompanies.find((company) => company.id === resolvedCompanyId)?.name || null;
    }, [resolvedCompanyId, safeCompanies]);

    const previousResolvedCompanyIdRef = useRef<string | null>(resolvedCompanyId);

    useEffect(() => {
        contextCacheRef.current.clear();
    }, [resolvedCompanyId]);

    useEffect(() => {
        if (previousResolvedCompanyIdRef.current === resolvedCompanyId) return;
        previousResolvedCompanyIdRef.current = resolvedCompanyId;
        contextCacheRef.current.clear();
        appliedStartKeyRef.current = '';
        setSelectedNodeId(null);
        setFolderContext(null);
        setContextHint(null);
        setBreadcrumbs([]);
        setSearchQuery(initialQuery || '');
        if (!paneCompanyId) {
            resetNavigationRoot(null);
        }
    }, [resolvedCompanyId, paneCompanyId, resetNavigationRoot, initialQuery]);

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
        return 'Start';
    }, [folderContext, breadcrumbs]);

    const buildRoutePath = useCallback((intake?: IntakeContext | null) => {
        return [
            intake?.target_department_name,
            intake?.target_space_name,
            intake?.target_folder_name,
        ].filter(Boolean).join(' > ') || intake?.suggested_location || currentPathLabel || 'Ziel nicht erkannt';
    }, [currentPathLabel]);

    const surfaceFinderCompletion = useCallback((args: {
        fileName?: string;
        intakeContext?: IntakeContext;
        folderId?: string;
        nodeId?: string;
        result?: string;
        outcome: 'confirmed' | 'rejected';
    }) => {
        dispatchMyceliumBatchComplete({
            phase: 'complete',
            companyId: resolvedCompanyId || undefined,
            total: 1,
            confirmed: args.outcome === 'confirmed' ? 1 : 0,
            rejected: args.outcome === 'rejected' ? 1 : 0,
            routes: [
                {
                    path: buildRoutePath(args.intakeContext),
                    folderId: args.folderId,
                    confirmed: args.outcome === 'confirmed' ? 1 : 0,
                    rejected: args.outcome === 'rejected' ? 1 : 0,
                }
            ],
            primaryFile: {
                name: args.fileName,
                nodeId: args.nodeId,
                folderId: args.folderId,
                result: args.result,
                routeExplanation: args.intakeContext?.route_explanation,
            },
        });
    }, [buildRoutePath, resolvedCompanyId]);

    const navigationSourceLabel = useMemo(() => {
        switch (navigationContext?.source) {
            case 'chat':
                return 'Aus Mora-Chat geoeffnet';
            case 'mycelium':
                return 'Aus Einordnung geoeffnet';
            case 'work-session':
                return 'Aus Arbeitsplan geoeffnet';
            case 'search-popup':
            case 'search-pane':
            case 'search':
                return 'Aus Suche geoeffnet';
            default:
                return 'Von Mora geoeffnet';
        }
    }, [navigationContext?.source]);

    const NavigationIcon = useMemo(() => {
        switch (navigationContext?.source) {
            case 'mycelium':
                return UploadCloud;
            case 'search-popup':
            case 'search-pane':
            case 'search':
                return Search;
            case 'work-session':
                return Sparkles;
            default:
                return Sparkles;
        }
    }, [navigationContext?.source]);

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

    const toFinderFileItem = useCallback((file: CompanyFileRecord) => ({
        id: file.id,
        type: 'file',
        name: file.filename,
        title: file.filename,
        company_id: file.company_id,
        folder_id: file.folder_id ?? undefined,
        linked_node_id: file.linked_node_id ?? undefined,
        linked_folder_id: file.linked_folder_id ?? undefined,
        linked_status: file.linked_status ?? undefined,
        visibility_scope: file.visibility_scope ?? undefined,
        created_at: file.created_at,
        mime: file.mime,
        size: file.size,
        metadata: {
            size: file.size,
            mime: file.mime,
        },
    }), []);

    // Recursively extract content for current view
    const getCurrentContent = useCallback(() => {
        // Fallback structures from store
        const flatSpaces = spacesByDepartment || {};
        const flatFolders = foldersBySpace || {};
        const flatNodes = nodesByFolder || {};
        const standaloneCompanyFiles = companyFiles.filter((file) => !file.linked_node_id);

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

            standaloneCompanyFiles.forEach((file) => {
                const name = file.filename || '';
                if (globalSearch || name.toLowerCase().includes(q)) {
                    results.files.push(toFinderFileItem(file));
                }
            });

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

            return {
                folders: uniqueItems.slice(0, 25),
                files: standaloneCompanyFiles
                    .filter((file) => !file.folder_id)
                    .map(toFinderFileItem),
            };
        }

        // 2. DRILLED DOWN VIEW vs DEEP VIEW
        if (isDeepView && resolvedCompanyId) {
            // DEEP VIEW: Show ALL files in the company, ignoring folders
            const allNodes = useMoraStore.getState().nodesByCompany[resolvedCompanyId] || [];
            return {
                folders: [],
                files: [
                    ...allNodes.filter(n => !['folder', 'space', 'department'].includes(n.type))
                        .map(n => ({ ...n, name: n.title || n.name })),
                    ...standaloneCompanyFiles.map(toFinderFileItem),
                ]
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

        standaloneCompanyFiles
            .filter((file) => file.folder_id === currentFolderId)
            .forEach((file) => files.push(toFinderFileItem(file)));

        // Deduplicate final results by ID
        const folderMap = new Map();
        folders.forEach(f => { if (f?.id) folderMap.set(f.id, f); });
        const fileMap = new Map();
        files.forEach(f => { if (f?.id) fileMap.set(f.id, f); });

        return {
            folders: Array.from(folderMap.values()),
            files: Array.from(fileMap.values())
        };
    }, [currentFolderId, rawTree, findNodeInTree, spacesByDepartment, foldersBySpace, nodesByFolder, isDeepView, resolvedCompanyId, globalSearch, searchQuery, companyFiles, toFinderFileItem]);

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
                    } else if (ec && (!ec.resolved || (ec.context_lookup && !ec.context_lookup.resolved))) {
                        const hintReason = ec.reason || ec.context_lookup?.reason || 'Kontext-ID nicht aufloesbar';
                        storeCache(null, `${hintReason}, Inhalte bleiben verfuegbar.`);
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
            if (resolvedCompanyId) {
                const filesPayload = await listCompanyFiles(resolvedCompanyId);
                setCompanyFiles(filesPayload);
            } else {
                setCompanyFiles([]);
            }
        } catch (e) {
            console.error("Tree load failed", e);
        }
    }, [globalSearch, loadTree, resolvedCompanyId]);

    // UNIFIED FINDER: Navigate to starting point based on pane data
    const appliedStartKeyRef = useRef<string>('');
    useEffect(() => {
        if (!treeData?.length) return;
        const startKey = `${resolvedCompanyId || ''}|${startFolderId || ''}|${startSpaceId || ''}|${departmentId || ''}`;
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
    }, [treeData, resolvedCompanyId, startFolderId, startSpaceId, departmentId, findNodeInTree, loadNodesForFolder, resetNavigationRoot]);

    // Sync search query from pane data (important for Chat -> Finder updates)
    useEffect(() => {
        if (initialQuery) {
            setSearchQuery(initialQuery);
        }
    }, [initialQuery]);

    // Realtime node updates handler
    useEffect(() => { currentFolderIdRef.current = currentFolderId; }, [currentFolderId]);
    const realtimeBatchRef = useRef<any[]>([]);
    const realtimeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleNodeUpdate = (data: any) => {
            if (data.event_type !== 'created' && data.event_type !== 'updated') return;
            
            realtimeBatchRef.current.push(data);
            if (realtimeTimeoutRef.current) clearTimeout(realtimeTimeoutRef.current);
            
            realtimeTimeoutRef.current = setTimeout(() => {
                const batch = realtimeBatchRef.current;
                realtimeBatchRef.current = [];
                realtimeTimeoutRef.current = null;

                const relevantNodes = batch.filter(b => 
                    b.payload?.folder_id === currentFolderIdRef.current ||
                    b.payload?.space_id === currentFolderIdRef.current
                ).map(b => b.payload);

                if (relevantNodes.length === 1) {
                    const node = relevantNodes[0];
                    window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                    loadContent();
                    
                    if (node.id) {
                        setTimeout(() => {
                            dispatchMoraPresence({
                                action: 'highlight',
                                targetId: `file-node-${node.id}`,
                                message: `Neu: ${node.name || node.title || 'Datei'}`
                            });
                        }, 400);
                    }
                } else if (relevantNodes.length > 1) {
                    // Bulk update -> silently reload without highlighting
                    window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                    loadContent();
                }
            }, 300);
        };
        
        realtime.on('node_update', handleNodeUpdate);
        return () => {
            realtime.off('node_update', handleNodeUpdate);
            if (realtimeTimeoutRef.current) clearTimeout(realtimeTimeoutRef.current);
        };
    }, [loadContent]);

    const handleUpload = useCallback(async (fileList: File[]) => {
        if (!resolvedCompanyId) {
            toast.error('Bitte zuerst eine Organisation waehlen.');
            setShowUpload(false);
            return;
        }

        setShowUpload(false);
        setIsUploading(true);
        setUploadProgress({ current: 0, total: fileList.length, filename: fileList[0]?.name || 'file' });

        // P6: Orb reacts - thinking (lila) waehrend Upload
        setThinking();

        // P6: Timeline event - intake started (P2-Pattern)
        window.dispatchEvent(new CustomEvent('mora:agency-update', {
            detail: {
                type: 'proposal',
                status: 'started',
                intent: 'intake',
                message: `${fileList[0]?.name || 'Datei'} wird gespeichert...`
            }
        }));

        const targetFolderId = resolveUploadFolderId();
        const targetFolderName = targetFolderId ? (findNodeInTree(rawTree, targetFolderId)?.name || 'aktueller Ordner') : 'Firmenwurzel';
        let successCount = 0;
        let hasPendingConfirmation = false;
        let hasPerFileError = false;
        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                setUploadProgress({ current: i + 1, total: fileList.length, filename: file.name });
                try {
                    const uploaded = await uploadCompanyFile(file, resolvedCompanyId, 'private', targetFolderId);
                    successCount++;
                    window.dispatchEvent(new CustomEvent('saimor:inbox-refresh'));
                    setSelectedNodeId(uploaded.id);
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
                toast.success(
                    successCount === 1
                        ? `Datei in ${targetFolderName} gespeichert`
                        : `${successCount} Dateien in ${targetFolderName} gespeichert`
                );
                await loadContent();
            } else if (successCount === 0 && !hasPerFileError) {
                // Only show generic error if no per-file error toast was already displayed
                toast.error('Dateien konnten nicht hochgeladen werden');
                setIdle();
            }
        } catch (e: any) {
            toast.error(e.message || 'Upload fehlgeschlagen');
            setIdle();
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
            if (!hasPendingConfirmation) {
                setIdle();
            }
        }
    }, [findNodeInTree, loadContent, rawTree, resolveUploadFolderId, resolvedCompanyId]);

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

    // Initial load + company-switch reload.
    // On initial mount: preferCache avoids a redundant fetch when the store
    // already has fresh tree data. On company change: skip the cache so the
    // new company's tree is always fetched, never showing stale data.
    const isFirstLoadRef = React.useRef(true);
    useEffect(() => {
        if (!resolvedCompanyId) return;
        if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false;
            void loadContent({ preferCache: true });
        } else {
            void loadContent(); // company changed — force fresh fetch
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
    const selectedEntry = useMemo(() => {
        if (!selectedNodeId) return null;
        const selectedFolder = filteredFolders.find((folder) => folder.id === selectedNodeId);
        if (selectedFolder) return { kind: 'folder' as const, item: selectedFolder };
        const selectedFile = filteredFiles.find((file) => file.id === selectedNodeId);
        if (selectedFile) return { kind: 'file' as const, item: selectedFile };
        return null;
    }, [filteredFiles, filteredFolders, selectedNodeId]);

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
        file: FileText,
        image: ImageIcon,
        link: LinkIcon,
        task: CheckSquare,
        folder: FolderIcon,
        other: Box,
        note: FileText,
        intel_report: FileText,
    };

    const getContainerTypeLabel = (type?: string) => {
        switch (type) {
            case 'department':
                return 'Bereich';
            case 'space':
                return 'Bereich';
            case 'folder':
                return 'Ordner';
            default:
                return type || 'Container';
        }
    };

    const getContextOpenLabel = (item: any, type: 'folder' | 'file' | 'background') => {
        if (type === 'background') return 'Oeffnen';
        if (type === 'folder' || ['folder', 'space', 'department'].includes(item?.type)) {
            if (item?.type === 'department') return 'Bereich oeffnen';
            if (item?.type === 'space') return 'Bereich oeffnen';
            return 'Ordner oeffnen';
        }
        if (item?.type === 'file') {
            return getSourceFileOpenActionLabel(item);
        }
        return getNodeOpenActionLabel(item);
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
                    data-file-drop-zone="local"
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
                                    <p className="text-emerald-100 font-bold text-lg">Hier ablegen, um Dateien hochzuladen</p>
                                    <p className="text-emerald-400/70 text-sm">Ziel: {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : 'Eingang'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 px-3 md:px-6 py-2 border-b border-white/5 bg-white/[0.02] text-[11px] text-white/38">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/60">
                            Instanz: {resolvedCompanyName || 'Keine Organisation aktiv'}
                        </span>
                        {globalSearch ? (
                            <span className="rounded-full border border-violet-400/15 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-100/80">
                                Alles durchsuchen
                            </span>
                        ) : searchQuery.trim() ? (
                            <span className="truncate text-white/26">Pfad: {currentPathLabel}</span>
                        ) : null}
                    </div>

                    {navigationContext && (
                        <div className="px-3 md:px-6 py-3 border-b border-cyan-400/10 bg-cyan-500/[0.05]">
                            <CommandReceipt
                                tone="cyan"
                                icon={NavigationIcon}
                                label={navigationSourceLabel}
                                title={navigationContext.message}
                                chips={[
                                    ...(navigationContext.label ? [{ label: navigationContext.label }] : []),
                                    ...(navigationContext.path ? [{ label: navigationContext.path }] : []),
                                    ...(navigationContext.query ? [{ label: `Suche: ${navigationContext.query}` }] : []),
                                    ...(currentPathLabel ? [{ label: `Pfad: ${currentPathLabel}` }] : []),
                                ]}
                                actions={(
                                    <button
                                        type="button"
                                        onClick={() => updatePane(id, {
                                            data: {
                                                ...(pane?.data || {}),
                                                navigationContext: undefined,
                                            }
                                        })}
                                        className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/55 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white/80"
                                    >
                                        Ausblenden
                                    </button>
                                )}
                                footer="Mora zeigt hier die Herkunft des offenen Kontexts. Der Eintrag bleibt sichtbar, bis du ihn ausblendest oder ein neuer Kontext ihn ersetzt."
                            />
                        </div>
                    )}

                    {/* UNIFIED TOOLBAR - RESPONSIVE */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 px-3 md:px-6 py-2 md:py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-md">
                        {/* nav-group: exactly one Back/Forward/Up set -- do not duplicate */}
                        <div className="flex items-center gap-1.5 shrink-0" data-testid="finder-nav-group">
                            <button
                                onClick={navigateBack}
                                disabled={backStack.length === 0}
                                aria-label="Zurueck"
                                className={`p-1.5 rounded-lg border transition-colors ${backStack.length > 0 ? 'border-white/10 text-white/60 hover:text-white hover:bg-white/5' : 'border-white/5 text-white/20 cursor-not-allowed'}`}
                                title="Zurück (Alt+Links)"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                onClick={navigateForward}
                                disabled={forwardStack.length === 0}
                                aria-label="Vorwaerts"
                                className={`p-1.5 rounded-lg border transition-colors ${forwardStack.length > 0 ? 'border-white/10 text-white/60 hover:text-white hover:bg-white/5' : 'border-white/5 text-white/20 cursor-not-allowed'}`}
                                title="Vorwärts (Alt+Rechts)"
                            >
                                <ChevronRight size={14} />
                            </button>
                            <button
                                onClick={navigateUp}
                                disabled={!currentFolderId}
                                aria-label="Nach oben"
                                className={`p-1.5 rounded-lg border transition-colors ${currentFolderId ? 'border-white/10 text-white/60 hover:text-white hover:bg-white/5' : 'border-white/5 text-white/20 cursor-not-allowed'}`}
                                title="Hoch (Alt+Hoch)"
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
                                <span className="font-medium tracking-tight">{folderContext?.path?.company?.name || 'Start'}</span>
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
                                    placeholder="Suche..."
                                    className="pl-9 pr-4 py-1.5 rounded-lg bg-black/20 border border-white/5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/30 w-28 lg:w-32 focus:w-40 lg:focus:w-48 transition-all"
                                />
                            </div>

                            {/* Global/Deep View Toggle - Hidden on mobile */}
                            <button
                                onClick={() => setIsDeepView(!isDeepView)}
                                className={`hidden md:flex p-1.5 px-2 lg:px-3 rounded-lg items-center gap-1.5 lg:gap-2 transition-all border text-xs ${isDeepView ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-black/40 border-white/5 text-white/40 hover:text-white'}`}
                                title={isDeepView ? "Gesamtsicht verlassen und nur den aktuellen Pfad zeigen" : "Gesamtsicht ueber die sichtbaren Inhalte dieser Instanz"}
                            >
                                <Sparkles size={14} />
                                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">
                                    {isDeepView ? 'Gesamtsicht' : 'Pfadfokus'}
                                </span>
                            </button>

                            {/* View Mode Toggles */}
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white/70'}`}
                                    title="Rasteransicht"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white/70'}`}
                                    title="Listenansicht"
                                >
                                    <List size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('graph')}
                                    className={`hidden md:block p-1.5 rounded-lg transition-all ${viewMode === 'graph' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white/70'}`}
                                    title="Semantischer Graph"
                                >
                                    <Share2 size={16} />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2 md:pl-3">
                                <button
                                    onClick={handleCopyPath}
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                                    title="Pfad kopieren"
                                >
                                    <Copy size={16} />
                                </button>
                                <button
                                    onClick={() => loadContent()}
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                                    title="Aktualisieren"
                                >
                                    <RefreshCw size={16} className={(isLoading || isLoadingTree) ? 'animate-spin' : ''} />
                                </button>

                                {currentLevelType !== 'company' && currentLevelType !== 'department' && (
                                    <button
                                        onClick={() => setIsCreateFolderOpen(true)}
                                        className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 transition-all"
                                        title="Neuer Ordner"
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

                    {selectedEntry && (
                        <div className="px-3 md:px-6 pb-3">
                            <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 md:flex-row md:items-center md:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/30">
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-white/55">
                                            Auswahl
                                        </span>
                                        <span>{selectedEntry.kind === 'folder' ? getContainerTypeLabel(selectedEntry.item.type) : getContentTypeLabel(selectedEntry.item.type)}</span>
                                        {selectedEntry.item?.foundIn && (
                                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 normal-case tracking-normal text-white/45">
                                                {selectedEntry.item.foundIn}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 truncate text-sm font-medium text-white/85">
                                        {selectedEntry.kind === 'folder' ? selectedEntry.item.name : getContentDisplayName(selectedEntry.item)}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/38">
                                        <span>
                                            {selectedEntry.kind === 'folder'
                                                ? `Ein weiterer Klick oeffnet ${selectedEntry.item.type === 'department' || selectedEntry.item.type === 'space' ? 'den Bereich' : 'den Ordner'}.`
                                                : getContextOpenLabel(selectedEntry.item, 'file')}
                                        </span>
                                        {selectedEntry.kind === 'file' && selectedEntry.item?.created_at && (
                                            <span>{new Date(selectedEntry.item.created_at).toLocaleDateString()}</span>
                                        )}
                                        {selectedEntry.kind === 'file' && (selectedEntry.item?.metadata?.size || selectedEntry.item?.size) && (
                                            <span>{`${(((selectedEntry.item.metadata?.size ?? selectedEntry.item.size) as number) / 1024).toFixed(0)} KB`}</span>
                                        )}
                                        {selectedEntry.kind === 'file' && (
                                            <span>{getSourceFileSecondaryLabel(selectedEntry.item)}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (selectedEntry.kind === 'folder') {
                                                navigateToFolder(selectedEntry.item.id);
                                            } else {
                                                openFinderNode(selectedEntry.item);
                                            }
                                        }}
                                        className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/14 px-3 py-1.5 text-[11px] font-medium text-emerald-50 transition-colors hover:border-emerald-300/35 hover:bg-emerald-500/22"
                                    >
                                        <ExternalLink size={13} />
                                        {selectedEntry.kind === 'folder' ? getContextOpenLabel(selectedEntry.item, 'folder') : getContextOpenLabel(selectedEntry.item, 'file')}
                                    </button>
                                    {selectedEntry.kind === 'file' && canOpenSourceFile(selectedEntry.item) && (
                                        <button
                                            type="button"
                                            onClick={() => void handleOpenSourceFile(selectedEntry.item)}
                                            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/14 px-3 py-1.5 text-[11px] font-medium text-cyan-50 transition-colors hover:border-cyan-300/35 hover:bg-cyan-500/22"
                                        >
                                            <Paperclip size={13} />
                                            Quelle
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedNodeId(null)}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/72 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                                    >
                                        Auswahl aufheben
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content Container with Animation */}
                    <div className="flex-1 overflow-y-auto p-6 bg-black/40 relative" onClick={() => setSelectedNodeId(null)} onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, null, 'background')}>
                        <AnimatePresence mode="popLayout">
                            {/* Loading State */}
                            {(isLoading || isLoadingTree) && filteredFiles.length === 0 && filteredFolders.length === 0 ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center justify-center h-full"
                                >
                                    <CommandReceipt
                                        tone="cyan"
                                        icon={Loader2}
                                        label="Finder laeuft"
                                        title="Inhalte werden synchronisiert."
                                        body="Mora zieht Pfad, Baum und Suchkontext zusammen. Das kann kurz dauern, wenn der aktuelle Ordner gerade neu geladen wird."
                                        chips={[
                                            { label: `Pfad: ${currentPathLabel}` },
                                            { label: searchQuery ? `Suche: ${searchQuery}` : 'Kein Suchfilter' },
                                        ]}
                                        className="w-full max-w-xl"
                                    />
                                </motion.div>
                            ) : filteredFiles.length === 0 && filteredFolders.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center h-full"
                                >
                                    <CommandReceipt
                                        tone="slate"
                                        icon={Search}
                                        label={searchQuery ? 'Kein Treffer' : 'Leerer Bereich'}
                                        title={searchQuery ? 'Zu dieser Suche gibt es gerade keine sichtbaren Treffer.' : 'In diesem Bereich sind noch keine Ordner oder Dateien sichtbar.'}
                                        body={searchQuery
                                            ? 'Die Suche ist aktiv, aber der aktuelle Kontext liefert nichts Sichtbares. Mora zeigt dir trotzdem den letzten Pfad und den Suchbegriff oben an.'
                                            : 'Lege Dateien hier ab oder navigiere tiefer in den Baum. Mora blendet keine falschen Treffer ein.'}
                                        chips={[
                                            { label: `Pfad: ${currentPathLabel}` },
                                            ...(searchQuery ? [{ label: `Suche: ${searchQuery}`, tone: 'cyan' as const }] : [{ label: 'Keine Suche aktiv' }]),
                                        ]}
                                        className="w-full max-w-xl"
                                    />
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
                                        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 lg:gap-4">
                                            {/* Folders */}
                                            {filteredFolders.map(folder => {
                                                const isSelected = selectedNodeId === folder.id;
                                                return (
                                                    <motion.div
                                                        key={folder.id}
                                                        onClick={(e: React.MouseEvent) => handleFolderClick(e, folder.id)}
                                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, folder, 'folder')}
                                                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-200 flex flex-col gap-2.5 md:gap-3 cursor-pointer group relative hover:-translate-y-0.5 active:scale-[0.98] ${isSelected
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
                                                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold tracking-tighter border border-emerald-500/20 uppercase">Bereich</span>
                                                            )}
                                                            {folder.type === 'space' && (
                                                                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-bold tracking-tighter border border-cyan-500/20 uppercase">Bereich</span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className={`text-sm font-medium line-clamp-2 leading-snug break-words ${isSelected ? 'text-white' : 'text-white/80'}`} title={folder.name}>{folder.name}</span>
                                                            {folder.type === 'folder' && (
                                                                <span className="text-[10px] text-white/30 uppercase tracking-[0.1em]">Gemeinsamer Ordner</span>
                                                            )}
                                                        </div>

                                                        {/* Simple selection indicator */}
                                                        {isSelected && (
                                                            <div className="absolute inset-0 border-2 border-emerald-500/40 rounded-2xl pointer-events-none" />
                                                        )}
                                                    </motion.div>
                                                );
                                            })}

                                            {/* Files */}
                                            {filteredFiles.map(file => {
                                                const isResonant = resonanceIds.includes(file.id);
                                                const isSelected = selectedNodeId === file.id;
                                                const Icon = TYPE_ICONS[file.type] || FileText;
                                                const hasSourceFile = canOpenSourceFile(file);
                                                const opensExternally = file.type === 'link' && typeof file.url === 'string' && file.url.trim().length > 0;
                                                const displayName = getContentDisplayName(file);
                                                const secondaryLabel = file.type === 'file'
                                                    ? getSourceFileSecondaryLabel(file)
                                                    : getContentSecondaryLabel(file);

                                                return (
                                                    <motion.div
                                                        key={file.id}
                                                        id={`file-node-${file.id}`}
                                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedNodeId(file.id); }}
                                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, file, 'file')}
                                                        onDoubleClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            checkResonance(file.id);
                                                            openFinderNode(file);
                                                        }}
                                                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-200 flex flex-col gap-2.5 md:gap-3 cursor-pointer group relative hover:-translate-y-0.5 active:scale-[0.98] ${isSelected
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
                                                            <span className={`text-sm line-clamp-2 leading-snug break-words ${isSelected ? 'text-white font-medium' : 'text-white/80'}`} title={displayName}>
                                                                {displayName}
                                                                {displayName.match(/[_-](EN|DE|FR|ES|IT)\b/i) && (
                                                                    <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-white/10 text-white/70 tracking-wider align-middle">
                                                                        {displayName.match(/[_-](EN|DE|FR|ES|IT)\b/i)![1].toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] text-white/30 uppercase tracking-tighter">{getContentTypeLabel(file.type)}</span>
                                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                                <span className="text-[9px] text-white/30">{new Date(file.created_at || Date.now()).toLocaleDateString()}</span>
                                                                {secondaryLabel && (
                                                                    <>
                                                                        <div className="w-1 h-1 rounded-full bg-white/10" />
                                                                        <span className={`text-[9px] uppercase tracking-tighter ${opensExternally ? 'text-violet-200/60' : hasSourceFile ? 'text-cyan-200/60' : 'text-white/35'}`}>
                                                                            {secondaryLabel}
                                                                        </span>
                                                                    </>
                                                                )}
                                                                {(() => {
                                                                    const vis = file.visibility ||
                                                                        ((file as any).visibility_scope === 'personal' ? 'private' :
                                                                         (file as any).visibility_scope === 'public' ? 'public' : null);
                                                                    return vis ? <VisibilityBadge visibility={vis as any} size={10} /> : null;
                                                                })()}
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
                                                            <div className="absolute inset-0 border-2 border-emerald-500/40 rounded-2xl pointer-events-none" />
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
                                                        {folderContext?.path?.breadcrumbs?.slice(-1)[0]?.name || folderContext?.path?.space?.name || folderContext?.path?.department?.name || 'Start'}
                                                    </span>
                                                </div>
                                                {/* Center core */}
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 blur-sm opacity-50" />
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 shadow-lg" />

                                                {/* Render folders/spaces as orbiting nodes */}
                                                {filteredFolders.map((folder, i) => {
                                                    const count = Math.max(filteredFolders.length, 1);
                                                    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                                                    const layerIdx = Math.floor(i / 10);
                                                    const radius = 160 + (i % 3) * 35 + layerIdx * 90;
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
                                                                openFinderNode(file);
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

                                                {/* Legende */}
                                                <div className="absolute bottom-4 left-4 flex items-center justify-center flex-wrap gap-4 text-[10px] text-white/60 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl z-50 shadow-2xl">
                                                    <div className="font-medium text-emerald-400/80 mr-2 uppercase tracking-widest hidden sm:block">Legende</div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                        <span>Bereich</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                                        <span>Bereich</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                                                        <span>Ordner</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-white/40" />
                                                        <span>Inhalt</span>
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
                                                                <span className="text-[10px] text-emerald-400/40 block truncate">Pfad: {folder.foundIn}</span>
                                                            )}
                                                        </div>
                                                        {folder.type && (
                                                            <span className="text-[10px] text-white/30 uppercase shrink-0">{getContainerTypeLabel(folder.type)}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Files */}
                                            {filteredFiles.map(file => {
                                                const isSelected = selectedNodeId === file.id;
                                                const isResonant = resonanceIds.includes(file.id);
                                                const Icon = TYPE_ICONS[file.type] || FileText;
                                                const displayName = getContentDisplayName(file);
                                                const secondaryLabel = file.type === 'file'
                                                    ? getSourceFileSecondaryLabel(file)
                                                    : getContentSecondaryLabel(file);

                                                return (
                                                    <div
                                                        key={file.id}
                                                        id={`file-node-${file.id}`}
                                                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedNodeId(file.id); }}
                                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, file, 'file')}
                                                        onDoubleClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            checkResonance(file.id);
                                                            openFinderNode(file);
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
                                                            <span className={`text-sm block truncate ${isSelected ? 'text-white font-medium' : 'text-white/70'}`}>{displayName}</span>
                                                            {file.foundIn && (
                                                                <span className="text-[10px] text-emerald-400/40 block truncate">Pfad: {file.foundIn}</span>
                                                            )}
                                                            <div className="mt-1 flex items-center gap-2 text-[10px] text-white/30">
                                                                <span>{getContentTypeLabel(file.type)}</span>
                                                                {secondaryLabel && (
                                                                    <span className={`${file.type === 'link' ? 'text-violet-200/60' : 'text-cyan-200/60'}`}>{secondaryLabel}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] text-white/30 shrink-0">{new Date(file.created_at || Date.now()).toLocaleDateString()}</span>
                                                        {(() => {
                                                            const vis = file.visibility ||
                                                                ((file as any).visibility_scope === 'personal' ? 'private' :
                                                                 (file as any).visibility_scope === 'public' ? 'public' : null);
                                                            return vis ? <VisibilityBadge visibility={vis as any} size={11} /> : null;
                                                        })()}
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
                            <div className="space-y-3">
                                {pendingAction.route_resolution === 'choose' && (pendingAction.route_candidates?.length || 0) > 0 && (
                                    <AmbiguityChoiceSurface
                                        query={pendingAction.params?.filename}
                                        results={(pendingAction.route_candidates || []).map((candidate, index) => toIntakeChoiceResult(candidate, index))}
                                        title={pendingAction.route_choice_headline || 'Mehrere plausible Ziele'}
                                        body={pendingAction.route_choice_reason || 'Mehrere Zielkontexte passen zur Datei. Waehle den richtigen Zielordner vor der Freigabe.'}
                                        onPick={(result) => {
                                            const folderId = result.folderId;
                                            if (!folderId) return;
                                            setPendingAction((prev) => prev ? {
                                                ...prev,
                                                folder_id: folderId,
                                                confirm_payload: {
                                                    ...(prev.confirm_payload || {}),
                                                    folder_id: folderId,
                                                },
                                            } : prev);
                                        }}
                                    />
                                )}
                                {pendingAction.next && (
                                    <CommandReceipt
                                        tone={pendingAction.route_resolution === 'choose' ? 'amber' : 'cyan'}
                                        label={pendingAction.next.label || 'Naechster Schritt'}
                                        title={pendingAction.route_summary || buildRoutePath(pendingAction.intake_context)}
                                        body={pendingAction.next.message || 'Pruefe die Einordnung und bestaetige oder korrigiere das Ziel.'}
                                        className="rounded-xl border-white/[0.06] bg-white/[0.02] shadow-none"
                                    />
                                )}
                                <ConfirmationCard
                                    action={pendingAction}
                                    variant="intake"
                                    onConfirmed={async (result) => {
                                        const active = pendingAction;
                                        setPendingAction(null);
                                        setIdle();
                                        if (active) {
                                            let resolvedFolderId: string | undefined =
                                                result?.folder_id ||
                                                result?.destination?.folder_id ||
                                                result?.result?.destination?.folder_id ||
                                                active.confirm_payload?.folder_id;
                                            let resolvedNodeId: string | undefined =
                                                result?.node_id ||
                                                result?.destination?.node_id ||
                                                result?.result?.destination?.node_id;

                                            if (!resolvedFolderId || !resolvedNodeId) {
                                                try {
                                                    const nodeStatus = await getFileNode(active.file_id);
                                                    if (!resolvedFolderId && nodeStatus?.folder_id) {
                                                        resolvedFolderId = nodeStatus.folder_id;
                                                    }
                                                    if (!resolvedNodeId && nodeStatus?.node_id) {
                                                        resolvedNodeId = nodeStatus.node_id;
                                                    }
                                                } catch {
                                                    // best-effort only
                                                }
                                            }

                                            surfaceFinderCompletion({
                                                fileName: active.params?.filename,
                                                intakeContext: active.intake_context,
                                                folderId: resolvedFolderId,
                                                nodeId: resolvedNodeId,
                                                result: result?.result_summary || result?.destination_summary || result?.result?.destination_summary,
                                                outcome: 'confirmed',
                                            });
                                        }
                                        loadContent();
                                    }}
                                    onRejected={async () => {
                                        const active = pendingAction;
                                        setPendingAction(null);
                                        setIdle();
                                        if (active) {
                                            try {
                                                await rejectCreateNodeFromFile(active.file_id, active.confirmation_token);
                                                surfaceFinderCompletion({
                                                    fileName: active.params?.filename,
                                                    intakeContext: active.intake_context,
                                                    folderId: active.confirm_payload?.folder_id,
                                                    result: 'Verworfen',
                                                    outcome: 'rejected',
                                                });
                                                toast.info('Node creation rejected');
                                            } catch (err) {
                                                console.error('Reject failed', err);
                                            }
                                        }
                                    }}
                                    onDismiss={() => {
                                        // P6: "Spaeter" - dismiss UI without policy reject
                                        // Pending stays pending (token still valid for 5 min)
                                        setPendingAction(null);
                                        setIdle();
                                        toast.info('Einordnung verschoben');
                                    }}
                                />
                            </div>
                        )}

                        {/* Upload Progress Footer */}
                        {isUploading && (
                            <div className="px-4 py-3 border-t border-white/5 bg-emerald-900/10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                                        <Loader2 size={12} className="animate-spin" />
                                        <span className="font-medium">Lade hoch...</span>
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
                                        <ExternalLink size={14} /> {getContextOpenLabel(contextMenu.item, contextMenu.type)}
                                    </button>
                                    {contextMenu.type === 'file' && canOpenSourceFile(contextMenu.item) && (
                                        <button
                                            onClick={() => {
                                                void handleOpenSourceFile(contextMenu.item);
                                                setContextMenu(null);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2 transition-colors"
                                        >
                                            <Paperclip size={14} /> Quelle oeffnen
                                        </button>
                                    )}
                                    <button onClick={handleOpenInUniverse} className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2 transition-colors">
                                        <Globe size={14} /> Im Universe oeffnen
                                    </button>
                                    <button onClick={handleRename} className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center gap-2 transition-colors">
                                        <Edit size={14} /> Umbenennen
                                    </button>
                                    <button onClick={handleCopy} className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center gap-2 transition-colors">
                                        <Copy size={14} /> Kopieren
                                    </button>
                                    <button onClick={handleCut} className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center gap-2 transition-colors">
                                        <Scissors size={14} /> Ausschneiden
                                    </button>
                                    <div className="h-px bg-white/5 my-1" />
                                    <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 hover:text-red-400 flex items-center gap-2 transition-colors text-red-300">
                                        <Trash2 size={14} /> Loeschen
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => loadContent()} className="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2">
                                        <RefreshCw size={14} /> Aktualisieren
                                    </button>
                                    {clipboard && (
                                        <button onClick={handlePaste} className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center gap-2">
                                            <Clipboard size={14} /> Element einfuegen
                                        </button>
                                    )}
                                    <button onClick={() => setIsCreateFolderOpen(true)} className="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2">
                                        <FolderIcon size={14} /> Neuer Ordner
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
                            <h3 className="text-lg font-medium text-white mb-4">Neuer Ordner</h3>
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
                                    toast.success('Ordner erstellt');
                                } catch (err: any) {
                                    toast.error(err?.message || 'Failed to create folder');
                                }
                            }}>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Ordnername..."
                                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:border-emerald-500/50 outline-none mb-4"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setIsCreateFolderOpen(false); setNewFolderName(''); }}
                                        className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5"
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30"
                                    >
                                        Erstellen
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
