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
    settings?: Record<string, any>;
    tenant_id?: string;
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
    cursorAgent: {
        active: boolean;
        action: 'idle' | 'highlight' | 'point' | 'roam';
        target?: { x: number, y: number };
    };
    hasBooted: boolean;

    // P1-B: Speculative Orb Awareness (Zero Latency)
    speculativeState?: OrbState;
    speculativeUntil?: number;

    // Actions
    setViewLevel: (level: ViewLevel) => void;
    setViewMode: (mode: ViewMode) => void; // NEW: Switch between Owner/Demo/Workspace
    setActiveCompany: (id: string | null) => void;
    setActiveDepartment: (id: string | null) => void;
    setActiveSpace: (id: string | null) => void;
    setActiveFolder: (id: string | null) => void;
    setActiveNode: (node: CoreNode | null) => void;
    setOrbState: (state: OrbState) => void;
    setSpeculativeState: (state: OrbState, ttlMs?: number) => void; // P1-B: Instant reaction
    clearSpeculativeState: () => void;
    addOrbNotification: (notification: { id: string, type: 'task' | 'email' | 'insight' | 'alert', message: string }) => void;
    clearOrbNotifications: () => void;
    setCursorAgent: (agent: Partial<{ active: boolean; action: string; target?: { x: number, y: number } }>) => void;
    setHasBooted: (hasBooted: boolean) => void;
    minimizeNode: (node: CoreNode) => void;
    restoreNode: (nodeId: string) => void;
    closeNode: (nodeId: string) => void;
    setUser: (user: User | null) => void; // Phase 6.3: Set user with role
    updateUserSettings: (settings: Record<string, any>) => void;
    resetStore: () => void; // System: Clear all state on logout

    // Data Actions - Load
    loadCompanies: () => Promise<void>;
    loadDepartments: (companyId?: string) => Promise<void>;
    loadSpacesForDepartment: (departmentId: string) => Promise<void>;
    loadFoldersForSpace: (spaceId: string) => Promise<void>;
    loadNodesForFolder: (folderId: string, options?: { search?: string, type?: string }) => Promise<void>;
    loadNodesForCompany: (companyId: string) => Promise<void>;
    loadNodeDetails: (nodeId: string) => Promise<void>;
    loadTree: (tenantId?: string, companyId?: string) => Promise<void>;

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
    createDepartment: (payload: CreateDepartmentPayload) => Promise<void>;
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
    speculativeState: undefined,
    speculativeUntil: undefined,
    orbNotifications: [],
    minimizedNodes: [],
    cursorAgent: {
        active: false,
        action: 'idle',
        target: undefined
    },
    hasBooted: false,

    // User & Permissions (Phase 6.3) - Default to demo role
    user: null,
    permissions: ROLE_PERMISSIONS.demo,

    // Basic Setters
    setViewLevel: (level) => set({ viewLevel: level }),
    setViewMode: (mode) => {
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
    setOrbState: (state) => {
        const now = Date.now();
        const current = get();

        // P1-B: PollGuard - Don't overwrite speculative state if active
        if (current.speculativeState && current.speculativeUntil && current.speculativeUntil > now) {
            // Polling tried to set state, but we are in a speculative window.
            // Ignore polling update, keep speculative state visible.
            return;
        }

        set({ orbState: state });
    },
    setSpeculativeState: (state, ttlMs = 1200) => {
        // P1-B: Instant Speculative Update
        // Forces the Orb to this state immediately, blocking polling updates for ttlMs
        const now = Date.now();

        // Debounce: If already in this state and valid, extend TTL but don't re-render
        if (get().orbState === state && get().speculativeState === state) {
            set({ speculativeUntil: now + ttlMs });
            return;
        }

        set({
            orbState: state, // Immediate visual update
            speculativeState: state,
            speculativeUntil: now + ttlMs
        });
    },
    clearSpeculativeState: () => {
        set({
            speculativeState: undefined,
            speculativeUntil: undefined
            // We don't reset orbState immediately to avoid flicker; 
            // let the next poll (or manual setIdle) handle it naturally.
        });
    },
    addOrbNotification: (notification) => set((state) => ({
        orbNotifications: [...state.orbNotifications, notification]
    })),
    clearOrbNotifications: () => set({ orbNotifications: [] }),
    setCursorAgent: (agent) => set((state) => ({
        cursorAgent: { ...state.cursorAgent, ...agent } as MoraState['cursorAgent']
    })),
    setHasBooted: (hasBooted) => set({ hasBooted }),

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

            // Auto-set viewMode for consistent navigation (Phase 6.3 Cleanup)
            // FIX: Only System Owners (m.f4hrlaender) see the "Client Health" (owner view)
            // Tenant Owners (users who signed up) see their "workspace" view.
            const systemOwners = [
                'm.f4hrlaender@gmail.com',
                'master_real@saimor.io',
                'nexus@saimor.dev',
                'nextchaptergermany@gmail.com' // Explicitly add the user's current account
            ];

            if ((user.role === 'owner' || user.role === 'admin') && user.email && systemOwners.includes(user.email)) {
                get().setViewMode('owner');
            } else if (user.role === 'demo') {
                get().setViewMode('demo');
            } else {
                get().setViewMode('workspace');
            }
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

    updateUserSettings: (settings) => {
        set((state) => {
            if (!state.user) return state;
            return {
                user: {
                    ...state.user,
                    settings: {
                        ...(state.user.settings || {}),
                        ...settings
                    }
                }
            };
        });
    },


    // Data Loading Actions
    // -------------------------------------------------------------------------
    // SYSTEM ACTIONS
    // -------------------------------------------------------------------------
    resetStore: () => {
        set({
            user: null,
            companies: [],
            departments: [],
            spacesByDepartment: {},
            foldersBySpace: {},
            nodesByFolder: {},
            nodesByCompany: {},
            activeCompanyId: null,
            activeDepartmentId: null,
            activeSpaceId: null,
            activeFolderId: null,
            activeNode: null,
            treeData: null,
            expandedTreeNodes: new Set<string>(),
            minimizedNodes: [],
            viewMode: 'workspace',
            viewLevel: 'core',
            coreError: null,
            orbState: 'idle',
            hasBooted: false
        });
    },

    loadCompanies: async () => {
        set({ isLoadingCompanies: true, coreError: null });
        // Phase 8.1: Dispatch thinking event
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadCompanies' } });
        set({ orbState: mindLoop.getCurrentState() });

        try {
            let data = await fetchCompanies(true);

            // -------------------------------------------------------------------------
            // PHASE 8.2: AGENTIC INJECTION - SAIMÔR HQ for Authorized Users
            // -------------------------------------------------------------------------
            const userEmail = get().user?.email;
            const authorizedEmails = [
                'm.f4hrlaender@gmail.com', // The user
                'master_real@saimor.io',
                'nexus@saimor.dev',
                'demo@saimor.io',          // Demo Account
                'nextchaptergermany@gmail.com' // Next Chapter Account
            ];

            if (userEmail && authorizedEmails.includes(userEmail)) {
                // Check if HQ already exists (to avoid duplicates if backend has it)
                const hasHQ = data.some((c: any) => c.slug === 'saimor-hq' || c.name === 'Saimor HQ');

                if (!hasHQ) {
                    const hqCompany: any = {
                        id: 'comp-saimor-hq',
                        tenant_id: 'tenant-saimor-hq',
                        owner_id: get().user?.id || 'sys-admin',
                        name: 'Saimor HQ',
                        slug: 'saimor-hq',
                        description: 'Central Intelligence Workspace',
                        logo_url: null,
                        is_demo: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    data.unshift(hqCompany); // Add to top
                }
            }

            // Demo mode: Real backend data only, no client-side mock injection
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

            // No mock fallback - show error state
            set({ companies: [], isLoadingCompanies: false, coreError: msg, orbState: mindLoop.getCurrentState() });
        }
    },

    loadDepartments: async (companyId?: string) => {
        set({ isLoadingDepartments: true, coreError: null });
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadDepartments' } });
        set({ orbState: mindLoop.getCurrentState() });

        // PRODUCTION MODE: Demo now uses real DB data for authenticity
        // Mock data fallback removed - all modes fetch from backend

        try {
            // Use active company if not provided
            const targetCompanyId = companyId || get().activeCompanyId || undefined;
            console.log('[MoraState] Loading Departments for:', targetCompanyId);

            let data = await fetchDepartments(targetCompanyId);
            console.log('[MoraState] Departments Fetched:', data?.length || 0, data);

            if (!data || data.length === 0) {
                console.warn('[MoraState] WARNING: No departments returned! Possible seed issue.');
            }

            set({ departments: data, isLoadingDepartments: false });
            mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'idle', severity: 0.1, payload: { status: 'success' } });
            set({ orbState: mindLoop.getCurrentState() });
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized per JWT." : error.message)
                : "Failed to load departments.";

            mindLoop.dispatch({ type: 'SYSTEM_ALERT', source: 'Core', severity: 0.8, payload: { error: msg, handled: true } });
            set({ departments: [], isLoadingDepartments: false, coreError: msg, orbState: mindLoop.getCurrentState() });
        }
    },

    loadSpacesForDepartment: async (deptId: string) => {
        set({ isLoadingSpaces: true, coreError: null });
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadSpaces' } });
        set({ orbState: mindLoop.getCurrentState() });

        // PRODUCTION MODE: Demo now uses real DB spaces for authenticity

        try {
            let data = await fetchSpaces(deptId);

            set(state => ({
                spacesByDepartment: { ...state.spacesByDepartment, [deptId]: data || [] },
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

        // PRODUCTION MODE: Demo now uses real DB nodes for authenticity

        try {
            let data = await fetchNodesByCompany(companyId);

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

    loadTree: async (tenantId?: string, companyId?: string) => {
        set({ isLoadingTree: true, coreError: null });
        try {
            const resolvedTenant = tenantId || useAccountStore.getState().currentAccount?.tenantId;
            const targetCompany = companyId || get().activeCompanyId || undefined;

            const tree = await fetchTree(resolvedTenant || undefined, targetCompany);
            if ((tree?.length || 0) === 0) {
                // Retry once to avoid empty renders during demo refresh
                const retryTree = await fetchTree(resolvedTenant || undefined, targetCompany);
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
    createDepartment: async (payload: { name: string; description?: string; color?: string }) => {
        try {
            const newDept = await apiCreateDepartment({
                ...payload,
                company_id: get().activeCompanyId || undefined // AUTO-INJECT COMPANY ID
            });
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
