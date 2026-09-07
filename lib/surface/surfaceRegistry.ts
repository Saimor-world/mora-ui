/**
 * Surface Hierarchy Registry
 *
 * Canonical source of truth for the active Saimôr OS surface hierarchy.
 * Daily navigation stays intentionally small; the app library holds the long tail.
 *
 * Stand 0 invariant: there is one Saimôr OS. Historical Desk is not a product,
 * surface, workspace or navigation destination in this registry.
 */

export type SurfaceTier = 'core_work' | 'app' | 'future';

export type PaneType =
    | 'settings' | 'finder' | 'document' | 'chat' | 'team' | 'notes' | 'meine-dateien'
    | 'scanner' | 'users' | 'company-detail' | 'grid' | 'search' | 'space'
    | 'mail' | 'calendar' | 'integrations' | 'browser' | 'terminal' | 'mora-hub'
    | 'actions' | 'action-center' | 'work-session' | 'apps' | 'website-dossier'
    | 'timeline' | 'tasks' | 'canvas' | 'nightwatch' | 'lagefeld' | 'codex'
    | 'wall' | 'feeds' | 'finance' | 'work';

export const SURFACE_TIERS: Record<PaneType, SurfaceTier> = {
    work:            'core_work',
    finder:          'core_work',
    document:        'core_work',
    chat:            'core_work',
    team:            'core_work',
    settings:        'core_work',
    finance:         'core_work',

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
 * The dock is orientation, not inventory. It exposes the five places a person
 * actually needs to orient themselves in Saimôr; detailed tools stay contextual.
 */
export function getCoreDockItems(): CoreDockItem[] {
    return [
        { action: 'home',     label: 'Heute',         description: 'Was jetzt relevant ist',                     shortcutSuffix: 'H' },
        { action: 'cockpit',  label: 'Arbeit',        description: 'Fokus, Aufgaben und laufende Arbeit',         shortcutSuffix: 'A' },
        { action: 'chat',     label: 'MÔRA',          description: 'Verstehen, planen und gemeinsam weiterarbeiten', shortcutSuffix: 'J' },
        { action: 'map',      label: 'Universe',      description: 'Zusammenhänge räumlich erkunden',             shortcutSuffix: null },
        { action: 'settings', label: 'Einstellungen', description: 'Konto, Verbindungen und System',              shortcutSuffix: ',' },
    ];
}

export function getPlaygroundDockItems(): CoreDockItem[] {
    return [
        { action: 'dossier',   label: 'Dossier',        description: 'Dein Sicherheitsbericht',                  shortcutSuffix: null },
        { action: 'chat',      label: 'MÔRA',           description: 'Ergebnis verstehen und Fragen klären',      shortcutSuffix: null },
        { action: 'wall',      label: 'Wall',           description: 'Signale aus der Community',                 shortcutSuffix: null },
        { action: 'workspace', label: 'Arbeitsbereich', description: 'So kann Zusammenarbeit in Saimôr aussehen', shortcutSuffix: null },
    ];
}
