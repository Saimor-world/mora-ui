"use client";

import { useCallback, useEffect, useState } from "react";
import { getMemoryPending } from "@/lib/api/coreClient";
import { useMoraStore } from "@/lib/store/moraState";

export function useMemoryPendingCount(manualCompanyId?: string | null) {
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const companies = useMoraStore((s) => s.companies);
    const safeCompanies = Array.isArray(companies) ? companies : [];
    const scopedCompanyId = manualCompanyId || activeCompanyId || safeCompanies[0]?.id || null;
    const [pendingCount, setPendingCount] = useState(0);

    const load = useCallback(async () => {
        if (!scopedCompanyId) {
            setPendingCount(0);
            return;
        }
        try {
            const data = await getMemoryPending(scopedCompanyId);
            setPendingCount(Array.isArray(data) ? data.length : 0);
        } catch {
            // Keep dock resilient: count badge is best-effort.
            setPendingCount(0);
        }
    }, [scopedCompanyId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const t = setInterval(() => {
            void load();
        }, 60000);
        return () => clearInterval(t);
    }, [load]);

    return pendingCount;
}
