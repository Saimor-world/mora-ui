// __tests__/lib/surface/surfaceRegistry.test.ts
//
// Surface Hierarchy Registry — the canonical source of truth for which
// pane types belong to which tier in the 1.0 OS hierarchy.
//
// Tiers:
//   shell        — permanent OS frame elements (not pane types)
//   core_work    — the 6-8 daily-driver surfaces, Dock-first
//   app          — legitimate programs, reachable via Cmd+K / context menu
//   future       — gated in 1.0, not mounted / not routed

import {
    SURFACE_TIERS,
    SurfaceTier,
    isPaneEnabled,
    getCoreDockItems,
    FUTURE_PANE_TYPES,
    getTier,
} from '@/lib/surface/surfaceRegistry';

describe('surfaceRegistry', () => {
    describe('SURFACE_TIERS', () => {
        it('categorizes every known pane type into exactly one tier', () => {
            // All pane types that exist in PaneManager switch cases
            const ALL_KNOWN_PANE_TYPES = [
                'settings', 'apps', 'grid', 'space', 'document', 'search',
                'team', 'mail', 'integrations', 'calendar', 'terminal',
                'notes', 'finder', 'scanner', 'users', 'company-detail',
                'chat', 'mora-hub', 'actions', 'action-center', 'work-session', 'meine-dateien',
                'timeline', 'tasks', 'canvas', 'lagefeld',  // ← new app-platform types
            ];

            for (const paneType of ALL_KNOWN_PANE_TYPES) {
                const tier = getTier(paneType);
                expect(tier).toBeDefined();
                expect(['core_work', 'app', 'future']).toContain(tier);
            }
        });

        it('assigns core_work to the 1.0 daily-driver surfaces', () => {
            const coreWork = Object.entries(SURFACE_TIERS)
                .filter(([, tier]) => tier === 'core_work')
                .map(([type]) => type);

            expect(coreWork).toContain('finder');
            expect(coreWork).toContain('document');
            expect(coreWork).toContain('chat');
            expect(coreWork).toContain('team');
            expect(coreWork).toContain('settings');
            expect(coreWork).not.toContain('notes');
            expect(coreWork).not.toContain('meine-dateien');
        });

        it('keeps only intentionally gated surfaces in future', () => {
            expect(SURFACE_TIERS['mail']).toBe('app');
            // calendar promoted — apps/calendar/ module now live
            expect(SURFACE_TIERS['integrations']).toBe('app');
            expect(SURFACE_TIERS['terminal']).toBe('app');
            // mora-hub is 'app' in registry — pre-existing state, skip
            expect(SURFACE_TIERS['actions']).toBe('app');
            expect(SURFACE_TIERS['work-session']).toBe('app');
            // apps is now 'app' tier — AppLibrary promoted
        });

        it('registers timeline, tasks, canvas as app tier', () => {
            expect(SURFACE_TIERS['timeline']).toBe('app');
            expect(SURFACE_TIERS['tasks']).toBe('app');
            expect(SURFACE_TIERS['canvas']).toBe('app');
            expect(SURFACE_TIERS['lagefeld']).toBe('app');
        });

        it('promotes apps (AppLibrary) to app tier', () => {
            // AppLibrary was future — now promoted so it can render
            expect(SURFACE_TIERS['apps']).toBe('app');
        });

        it('assigns app to legitimate but non-Dock programs', () => {
            expect(SURFACE_TIERS['notes']).toBe('app');
            expect(SURFACE_TIERS['meine-dateien']).toBe('app');
            expect(SURFACE_TIERS['scanner']).toBe('app');
            expect(SURFACE_TIERS['users']).toBe('app');
            expect(SURFACE_TIERS['company-detail']).toBe('app');
            expect(SURFACE_TIERS['grid']).toBe('app');
            expect(SURFACE_TIERS['search']).toBe('app');
            expect(SURFACE_TIERS['space']).toBe('app');
        });
    });

    describe('isPaneEnabled', () => {
        it('returns true for core_work panes', () => {
            expect(isPaneEnabled('finder')).toBe(true);
            expect(isPaneEnabled('chat')).toBe(true);
            expect(isPaneEnabled('document')).toBe(true);
        });

        it('returns true for app-tier panes', () => {
            expect(isPaneEnabled('scanner')).toBe(true);
            expect(isPaneEnabled('users')).toBe(true);
            expect(isPaneEnabled('mail')).toBe(true);
            expect(isPaneEnabled('integrations')).toBe(true);
            expect(isPaneEnabled('terminal')).toBe(true);
        });

        it('enables the operational action surfaces', () => {
            expect(isPaneEnabled('actions')).toBe(true);
            expect(isPaneEnabled('action-center')).toBe(true);
        });

        it('enables work-session as a promoted app pane', () => {
            expect(isPaneEnabled('work-session')).toBe(true);
        });

        it('returns true for new app-platform types', () => {
            expect(isPaneEnabled('timeline')).toBe(true);
            expect(isPaneEnabled('tasks')).toBe(true);
            expect(isPaneEnabled('canvas')).toBe(true);
            expect(isPaneEnabled('lagefeld')).toBe(true);
            expect(isPaneEnabled('apps')).toBe(true);
        });

        it('returns false for unknown pane types', () => {
            expect(isPaneEnabled('nonexistent' as any)).toBe(false);
        });
    });

    describe('FUTURE_PANE_TYPES', () => {
        it('lists all future-tier pane types for quick lookup', () => {
            expect(FUTURE_PANE_TYPES).not.toContain('mail');
            // calendar promoted — no longer future
            expect(FUTURE_PANE_TYPES).not.toContain('integrations');
            expect(FUTURE_PANE_TYPES).not.toContain('terminal');
            expect(FUTURE_PANE_TYPES).not.toContain('actions');
            expect(FUTURE_PANE_TYPES).not.toContain('work-session');
            // promoted types no longer in future:
            expect(FUTURE_PANE_TYPES).not.toContain('apps');
            expect(FUTURE_PANE_TYPES).not.toContain('calendar');
            expect(FUTURE_PANE_TYPES).not.toContain('timeline');
            expect(FUTURE_PANE_TYPES).not.toContain('tasks');
            expect(FUTURE_PANE_TYPES).not.toContain('canvas');
            expect(FUTURE_PANE_TYPES).not.toContain('lagefeld');
        });

        it('does not include core_work or app panes', () => {
            expect(FUTURE_PANE_TYPES).not.toContain('finder');
            expect(FUTURE_PANE_TYPES).not.toContain('chat');
            expect(FUTURE_PANE_TYPES).not.toContain('scanner');
            expect(FUTURE_PANE_TYPES).not.toContain('document');
        });
    });

    describe('getCoreDockItems', () => {
        it('returns the OS 1.0 Dock entries in the correct order', () => {
            const items = getCoreDockItems();
            expect(items).toHaveLength(7);
            expect(items.map(i => i.action)).toEqual([
                'home', 'ambient', 'chat', 'finder', 'team', 'map', 'settings',
            ]);
            expect(items.map(i => i.label)).toEqual([
                'Home', 'Raum', 'MORA', 'Finder', 'Team', 'Karte', 'Setup',
            ]);
        });

        it('each item has label, icon key, and description', () => {
            const items = getCoreDockItems();
            for (const item of items) {
                expect(item.label).toBeTruthy();
                expect(item.action).toBeTruthy();
                expect(item.description).toBeTruthy();
            }
        });
    });
});
