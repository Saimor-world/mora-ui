// __tests__/lib/surface/paneManagerGating.test.ts
//
// Verifies that PaneManager gates future-tier pane types via isPaneEnabled.
// We test the gating logic at the registry level (unit) rather than render-testing
// PaneManager (which has heavy component deps). The contract is:
//   PaneRenderer returns null for any pane type where isPaneEnabled() === false.
//
// This test verifies that isPaneEnabled correctly partitions ALL known pane types
// and that the FUTURE_PANE_TYPES set matches the PaneManager case statements
// that should be gated.

import { isPaneEnabled, SURFACE_TIERS, FUTURE_PANE_TYPES } from '@/lib/surface/surfaceRegistry';

describe('PaneManager gating contract', () => {
    // These are the exact case labels in PaneManager.tsx PaneRenderer switch
    const PANE_MANAGER_CASES = [
        'settings', 'apps', 'grid', 'space', 'document', 'search',
        'team', 'mail', 'integrations', 'calendar', 'terminal',
        'notes', 'finder', 'scanner', 'users', 'company-detail',
        'chat', 'mora-hub', 'actions', 'work-session', 'meine-dateien',
    ] as const;

    it('every PaneManager case is registered in SURFACE_TIERS', () => {
        for (const caseType of PANE_MANAGER_CASES) {
            expect(SURFACE_TIERS).toHaveProperty(caseType);
        }
    });

    it('gated types match the PaneManager cases that should not render', () => {
        const gatedCases = PANE_MANAGER_CASES.filter(c => !isPaneEnabled(c));
        // Must match FUTURE_PANE_TYPES exactly
        expect(new Set(gatedCases)).toEqual(new Set(FUTURE_PANE_TYPES));
    });

    it('enabled types cover all core_work and app surfaces', () => {
        const enabledCases = PANE_MANAGER_CASES.filter(c => isPaneEnabled(c));
        // Must include all essential 1.0 surfaces
        expect(enabledCases).toContain('finder');
        expect(enabledCases).toContain('document');
        expect(enabledCases).toContain('chat');
        expect(enabledCases).toContain('team');
        expect(enabledCases).toContain('settings');
        expect(enabledCases).toContain('meine-dateien');
        expect(enabledCases).toContain('notes');
        expect(enabledCases).toContain('scanner');
        expect(enabledCases).toContain('users');
    });

    it('no enabled type has tier "future"', () => {
        for (const caseType of PANE_MANAGER_CASES) {
            if (isPaneEnabled(caseType)) {
                expect(SURFACE_TIERS[caseType]).not.toBe('future');
            }
        }
    });
});
