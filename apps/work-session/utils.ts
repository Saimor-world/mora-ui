import type { WorkSessionStep, WorkSessionSegmentSummary } from '@/lib/api/coreClient';

/** @deprecated Use groupStepsBySegment instead. */
export function splitAtPlannedSteps<T>(
    steps: T[],
    plannedCount: number | null | undefined,
): { original: T[]; continuation: T[] } {
    if (!plannedCount || plannedCount <= 0 || plannedCount >= steps.length) {
        return { original: steps, continuation: [] };
    }
    return {
        original: steps.slice(0, plannedCount),
        continuation: steps.slice(plannedCount),
    };
}

/**
 * Groups steps by segment, pairing each group with its segment summary.
 * Primary path: uses segment_summaries if present.
 * Fallback 1: groups by step.segment_index if any step has segment_index > 0.
 * Fallback 2: one flat group if no segmentation data at all.
 */
export function groupStepsBySegment(
    steps: WorkSessionStep[],
    summaries: WorkSessionSegmentSummary[] | undefined,
): Array<{ summary: WorkSessionSegmentSummary | null; steps: WorkSessionStep[] }> {
    const byIndex = new Map<number, WorkSessionStep[]>();
    for (const step of steps) {
        const idx = step.segment_index ?? 0;
        if (!byIndex.has(idx)) byIndex.set(idx, []);
        byIndex.get(idx)!.push(step);
    }

    if (summaries?.length) {
        const summaryMap = new Map<number, WorkSessionSegmentSummary>(
            summaries.map((s) => [s.segment_index, s])
        );
        const allIndices = new Set([
            ...summaries.map((s) => s.segment_index),
            ...byIndex.keys(),
        ]);
        return Array.from(allIndices)
            .sort((a, b) => a - b)
            .map((idx) => ({
                summary: summaryMap.get(idx) ?? null,
                steps: byIndex.get(idx) ?? [],
            }));
    }

    const hasSegmentation = Array.from(byIndex.keys()).some((k) => k > 0);
    if (hasSegmentation) {
        return Array.from(byIndex.keys())
            .sort((a, b) => a - b)
            .map((idx) => ({
                summary: null,
                steps: byIndex.get(idx) ?? [],
            }));
    }

    return [{ summary: null, steps }];
}
