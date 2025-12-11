import { create } from 'zustand';
import type { CoreCompany, CoreDepartment, CoreSpace, CoreFolder, CoreNode, CoreTreeNode } from "@/lib/types/core";
import {
    fetchDepartments,
    fetchCompanies,
    fetchSpaces,
    fetchFolders,
    fetchNodes,
    fetchNodesByCompany,
    fetchNodeDetails,
    fetchTree,
    createSpace,
    createFolder,
    createNode,
    updateNode as apiUpdateNode,
    deleteNode as apiDeleteNode,
    createDepartment as apiCreateDepartment,
    updateDepartment as apiUpdateDepartment,
    deleteDepartment as apiDeleteDepartment,
    updateSpace as apiUpdateSpace,
    deleteSpace as apiDeleteSpace,
    updateFolder as apiUpdateFolder,
    deleteFolder as apiDeleteFolder,
    CoreError,
    type CreateSpacePayload,
    type CreateFolderPayload,
    type CreateNodePayload,
    type UpdateNodePayload,
    type CreateDepartmentPayload,
    type UpdateDepartmentPayload,
    type UpdateSpacePayload,
    type UpdateFolderPayload
} from "@/lib/api/coreClient";
import { useAccountStore } from "@/lib/auth/useAccount";
import { toast } from "@/lib/toast";
import { MOCK_DATA } from "@/lib/data/mockData";
import { mindLoop } from "@/lib/intelligence/mindLoop"; // Phase 8.1 Integration
import type { OrbState } from "@/lib/api/awarenessClient";

export type ViewLevel = 'company' | 'core' | 'department' | 'space' | 'folder';
export type ViewMode = 'owner' | 'demo' | 'workspace';

// ═══════════════════════════════════════════════════════════════════════════
// ROLE-BASED ACCESS CONTROL - Phase 6.3
// ═══════════════════════════════════════════════════════════════════════════
export type UserRole = 'owner' | 'admin' | 'manager' | 'member' | 'demo';

export interface User {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    role: UserRole;
}

export interface Permissions {
    canCreate: boolean;
    canDelete: boolean;
    canAdmin: boolean;
    canEditSettings: boolean;
    canViewAnalytics: boolean;
}

// Permission matrix by role
export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
    owner: { canCreate: true, canDelete: true, canAdmin: true, canEditSettings: true, canViewAnalytics: true },
    admin: { canCreate: true, canDelete: true, canAdmin: true, canEditSettings: true, canViewAnalytics: true },
    manager: { canCreate: true, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: true },
    member: { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false },
    demo: { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false }
};

// Helper to get permissions for a role
export const getPermissions = (role: UserRole): Permissions => ROLE_PERMISSIONS[role];

interface MoraState {
    // Spatial Position
    viewLevel: ViewLevel;
    viewMode: ViewMode; // NEW: Owner View (Kunden) vs Demo View (Café) vs Workspace View (eigene Firma)
    activeCompanyId: string | null;
    activeDepartmentId: string | null;
    activeSpaceId: string | null;
    activeFolderId: string | null;
    activeNode: CoreNode | null;
    minimizedNodes: CoreNode[]; // Phase 3: Dock Integration

    // User & Permissions (Phase 6.3)
    user: User | null;
    permissions: Permissions;

    // Data
    companies: CoreCompany[];
    departments: CoreDepartment[];
    spacesByDepartment: Record<string, CoreSpace[]>;
    foldersBySpace: Record<string, CoreFolder[]>;
    nodesByFolder: Record<string, CoreNode[]>;
    nodesByCompany: Record<string, CoreNode[]>;

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
    // Orb Awareness - UPGRADE A1: Five awareness modes (Phase 7.1)
    orbState: OrbState;
    orbNotifications: Array<{ id: string, type: 'task' | 'email' | 'insight' | 'alert', message: string }>;

    // Actions
    setViewLevel: (level: ViewLevel) => void;
    setViewMode: (mode: ViewMode) => void; // NEW: Switch between Owner/Demo/Workspace
    setActiveCompany: (id: string | null) => void;
    setActiveDepartment: (id: string | null) => void;
    setActiveSpace: (id: string | null) => void;
    setActiveFolder: (id: string | null) => void;
    setActiveNode: (node: CoreNode | null) => void;
    setOrbState: (state: OrbState) => void;
    addOrbNotification: (notification: { id: string, type: 'task' | 'email' | 'insight' | 'alert', message: string }) => void;
    clearOrbNotifications: () => void;
    minimizeNode: (node: CoreNode) => void;
    restoreNode: (nodeId: string) => void;
    closeNode: (nodeId: string) => void;
    setUser: (user: User | null) => void; // Phase 6.3: Set user with role

