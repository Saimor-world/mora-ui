import type { AppManifest } from './types';

export const APP_REGISTRY: AppManifest[] = [
  // ── Core ──────────────────────────────────────────────────────────────────
  {
    id: 'finder',
    name: 'Finder',
    description: 'Dateien und Ordner durchsuchen',
    icon: 'Folder',
    color: 'blue',
    category: 'core',
    defaultSize: { width: 900, height: 620 },
  },
  {
    id: 'document',
    name: 'Dokument',
    description: 'Dokumente öffnen und lesen',
    icon: 'FileText',
    color: 'slate',
    category: 'core',
    defaultSize: { width: 720, height: 560 },
  },
  {
    id: 'notes',
    name: 'Notizen',
    description: 'Persönliche Notizen',
    icon: 'StickyNote',
    color: 'amber',
    category: 'core',
    defaultSize: { width: 480, height: 420 },
    singleton: true,
  },
  {
    id: 'grid',
    name: 'Alle Inhalte',
    description: 'Alle Knoten in der Übersicht',
    icon: 'Grid',
    color: 'green',
    category: 'core',
    defaultSize: { width: 900, height: 640 },
  },

  // ── Intelligence ──────────────────────────────────────────────────────────
  {
    id: 'chat',
    name: 'Chat',
    description: 'Mit Mora sprechen',
    icon: 'MessageCircle',
    color: 'purple',
    category: 'intelligence',
    defaultSize: { width: 860, height: 680 },
  },
  {
    id: 'scanner',
    name: 'Scanner',
    description: 'Dateien hochladen und kategorisieren',
    icon: 'ScanLine',
    color: 'teal',
    category: 'intelligence',
    defaultSize: { width: 840, height: 600 },
  },
  {
    id: 'search',
    name: 'Suche',
    description: 'Semantisch suchen',
    icon: 'Search',
    color: 'indigo',
    category: 'intelligence',
    defaultSize: { width: 640, height: 500 },
  },
  {
    id: 'timeline',
    name: 'Zeitverlauf',
    description: 'Aktivitäten und Verlauf',
    icon: 'Activity',
    color: 'rose',
    category: 'intelligence',
    defaultSize: { width: 540, height: 620 },
    isNew: true,
  },

  // ── Workspace ─────────────────────────────────────────────────────────────
  {
    id: 'calendar',
    name: 'Kalender',
    description: 'Termine und Ereignisse',
    icon: 'Calendar',
    color: 'green',
    category: 'workspace',
    defaultSize: { width: 840, height: 620 },
  },
  {
    id: 'tasks',
    name: 'Aufgaben',
    description: 'Kanban-Board für Aufgaben',
    icon: 'SquareCheckBig',
    color: 'orange',
    category: 'workspace',
    defaultSize: { width: 900, height: 580 },
    isNew: true,
  },
  {
    id: 'work-session',
    name: 'Arbeitssitzung',
    description: 'Fokussierte Arbeitspläne',
    icon: 'Timer',
    color: 'teal',
    category: 'workspace',
    defaultSize: { width: 640, height: 500 },
  },

  // ── People ────────────────────────────────────────────────────────────────
  {
    id: 'team',
    name: 'Team',
    description: 'Teammitglieder und Aktivität',
    icon: 'Users',
    color: 'blue',
    category: 'people',
    defaultSize: { width: 780, height: 620 },
  },
  {
    id: 'users',
    name: 'Benutzerverwaltung',
    description: 'Benutzer verwalten',
    icon: 'UserCog',
    color: 'slate',
    category: 'people',
    defaultSize: { width: 760, height: 600 },
    requiresRole: ['owner', 'admin'],
  },

  // ── Productivity ─────────────────────────────────────────────────────────
  {
    id: 'action-center',
    name: 'Action Center',
    description: 'Aktionen, Vorschläge und operative Aufgaben',
    icon: 'Activity',
    color: 'emerald',
    category: 'core',
    defaultSize: { width: 900, height: 720 },
  },
  {
    id: 'integrations',
    name: 'Integrationen',
    description: 'Verbindungen zu externen Diensten und Plattformen',
    icon: 'Plug',
    color: 'blue',
    category: 'core',
    defaultSize: { width: 860, height: 680 },
  },
  {
    id: 'mail',
    name: 'Mail',
    description: 'E-Mail-Postfach und Kommunikation',
    icon: 'Mail',
    color: 'slate',
    category: 'core',
    defaultSize: { width: 960, height: 680 },
  },

  // ── System ────────────────────────────────────────────────────────────────
  {
    id: 'apps',
    name: 'Apps',
    description: 'App-Bibliothek und Launcher',
    icon: 'Grid',
    color: 'slate',
    category: 'system',
    defaultSize: { width: 900, height: 680 },
  },
  {
    id: 'meine-dateien',
    name: 'Meine Dateien',
    description: 'Persönliche Inhalte und Dateien',
    icon: 'Folder',
    color: 'slate',
    category: 'core',
    defaultSize: { width: 680, height: 560 },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Kommandozeile',
    icon: 'Terminal',
    color: 'slate',
    category: 'system',
    defaultSize: { width: 720, height: 480 },
  },
  {
    id: 'settings',
    name: 'Einstellungen',
    description: 'System und Arbeitsbereich konfigurieren',
    icon: 'Settings',
    color: 'slate',
    category: 'system',
    defaultSize: { width: 700, height: 500 },
    singleton: true,
  },

  // ── Creative ──────────────────────────────────────────────────────────────
  {
    id: 'canvas',
    name: 'Canvas',
    description: 'Freies Whiteboard',
    icon: 'PenTool',
    color: 'purple',
    category: 'creative',
    defaultSize: { width: 900, height: 660 },
    isNew: true,
  },
];

/** Look up a manifest by app id. Returns undefined if not found. */
export function getAppManifest(id: string): AppManifest | undefined {
  return APP_REGISTRY.find(a => a.id === id);
}
