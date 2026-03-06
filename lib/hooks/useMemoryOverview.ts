"use client";

import { useCallback, useEffect, useState } from "react";
import { getMemoryOverview } from "@/lib/api/coreClient";
import { useMoraStore } from "@/lib/store/moraState";

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
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const companies = useMoraStore((s) => s.companies);
    const safeCompanies = Array.isArray(companies) ? companies : [];
    // Strict undefined-check: null is treated as explicit "no company" (suppresses fetch).
    // This differs from useMemoryPendingCount which uses || (falsy semantics).
    const scopedCompanyId =
        manualCompanyId !== undefined
            ? manualCompanyId
            : activeCompanyId ?? safeCompanies[0]?.id ?? null;

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