    // Data Actions - Load
    loadCompanies: () => Promise<void>;
    loadDepartments: (companyId?: string) => Promise<void>;
    loadSpacesForDepartment: (departmentId: string) => Promise<void>;
    loadFoldersForSpace: (spaceId: string) => Promise<void>;
    loadNodesForFolder: (folderId: string, options?: { search?: string, type?: string }) => Promise<void>;
    loadNodesForCompany: (companyId: string) => Promise<void>;
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
    updateSpace: (id: string, payload: UpdateSpacePayload) => Promise<void>;
    deleteSpace: (id: string) => Promise<void>;
    updateFolder: (id: string, payload: UpdateFolderPayload) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;

    // Departments (Phase 7.1)
    addDepartment: (payload: CreateDepartmentPayload) => Promise<void>;
    updateDepartment: (id: string, payload: UpdateDepartmentPayload) => Promise<void>;
    deleteDepartment: (id: string) => Promise<void>;

    // Navigation Helpers
    navigateToCore: () => void;
    navigateToDepartment: (deptId: string) => void;
    navigateToSpace: (spaceId: string) => void;
    navigateToFolder: (folderId: string) => void;
}

export const useMoraStore = create<MoraState>((set, get) => ({
    // Initial State
    viewLevel: 'core',
    viewMode: 'workspace',
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
    nodesByCompany: {},

    treeData: null,
    expandedTreeNodes: new Set<string>(),

    isLoadingCompanies: false,
    isLoadingDepartments: false,
    isLoadingSpaces: false,
    isLoadingFolders: false,
    isLoadingNodes: false,
    isLoadingTree: false,
    coreError: null,
    orbState: 'idle', // Phase 7.1: Start in simple breathing mode
    orbNotifications: [],
    minimizedNodes: [],

    // User & Permissions (Phase 6.3) - Default to demo role
    user: null,
    permissions: ROLE_PERMISSIONS.demo,

    // Basic Setters
    setViewLevel: (level) => set({ viewLevel: level }),
    setViewMode: (mode) => {
        console.log(`🔄 Switching View Mode: ${mode}`);
        set({ viewMode: mode });

        // Auto-adjust viewLevel based on mode
        if (mode === 'owner') {
            // Owner view: Show companies as planets
            set({ viewLevel: 'company' });
        } else if (mode === 'demo' || mode === 'workspace') {
            // Demo/Workspace: Show departments
            set({ viewLevel: 'core' });
        }
    },
    setActiveCompany: (id) => set({ activeCompanyId: id }),
    setActiveDepartment: (id) => set({ activeDepartmentId: id }),
    setActiveSpace: (id) => set({ activeSpaceId: id }),
    setActiveFolder: (id) => set({ activeFolderId: id }),
    setActiveNode: (node) => set({ activeNode: node }),
    setOrbState: (state) => set({ orbState: state }),
    addOrbNotification: (notification) => set((state) => ({
        orbNotifications: [...state.orbNotifications, notification]
    })),
    clearOrbNotifications: () => set({ orbNotifications: [] }),

    // Phase 6.3: Set user and auto-compute permissions from role
    setUser: (user) => {
        if (user) {
            // Save to localStorage for LockScreen (client-side only)
            if (typeof window !== 'undefined') {
                localStorage.setItem('mora_session', 'active');
                localStorage.setItem('last_user_name', user.name);
            }
            set({
                user,
                permissions: getPermissions(user.role)
            });
        } else {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('mora_session');
                localStorage.removeItem('last_user_name');
            }
            set({
                user: null,
                permissions: ROLE_PERMISSIONS.demo
            });
        }
    },


    // Data Loading Actions
    loadCompanies: async () => {
        set({ isLoadingCompanies: true, coreError: null });
        // Phase 8.1: Dispatch thinking event
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadCompanies' } });
        set({ orbState: mindLoop.getCurrentState() });

        try {
            let data = await fetchCompanies(true);

            // MOCK FALLBACK if data is empty or invalid (even if API call succeeded)
            // FIX: Also check if response is actually an array (backend might return {"detail": "Not authenticated"} as 200 OK)
            if (!data || !Array.isArray(data) || data.length === 0) {
                console.warn('⚠️ API returned empty/invalid data, using MOCK DATA for companies');
                data = [
                    {
                        id: 'comp-demo',
                        tenant_id: 'tenant-demo',
                        owner_id: 'user-demo',
                        name: 'Simple Coffee Group',
                        slug: 'simple-coffee-group',
                        is_demo: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    {
                        id: 'comp-saimor',
                        tenant_id: 'tenant-saimor',
                        owner_id: 'user-saimor',
                        name: 'Saimôr HQ',
                        slug: 'saimor-hq',
                        is_demo: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ] as any;
            }

            set({ companies: data, isLoadingCompanies: false });

            // Phase 8.1: Success event
            mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'idle', severity: 0.1, payload: { status: 'success' } });
            set({ orbState: mindLoop.getCurrentState() });
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized." : error.message)
                : "Failed to load companies.";

            // Phase 8.1: Alert event
            mindLoop.dispatch({ type: 'SYSTEM_ALERT', source: 'Core', severity: 0.9, payload: { error: msg, handled: true } });

            // MOCK FALLBACK for Companies
            console.warn('⚠️ API failed, using MOCK DATA for companies');
            const mockCompanies: CoreCompany[] = [
                {
                    id: 'comp-demo',
                    tenant_id: 'tenant-demo',
                    owner_id: 'user-demo',
                    name: 'Simple Coffee Group',
                    slug: 'simple-coffee-group',
                    is_demo: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 'comp-saimor',
                    tenant_id: 'tenant-saimor',
                    owner_id: 'user-saimor',
                    name: 'Saimôr HQ',
                    slug: 'saimor-hq',
                    is_demo: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];
            set({ companies: mockCompanies, isLoadingCompanies: false, coreError: null, orbState: mindLoop.getCurrentState() });
        }
    },

    loadDepartments: async (companyId?: string) => {
        set({ isLoadingDepartments: true, coreError: null });
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadDepartments' } });
        set({ orbState: mindLoop.getCurrentState() });
        try {
            // Use active company if not provided
            const targetCompanyId = companyId || get().activeCompanyId || undefined;
            let data = await fetchDepartments(targetCompanyId);

            // MOCK FALLBACK if data is empty or invalid
            // FIX: Also check if response is actually an array (backend might return {"detail": "Not authenticated"} as 200 OK)
            if (!data || !Array.isArray(data) || data.length === 0) {
                const isDemo = get().viewMode === 'demo';
                if (isDemo) {
                    console.warn('⚠️ Using MOCK DATA for Demo Company');
                    data = MOCK_DATA.demo.departments as any;
                } else {
                    console.warn('⚠️ Using MOCK DATA for Workspace (Solo Founder)');
                    data = MOCK_DATA.solo.departments as any;
                }
            }

            set({ departments: data, isLoadingDepartments: false });
            mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'idle', severity: 0.1, payload: { status: 'success' } });
            set({ orbState: mindLoop.getCurrentState() });
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized per JWT." : error.message)
                : "Failed to load departments.";

            // MOCK FALLBACK on API errors too
            const isDemo = get().viewMode === 'demo';
            const mockData = isDemo ? MOCK_DATA.demo.departments : MOCK_DATA.solo.departments;
            console.warn('⚠️ API failed, using MOCK DATA:', mockData.length, 'departments');

            mindLoop.dispatch({ type: 'SYSTEM_ALERT', source: 'Core', severity: 0.8, payload: { error: msg, handled: true } });
            set({ departments: mockData as any, isLoadingDepartments: false, coreError: null, orbState: mindLoop.getCurrentState() });
        }
    },

    loadSpacesForDepartment: async (deptId: string) => {
        set({ isLoadingSpaces: true, coreError: null });
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadSpaces' } });
        set({ orbState: mindLoop.getCurrentState() });

        try {
            let data = await fetchSpaces(deptId);

            // ... Mock logic copy ...
            if (!data || data.length === 0) {
                const demoSpaces = MOCK_DATA.demo.spaces[deptId as keyof typeof MOCK_DATA.demo.spaces];
                const soloSpaces = MOCK_DATA.solo.spaces[deptId as keyof typeof MOCK_DATA.solo.spaces];
                if (demoSpaces) data = demoSpaces as any;
                else if (soloSpaces) data = soloSpaces as any;
            }

            set(state => ({
                spacesByDepartment: { ...state.spacesByDepartment, [deptId]: data },
                isLoadingSpaces: false
            }));

            // Phase 8.1: Watch/Focus based on context
            mindLoop.dispatch({ type: 'NAV_EVENT', source: 'Core', awarenessTrigger: 'watch', severity: 0.2, payload: { context: 'Sector Loaded' } });
            set({ orbState: mindLoop.getCurrentState() });

        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized per JWT." : error.message)
                : "Failed to load spaces.";

            mindLoop.dispatch({ type: 'SYSTEM_ALERT', source: 'Core', severity: 0.8, payload: { error: msg } });
            set({ isLoadingSpaces: false, coreError: msg, orbState: mindLoop.getCurrentState() });
        }
    },

    loadFoldersForSpace: async (spaceId: string) => {
        set({ isLoadingFolders: true, coreError: null });
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadFolders' } });
        set({ orbState: mindLoop.getCurrentState() });

        try {
            const data = await fetchFolders(spaceId);
            set(state => ({
                foldersBySpace: { ...state.foldersBySpace, [spaceId]: data },
                isLoadingFolders: false
            }));

            // Phase 8.1: Deep dive -> Focus
            mindLoop.dispatch({ type: 'NAV_EVENT', source: 'Core', awarenessTrigger: 'focus', severity: 0.3, payload: { context: 'Deep Dive' } });
            set({ orbState: mindLoop.getCurrentState() });

        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized per JWT." : error.message)
                : "Failed to load folders.";

            mindLoop.dispatch({ type: 'SYSTEM_ALERT', source: 'Core', severity: 0.8, payload: { error: msg } });
            set({ isLoadingFolders: false, coreError: msg, orbState: mindLoop.getCurrentState() });
        }
    },

    loadNodesForFolder: async (folderId: string, options?: { search?: string, type?: string }) => {
        set({ isLoadingNodes: true, coreError: null });
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadNodes' } });
        set({ orbState: mindLoop.getCurrentState() });

        try {
            const data = await fetchNodes(folderId, options);
            set(state => ({
                nodesByFolder: { ...state.nodesByFolder, [folderId]: data },
                isLoadingNodes: false
            }));

            // Phase 8.1: Content Loaded -> Focus
            mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', severity: 0.3, payload: { count: data.length, context: 'Folder Content' } });
            set({ orbState: mindLoop.getCurrentState() });
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized to access Saimôr Core (check JWT/tenant)." : error.message)
                : "Failed to load nodes.";

            mindLoop.dispatch({ type: 'SYSTEM_ALERT', source: 'Core', severity: 0.8, payload: { error: msg } });
            set({ isLoadingNodes: false, coreError: msg, orbState: mindLoop.getCurrentState() });
        }
    },

    loadNodesForCompany: async (companyId: string) => {
        set({ isLoadingNodes: true, coreError: null });
        try {
            const data = await fetchNodesByCompany(companyId);
            set(state => ({
                nodesByCompany: { ...state.nodesByCompany, [companyId]: data },
                isLoadingNodes: false
            }));
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized to access Saimôr Core (check JWT/tenant)." : error.message)
                : "Failed to load nodes for company.";
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

    // Department CRUD
    addDepartment: async (payload: { name: string; description?: string; color?: string }) => {
        try {
            const newDept = await apiCreateDepartment(payload);
            set(state => ({
                departments: [...state.departments, newDept]
            }));
            toast.success(`Department "${newDept.name}" created!`);
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to create department.";
            toast.error(msg);
            set({ coreError: msg });
            throw error;
        }
    },

    updateDepartment: async (id: string, payload: { name?: string; description?: string; color?: string }) => {
        try {
            const updated = await apiUpdateDepartment(id, payload);
            set(state => ({
                departments: state.departments.map(d => d.id === id ? updated : d)
            }));
            toast.success(`Department updated!`);
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to update department.";
            toast.error(msg);
            throw error;
        }
    },

    deleteDepartment: async (id: string) => {
        try {
            await apiDeleteDepartment(id);
            set(state => ({
                departments: state.departments.filter(d => d.id !== id),
                activeDepartmentId: state.activeDepartmentId === id ? null : state.activeDepartmentId
            }));
            toast.success(`Department deleted.`);
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to delete department.";
            toast.error(msg);
            throw error;
        }
    },

    // Space CRUD
    updateSpace: async (id: string, payload: { name?: string; description?: string; color?: string }) => {
        try {
            const updated = await apiUpdateSpace(id, payload);
            const deptId = updated.department_id;
            if (deptId) {
                set(state => ({
                    spacesByDepartment: {
                        ...state.spacesByDepartment,
                        [deptId]: (state.spacesByDepartment[deptId] || []).map(s => s.id === id ? updated : s)
                    }
                }));
            }
            toast.success(`Space updated!`);
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to update space.";
            toast.error(msg);
            throw error;
        }
    },

    deleteSpace: async (id: string) => {
        try {
            const state = get();
            let deptId: string | null = null;
            for (const [dId, spaces] of Object.entries(state.spacesByDepartment)) {
                if (spaces.find(s => s.id === id)) {
                    deptId = dId;
                    break;
                }
            }
            await apiDeleteSpace(id);
            if (deptId) {
                set(state => ({
                    spacesByDepartment: {
                        ...state.spacesByDepartment,
                        [deptId!]: (state.spacesByDepartment[deptId!] || []).filter(s => s.id !== id)
                    },
                    activeSpaceId: state.activeSpaceId === id ? null : state.activeSpaceId
                }));
            }
            toast.success(`Space deleted.`);
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to delete space.";
            toast.error(msg);
            throw error;
        }
    },

    // Folder CRUD
    updateFolder: async (id: string, payload: { name?: string; description?: string; color?: string }) => {
        try {
            const updated = await apiUpdateFolder(id, payload);
            const spaceId = updated.space_id;
            if (spaceId) {
                set(state => ({
                    foldersBySpace: {
                        ...state.foldersBySpace,
                        [spaceId]: (state.foldersBySpace[spaceId] || []).map(f => f.id === id ? updated : f)
                    }
                }));
            }
            toast.success(`Folder updated!`);
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to update folder.";
            toast.error(msg);
            throw error;
        }
    },

    deleteFolder: async (id: string) => {
        try {
            const state = get();
            let spaceId: string | null = null;
            for (const [sId, folders] of Object.entries(state.foldersBySpace)) {
                if (folders.find(f => f.id === id)) {
                    spaceId = sId;
                    break;
                }
            }
            await apiDeleteFolder(id);
            if (spaceId) {
                set(state => ({
                    foldersBySpace: {
                        ...state.foldersBySpace,
                        [spaceId!]: (state.foldersBySpace[spaceId!] || []).filter(f => f.id !== id)
                    },
                    activeFolderId: state.activeFolderId === id ? null : state.activeFolderId
                }));
            }
            toast.success(`Folder deleted.`);
            get().loadTree();
        } catch (error: any) {
            const msg = error instanceof CoreError ? error.message : "Failed to delete folder.";
            toast.error(msg);
            throw error;
        }
    },

    // Navigation Helpers
    navigateToCore: () => {
        set({
            viewLevel: 'core',
            activeDepartmentId: null,
            activeSpaceId: null,
            activeFolderId: null,
            orbState: 'idle' // Reset to idle on home
        });
    },

    navigateToDepartment: (deptId) => {
        set({
            viewLevel: 'department',
            activeDepartmentId: deptId,
            activeSpaceId: null,
            activeFolderId: null,
            orbState: 'watch' // Entering a sector -> Watch mode
        });
        // Auto-load spaces for this department
        get().loadSpacesForDepartment(deptId);
    },

    navigateToSpace: (spaceId) => {
        set({
            viewLevel: 'space',
            activeSpaceId: spaceId,
            activeFolderId: null,
            orbState: 'focus' // Deep dive -> Focus mode
        });
        // Auto-load folders for this space
        get().loadFoldersForSpace(spaceId);
    },

    navigateToFolder: (folderId) => {
        set({
            viewLevel: 'folder',
            activeFolderId: folderId,
            orbState: 'thinking' // Analyzing folder content
        });
        // Auto-load nodes for this folder
        get().loadNodesForFolder(folderId);
    },

    // Window Management
    minimizeNode: (node) => set((state) => {
        // Avoid duplicates
        if (state.minimizedNodes.find(n => n.id === node.id)) return {};
        // Only run if minimizedNodes is defined (safety)
        const current = state.minimizedNodes || [];
        return {
            activeNode: null,
            minimizedNodes: [...current, node]
        };
    }),
    restoreNode: (nodeId) => set((state) => {
        const current = state.minimizedNodes || [];
        const node = current.find(n => n.id === nodeId);
        if (!node) return {};
        return {
            activeNode: node, // Restore as active
            minimizedNodes: current.filter(n => n.id !== nodeId)
        };
    }),
    closeNode: (nodeId) => set((state) => ({
        minimizedNodes: (state.minimizedNodes || []).filter(n => n.id !== nodeId)
    })),
}));
