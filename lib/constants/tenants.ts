/**
 * SAIMOR Tenant Constants - Centralized Configuration
 *
 * All hardcoded tenant IDs should be imported from here.
 */

// Tenant IDs
export const TENANT_DEMO = 'tenant-demo';
export const TENANT_HQ = 'tenant-saimor-hq';
export const TENANT_DEFAULT = 'tenant-default';

// Role Constants
export const ROLE_SYSTEM_OWNER = 'system_owner';
export const ROLE_OWNER = 'owner';
export const ROLE_ADMIN = 'admin';
export const ROLE_MEMBER = 'member';
export const ROLE_TEAM_MEMBER = 'team_member';
export const ROLE_DEMO = 'demo';

// Scope Constants
export const SCOPE_SYSTEM_OWNER = 'system_owner';
export const SCOPE_CLIENT = 'client';

// Helper function to check if tenant is demo
export const isDemoTenant = (tenantId: string | null | undefined): boolean => {
    return tenantId === TENANT_DEMO;
};

// Helper function to check if user is system owner
export const isSystemOwner = (role: string | null | undefined, scope?: string | null): boolean => {
    return role === ROLE_SYSTEM_OWNER || scope === SCOPE_SYSTEM_OWNER;
};
