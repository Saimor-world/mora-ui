// lib/store/moraTypes.ts
// Pure type definitions for the Mora store.
// ZERO runtime imports from lib/api or lib/store — safe to import anywhere without circular risk.

import type { CoreCompany, CoreDepartment, CoreSpace, CoreFolder, CoreNode, CoreTreeNode } from '@/lib/types/core';
import type { OrbState } from '@/lib/api/awarenessClient';
export type { OperationalState } from '@/lib/types/session';
import type { OperationalState } from '@/lib/types/session';

import type {
    CreateSpacePayload,
    CreateFolderPayload,
    CreateNodePayload,
    UpdateNodePayload,
    CreateDepartmentPayload,
    UpdateDepartmentPayload,
    UpdateSpacePayload,
    UpdateFolderPayload,
} from '@/lib/api/coreClient';

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

export interface MoraState {
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
