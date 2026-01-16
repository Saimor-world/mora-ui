/**
 * useAutonomousCognition - React Hook for MÔRA's Proactive Intelligence
 * 
 * This hook provides:
 * - Proactive suggestions polling
 * - Content enrichment triggers
 * - Context synthesis
 * - Cognition status monitoring
 * 
 * Usage:
 * const { suggestions, enrichNode, synthesize, isActive } = useAutonomousCognition();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getProactiveSuggestions,
    triggerWorkspaceAnalysis,
    enrichContent,
    synthesizeContext,
    getCognitionStatus,
    type ProactiveSuggestion,
    type EnrichmentResult,
    type SynthesisResult,
    type CognitionStatus
} from '@/lib/api/cognitionClient';

interface UseAutonomousCognitionOptions {
    /** Enable automatic suggestion polling */
    autoPolling?: boolean;
    /** Polling interval in ms (default: 60000 = 1 min) */
    pollingInterval?: number;
    /** Whether to trigger initial analysis on mount */
    analyzeOnMount?: boolean;
}

export function useAutonomousCognition(options: UseAutonomousCognitionOptions = {}) {
    const {
        autoPolling = true,
        pollingInterval = 60000,
        analyzeOnMount = false
    } = options;

    // State
    const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
    const [status, setStatus] = useState<CognitionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Refs for cleanup
    const mountedRef = useRef(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch suggestions
    const fetchSuggestions = useCallback(async () => {
        if (!mountedRef.current) return;

        try {
            const newSuggestions = await getProactiveSuggestions();
            if (mountedRef.current) {
                setSuggestions(newSuggestions);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.warn('[useAutonomousCognition] Fetch failed:', error);
        }
    }, []);

    // Fetch status
    const fetchStatus = useCallback(async () => {
        if (!mountedRef.current) return;

        try {
            const newStatus = await getCognitionStatus();
            if (mountedRef.current && newStatus) {
                setStatus(newStatus);
            }
        } catch (error) {
            console.warn('[useAutonomousCognition] Status fetch failed:', error);
        }
    }, []);

    // Trigger analysis
    const analyze = useCallback(async (deep: boolean = false) => {
        setIsLoading(true);
        try {
            const result = await triggerWorkspaceAnalysis(deep);
            // Refresh suggestions after analysis
            await fetchSuggestions();
            return result;
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [fetchSuggestions]);

    // Enrich a node
    const enrichNode = useCallback(async (
        nodeId: string,
        title: string,
        content: string
    ): Promise<EnrichmentResult> => {
        setIsLoading(true);
        try {
            return await enrichContent(nodeId, title, content);
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    // Synthesize context
    const synthesize = useCallback(async (nodeId: string): Promise<SynthesisResult> => {
        setIsLoading(true);
        try {
            return await synthesizeContext(nodeId);
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    // Dismiss a suggestion
    const dismissSuggestion = useCallback((index: number) => {
        setSuggestions(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Polling loop
    useEffect(() => {
        mountedRef.current = true;

        // Initial fetch
        fetchSuggestions();
        fetchStatus();

        // Optional: Run analysis on mount
        if (analyzeOnMount) {
            analyze(false);
        }

        // Set up polling
        if (autoPolling) {
            const poll = () => {
                fetchSuggestions();
                if (mountedRef.current) {
                    timeoutRef.current = setTimeout(poll, pollingInterval);
                }
            };
            timeoutRef.current = setTimeout(poll, pollingInterval);
        }

        return () => {
            mountedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [autoPolling, pollingInterval, analyzeOnMount, fetchSuggestions, fetchStatus, analyze]);

    return {
        // Data
        suggestions,
        status,
        isActive: status?.active ?? false,
        queueLength: status?.queue_length ?? 0,
        lastUpdate,

        // Loading state
        isLoading,

        // Actions
        analyze,
        enrichNode,
        synthesize,
        dismissSuggestion,
        refresh: fetchSuggestions
    };
}

export default useAutonomousCognition;
