// lib/types/mora.ts
// Shared domain types — imported by stores, query hooks, and components.
// Zero imports from lib/api or lib/store (no circular risk).

import type { OrbState as OrbStateValue } from '@/lib/api/awarenessClient';
export type { OrbStateValue };
export type { OperationalState } from '@/lib/types/session';

export type ViewLevel = 'company' | 'core' | 'department' | 'space' | 'folder' | 'ambient';
export type ViewMode = 'owner' | 'demo' | 'workspace';

/**
 * CoreMode — which surface is active when viewLevel === 'core'.
 * 'home' — Day-start working surface: recent docs, activity, quick access.
 * 'explore' — Universe planet map: spatial overview of all departments.
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
  scope_reason?: string;
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
  updatedAt?: string;
}

export interface NameConflictState {
  type: 'department' | 'space' | 'folder';
  message: string;
  suggestions: string[];
  originalPayload: Record<string, unknown>;
}

export type UserRole = 'owner' | 'admin' | 'system_owner' | 'manager' | 'member' | 'demo';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  settings?: Record<string, unknown>;
  tenant_id?: string;
  operational_state?: import('@/lib/types/session').OperationalState;
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

export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  owner:        { canCreate: true,  canDelete: true,  canAdmin: true,  canEditSettings: true,  canViewAnalytics: true  },
  admin:        { canCreate: true,  canDelete: true,  canAdmin: true,  canEditSettings: true,  canViewAnalytics: true  },
  system_owner: { canCreate: true,  canDelete: true,  canAdmin: true,  canEditSettings: true,  canViewAnalytics: true  },
  manager:      { canCreate: true,  canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: true  },
  member:       { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false },
  demo:         { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false },
};

export const getPermissions = (role: UserRole): Permissions => ROLE_PERMISSIONS[role];
