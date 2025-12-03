import { create } from 'zustand';
import type { CoreCompany, CoreDepartment, CoreSpace, CoreFolder, CoreNode, CoreTreeNode } from "@/lib/types/core";
import {
    fetchDepartments,
    fetchCompanies,
    fetchSpaces,
    fetchFolders,
    fetchNodes,
    fetchNodeDetails,
    fetchTree,
    createSpace,
    createFolder,
    createNode,
    updateNode as apiUpdateNode,
    deleteNode as apiDeleteNode,
    CoreError,
    type CreateSpacePayload,
    type CreateFolderPayload,
    type CreateNodePayload,
    type UpdateNodePayload
} from "@/lib/api/coreClient";
import { useAccountStore } from "@/lib/auth/useAccount";
import { toast } from "@/lib/toast";

export type ViewLevel = 'company' | 'core' | 'department' | 'space' | 'folder';


interface MoraState {
    // Spatial Position
    viewLevel: ViewLevel;
    activeCompanyId: string | null;
    activeDepartmentId: string | null;
    activeSpaceId: string | null;
    activeFolderId: string | null;
    activeNode: CoreNode | null;

    // Data
    companies: CoreCompany[];
    departments: CoreDepartment[];
    spacesByDepartment: Record<string, CoreSpace[]>;
    foldersBySpace: Record<string, CoreFolder[]>;
    nodesByFolder: Record<string, CoreNode[]>;

    // Tree Data
    treeData: CoreTreeNode[] | null;
    expandedTreeNodes: Set<string>;

    // Loading / Error States
    isLoadingCompanies: boolean;
    isLoadingDepartments: boolean;
    isLoadingSpaces: boolean;
    isLoadingFolders: boolean;
    isLoadingNodes: boolean;
    isLoadingTree: boolean;
    coreError: string | null;
    // Orb Awareness
    orbState: 'idle' | 'active' | 'learning' | 'warning' | 'demo';

    // Actions
    setViewLevel: (level: ViewLevel) => void;
    setActiveCompany: (id: string | null) => void;
    setActiveDepartment: (id: string | null) => void;
    setActiveSpace: (id: string | null) => void;
    setActiveFolder: (id: string | null) => void;
    setActiveNode: (node: CoreNode | null) => void;
    setOrbState: (state: 'idle' | 'active' | 'learning' | 'warning' | 'demo') => void;

    // Data Actions - Load
    loadCompanies: () => Promise<void>;
    loadDepartments: (companyId?: string) => Promise<void>;
    loadSpacesForDepartment: (departmentId: string) => Promise<void>;
    loadFoldersForSpace: (spaceId: string) => Promise<void>;
    loadNodesForFolder: (folderId: string, options?: { search?: string, type?: string }) => Promise<void>;
    loadNodeDetails: (nodeId: string) => Promise<void>;
    loadTree: (tenantId?: string) => Promise<void>;

    // Tree Actions
    toggleTreeNode: (id: string) => void;

    // Data Actions - Create/Update/Delete
    addSpace: (payload: CreateSpacePayload) => Promise<void>;
    addFolder: (payload: CreateFolderPayload) => Promise<void>;
    addNode: (payload: CreateNodePayload) => Promise<void>;
    updateNode: (id: string, payload: UpdateNodePayload) => Promise<void>;
    deleteNode: (id: string) => Promise<void>;

    // Navigation Helpers
    navigateToCore: () => void;
    navigateToDepartment: (deptId: string) => void;
    navigateToSpace: (spaceId: string) => void;
    navigateToFolder: (folderId: string) => void;
}

