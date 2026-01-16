"use client";

import { useEffect, useState } from "react";
import { useMoraStore } from "@/lib/store/moraState";
import { coreGet } from "@/lib/api/coreClient";

export interface IntelHint {
    title?: string;
    summary?: string;
    relations?: any[];
    neighbours?: any[];
    suggestions?: any[];
}

export function useIntelFeed() {
    const activeNode = useMoraStore((s) => s.activeNode);
    const setOrbState = useMoraStore((s) => s.setOrbState);
    const [hint, setHint] = useState<IntelHint | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!activeNode) {
                setHint(null);
                return;
            }
            setIsLoading(true);
            try {
                const res = await coreGet(`/v1/intel/node/${activeNode.id}/context`, { isOptional: true });
                if (!cancelled) {
                    setHint(res || null);
                }
            } catch (e) {
                if (!cancelled) {
                    setHint(null);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [activeNode?.id]);

    // Update orb to "learning" briefly when loading
    useEffect(() => {
        if (isLoading) {
            setOrbState('thinking');
        }
    }, [isLoading, setOrbState]);

    return { hint, isLoading };
}
