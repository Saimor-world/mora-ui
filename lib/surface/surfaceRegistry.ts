/**
 * Surface Hierarchy Registry
 *
 * Canonical source of truth for the active SAIMOR OS surface hierarchy.
 * Daily navigation stays intentionally small; the app library holds the long tail.
 */

import { ESTATE_LABELS } from '@/lib/estate';

export type SurfaceTier = 'core_work' | 'app' | 'future';

export type PaneType =
    | 'settings' | 'finder' | 'document' | 'chat' | 'team' | 'notes' | 'meine-dateien'
    | 'scanner' | 'users' | 'company-detail' | 'grid' | 'search' | 'space'
    | 'mail' | 'calendar' | 'integrations' | 'browser' | 'terminal' | 'mora-hub'
    | 'actions' | 'action-center' | 'work-session' | 'apps' | 'website-dossier'
    | 'timeline' | 'tasks' | 'canvas' | 'nightwatch' | 'lagefeld' | 'codex'
    | 'wall' | 'feeds' | 'finance' | 'work';

export const SURFACE_TIERS: Record<PaneType, SurfaceTier> = {
    // Core operating surfaces
    work:            'core_work',
    finder:          'core_work',
    document:        'core_work',
    chat:            'core_work',
    team:            'core_work',
    settings:        'core_work',
    finance:         'core_work',

    // Mounted apps
    notes:            'app',
    'meine-dateien':  'app',
    scanner:          'app',
    users:            'app',
    'company-detail': 'app',
    grid:             'app',
    search:           'app',
    space:            'app',
    calendar:         'app',
    browser:          'app',
    'website-dossier':'app',
    'mora-hub':       'app',
    apps:             'app',
    timeline:         'app',
    nightwatch:       'app',
    lagefeld:         'app',
    codex:            'app',
    tasks:            'app',
    canvas:           'app',
    wall:             'app',
    mail:             'app',
    feeds:            'app',
    integrations:     'app',
    terminal:         'app',
    actions:          'app',
    'action-center':  'app',
    'work-session':   'app',
};

export const FUTURE_PANE_TYPES: PaneType[] = (Object.entries(SURFACE_TIERS) as [PaneType, SurfaceTier][])
    .filter(([, tier]) => tier === 'future')
    .map(([type]) => type);

export function getTier(paneType: string): SurfaceTier | undefined {
    return SURFACE_TIERS[paneType as PaneType];
}

export function isPaneEnabled(paneType: string): boolean {
    const tier = getTier(paneType);
    if (!tier) return false;
    return tier !== 'future';
}

export interface CoreDockItem {
    action: string;
    label: string;
    description: string;
    shortcutSuffix: string | null;
}

/**
 * The Dock is orientation, not inventory.
 * Finder, files, team and long-tail tools remain available through Work/Apps,
 * Spotlight and contextual actions instead of competing for permanent space.
 */
export function getCoreDockItems(): CoreDockItem[] {
    return [
        { action: 'home',     label: 'Home',     description: 'Dein aktuelles Feld',                shortcutSuffix: 'H' },
        { action: 'cockpit',  label: 'Arbeit',   description: 'Projekte, Aufgaben und Werkzeuge',   shortcutSuffix: 'A' },
        { action: 'chat',     label: 'MÔRA',     description: 'Kontext, Memory und Entscheidungen', shortcutSuffix: 'J' },
        { action: 'map',      label: 'Universe', description: 'Strukturen räumlich erkunden',       shortcutSuffix: null },
        { action: 'settings', label: 'Setup',    description: 'OS, Verbindungen und Workspace',     shortcutSuffix: ',' },
        { action: 'desk',     label: ESTATE_LABELS.desk, description: 'Operator-Lage und Systemstatus', shortcutSuffix: 'L' },
    ];
}

export function getPlaygroundDockItems(): CoreDockItem[] {
    return [
        { action: 'dossier',   label: 'Dossier',   description: 'Dein Sicherheits-Report',          shortcutSuffix: null },
        { action: 'chat',      label: 'Môra',      description: 'Frag Môra zu deinem Ergebnis',     shortcutSuffix: null },
        { action: 'wall',      label: 'Wall',      description: 'Community Security Signals',        shortcutSuffix: null },
        { action: 'workspace', label: 'Workspace', description: 'So arbeitet ein Team auf SAIMÔR',  shortcutSuffix: null },
    ];
}
