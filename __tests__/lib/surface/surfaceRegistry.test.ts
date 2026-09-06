// __tests__/lib/surface/surfaceRegistry.test.ts
//
// Surface Hierarchy Registry — canonical source of truth for the active OS hierarchy.

import {
    SURFACE_TIERS,
    isPaneEnabled,
    getCoreDockItems,
    FUTURE_PANE_TYPES,
    getTier,
} from '@/lib/surface/surfaceRegistry';

describe('surfaceRegistry', () => {
    describe('SURFACE_TIERS', () => {
        it('categorizes every known pane type into exactly one tier', () => {
            const ALL_KNOWN_PANE_TYPES = [
                'settings', 'apps', 'grid', 'space', 'document', 'search',
                'team', 'mail', 'integrations', 'calendar', 'terminal',
                'notes', 'finder', 'scanner', 'users', 'company-detail',
                'chat', 'mora-hub', 'actions', 'action-center', 'work-session', 'meine-dateien',
                'timeline', 'tasks', 'canvas', 'lagefeld', 'nightwatch', 'codex',
                'wall', 'feeds', 'website-dossier', 'finance', 'work',
            ];

            for (const paneType of ALL_KNOWN_PANE_TYPES) {
                const tier = getTier(paneType);
                expect(tier).toBeDefined();
                expect(['core_work', 'app', 'future']).toContain(tier);
            }
        });

        it('assigns core_work to the small set of operating surfaces', () => {
            const coreWork = Object.entries(SURFACE_TIERS)
                .filter(([, tier]) => tier === 'core_work')
                .map(([type]) => type);

            expect(coreWork).toEqual(expect.arrayContaining([
                'work', 'finder', 'document', 'chat', 'team', 'settings', 'finance',
            ]));
            expect(coreWork).not.toContain('notes');
            expect(coreWork).not.toContain('meine-dateien');
        });

        it('keeps operational programs enabled as app surfaces', () => {
            expect(SURFACE_TIERS['mail']).toBe('app');
            expect(SURFACE_TIERS['integrations']).toBe('app');
            expect(SURFACE_TIERS['terminal']).toBe('app');
            expect(SURFACE_TIERS['actions']).toBe('app');
            expect(SURFACE_TIERS['work-session']).toBe('app');
            expect(SURFACE_TIERS['apps']).toBe('app');
        });

        it('registers the app-platform surfaces', () => {
            expect(SURFACE_TIERS['timeline']).toBe('app');
            expect(SURFACE_TIERS['tasks']).toBe('app');
            expect(SURFACE_TIERS['canvas']).toBe('app');
            expect(SURFACE_TIERS['lagefeld']).toBe('app');
            expect(SURFACE_TIERS['nightwatch']).toBe('app');
            expect(SURFACE_TIERS['codex']).toBe('app');
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
            expect(isPaneEnabled('work')).toBe(true);
            expect(isPaneEnabled('finance')).toBe(true);
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
            expect(isPaneEnabled('work-session')).toBe(true);
        });

        it('returns true for app-platform types', () => {
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
        it('does not include active core or app panes', () => {
            for (const pane of [
                'work', 'finance', 'finder', 'chat', 'document', 'mail', 'calendar',
                'integrations', 'terminal', 'actions', 'work-session', 'apps',
                'timeline', 'tasks', 'canvas', 'lagefeld',
            ]) {
                expect(FUTURE_PANE_TYPES).not.toContain(pane);
            }
        });
    });

    describe('getCoreDockItems', () => {
        it('keeps the permanent Dock intentionally small and ordered', () => {
            const items = getCoreDockItems();
            expect(items).toHaveLength(6);
            expect(items.map(i => i.action)).toEqual([
                'home', 'cockpit', 'chat', 'map', 'settings', 'desk',
            ]);
            expect(items.map(i => i.label)).toEqual([
                'Home', 'Arbeit', 'MÔRA', 'Universe', 'Setup', 'Saimôr Desk',
            ]);
        });

        it('each item has label, action, and description', () => {
            const items = getCoreDockItems();
            for (const item of items) {
                expect(item.label).toBeTruthy();
                expect(item.action).toBeTruthy();
                expect(item.description).toBeTruthy();
            }
        });
    });
});