export const useMoraStore = create<MoraState>((set, get) => ({
    // Initial State
    viewLevel: 'core', // Default to core view (Môra + departments)
    activeCompanyId: null,
    activeDepartmentId: null,
    activeSpaceId: null,
    activeFolderId: null,
    activeNode: null,

    companies: [],
    departments: [],
    spacesByDepartment: {},
    foldersBySpace: {},
    nodesByFolder: {},

    treeData: null,
    expandedTreeNodes: new Set<string>(),

    isLoadingCompanies: false,
    isLoadingDepartments: false,
    isLoadingSpaces: false,
    isLoadingFolders: false,
    isLoadingNodes: false,
    isLoadingTree: false,
    coreError: null,
    orbState: 'idle',

    // Basic Setters
    setViewLevel: (level) => set({ viewLevel: level }),
    setActiveCompany: (id) => set({ activeCompanyId: id }),
    setActiveDepartment: (id) => set({ activeDepartmentId: id }),
    setActiveSpace: (id) => set({ activeSpaceId: id }),
    setActiveFolder: (id) => set({ activeFolderId: id }),
    setActiveNode: (node) => set({ activeNode: node }),
    setOrbState: (state) => set({ orbState: state }),


    // Data Loading Actions
    loadCompanies: async () => {
        set({ isLoadingCompanies: true, coreError: null });
        try {
            const data = await fetchCompanies(true); // Include demo for now
            set({ companies: data, isLoadingCompanies: false });
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized." : error.message)
                : "Failed to load companies.";
            set({ isLoadingCompanies: false, coreError: msg });
        }
    },

    loadDepartments: async (companyId?: string) => {
        set({ isLoadingDepartments: true, coreError: null });
        try {
            // Use active company if not provided
            const targetCompanyId = companyId || get().activeCompanyId || undefined;
            const data = await fetchDepartments(targetCompanyId);
            set({ departments: data, isLoadingDepartments: false });
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized to access Saimôr Core (check JWT/tenant)." : error.message)
                : "Failed to load departments.";
            set({ isLoadingDepartments: false, coreError: msg });
        }
    },

    loadSpacesForDepartment: async (deptId: string) => {
        set({ isLoadingSpaces: true, coreError: null });
        try {
            const data = await fetchSpaces(deptId);
            set(state => ({
                spacesByDepartment: { ...state.spacesByDepartment, [deptId]: data },
                isLoadingSpaces: false
            }));
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized to access Saimôr Core (check JWT/tenant)." : error.message)
                : "Failed to load spaces.";
            set({ isLoadingSpaces: false, coreError: msg });
        }
    },

    loadFoldersForSpace: async (spaceId: string) => {
        set({ isLoadingFolders: true, coreError: null });
        try {
            const data = await fetchFolders(spaceId);
            set(state => ({
                foldersBySpace: { ...state.foldersBySpace, [spaceId]: data },
                isLoadingFolders: false
            }));
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized to access Saimôr Core (check JWT/tenant)." : error.message)
                : "Failed to load folders.";
            set({ isLoadingFolders: false, coreError: msg });
        }
    },

    loadNodesForFolder: async (folderId: string, options?: { search?: string, type?: string }) => {
        set({ isLoadingNodes: true, coreError: null });
        try {
            const data = await fetchNodes(folderId, options);
            set(state => ({
                nodesByFolder: { ...state.nodesByFolder, [folderId]: data },
                isLoadingNodes: false
            }));
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized to access Saimôr Core (check JWT/tenant)." : error.message)
                : "Failed to load nodes.";
            set({ isLoadingNodes: false, coreError: msg });
        }
    },

    loadNodeDetails: async (nodeId: string) => {
        // Optimistic update if we have the node in the list
        const state = get();
        let foundNode: CoreNode | undefined;

        // Search in loaded folders
        for (const nodes of Object.values(state.nodesByFolder)) {
            foundNode = nodes.find(n => n.id === nodeId);
            if (foundNode) break;
        }

        if (foundNode) {
            set({ activeNode: foundNode });
        }

        // Fetch fresh details
        try {
            const detailedNode = await fetchNodeDetails(nodeId);
            set({ activeNode: detailedNode });
        } catch (error: any) {
            console.error("Failed to load node details:", error);
            // Keep the optimistic version if available, or handle error
        }
    },

    loadTree: async (tenantId?: string) => {
        set({ isLoadingTree: true, coreError: null });
        try {
            const resolvedTenant = tenantId || useAccountStore.getState().currentAccount?.tenantId;
            const tree = await fetchTree(resolvedTenant || undefined);
            if ((tree?.length || 0) === 0) {
                // Retry once to avoid empty renders during demo refresh
                const retryTree = await fetchTree(resolvedTenant || undefined);
                const hasData = (retryTree?.length || 0) > 0;
                set({
                    treeData: retryTree,
                    isLoadingTree: false,
                    coreError: hasData ? null : "Tree is empty after refresh. Try resetting the demo.",
                });
                return;
            }
            set({ treeData: tree, isLoadingTree: false });
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized to access tree." : error.message)
                : "Failed to load tree structure.";
            set({ isLoadingTree: false, coreError: msg });
        }
    },

    toggleTreeNode: (id: string) => {
        const state = get();
        const newExpanded = new Set(state.expandedTreeNodes);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        set({ expandedTreeNodes: newExpanded });
    },

    // Create Actions
    addSpace: async (payload) => {
        try {
            const newSpace = await createSpace(payload);
            const deptId = payload.department_id;

            set(state => ({
                spacesByDepartment: {
                    ...state.spacesByDepartment,
                    [deptId]: [...(state.spacesByDepartment[deptId] || []), newSpace]
                }
            }));

            // Show success toast
            toast.success(`Space "${newSpace.name}" created successfully!`);

            // Refresh tree to show new space
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to create space.";
            toast.error(msg);
            set({ coreError: msg });
            throw error;
        }
    },

    addFolder: async (payload) => {
        try {
            const newFolder = await createFolder(payload);
            const spaceId = payload.space_id;

            set(state => ({
                foldersBySpace: {
                    ...state.foldersBySpace,
                    [spaceId]: [...(state.foldersBySpace[spaceId] || []), newFolder]
                }
            }));

            // Show success toast
            toast.success(`Folder "${newFolder.name}" created!`);

            // Refresh tree to show new folder
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to create folder.";
            toast.error(msg);
            set({ coreError: msg });
            throw error;
        }
    },

    addNode: async (payload) => {
        try {
            const newNode = await createNode(payload);
            const folderId = payload.folder_id;

            set(state => ({
                nodesByFolder: {
                    ...state.nodesByFolder,
                    [folderId]: [...(state.nodesByFolder[folderId] || []), newNode]
                }
            }));

            // Show success toast
            toast.success(`Item "${newNode.title}" added!`);

            // Refresh tree to show new node
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to create item.";
            toast.error(msg);
            set({ coreError: msg });
            throw error;
        }
    },

    updateNode: async (id, payload) => {
        try {
            const updatedNode = await apiUpdateNode(id, payload);
            const folderId = updatedNode.folder_id;

            if (folderId) {
                set(state => ({
                    activeNode: state.activeNode?.id === id ? updatedNode : state.activeNode,
                    nodesByFolder: {
                        ...state.nodesByFolder,
                        [folderId]: (state.nodesByFolder[folderId] || []).map((n: CoreNode) =>
                            n.id === id ? updatedNode : n
                        )
                    }
                }));
            }

            toast.success(`Item updated successfully!`);
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to update item.";
            toast.error(msg);
            throw error;
        }
    },

    deleteNode: async (id) => {
        try {
            // Get folder ID before deletion for state update
            const state = get();
            let folderId = state.activeNode?.id === id ? state.activeNode.folder_id : null;

            if (!folderId) {
                // Find folder ID if not active
                for (const [fId, nodes] of Object.entries(state.nodesByFolder)) {
                    if (nodes.find(n => n.id === id)) {
                        folderId = fId;
                        break;
                    }
                }
            }

            await apiDeleteNode(id);

            if (folderId) {
                set(state => ({
                    activeNode: state.activeNode?.id === id ? null : state.activeNode,
                    nodesByFolder: {
                        ...state.nodesByFolder,
                        [folderId]: (state.nodesByFolder[folderId] || []).filter(n => n.id !== id)
                    }
                }));
            }

            toast.success(`Item deleted.`);
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to delete item.";
            toast.error(msg);
            throw error;
        }
    },

    // Navigation Helpers
    navigateToCore: () => set({
        viewLevel: 'core',
        activeDepartmentId: null,
        activeSpaceId: null,
        activeFolderId: null
    }),

    navigateToDepartment: (deptId) => {
        set({
            viewLevel: 'department',
            activeDepartmentId: deptId,
            activeSpaceId: null,
            activeFolderId: null
        });
        // Auto-load spaces for this department
        get().loadSpacesForDepartment(deptId);
    },

    navigateToSpace: (spaceId) => {
        set({
            viewLevel: 'space',
            activeSpaceId: spaceId,
            activeFolderId: null
        });
        // Auto-load folders for this space
        get().loadFoldersForSpace(spaceId);
    },

    navigateToFolder: (folderId) => {
        set({
            viewLevel: 'folder',
            activeFolderId: folderId
        });
        // Auto-load nodes for this folder
        get().loadNodesForFolder(folderId);
    },
}));
