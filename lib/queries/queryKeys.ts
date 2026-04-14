// lib/queries/queryKeys.ts
// Centralized query key factory + per-domain stale time configuration.
// staleTime = how long data is considered fresh (no refetch during this window).
//
// Trade-off: longer = fewer requests + instant navigation
//            shorter = fresher data + more server load
//
// TODO: Fill in the staleTime values below based on how often your users
// expect each data type to change in real usage.

export const STALE_TIMES = {
  // One company per server instance. Structure barely changes during a session.
  // Admin explicit refresh available via queryClient.invalidateQueries().
  companies: 30 * 60 * 1000, // 30 minutes

  // Admin-only changes. No live collaborative editing of org structure.
  // Explicit refresh triggered by settings action, not automatic.
  departments: 10 * 60 * 1000, // 10 minutes

  // Active working layer — team members in same department may create spaces/folders.
  // "One truth" exists on the server; clients see it within this window.
  spaces: 5 * 60 * 1000,   // 5 minutes
  folders: 5 * 60 * 1000,  // 5 minutes

  // Documents are actively edited. Whole company on own devices means
  // multiple users may create/update nodes concurrently.
  // refetchOnWindowFocus: true added per-query for active document views.
  nodes: 2 * 60 * 1000, // 2 minutes

  // Full hierarchy tree — expensive fetch, structure-only (no content).
  // Changes only when departments/spaces are created/renamed by admins.
  tree: 15 * 60 * 1000, // 15 minutes

  // Like a Windows account — role/company don't change mid-session.
  // Only invalidated explicitly on logout or admin role-change action.
  userProfile: Infinity,
};

// Query key factory — canonical cache keys for every domain.
// Structure: [domain, ...params] so invalidation is surgical.
export const queryKeys = {
  companies: () => ['companies'] as const,
  company: (id: string) => ['companies', id] as const,

  departments: (companyId?: string | null) =>
    companyId ? ['departments', companyId] : ['departments'],

  spaces: (departmentId?: string | null) =>
    departmentId ? ['spaces', departmentId] : ['spaces'],

  folders: (spaceId?: string | null) =>
    spaceId ? ['folders', spaceId] : ['folders'],

  nodes: (folderId?: string | null, options?: Record<string, unknown>) =>
    options ? ['nodes', folderId, options] : ['nodes', folderId],

  tree: (companyId?: string | null) =>
    companyId ? ['tree', companyId] : ['tree'],

  userProfile: () => ['userProfile'] as const,
};
