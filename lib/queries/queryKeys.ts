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
  companies: 30 * 60 * 1000,
  departments: 10 * 60 * 1000,
  spaces: 5 * 60 * 1000,
  folders: 5 * 60 * 1000,
  nodes: 2 * 60 * 1000,
  tree: 15 * 60 * 1000,
  userProfile: Infinity,
  perception: 30 * 1000,
  radar: 30 * 1000,
  larryArtifacts: 60 * 1000,
  teamMembers: 30 * 1000,
  nightwatchIncidents: 60 * 1000,
  nightwatchMonitors: 60 * 1000,
  bridgePulse: 60 * 1000,
  rssFeed: 60 * 1000,
  workspaceAccess: 60 * 1000,
  workspaceCatalog: 30 * 60 * 1000,
  tasks: 30 * 1000,
  financialPulse: 60 * 1000,
  financeState: 30 * 1000,
  financeRecords: 30 * 1000,
};

export const queryKeys = {
  companies: () => ['companies'] as const,
  company: (id: string) => ['companies', id] as const,
  viewHome: () => ['view', 'home'] as const,
  viewHomeStatus: () => ['view', 'home', 'status'] as const,
  viewHomeInsight: () => ['view', 'home', 'insight'] as const,
  viewDossier: (auditId: string) => ['view', 'dossier', auditId] as const,

  departments: (companyId?: string | null) =>
    companyId ? ['departments', companyId] : ['departments'],

  spaces: (departmentId?: string | null) =>
    departmentId ? ['spaces', departmentId] : ['spaces'],

  folders: (spaceId?: string | null) =>
    spaceId ? ['folders', spaceId] : ['folders'],

  nodes: (folderId?: string | null, options?: Record<string, unknown>) =>
    options ? ['nodes', folderId, options] : ['nodes', folderId],

  companyNodes: (companyId?: string | null, options?: Record<string, unknown>) =>
    options ? ['companyNodes', companyId, options] : ['companyNodes', companyId],

  tree: (companyId?: string | null) =>
    companyId ? ['tree', companyId] : ['tree'],

  userProfile: () => ['userProfile'] as const,
  userSettings: () => ['userSettings'] as const,
  personalHomeNote: () => ['personalHomeNote'] as const,

  perceptionRoot: () => ['perception'] as const,
  perception: (key: string) => ['perception', key] as const,
  radar: () => ['radar'] as const,

  larryArtifacts: (companyId?: string | null, limit?: number) =>
    limit != null
      ? (['larryArtifacts', companyId, limit] as const)
      : (['larryArtifacts', companyId] as const),

  teamMembers: () => ['teamMembers'] as const,
  tasks: (companyId?: string | null) => ['tasks', companyId ?? 'account'] as const,
  financialPulse: (scopeId?: string | null) => ['financialPulse', scopeId ?? 'account'] as const,
  financeRoot: (tenantId?: string | null, identityKey?: string | null, companyId?: string | null) =>
    ['finance', tenantId ?? 'tenant-unknown', identityKey ?? 'anonymous', companyId ?? 'none'] as const,
  financeState: (tenantId?: string | null, identityKey?: string | null, companyId?: string | null) =>
    ['finance', tenantId ?? 'tenant-unknown', identityKey ?? 'anonymous', companyId ?? 'none', 'state'] as const,
  financeRecords: (
    tenantId?: string | null,
    identityKey?: string | null,
    companyId?: string | null,
    limit = 50,
  ) => ['finance', tenantId ?? 'tenant-unknown', identityKey ?? 'anonymous', companyId ?? 'none', 'records', limit] as const,
  financeRecord: (
    tenantId?: string | null,
    identityKey?: string | null,
    companyId?: string | null,
    recordId?: string | null,
  ) => ['finance', tenantId ?? 'tenant-unknown', identityKey ?? 'anonymous', companyId ?? 'none', 'record', recordId ?? 'none'] as const,
  financeEvidence: (
    tenantId?: string | null,
    identityKey?: string | null,
    companyId?: string | null,
    evidenceId?: string | null,
  ) => ['finance', tenantId ?? 'tenant-unknown', identityKey ?? 'anonymous', companyId ?? 'none', 'evidence', evidenceId ?? 'none'] as const,

  nightwatchIncidents: (includeResolved = true) => ['nightwatchIncidents', includeResolved] as const,
  nightwatchMonitors: () => ['nightwatchMonitors'] as const,
  bridgePulse: () => ['bridgePulse'] as const,
  rssFeed: (limit = 30, companyId?: string | null) => ['integrations', 'rss', 'items', companyId ?? 'account', limit] as const,
  workspaceAccess: () => ['workspace', 'access'] as const,
  workspaceCatalog: () => ['workspace', 'catalog'] as const,
};