import { splitAtPlannedSteps } from '@/components/panes/WorkSessionPane';

const makeStep = (id: string) => ({
    step_id: id,
    kind: 'navigate',
    title: `Step ${id}`,
    status: 'done' as const,
});

describe('splitAtPlannedSteps', () => {
    it('returns all steps as original when no plannedCount given', () => {
        const steps = [makeStep('a'), makeStep('b'), makeStep('c')];
        const { original, continuation } = splitAtPlannedSteps(steps, null);
        expect(original).toHaveLength(3);
        expect(continuation).toHaveLength(0);
    });

    it('returns all steps as original when plannedCount >= steps.length', () => {
        const steps = [makeStep('a'), makeStep('b')];
        const { original, continuation } = splitAtPlannedSteps(steps, 5);
        expect(original).toHaveLength(2);
        expect(continuation).toHaveLength(0);
    });

    it('splits correctly when continuation exists', () => {
        const steps = [makeStep('a'), makeStep('b'), makeStep('c'), makeStep('d')];
        const { original, continuation } = splitAtPlannedSteps(steps, 2);
        expect(original).toHaveLength(2);
        expect(continuation).toHaveLength(2);
        expect(original[0].step_id).toBe('a');
        expect(continuation[0].step_id).toBe('c');
    });

    it('handles empty steps array', () => {
        const { original, continuation } = splitAtPlannedSteps([], 3);
        expect(original).toHaveLength(0);
        expect(continuation).toHaveLength(0);
    });

    it('returns all as original when plannedCount is 0', () => {
        const steps = [makeStep('a'), makeStep('b')];
        const { original, continuation } = splitAtPlannedSteps(steps, 0);
        expect(original).toHaveLength(2);
        expect(continuation).toHaveLength(0);
    });
});
