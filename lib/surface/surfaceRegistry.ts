/**
 * Surface Hierarchy Registry
 *
 * Canonical source of truth for the active SAIMOR OS surface hierarchy.
 * Every pane type is assigned to exactly one tier:
 *
 *   core_work - daily-driver surfaces, Dock-first
 *   app       - mounted programs, reachable via Cmd+K or context actions
 *   future    - intentionally gated paths
 */

export type SurfaceTier = 'core_work' | 'app' | 'future';

export type PaneType =
    | 'settings' | 'finder' | 'document' | 'chat' | 'team' | 'notes' | 'meine-dateien'
    | 'scanner' | 'users' | 'company-detail' | 'grid' | 'search' | 'space'
    | 'mail' | 'calendar' | 'integrations' | 'browser' | 'terminal' | 'mora-hub'
    | 'actions' | 'action-center' | 'work-session' | 'apps' | 'website-dossier'
    | 'timeline' | 'tasks' | 'canvas' | 'nightwatch' | 'lagefeld' | 'codex'
    | 'wall' | 'feeds';

/**
 * Every pane type mapped to its tier.
 *
 * core_work - Dock-first, daily work
 * app       - mounted programs outside the primary Dock
 * future    - intentionally gated or unsafe paths
 */
export const SURFACE_TIERS: Record<PaneType, SurfaceTier> = {
    // Core work
    finder:          'core_work',
    document:        'core_work',
    chat:            'core_work',
    team:            'core_work',
    notes:           'app',
    settings:        'core_work',
    'meine-dateien': 'app',

    // Mounted apps
    scanner:          'app',
    users:            'app',
    'company-detail': 'app',
    grid:             'app',
    search:           'app',
    space:            'app',
    calendar:         'app',
    browser:          'app',
    'website-dossier': 'app',
    'mora-hub':       'app',
    apps:             'app',       // AppLibrary — promoted (16 apps registered)

    // ── App Platform additions ──────────────────────────────────────────────
    timeline:        'app',       // Activity feed
    nightwatch:      'app',       // MÔRA infra observation (read-only)
    lagefeld:        'app',       // Betretbarer MÔRA Field / Voice-Raum
    codex:           'app',       // Engineering coding agent
    tasks:           'app',       // Kanban board
    canvas:          'app',       // Whiteboard
    wall:            'app',       // Community Wall — Security Signals

    mail:            'app',
    feeds:           'app',
    integrations:    'app',
    terminal:        'app',

    actions:         'app',       // legacy alias opened by shell/action tray
    'action-center': 'app',

    // Promoted operational surfaces
    'work-session':  'app',
};

/** All future-tier pane types for quick inclusion checks. */
export const FUTURE_PANE_TYPES: PaneType[] = (Object.entries(SURFACE_TIERS) as [PaneType, SurfaceTier][])
    .filter(([, tier]) => tier === 'future')
    .map(([type]) => type);

/**
 * Returns the tier for a pane type string, or undefined if unknown.
 * Safe to call with arbitrary strings.
 */
export function getTier(paneType: string): SurfaceTier | undefined {
    return SURFACE_TIERS[paneType as PaneType];
}

/**
 * Returns true if a pane type is enabled (core_work or app).
 */
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

export function getCoreDockItems(): CoreDockItem[] {
    return [
        { action: 'home',     label: 'Home',     description: 'Lagebild',              shortcutSuffix: 'H' },
        { action: 'ambient',  label: 'Raum',     description: 'Môra Field — Sprache',  shortcutSuffix: null },
        { action: 'chat',     label: 'MORA',     description: 'Mit MORA sprechen',     shortcutSuffix: 'J' },
        { action: 'finder',   label: 'Finder',   description: 'Objekte und Dateien',   shortcutSuffix: 'F' },
        { action: 'team',     label: 'Team',     description: 'Menschen und Rollen',   shortcutSuffix: 'U' },
        { action: 'map',      label: 'Karte',    description: 'Organisation sehen',    shortcutSuffix: null },
        { action: 'settings', label: 'Setup',    description: 'Verwaltung',            shortcutSuffix: ',' },
    ];
}

/**
 * Curated dock for the public playground demo. NOT the employee OS dock — this
 * is the demo's four designed destinations (see demo-experience-rethink spec).
 * The visitor never sees finder/terminal/calendar/settings noise.
 */
export function getPlaygroundDockItems(): CoreDockItem[] {
    return [
        { action: 'dossier',   label: 'Dossier',   description: 'Dein Sicherheits-Report',          shortcutSuffix: null },
        { action: 'chat',      label: 'Môra',      description: 'Frag Môra zu deinem Ergebnis',     shortcutSuffix: null },
        { action: 'wall',      label: 'Wall',      description: 'Community Security Signals',        shortcutSuffix: null },
        { action: 'workspace', label: 'Workspace', description: 'So arbeitet ein Team auf SAIMÔR',  shortcutSuffix: null },
    ];
}
