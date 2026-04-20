"use client";

import { useCallback, useEffect, useState } from "react";
import { getMemoryOverview } from "@/lib/api/coreClient";
import { useNavStore } from "@/lib/store/navStore";

export interface MemoryOverviewCounts {
    structuredFacts: number;
    pendingReviews: number;
    episodicTotal: number;
}

const ZERO: MemoryOverviewCounts = {
    structuredFacts: 0,
    pendingReviews: 0,
    episodicTotal: 0,
};

export function useMemoryOverview(manualCompanyId?: string | null): MemoryOverviewCounts {
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    // Null means explicit "no company" and suppresses the fetch.
    const scopedCompanyId =
        manualCompanyId !== undefined
            ? manualCompanyId
            : activeCompanyId ?? null;

    const [counts, setCounts] = useState<MemoryOverviewCounts>(ZERO);

    const load = useCallback(async () => {
        if (!scopedCompanyId) {
            setCounts(ZERO);
            return;
        }
        try {
            const data = await getMemoryOverview(scopedCompanyId);
            if (data?.metrics) {
                setCounts({
                    structuredFacts: data.metrics.structured_facts ?? 0,
                    pendingReviews: data.metrics.pending_reviews ?? 0,
                    episodicTotal: data.metrics.episodic_total ?? 0,
                });
            } else {
                setCounts(ZERO);
            }
        } catch {
            // Best-effort — badge counts are non-critical
            setCounts(ZERO);
        }
    }, [scopedCompanyId]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        const t = setInterval(() => { void load(); }, 60_000);
        return () => clearInterval(t);
    }, [load]);

    return counts;
}
