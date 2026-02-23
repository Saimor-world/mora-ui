"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    approveMemoryItem,
    getMemoryMetrics,
    getMemoryPending,
    rejectMemoryItem,
} from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';
import { toast } from 'sonner';

interface ReviewItem {
    id: string;
    insight: string;
    category: string;
    risk_level: string;
    status: string;
    created_at: string;
}

interface MemoryMetrics {
    episodic_memories: Record<string, number>;
    structured_facts: number;
    pending_reviews: number;
    recent_learns_7d: number;
    memory_ttl_days: number;
}

export function useMemory() {
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const [pendingItems, setPendingItems] = useState<ReviewItem[]>([]);
    const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load pending review items
    const loadPending = useCallback(async () => {
        try {
            const data = await getMemoryPending(activeCompanyId || undefined);
            if (Array.isArray(data)) {
                setPendingItems(data);
            }
        } catch (err) {
            console.error('[useMemory] Load pending error:', err);
        }
    }, [activeCompanyId]);

    // Load metrics
    const loadMetrics = useCallback(async () => {
        try {
            const data = await getMemoryMetrics(activeCompanyId || undefined);
            if (data && !data.error) {
                setMetrics(data);
            }
        } catch (err) {
            console.error('[useMemory] Load metrics error:', err);
        }
    }, [activeCompanyId]);

    // Refresh all
    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            await Promise.all([loadPending(), loadMetrics()]);
        } catch (err) {
            setError('Fehler beim Laden');
        } finally {
            setIsLoading(false);
        }
    }, [loadPending, loadMetrics]);

    // Approve item
    const approve = useCallback(async (id: string) => {
        try {
            await approveMemoryItem(id, activeCompanyId || undefined);
            setPendingItems(prev => prev.filter(item => item.id !== id));
            toast.success('Insight gelernt');
            loadMetrics(); // Refresh metrics
            return true;
        } catch (err) {
            toast.error('Fehler beim Speichern');
            return false;
        }
    }, [activeCompanyId, loadMetrics]);

    // Reject item
    const reject = useCallback(async (id: string) => {
        try {
            await rejectMemoryItem(id, activeCompanyId || undefined);
            setPendingItems(prev => prev.filter(item => item.id !== id));
            toast.info('Insight abgelehnt');
            return true;
        } catch (err) {
            toast.error('Fehler beim Ablehnen');
            return false;
        }
    }, [activeCompanyId]);

    // Initial load
    useEffect(() => {
        refresh();
    }, [refresh]);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const interval = setInterval(refresh, 60000);
        return () => clearInterval(interval);
    }, [refresh]);

    return {
        pendingItems,
        pendingCount: pendingItems.length,
        metrics,
        isLoading,
        error,
        refresh,
        approve,
        reject,
    };
}
