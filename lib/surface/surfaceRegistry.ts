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
    | 'timeline' | 'tasks' | 'canvas';

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
    notes:           'core_work',
    settings:        'core_work',
    'meine-dateien': 'core_work',

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
    tasks:           'app',       // Kanban board
    canvas:          'app',       // Whiteboard

    mail:            'app',
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
        { action: 'home',     label: 'Start',    description: 'Arbeitsplatz',          shortcutSuffix: 'H' },
        { action: 'chat',     label: 'Mora',     description: 'Mit Mora sprechen',     shortcutSuffix: 'J' },
        { action: 'finder',   label: 'Finder',   description: 'Dateien & Ordner',      shortcutSuffix: 'F' },
        { action: 'team',     label: 'Team',     description: 'Teammitglieder',        shortcutSuffix: 'U' },
        { action: 'notes',    label: 'Notizen',  description: 'Persoenliche Notizen',  shortcutSuffix: 'N' },
        { action: 'ambient',  label: 'Field',    description: 'Môra Field – Sprachraum',  shortcutSuffix: null },
        { action: 'larry',    label: 'Larry',    description: 'Larry Dashboard',       shortcutSuffix: 'L' },
        { action: 'settings', label: 'System',   description: 'Einstellungen',         shortcutSuffix: ',' },
    ];
}
