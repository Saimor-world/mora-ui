"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    approveMemoryItem,
    getMemoryMetrics,
    getMemoryPending,
    getMemoryDebugScope,
    rejectMemoryItem,
    type MemoryDebugScope,
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
    const companies = useMoraStore((s) => s.companies);
    const [pendingItems, setPendingItems] = useState<ReviewItem[]>([]);
    const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
    const [debugScope, setDebugScope] = useState<MemoryDebugScope | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const scopedCompanyId = activeCompanyId || companies[0]?.id || null;

    // Load pending review items
    const loadPending = useCallback(async () => {
        if (!scopedCompanyId) {
            setPendingItems([]);
            return;
        }
        try {
            const data = await getMemoryPending(scopedCompanyId);
            if (Array.isArray(data)) {
                setPendingItems(data);
            }
        } catch (err) {
            console.error('[useMemory] Load pending error:', err);
        }
    }, [scopedCompanyId]);

    // Load metrics
    const loadMetrics = useCallback(async () => {
        if (!scopedCompanyId) {
            setMetrics(null);
            return;
        }
        try {
            const data = await getMemoryMetrics(scopedCompanyId);
            if (data && !data.error) {
                setMetrics(data);
            }
        } catch (err) {
            console.error('[useMemory] Load metrics error:', err);
        }
    }, [scopedCompanyId]);

    // Load debug scope (dev mode or ?diagnostics=1 query param)
    const loadDebugScope = useCallback(async () => {
        if (!scopedCompanyId) return;
        const isDev = process.env.NODE_ENV === 'development';
        const hasDiagnosticsParam =
            typeof window !== 'undefined' &&
            new URL(window.location.href).searchParams.has('diagnostics');
        if (!isDev && !hasDiagnosticsParam) return;
        try {
            const data = await getMemoryDebugScope(scopedCompanyId, 5);
            if (data) setDebugScope(data);
        } catch (err) {
            console.warn('[useMemory] Debug scope load failed:', err);
        }
    }, [scopedCompanyId]);

    // Refresh all
    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            await Promise.all([loadPending(), loadMetrics(), loadDebugScope()]);
        } catch (err) {
            setError('Fehler beim Laden');
        } finally {
            setIsLoading(false);
        }
    }, [loadPending, loadMetrics, loadDebugScope]);

    // Approve item
    const approve = useCallback(async (id: string) => {
        if (!scopedCompanyId) {
            toast.error('Keine aktive Company ausgewaehlt');
            return false;
        }
        try {
            await approveMemoryItem(id, scopedCompanyId);
            setPendingItems(prev => prev.filter(item => item.id !== id));
            toast.success('Insight gelernt');
            loadMetrics(); // Refresh metrics
            return true;
        } catch (err) {
            toast.error('Fehler beim Speichern');
            return false;
        }
    }, [loadMetrics, scopedCompanyId]);

    // Reject item
    const reject = useCallback(async (id: string) => {
        if (!scopedCompanyId) {
            toast.error('Keine aktive Company ausgewaehlt');
            return false;
        }
        try {
            await rejectMemoryItem(id, scopedCompanyId);
            setPendingItems(prev => prev.filter(item => item.id !== id));
            toast.info('Insight abgelehnt');
            return true;
        } catch (err) {
            toast.error('Fehler beim Ablehnen');
            return false;
        }
    }, [scopedCompanyId]);

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
        debugScope,
        isLoading,
        error,
        refresh,
        approve,
        reject,
    };
}
