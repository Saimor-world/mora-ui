export const SAIMOR_OS_PRODUCT = {
  id: 'saimor-os',
  name: 'Saimôr OS',
} as const;

export const SAIMOR_SURFACES = {
  home: {
    id: 'home',
    name: 'Home',
    role: 'home',
    canonicalPath: '/',
  },
  today: {
    id: 'today',
    name: 'Heute',
    role: 'home',
  },
  inbox: {
    id: 'inbox',
    name: 'Inbox',
    role: 'work',
  },
  files: {
    id: 'files',
    name: 'Dateien',
    role: 'work',
  },
  workspaces: {
    id: 'workspaces',
    name: 'Bereiche',
    role: 'work',
  },
  board: {
    id: 'board',
    name: 'Board',
    role: 'work',
  },
  calendar: {
    id: 'calendar',
    name: 'Kalender',
    role: 'work',
  },
  memory: {
    id: 'memory',
    name: 'Wissen',
    role: 'knowledge',
  },
  operations: {
    id: 'operations',
    name: 'Betrieb',
    role: 'system',
  },
  runtime: {
    id: 'runtime',
    name: 'Runtime',
    role: 'system',
  },
  agents: {
    id: 'agents',
    name: 'Agents',
    role: 'intelligence',
  },
  settings: {
    id: 'settings',
    name: 'Einstellungen',
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
  'mora.identity',
  'mora.personality',
  'mora.context',
  'mora.presence',
  'mora.proactivity',
  'mora.conversation',
  'mora.execution',
] as const;

export const OS_RUNTIME = {
  canonicalRepo: 'mora-ui',
  canonicalOrigin: 'https://hq.saimor.world',
  migrationSources: ['mora-work'],
  target: 'single-runtime',
} as const;

export type SaimorSurfaceId = keyof typeof SAIMOR_SURFACES;
export type SaimorEngineCapability = (typeof SAIMOR_ENGINE_CAPABILITIES)[number];

export function getSurfaceProductLabel(surface: SaimorSurfaceId): string {
  return `${SAIMOR_OS_PRODUCT.name} · ${SAIMOR_SURFACES[surface].name}`;
}
