"use client";

import { useCallback, useEffect, useState } from "react";
import { getMemoryOverview, type MemoryOverview } from "@/lib/api/coreClient";
import { useNavStore } from "@/lib/store/navStore";

export function useMemorySurface(manualCompanyId?: string | null) {
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const scopedCompanyId =
        manualCompanyId !== undefined
            ? manualCompanyId
            : activeCompanyId ?? null;

    const [surface, setSurface] = useState<MemoryOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        if (!scopedCompanyId) {
            setSurface(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const data = await getMemoryOverview(scopedCompanyId);
            setSurface(data);
        } catch {
            setSurface(null);
        } finally {
            setIsLoading(false);
        }
    }, [scopedCompanyId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const timer = setInterval(() => {
            void load();
        }, 60_000);
        return () => clearInterval(timer);
    }, [load]);

    return {
        surface,
        isLoading,
        refresh: load,
    };
}
