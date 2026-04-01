import { create } from 'zustand';
import type { CoreCompany, CoreDepartment, CoreSpace, CoreFolder, CoreNode, CoreTreeNode } from "@/lib/types/core";
import { ROLE_SYSTEM_OWNER, TENANT_DEMO, TENANT_HQ, isDemoTenant as checkDemoTenant } from '@/lib/constants/tenants';
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
import { usePaneStore } from "@/lib/store/paneStore";
import { toast } from "@/lib/toast";

import { mindLoop } from "@/lib/intelligence/mindLoop"; // Phase 8.1 Integration
import type { OrbState } from "@/lib/api/awarenessClient";

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

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const getStandardModeKey = (companyId?: string | null) =>
    companyId ? `saimor_standard_mode_${companyId}` : 'saimor_standard_mode_default';

const readStandardMode = (companyId?: string | null) => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(getStandardModeKey(companyId));
    if (stored === null) return false;
    return stored === '1' || stored === 'true';
};

export type ViewLevel = 'company' | 'core' | 'department' | 'space' | 'folder';
export type ViewMode = 'owner' | 'demo' | 'workspace';

/**
 * CoreMode — which surface is active when viewLevel === 'core'.
 *
 * 'home'    — Day-start working surface: recent docs, activity, quick access.
 *             Default after login and after Dock "Start" / Mod+H.
 * 'explore' — Universe planet map: spatial overview of all departments.
 *             Reached via "Explore" button in Home or breadcrumb root click from dept/space.
 *
 * NOT the same as viewMode (which answers "who is this user?").
 * NOT a new route — this is a surface mode inside viewLevel='core'.
 */
export type CoreMode = 'home' | 'explore';

export interface UiScopeHints {
    view_level?: string;
    layer?: string;
    route_path?: string;
    pane_id?: string;
    [key: string]: string | undefined;
}

export interface ScopeContract {
    contract_version?: string;
    boundary_level?: string;
    enforced?: boolean;
    dropped_fields?: string[];
    ui_scope_hints?: UiScopeHints;
    scope_reason?: string;  // P1 backend dep — reason scope was narrowed
}

export interface ResolvedScope {
    company_id?: string;
    department_id?: string;
    space_id?: string;
    folder_id?: string;
    scope_source?: string;
    [key: string]: string | undefined;
}

export interface LastChatScopeState {
    resolved_scope: ResolvedScope;
    scope_policy: string;
    scope_enforced: boolean;
    scope_contract?: ScopeContract;
    ui_scope_hints?: UiScopeHints;
    updatedAt?: string;  // ISO timestamp — set by setLastChatScope, not by backend
}

/** Module-level guard: tracks the last company ID for which departments were fully loaded.
 *  Prevents redundant sequential calls when multiple components mount simultaneously. */
let _deptCacheCompanyId: string | null = null;

export interface NameConflictState {
    type: 'department' | 'space' | 'folder';
    message: string;
    suggestions: string[];
    originalPayload: any;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROLE-BASED ACCESS CONTROL - Phase 6.3
// ═══════════════════════════════════════════════════════════════════════════
export type UserRole = 'owner' | 'admin' | 'system_owner' | 'manager' | 'member' | 'demo';
export type OperationalState = 'operational' | 'setup_required';

export interface User {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    role: UserRole;
    settings?: Record<string, any>;
    tenant_id?: string;
    // Session operational contract (Core e2fa9d1+)
    operational_state?: OperationalState;
    setup_required?: boolean;
    active_company_id?: string;
    active_company_name?: string;
    company_count?: number;
    scope_source?: string;
}

export type OperationalSessionPatch = Partial<Pick<
    User,
    'operational_state' | 'setup_required' | 'active_company_id' | 'active_company_name' | 'company_count' | 'scope_source'
>>;

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
    system_owner: { canCreate: true, canDelete: true, canAdmin: true, canEditSettings: true, canViewAnalytics: true },
    manager: { canCreate: true, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: true },
    member: { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false },
    demo: { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false }
};

// Helper to get permissions for a role
export const getPermissions = (role: UserRole): Permissions => ROLE_PERMISSIONS[role];

