import { create } from 'zustand';
import type { CoreDepartment, CoreSpace, CoreFolder, CoreNode } from "@/lib/types/core";
import {
    fetchDepartments,
    fetchSpaces,
    fetchFolders,
    fetchNodes,
    createSpace,
    createFolder,
    createNode,
    CoreError,
    type CreateSpacePayload,
    type CreateFolderPayload,
    type CreateNodePayload
} from "@/lib/api/coreClient";

export type ViewLevel = 'core' | 'department' | 'space' | 'folder';

interface MoraState {
    // Spatial Position
    viewLevel: ViewLevel;
    activeDepartmentId: string | null;
    activeSpaceId: string | null;
    activeFolderId: string | null;

    // Data
    departments: CoreDepartment[];
    spacesByDepartment: Record<string, CoreSpace[]>;
    foldersBySpace: Record<string, CoreFolder[]>;
    nodesByFolder: Record<string, CoreNode[]>;

    // Loading / Error States
    isLoadingDepartments: boolean;
    isLoadingSpaces: boolean;
    isLoadingFolders: boolean;
    isLoadingNodes: boolean;
    coreError: string | null;

    // Actions
    setViewLevel: (level: ViewLevel) => void;
    setActiveDepartment: (id: string | null) => void;
    setActiveSpace: (id: string | null) => void;
    setActiveFolder: (id: string | null) => void;

    // Data Actions - Load
    loadDepartments: () => Promise<void>;
    loadSpacesForDepartment: (departmentId: string) => Promise<void>;
    loadFoldersForSpace: (spaceId: string) => Promise<void>;
    loadNodesForFolder: (folderId: string) => Promise<void>;

    // Data Actions - Create
    addSpace: (payload: CreateSpacePayload) => Promise<void>;
    addFolder: (payload: CreateFolderPayload) => Promise<void>;
    addNode: (payload: CreateNodePayload) => Promise<void>;

    // Navigation Helpers
    navigateToCore: () => void;
    navigateToDepartment: (deptId: string) => void;
    navigateToSpace: (spaceId: string) => void;
    navigateToFolder: (folderId: string) => void;
}

export const useMoraStore = create<MoraState>((set, get) => ({
    // Initial State
    viewLevel: 'core',
    activeDepartmentId: null,
    activeSpaceId: null,
    activeFolderId: null,

    departments: [],
    spacesByDepartment: {},
    foldersBySpace: {},
    nodesByFolder: {},

    isLoadingDepartments: false,
    isLoadingSpaces: false,
    isLoadingFolders: false,
    isLoadingNodes: false,
    coreError: null,

    // Basic Setters
    setViewLevel: (level) => set({ viewLevel: level }),
    setActiveDepartment: (id) => set({ activeDepartmentId: id }),
    setActiveSpace: (id) => set({ activeSpaceId: id }),
    setActiveFolder: (id) => set({ activeFolderId: id }),

    // Data Loading Actions
    loadDepartments: async () => {
        set({ isLoadingDepartments: true, coreError: null });
        try {
            const data = await fetchDepartments();
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

    loadNodesForFolder: async (folderId: string) => {
        set({ isLoadingNodes: true, coreError: null });
        try {
            const data = await fetchNodes(folderId);
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
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to create space.";
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
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to create folder.";
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
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to create node.";
            set({ coreError: msg });
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

    navigateToDepartment: (deptId) => set({
        viewLevel: 'department',
        activeDepartmentId: deptId,
        activeSpaceId: null,
        activeFolderId: null
    }),

    navigateToSpace: (spaceId) => set({
        viewLevel: 'space',
        activeSpaceId: spaceId,
        activeFolderId: null
    }),

    navigateToFolder: (folderId) => set({
        viewLevel: 'folder',
        activeFolderId: folderId
    }),
}));
