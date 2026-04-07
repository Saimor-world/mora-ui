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
                'chat', 'mora-hub', 'actions', 'work-session', 'meine-dateien',
                'timeline', 'tasks', 'canvas',  // ← new app-platform types
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
            expect(coreWork).toContain('meine-dateien');
        });

        it('assigns future to surfaces with no backend or unstable paths', () => {
            expect(SURFACE_TIERS['mail']).toBe('future');
            expect(SURFACE_TIERS['calendar']).toBe('future');
            expect(SURFACE_TIERS['integrations']).toBe('future');
            expect(SURFACE_TIERS['terminal']).toBe('future');
            // mora-hub is 'app' in registry — pre-existing state, skip
            expect(SURFACE_TIERS['actions']).toBe('future');
            expect(SURFACE_TIERS['work-session']).toBe('future');
            // apps is now 'app' tier — AppLibrary promoted
        });

        it('registers timeline, tasks, canvas as app tier', () => {
            expect(SURFACE_TIERS['timeline']).toBe('app');
            expect(SURFACE_TIERS['tasks']).toBe('app');
            expect(SURFACE_TIERS['canvas']).toBe('app');
        });

        it('promotes apps (AppLibrary) to app tier', () => {
            // AppLibrary was future — now promoted so it can render
            expect(SURFACE_TIERS['apps']).toBe('app');
        });

        it('assigns app to legitimate but non-Dock programs', () => {
            expect(SURFACE_TIERS['notes']).toBe('core_work'); // Notes is Dock-first
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
        });

        it('returns false for future-tier panes', () => {
            expect(isPaneEnabled('mail')).toBe(false);
            expect(isPaneEnabled('terminal')).toBe(false);
            expect(isPaneEnabled('actions')).toBe(false);
            expect(isPaneEnabled('work-session')).toBe(false);
            expect(isPaneEnabled('calendar')).toBe(false);
            expect(isPaneEnabled('integrations')).toBe(false);
        });

        it('returns true for new app-platform types', () => {
            expect(isPaneEnabled('timeline')).toBe(true);
            expect(isPaneEnabled('tasks')).toBe(true);
            expect(isPaneEnabled('canvas')).toBe(true);
            expect(isPaneEnabled('apps')).toBe(true);
        });

        it('returns false for unknown pane types', () => {
            expect(isPaneEnabled('nonexistent' as any)).toBe(false);
        });
    });

    describe('FUTURE_PANE_TYPES', () => {
        it('lists all future-tier pane types for quick lookup', () => {
            expect(FUTURE_PANE_TYPES).toContain('mail');
            expect(FUTURE_PANE_TYPES).toContain('calendar');
            expect(FUTURE_PANE_TYPES).toContain('integrations');
            expect(FUTURE_PANE_TYPES).toContain('terminal');
            expect(FUTURE_PANE_TYPES).toContain('actions');
            expect(FUTURE_PANE_TYPES).toContain('work-session');
            // apps promoted to 'app' tier:
            expect(FUTURE_PANE_TYPES).not.toContain('apps');
            // new app-platform types are 'app' tier:
            expect(FUTURE_PANE_TYPES).not.toContain('timeline');
            expect(FUTURE_PANE_TYPES).not.toContain('tasks');
            expect(FUTURE_PANE_TYPES).not.toContain('canvas');
        });

        it('does not include core_work or app panes', () => {
            expect(FUTURE_PANE_TYPES).not.toContain('finder');
            expect(FUTURE_PANE_TYPES).not.toContain('chat');
            expect(FUTURE_PANE_TYPES).not.toContain('scanner');
            expect(FUTURE_PANE_TYPES).not.toContain('document');
        });
    });

    describe('getCoreDockItems', () => {
        it('returns exactly 6 Dock entries in the correct order', () => {
            const items = getCoreDockItems();
            expect(items).toHaveLength(6);
            expect(items.map(i => i.action)).toEqual([
                'home', 'chat', 'finder', 'team', 'notes', 'settings',
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