interface MoraState {
    // Spatial Position
    viewLevel: ViewLevel;
    /**
     * Which surface is active when viewLevel === 'core'.
     * Default: 'home'. Set to 'explore' to show the Universe planet map.
     * Resets to 'home' on company switch and on Dock "Start" / Mod+H.
     */
    coreMode: CoreMode;
    viewMode: ViewMode; // NEW: Owner View (Kunden) vs Demo View (Café) vs Workspace View (eigene Firma)
    activeCompanyId: string | null;
    activeDepartmentId: string | null;
    activeSpaceId: string | null;
    activeFolderId: string | null;
    // Naming Conflict (409) State
    nameConflict: NameConflictState | null;

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
    loadedNodes: Set<string>; // Phase 2: Lazy Loading Tracking

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
    hasBooted: boolean;
    isLoggingOut: boolean;

    // P1-B: Speculative Orb Awareness (Zero Latency)
    speculativeState?: OrbState;
    speculativeUntil?: number;

    // v3/chat: Last resolved scope from backend (scope enforcement signal)
    lastChatScope: LastChatScopeState | null;

    // Answer provenance — populated by useMoraStream from SSE preamble (MR18/MR19)
    lastAnswerSource: 'memory' | 'context' | 'inference' | null;
    lastAnswerSourceMode: string | null;   // e.g. 'retrieval' | 'synthesis' | 'hybrid'
    lastAnswerScopeLabel: string | null;

    // Visual State
    isStandardMode: boolean;
    setIsStandardMode: (active: boolean) => void;

    // Actions
    resolveNameConflict: (newName: string) => Promise<void>;
    cancelNameConflict: () => void;
    setCoreMode: (mode: CoreMode) => void;
    setViewLevel: (level: ViewLevel) => void;
    setViewMode: (mode: ViewMode) => void; // NEW: Switch between Owner/Demo/Workspace
    setActiveCompany: (id: string | null) => void;
    setActiveDepartment: (id: string | null) => void;
    setActiveSpace: (id: string | null) => void;
    setActiveFolder: (id: string | null) => void;
    setOrbState: (state: OrbState) => void;
    setSpeculativeState: (state: OrbState, ttlMs?: number) => void; // P1-B: Instant reaction
    clearSpeculativeState: () => void;
    setLastChatScope: (scope: LastChatScopeState | null) => void;
    setAnswerProvenance: (
        source: 'memory' | 'context' | 'inference' | null,
        mode: string | null,
        label: string | null,
    ) => void;
    addOrbNotification: (notification: { id: string, type: 'task' | 'email' | 'insight' | 'alert', message: string }) => void;
    clearOrbNotifications: () => void;
    setHasBooted: (hasBooted: boolean) => void;
    setIsLoggingOut: (isLoggingOut: boolean) => void;
    setUser: (user: User | null) => void; // Phase 6.3: Set user with role
    patchOperationalSession: (patch: OperationalSessionPatch) => void;
    updateUserSettings: (settings: Record<string, any>) => void;
    resetStore: () => void; // System: Clear all state on logout

    // Data Actions - Load
    loadCompanies: (options?: { prefetchTree?: boolean }) => Promise<void>;
    loadDepartments: (companyId?: string) => Promise<void>;
    loadSpacesForDepartment: (departmentId: string) => Promise<void>;
    loadFoldersForSpace: (spaceId: string) => Promise<void>;
    loadNodesForFolder: (folderId: string, options?: { search?: string; type?: string; limit?: number; offset?: number }) => Promise<void>;
    loadNodesForCompany: (companyId: string) => Promise<void>;
    loadTree: (tenantId?: string, companyId?: string) => Promise<void>;

    // Tree Actions
    toggleTreeNode: (id: string) => void;
    loadChildren: (nodeId: string, type: 'department' | 'space' | 'folder') => Promise<void>;

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
    navigateToExplore: () => void;
    navigateToDepartment: (deptId: string) => void;
    navigateToSpace: (spaceId: string) => void;
    navigateToFolder: (folderId: string | null) => void;

    // Phase 8: Intelligence
    initializeMindLoop: () => void;
}

