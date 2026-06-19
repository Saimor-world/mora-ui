import { groupStepsBySegment } from '@/apps/work-session';
import type { WorkSessionSegmentSummary, WorkSessionStep } from '@/lib/api/coreClient';

// Minimal step factory
function makeStep(
    step_id: string,
    segment_index?: number,
): WorkSessionStep {
    return {
        step_id,
        kind: 'search',
        status: 'done',
        title: `Step ${step_id}`,
        ...(segment_index !== undefined ? { segment_index } : {}),
    } as WorkSessionStep;
}

// Minimal summary factory
function makeSummary(
    segment_index: number,
    origin: WorkSessionSegmentSummary['origin'] = 'planning',
): WorkSessionSegmentSummary {
    return { segment_index, origin };
}

// ─── Test 1: Primary path — segment_summaries present, steps match summaries ──
describe('groupStepsBySegment', () => {
    it('primary path: returns 2 groups aligned to 2 summaries', () => {
        const summaries = [makeSummary(0), makeSummary(1, 'continuation')];
        const steps = [
            makeStep('a', 0),
            makeStep('b', 0),
            makeStep('c', 1),
        ];
        const result = groupStepsBySegment(steps, summaries);

        expect(result).toHaveLength(2);
        expect(result[0].summary).toEqual(summaries[0]);
        expect(result[0].steps).toHaveLength(2);
        expect(result[0].steps.map((s) => s.step_id)).toEqual(['a', 'b']);
        expect(result[1].summary).toEqual(summaries[1]);
        expect(result[1].steps).toHaveLength(1);
        expect(result[1].steps[0].step_id).toBe('c');
    });

    // ─── Test 2: Primary path — orphan step (segment_index not in summaries) ──
    it('primary path: orphan step produces null-summary group; total steps preserved; ascending order', () => {
        const summaries = [makeSummary(0)];
        const steps = [
            makeStep('a', 0),
            makeStep('b', 1), // no matching summary
        ];
        const result = groupStepsBySegment(steps, summaries);

        expect(result).toHaveLength(2);
        // Group for index 0 has its summary
        expect(result[0].summary).toEqual(summaries[0]);
        expect(result[0].steps.map((s) => s.step_id)).toEqual(['a']);
        // Group for orphan index 1 has null summary
        expect(result[1].summary).toBeNull();
        expect(result[1].steps.map((s) => s.step_id)).toEqual(['b']);
        // Total steps preserved
        const allSteps = result.flatMap((g) => g.steps);
        expect(allSteps).toHaveLength(2);
        // Ascending order
        expect(result[0].summary?.segment_index ?? 0).toBeLessThan(
            result[1].summary?.segment_index ?? 1,
        );
    });

    // ─── Test 3: Fallback 1 — no summaries, steps have segment_index > 0 ──────
    it('fallback 1: no summaries + steps with segment_index → groups by distinct index', () => {
        const steps = [
            makeStep('a', 0),
            makeStep('b', 1),
        ];
        const result = groupStepsBySegment(steps, undefined);

        expect(result).toHaveLength(2);
        expect(result[0].summary).toBeNull();
        expect(result[0].steps.map((s) => s.step_id)).toEqual(['a']);
        expect(result[1].summary).toBeNull();
        expect(result[1].steps.map((s) => s.step_id)).toEqual(['b']);
    });

    // ─── Test 4: Fallback 2 — no summaries, no step segment_index (pre-V5) ────
    it('fallback 2: no summaries, no segment_index on steps → 1 flat group with all steps', () => {
        const steps = [
            makeStep('a'),
            makeStep('b'),
            makeStep('c'),
        ];
        const result = groupStepsBySegment(steps, undefined);

        expect(result).toHaveLength(1);
        expect(result[0].summary).toBeNull();
        expect(result[0].steps).toHaveLength(3);
        expect(result[0].steps.map((s) => s.step_id)).toEqual(['a', 'b', 'c']);
    });

    // ─── Test 5: Primary path — summary exists but no matching steps ──────────
    it('primary path: summary with no matching steps → empty steps array; other groups intact', () => {
        const summaries = [makeSummary(0), makeSummary(1, 'continuation')];
        const steps = [
            makeStep('a', 0),
            makeStep('b', 0),
        ];
        const result = groupStepsBySegment(steps, summaries);

        expect(result).toHaveLength(2);
        expect(result[0].summary?.segment_index).toBe(0);
        expect(result[0].steps).toHaveLength(2);
        expect(result[1].summary?.segment_index).toBe(1);
        expect(result[1].steps).toHaveLength(0);
    });

    // ─── Test 6: Empty steps — returns one empty group (no crash) ─────────────
    it('empty steps: returns 1 group with summary null and empty steps array', () => {
        const result = groupStepsBySegment([], undefined);

        expect(result).toHaveLength(1);
        expect(result[0].summary).toBeNull();
        expect(result[0].steps).toHaveLength(0);
    });
});
