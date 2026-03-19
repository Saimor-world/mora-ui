import { getSessionBodyText, getSessionExtendedNote } from '@/lib/utils/moraExplanation';
import type { WorkSessionShellSummary } from '@/lib/utils/moraExplanation';

const base: WorkSessionShellSummary = {
    planId: 'plan-1',
    state: 'pending',
    title: 'Test Plan',
};

describe('getSessionBodyText', () => {
    it('returns pending fallback when state is pending', () => {
        expect(getSessionBodyText(base)).toBe('Mora haelt den aktuellen Arbeitsplan im Scope bereit.');
    });

    it('returns singular confirmation copy for 1 pending step', () => {
        const s = { ...base, state: 'waiting_confirmation', stats: { pending_confirmations: 1 } };
        expect(getSessionBodyText(s)).toBe('Ein Schritt wartet auf Freigabe.');
    });

    it('returns plural confirmation copy for multiple pending steps', () => {
        const s = { ...base, state: 'waiting_confirmation', stats: { pending_confirmations: 3 } };
        expect(getSessionBodyText(s)).toBe('3 Schritte warten auf Freigabe.');
    });

    it('falls back to generic running copy when no progress data', () => {
        const s = { ...base, state: 'running' };
        expect(getSessionBodyText(s)).toBe('Mora arbeitet am Arbeitsplan.');
    });

    it('returns progress copy when running with completed steps', () => {
        const s = { ...base, state: 'running', stats: { completed_steps: 2, total_steps: 5 } };
        expect(getSessionBodyText(s)).toBe('2 von 5 Schritten abgeschlossen.');
    });

    it('returns completion copy for done with step counts', () => {
        const s = { ...base, state: 'done', stats: { completed_steps: 4, total_steps: 4 } };
        expect(getSessionBodyText(s)).toBe('4 von 4 Schritten abgeschlossen.');
    });

    it('returns generic done copy when no totals available', () => {
        const s = { ...base, state: 'done' };
        expect(getSessionBodyText(s)).toBe('Arbeitsplan abgeschlossen.');
    });
});

describe('getSessionExtendedNote', () => {
    it('returns null when no planned_steps set', () => {
        const s = { ...base, stats: { total_steps: 5 } };
        expect(getSessionExtendedNote(s)).toBeNull();
    });

    it('returns null when total equals planned', () => {
        const s = { ...base, stats: { total_steps: 3, planned_steps: 3 } };
        expect(getSessionExtendedNote(s)).toBeNull();
    });

    it('returns null when total is less than planned', () => {
        const s = { ...base, stats: { total_steps: 2, planned_steps: 3 } };
        expect(getSessionExtendedNote(s)).toBeNull();
    });

    it('returns singular note when one step was added', () => {
        const s = { ...base, stats: { total_steps: 4, planned_steps: 3 } };
        expect(getSessionExtendedNote(s)).toBe('Navigation hat einen Schritt zum Verlauf ergaenzt.');
    });

    it('returns plural note when multiple steps were added', () => {
        const s = { ...base, stats: { total_steps: 7, planned_steps: 3 } };
        expect(getSessionExtendedNote(s)).toBe('Navigation hat 4 Schritte zum Verlauf ergaenzt.');
    });

    it('returns null when stats is undefined', () => {
        expect(getSessionExtendedNote(base)).toBeNull();
    });

    // V5 segmentation tests
    it('V5: has_continuation true with 1 segment returns single continuation text', () => {
        const s = { ...base, stats: { has_continuation: true } };
        expect(getSessionExtendedNote(s)).toBe('Mora hat die Session fortgesetzt.');
    });

    it('V5: has_continuation true with continuation_segments=2 returns multi-continuation text', () => {
        const s = { ...base, stats: { has_continuation: true, continuation_segments: 2 } };
        expect(getSessionExtendedNote(s)).toBe('Mora hat die Session 2\u00d7 fortgesetzt.');
    });

    it('V5: has_continuation false returns null', () => {
        const s = { ...base, stats: { has_continuation: false } };
        expect(getSessionExtendedNote(s)).toBeNull();
    });

    it('Pre-V5 fallback: has_continuation absent, total > planned returns Navigation text', () => {
        const s = { ...base, stats: { total_steps: 7, planned_steps: 3 } };
        expect(getSessionExtendedNote(s)).toBe('Navigation hat 4 Schritte zum Verlauf ergaenzt.');
    });

    it('Pre-V5 fallback: has_continuation absent, total <= planned returns null', () => {
        const s = { ...base, stats: { total_steps: 3, planned_steps: 3 } };
        expect(getSessionExtendedNote(s)).toBeNull();
    });
});