export const useMoraStore = create<MoraState>((set, get) => ({
    // Initial State
    viewLevel: 'core',
    coreMode: 'home',
    viewMode: 'workspace',
    activeCompanyId: null,
    activeDepartmentId: null,
    activeSpaceId: null,
    activeFolderId: null,
    nameConflict: null,

    companies: [],
    departments: [],
    spacesByDepartment: {},
    foldersBySpace: {},
    nodesByFolder: {},
    nodesByCompany: {},

    treeData: null,
    expandedTreeNodes: new Set<string>(),
    loadedNodes: new Set<string>(),

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
    hasBooted: false,
    isLoggingOut: false,
    lastChatScope: null,
    lastAnswerSource: null,
    lastAnswerSourceMode: null,
    lastAnswerScopeLabel: null,

    // User & Permissions (Phase 6.3) - Default to demo role
    user: null,
    permissions: ROLE_PERMISSIONS.demo,
    isStandardMode: false,

    // Basic Setters
    setIsStandardMode: (active) => {
        const companyId = get().activeCompanyId;
        if (typeof window !== 'undefined') {
            localStorage.setItem(getStandardModeKey(companyId), active ? '1' : '0');
        }
        set({ isStandardMode: active });
    },
    setCoreMode: (mode) => set({ coreMode: mode }),
    setViewLevel: (level) => set({ viewLevel: level }),
    setViewMode: (mode) => {
        set({ viewMode: mode });
        if (typeof window !== 'undefined') {
            localStorage.setItem('saimor_view_mode', mode);
        }

        // Auto-adjust viewLevel based on mode
        if (mode === 'owner') {
            // Owner view: Show companies as planets
            set({ viewLevel: 'company' });
        } else if (mode === 'demo' || mode === 'workspace') {
            // Demo/Workspace: Show departments
            set({ viewLevel: 'core' });
        }

        // Align active company to the selected mode (prevents HQ/Demo mismatch)
        const { user, activeCompanyId } = get();
        const companies = asArray<CoreCompany>(get().companies);
        if (!companies.length) return;

        const tenantId = user?.tenant_id;
        const isDemoTenant = checkDemoTenant(tenantId);
        const demoCompanyId = companies.find((c) => c.is_demo)?.id || null;
        const hqCompanyId = companies.find((c) => c.tenant_id === TENANT_HQ)?.id || null;

        let nextActive = activeCompanyId;
        const currentCompany = companies.find(c => c.id === nextActive);

        if (isDemoTenant) {
            const companyExists = nextActive ? companies.some((c) => c.id === nextActive) : false;
            const sessionCompanyId = user?.active_company_id;
            const sessionCompanyExists = sessionCompanyId ? companies.some((c) => c.id === sessionCompanyId) : false;
            if (!companyExists) {
                nextActive = sessionCompanyExists
                    ? sessionCompanyId || null
                    : (hqCompanyId || demoCompanyId || companies[0]?.id || null);
            }
        } else if (mode === 'demo') {
            // Demo mode REQUIRES a demo company.
            if (!currentCompany?.is_demo) {
                nextActive = demoCompanyId || nextActive;
            }
        } else if (mode === 'workspace') {
            if (user?.role === ROLE_SYSTEM_OWNER) {
                // System Owner Workspace: HQ or non-demo client. 
                // We do NOT want demo companies in the "Workspace/Client" tab.
                if (currentCompany?.is_demo || !nextActive) {
                    nextActive = hqCompanyId || companies.find(c => !c.is_demo)?.id || nextActive;
                }
            } else if (tenantId) {
                // Regular users are locked to their tenant's company
                if (currentCompany?.tenant_id !== tenantId) {
                    nextActive = companies.find((c) => c.tenant_id === tenantId)?.id || hqCompanyId || nextActive;
                }
            }
        } else if (mode === 'owner') {
            // In Dashboard Mode, we usually want to ensure HQ or a valid client is selected for any metadata lookups
            if (currentCompany?.is_demo || !nextActive) {
                nextActive = hqCompanyId || companies.find(c => !c.is_demo)?.id || companies[0]?.id || null;
            }
        }

        if (nextActive && companies.some((c) => c.id === nextActive) && nextActive !== activeCompanyId) {
            set({ activeCompanyId: nextActive, isStandardMode: readStandardMode(nextActive) });
        }
    },
    setActiveCompany: (id) => {
        const state = get();
        const nextStandard = readStandardMode(id);
        const nextCompany = state.companies.find((company) => company.id === id) || null;
        const nextTenantId = nextCompany?.tenant_id || state.user?.tenant_id;

        if (typeof window !== 'undefined') {
            if (id) {
                localStorage.setItem('last_company_id', id);
            } else {
                localStorage.removeItem('last_company_id');
            }
            if (nextCompany?.name) {
                localStorage.setItem('last_workspace', nextCompany.name);
            }
        }

        set({
            activeCompanyId: id,
            activeDepartmentId: null,
            activeSpaceId: null,
            activeFolderId: null,
            viewLevel: 'core',  // reset nav depth — prevents stale dept/space scope in chat
            coreMode: 'home', // reset to Home on company switch — fresh start for new workspace
            isStandardMode: nextStandard,
            user: state.user
                ? {
                    ...state.user,
                    active_company_id: id || undefined,
                    active_company_name: nextCompany?.name || state.user.active_company_name,
                }
                : null,
        });

        if (id) {
            get().loadDepartments(id).catch(console.error);
            get().loadTree(nextTenantId || undefined, id).catch(console.error);
        }
    },
    setActiveDepartment: (id) => set({ activeDepartmentId: id }),
    setActiveSpace: (id) => set({ activeSpaceId: id }),
    setActiveFolder: (id) => set({ activeFolderId: id }),
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
        set({
            speculativeState: state,
            speculativeUntil: now + ttlMs,
            orbState: state
        });
    },

    initializeMindLoop: () => {
        // Prevent double subscription
        const current = get();
        if ((current as any)._hasGenericMindLoopSub) return;
        (current as any)._hasGenericMindLoopSub = true;

        console.log('[MoraState] Linking to Mind Loop Consciousness...');

        mindLoop.subscribe((level) => {
            // Map MindLoop levels to OrbState
            const mappedState = level as OrbState;
            get().setOrbState(mappedState);
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
    setLastChatScope: (scope) => set({
        lastChatScope: scope ? { ...scope, updatedAt: new Date().toISOString() } : null
    }),
    setAnswerProvenance: (source, mode, label) => set({
        lastAnswerSource: source,
        lastAnswerSourceMode: mode,
        lastAnswerScopeLabel: label,
    }),
    addOrbNotification: (notification) => set((state) => ({
        orbNotifications: [...state.orbNotifications, notification]
    })),
    clearOrbNotifications: () => set({ orbNotifications: [] }),
    setHasBooted: (hasBooted) => set({ hasBooted }),
    setIsLoggingOut: (isLoggingOut) => set({ isLoggingOut }),

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

            // Auto-set viewMode from backend truth (no hardcoded email allow-lists)
            // IMPORTANT: Only SYSTEM_OWNER sees Client Health Dashboard (owner view)
            // Regular 'owner' users see their own company (workspace view)
            const isDemoTenant = checkDemoTenant(user.tenant_id);
            let savedViewMode: ViewMode | null = null;
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('saimor_view_mode');
                if (stored === 'owner' || stored === 'workspace' || stored === 'demo') {
                    savedViewMode = stored;
                }
            }

            const canUseSaved = savedViewMode && (user.role === ROLE_SYSTEM_OWNER || savedViewMode !== 'owner');
            if (canUseSaved) {
                set({ viewMode: savedViewMode as ViewMode });
            } else if (user.role === ROLE_SYSTEM_OWNER) {
                get().setViewMode('owner');
            } else if (isDemoTenant) {
                get().setViewMode('workspace');
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
    patchOperationalSession: (patch) => {
        set((state) => {
            if (!state.user) return state;
            return {
                user: {
                    ...state.user,
                    ...patch,
                },
            };
        });
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

    resolveNameConflict: async (newName: string) => {
        const state = get();
        const conflict = state.nameConflict;
        if (!conflict) return;

        set({ nameConflict: null });

        try {
            switch (conflict.type) {
                case 'department':
                    await state.createDepartment({ ...conflict.originalPayload, name: newName });
                    break;
                case 'space':
                    await state.addSpace({ ...conflict.originalPayload, name: newName });
                    break;
                case 'folder':
                    await state.addFolder({ ...conflict.originalPayload, name: newName });
                    break;
            }
        } catch (e) {
            console.error("Failed to resolve name conflict:", e);
        }
    },

    cancelNameConflict: () => set({ nameConflict: null }),

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
            treeData: null,
            expandedTreeNodes: new Set<string>(),
            loadedNodes: new Set<string>(),
            viewMode: 'workspace',
            viewLevel: 'core',
            coreMode: 'home',
            nameConflict: null,
            coreError: null,
            orbState: 'idle',
            hasBooted: false,
            isLoggingOut: false,
            lastChatScope: null,
            lastAnswerSource: null,
            lastAnswerSourceMode: null,
            lastAnswerScopeLabel: null,
        });
    },

    loadCompanies: async (options) => {
        set({ isLoadingCompanies: true, coreError: null });
        // Phase 8.1: Dispatch thinking event
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadCompanies' } });
        set({ orbState: mindLoop.getCurrentState() });

        try {
            const viewMode = get().viewMode;
            const user = get().user;
            const userRole = user?.role;
            const isDemoTenantContext = checkDemoTenant(user?.tenant_id);
            const includeDemo =
                userRole === ROLE_SYSTEM_OWNER
                || isDemoTenantContext
                || viewMode === 'demo';
            let data = asArray<any>(await fetchCompanies(includeDemo));

            // Use DB name if available, only fallback to defaults if empty/null
            data = asArray<any>(data).map((company: any) => {
                let name = company?.name?.trim();

                // Only use fallback names if DB name is empty/null
                if (!name) {
                    if (company?.tenant_id === TENANT_HQ) {
                        name = 'Saimor HQ';
                    } else if (company?.is_demo || company?.tenant_id === TENANT_DEMO || checkDemoTenant(company?.tenant_id)) {
                        name = 'Simple Coffee Group';
                    } else {
                        name = 'Workspace';
                    }
                }

                return { ...company, name };
            });

            // Keep active company if it still exists; otherwise pick a sensible default.
            const currentActive = get().activeCompanyId;
            const userTenant = get().user?.tenant_id;
            const isDemoTenant = checkDemoTenant(userTenant);
            const demoCompanyId = data.find((c: any) => c.is_demo)?.id || null;
            const hqCompanyId = data.find((c: any) => c.tenant_id === TENANT_HQ)?.id || null;

            let nextActive: string | null = null;
            const hqCompany = data.find((c: any) => c.tenant_id === TENANT_HQ);
            const demoCompany = data.find((c: any) => c.is_demo);
            const userCompany = data.find((c: any) => c.tenant_id === userTenant);

            const sessionCompanyId = user?.active_company_id;
            const stillValid = currentActive && data.some((c: any) => c.id === currentActive);
            const sessionCompanyValid = sessionCompanyId && data.some((c: any) => c.id === sessionCompanyId);

            if (isDemoTenant) {
                if (stillValid) {
                    nextActive = currentActive;
                } else if (sessionCompanyValid) {
                    nextActive = sessionCompanyId;
                } else {
                    nextActive = hqCompany?.id || demoCompany?.id || data[0]?.id || null;
                }
            } else if (userRole === ROLE_SYSTEM_OWNER) {
                // SYSTEM OWNER: Respect current selection (sub-account stepping), fallback to HQ
                nextActive = currentActive ? (data.some((c: any) => c.id === currentActive) ? currentActive : (hqCompany?.id ?? null)) : (hqCompany?.id ?? null);
            } else {
                // Regular users: Try to keep current, fallback to their tenant company
                nextActive = stillValid ? currentActive : (userCompany?.id || data.find((c: any) => !c.is_demo)?.id || data[0]?.id || null);
            }

            const normalizedData = asArray<any>(data);

            set({
                companies: normalizedData,
                activeCompanyId: nextActive,
                isStandardMode: readStandardMode(nextActive),
                isLoadingCompanies: false
            });

            // Optional prefetch: useful for some entry paths, but bootstrap can disable it
            // to avoid duplicate tree requests during initial session restore.
            if (nextActive && options?.prefetchTree !== false) {
                get().loadTree(userTenant || undefined, nextActive).catch(console.error);
            }

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
        // DEBOUNCE: Prevent multiple simultaneous calls
        const state = get();
        if (state.isLoadingDepartments) {
            return; // Already loading, skip
        }

        // DEDUP GUARD: Skip if we already have fresh data for the same company
        const targetCompanyId = companyId || state.activeCompanyId || undefined;
        if (
            targetCompanyId &&
            _deptCacheCompanyId === targetCompanyId &&
            state.departments.length > 0
        ) {
            return; // Already loaded for this company, no refetch needed
        }

        // Keep existing departments visible during reload (no flash-to-empty)
        set({ isLoadingDepartments: true, coreError: null });
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadDepartments' } });
        set({ orbState: mindLoop.getCurrentState() });

        try {
            // Parallelize fetching to eliminate sequential lag.
            // Cap company-wide node fetch at 200 to stay within backend pagination limits.
            const [deptData, nodeData] = await Promise.all([
                fetchDepartments(targetCompanyId),
                targetCompanyId
                    ? fetchNodesByCompany(targetCompanyId, { limit: 200 })
                    : Promise.resolve([])
            ]);
            const safeDeptData = asArray<CoreDepartment>(deptData);
            const safeNodeData = asArray<CoreNode>(nodeData);

            _deptCacheCompanyId = targetCompanyId ?? null;
            set({
                departments: safeDeptData,
                nodesByCompany: targetCompanyId
                    ? { ...get().nodesByCompany, [targetCompanyId]: safeNodeData }
                    : get().nodesByCompany,
                isLoadingDepartments: false
            });
            mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'idle', severity: 0.1, payload: { status: 'success' } });
            set({ orbState: mindLoop.getCurrentState() });
        } catch (error: any) {
            const msg = error instanceof CoreError
                ? (error.status === 401 || error.status === 403 ? "Not authorized per JWT." : error.message)
                : "Failed to load departments.";

            mindLoop.dispatch({ type: 'SYSTEM_ALERT', source: 'Core', severity: 0.8, payload: { error: msg, handled: true } });
            set({ isLoadingDepartments: false, coreError: msg, orbState: mindLoop.getCurrentState() });
        }
    },

    loadSpacesForDepartment: async (deptId: string) => {
        const state = get();
        // Concurrent-call guard: prevents redundant in-flight fetches
        if (state.isLoadingSpaces) return;
        // Cache guard: skip if we already have data for this department
        if (state.spacesByDepartment[deptId]?.length > 0) return;

        set({ isLoadingSpaces: true, coreError: null });
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadSpaces' } });
        set({ orbState: mindLoop.getCurrentState() });

        // PRODUCTION MODE: Demo now uses real DB spaces for authenticity

        try {
            let data = asArray<CoreSpace>(await fetchSpaces(deptId));

            set(state => ({
                spacesByDepartment: { ...state.spacesByDepartment, [deptId]: asArray<CoreSpace>(data) },
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
        const state = get();
        // Concurrent-call guard: prevents redundant in-flight fetches
        if (state.isLoadingFolders) return;
        // Cache guard: skip if we already have data for this space
        if (state.foldersBySpace[spaceId]?.length > 0) return;

        set({ isLoadingFolders: true, coreError: null });
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadFolders' } });
        set({ orbState: mindLoop.getCurrentState() });

        try {
            const data = asArray<CoreFolder>(await fetchFolders(spaceId));
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

    loadNodesForFolder: async (folderId: string, options?: { search?: string; type?: string; limit?: number; offset?: number }) => {
        const state = get();
        // Concurrent-call guard: prevents duplicate simultaneous in-flight fetches.
        // Only applies to unfiltered calls — search/type requests must always fire.
        // NOTE: no cache guard here — callers like the post-upload refresh path need
        // fresh data even when the folder already has visible items.
        if (state.isLoadingNodes && !options?.search && !options?.type) return;

        set({ isLoadingNodes: true, coreError: null });
        mindLoop.dispatch({ type: 'DATA_CHANGE', source: 'Core', awarenessTrigger: 'thinking', severity: 0.1, payload: { action: 'loadNodes' } });
        set({ orbState: mindLoop.getCurrentState() });

        try {
            const data = asArray<CoreNode>(await fetchNodes(folderId, options));
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
        // Don't wipe existing data — update in-place to avoid flicker
        set({ isLoadingNodes: true, coreError: null });

        try {
            // Cap at 200 nodes initially; deep-view can page further as needed
            const data = asArray<CoreNode>(await fetchNodesByCompany(companyId, { limit: 200 }));

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

    loadTree: async (tenantId?: string, companyId?: string) => {
        // Preserve existing treeData during reload — setting null causes flash-to-empty.
        set({ isLoadingTree: true, coreError: null });
        try {
            const resolvedTenant = tenantId || useAccountStore.getState().currentAccount?.tenantId;
            const targetCompany = companyId || get().activeCompanyId || undefined;

            const tree = asArray<CoreTreeNode>(await fetchTree(resolvedTenant || undefined, targetCompany));
            if (tree.length === 0) {
                // Retry once
                const retryTree = asArray<CoreTreeNode>(await fetchTree(resolvedTenant || undefined, targetCompany));
                if (retryTree.length === 0) {
                    set({
                        treeData: [],
                        isLoadingTree: false,
                        coreError: "Tree is empty. Try resetting the demo."
                    });
                    return;
                }
                set({ treeData: retryTree, isLoadingTree: false });
                return;
            }

            // HYDRATION: Sync flat store from tree structure to guarantee consistency
            const newDepartments: any[] = [];
            const newSpacesByDept: Record<string, any[]> = {};
            const newFoldersBySpace: Record<string, any[]> = {};
            const newNodesByFolder: Record<string, any[]> = {};
            const newNodesByCompany: any[] = [];

            const processNode = (node: any, parentId?: string, parentType?: string) => {
                if (node.type === 'department') {
                    newDepartments.push({ id: node.id, name: node.name, color: node.color, slug: node.slug });
                    if (node.children) node.children.forEach((c: any) => processNode(c, node.id, 'department'));
                } else if (node.type === 'space') {
                    if (parentId) {
                        newSpacesByDept[parentId] = [...(newSpacesByDept[parentId] || []), { id: node.id, name: node.name, department_id: parentId }];
                    }
                    if (node.children) node.children.forEach((c: any) => processNode(c, node.id, 'space'));
                } else if (node.type === 'folder') {
                    if (parentId) {
                        newFoldersBySpace[parentId] = [...(newFoldersBySpace[parentId] || []), { id: node.id, name: node.name, space_id: parentId }];
                    }
                    if (node.children) node.children.forEach((c: any) => processNode(c, node.id, 'folder'));
                } else if (node.type === 'node') {
                    if (parentId) {
                        newNodesByFolder[parentId] = [...(newNodesByFolder[parentId] || []), { id: node.id, title: node.name, folder_id: parentId, type: node.nodeType || 'document' }];
                    }
                    newNodesByCompany.push({ id: node.id, title: node.name, type: node.nodeType || 'document' });
                }
            };

            tree.forEach((root: any) => processNode(root));

            set({
                treeData: tree,
                isLoadingTree: false,
                departments: mergeUnique(get().departments, newDepartments),
                spacesByDepartment: { ...get().spacesByDepartment, ...newSpacesByDept }, // Keys are deptIds, overwriting is generally correct here if tree is source of truth, but we could merge inner arrays if needed. Current logic: Tree replaces flat for specific departments.
                foldersBySpace: { ...get().foldersBySpace, ...newFoldersBySpace },
                nodesByFolder: { ...get().nodesByFolder, ...newNodesByFolder },
                nodesByCompany: targetCompany ? { ...get().nodesByCompany, [targetCompany]: mergeUnique(get().nodesByCompany[targetCompany], newNodesByCompany) } : get().nodesByCompany
            });
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
            // Trigger lazy load if treeData is present but children might be missing?
            // Actually, best to let the UI trigger loadChildren to keep this pure toggle.
        }
        set({ expandedTreeNodes: newExpanded });
    },

    loadChildren: async (nodeId, type) => {
        const state = get();
        if (state.loadedNodes.has(nodeId)) return; // Already loaded

        // Optimistic / Loading state handled by UI or we could add a `loadingNodes` set
        try {
            const { fetchNodeChildren } = await import('@/lib/api/coreClient');
            const children = await fetchNodeChildren(nodeId, type);

            // Inject into treeData
            const inject = (nodes: CoreTreeNode[]): CoreTreeNode[] => {
                return nodes.map(node => {
                    if (node.id === nodeId) {
                        return { ...node, children: children };
                    }
                    if (node.children && node.children.length > 0) {
                        return { ...node, children: inject(node.children) };
                    }
                    return node;
                });
            };

            const newTree = state.treeData ? inject(state.treeData) : null;

            // Also update flat maps if needed (optional but good for consistency)
            // But main purpose is Tree View.

            set(prev => ({
                treeData: newTree,
                loadedNodes: new Set(prev.loadedNodes).add(nodeId)
            }));

        } catch (e) {
            console.error("Failed to load children lazily", e);
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

            // Show success toast
            toast.success(`Space "${newSpace.name}" created successfully!`);

            // Refresh tree to show new space
            get().loadTree();
        } catch (error: any) {
            if (error instanceof CoreError && error.status === 409 && error.details?.error_code === 'name_conflict') {
                set({
                    nameConflict: {
                        type: 'space',
                        message: error.details?.message || 'Name already exists in this Department.',
                        suggestions: error.details?.suggestions || [],
                        originalPayload: payload
                    }
                });
                return;
            }
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
            if (error instanceof CoreError && error.status === 409 && error.details?.error_code === 'name_conflict') {
                set({
                    nameConflict: {
                        type: 'folder',
                        message: error.details?.message || 'Name already exists in this Space.',
                        suggestions: error.details?.suggestions || [],
                        originalPayload: payload
                    }
                });
                return;
            }
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

            // Only update nodesByFolder if folderId is defined
            if (folderId) {
                set(state => ({
                    nodesByFolder: {
                        ...state.nodesByFolder,
                        [folderId]: [...(state.nodesByFolder[folderId] || []), newNode]
                    }
                }));
            }

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
            const state = get();
            let folderId: string | null = null;

            for (const [fId, nodes] of Object.entries(state.nodesByFolder)) {
                if (nodes.find(n => n.id === id)) {
                    folderId = fId;
                    break;
                }
            }

            await apiDeleteNode(id);

            if (folderId) {
                set(state => ({
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
            if (error instanceof CoreError && error.status === 409 && error.details?.error_code === 'name_conflict') {
                set({
                    nameConflict: {
                        type: 'department',
                        message: error.details?.message || 'Name already exists in this Workspace.',
                        suggestions: error.details?.suggestions || [],
                        originalPayload: payload
                    }
                });
                return;
            }
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
            coreMode: 'home', // always land on Home surface, not Explore
            activeDepartmentId: null,
            activeSpaceId: null,
            activeFolderId: null,
            orbState: 'idle',
        });
    },

    navigateToExplore: () => {
        set({
            viewLevel: 'core',
            coreMode: 'explore',
            activeDepartmentId: null,
            activeSpaceId: null,
            activeFolderId: null,
            orbState: 'idle',
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
        const state = get();
        const nextViewLevel: ViewLevel = state.activeSpaceId
            ? 'space'
            : state.activeDepartmentId
                ? 'department'
                : 'core';

        set({
            viewLevel: nextViewLevel,
            activeFolderId: folderId,
            orbState: 'thinking'
        });

        if (folderId) {
            get().loadNodesForFolder(folderId);
        }

        usePaneStore.getState().openPane({
            id: 'finder-main',
            type: 'finder',
            title: 'Finder',
            size: { width: 1280, height: 820 },
            data: {
                folderId: folderId || undefined,
                spaceId: state.activeSpaceId || undefined,
                departmentId: state.activeDepartmentId || undefined,
                companyId: state.activeCompanyId || undefined,
            }
        });
    },

}));
