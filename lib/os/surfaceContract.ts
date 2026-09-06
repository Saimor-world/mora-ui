export const SAIMOR_OS_PRODUCT = {
  id: 'saimor-os',
  name: 'Saimôr OS',
} as const;

export const SAIMOR_SURFACES = {
  desk: {
    id: 'desk',
    name: 'Desk',
    role: 'home',
    canonicalPath: '/',
    legacyOrigin: 'https://dash.saimor.world',
  },
  files: {
    id: 'files',
    name: 'Files',
    role: 'workspace',
  },
  workspaces: {
    id: 'workspaces',
    name: 'Workspaces',
    role: 'workspace',
  },
  board: {
    id: 'board',
    name: 'Board',
    role: 'workspace',
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    role: 'workspace',
  },
  operations: {
    id: 'operations',
    name: 'Operations',
    role: 'workspace',
  },
  agents: {
    id: 'agents',
    name: 'Agents',
    role: 'workspace',
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    role: 'system',
  },
} as const;

export const SAIMOR_ENGINE_CAPABILITIES = [
  'engine.session',
  'engine.navigation',
  'engine.command',
  'engine.panes',
  'engine.events',
  'engine.notifications',
  'engine.ambient',
  'mora.context',
  'mora.conversation',
  'mora.execution',
] as const;

export const OS_RUNTIME = {
  canonicalRepo: 'mora-ui',
  canonicalOrigin: 'https://hq.saimor.world',
  legacyDeskRepo: 'mora-work',
  legacyDeskOrigin: 'https://dash.saimor.world',
  migrationMode: 'strangler',
} as const;

export type SaimorSurfaceId = keyof typeof SAIMOR_SURFACES;
export type SaimorEngineCapability = (typeof SAIMOR_ENGINE_CAPABILITIES)[number];

export function getSurfaceProductLabel(surface: SaimorSurfaceId): string {
  return `${SAIMOR_OS_PRODUCT.name} · ${SAIMOR_SURFACES[surface].name}`;
}
