/**
 * V12: Connection Status Hook
 *
 * Monitors backend connectivity and provides:
 * - Online/Offline status
 * - Last successful connection time
 * - Retry mechanism
 *
 * Startup is intentionally tolerant: one transient cold-start failure should
 * not flash an offline banner before the second probe confirms the issue.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { coreGet } from '@/lib/api/coreClient';

export type ConnectionStatus = 'connected' | 'connecting' | 'offline' | 'error';

interface ConnectionState {
    status: ConnectionStatus;
    lastConnected: Date | null;
    errorMessage: string | null;
    retryCount: number;
}

const HEALTH_CHECK_INTERVAL = 60000;
const INITIAL_RETRY_DELAY_MS = 1200;

export function useConnectionStatus() {
    const [state, setState] = useState<ConnectionState>({
        status: 'connecting',
        lastConnected: null,
        errorMessage: null,
        retryCount: 0
    });

    const hasEverConnectedRef = useRef(false);
    const statusRef = useRef<ConnectionStatus>('connecting');
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    statusRef.current = state.status;
    retryCountRef.current = state.retryCount;

    const clearWarmRetry = () => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    };

    const checkHealth = useCallback(async (): Promise<boolean> => {
        const scheduleWarmRetry = () => {
            clearWarmRetry();
            retryTimerRef.current = setTimeout(() => {
                void checkHealth();
            }, INITIAL_RETRY_DELAY_MS);
        };

        try {
            const response = await coreGet('/v1/health', { isOptional: true, skipAuth: true });

            if (response && (response.status === 'healthy' || response.status === 'ok')) {
                clearWarmRetry();
                hasEverConnectedRef.current = true;
                setState({
                    status: 'connected',
                    lastConnected: new Date(),
                    errorMessage: null,
                    retryCount: 0
                });
                return true;
            }

            if (!hasEverConnectedRef.current && retryCountRef.current === 0) {
                setState(prev => ({
                    ...prev,
                    status: 'connecting',
                    errorMessage: null,
                    retryCount: 1
                }));
                scheduleWarmRetry();
                return false;
            }

            clearWarmRetry();
            setState(prev => ({
                ...prev,
                status: 'error',
                errorMessage: 'Backend unhealthy',
                retryCount: prev.retryCount + 1
            }));
            return false;
        } catch (error: any) {
            if (!hasEverConnectedRef.current && retryCountRef.current === 0) {
                setState(prev => ({
                    ...prev,
                    status: 'connecting',
                    errorMessage: null,
                    retryCount: 1
                }));
                scheduleWarmRetry();
                return false;
            }

            clearWarmRetry();
            setState(prev => ({
                ...prev,
                status: 'offline',
                errorMessage: error?.message || 'Connection failed',
                retryCount: prev.retryCount + 1
            }));
            return false;
        }
    }, []);

    const retry = useCallback(() => {
        clearWarmRetry();
        setState(prev => ({ ...prev, status: 'connecting', retryCount: 0 }));
        void checkHealth();
    }, [checkHealth]);

    useEffect(() => {
        void checkHealth();

        const interval = setInterval(() => {
            void checkHealth();
        }, HEALTH_CHECK_INTERVAL);

        const handleFocus = () => {
            if (statusRef.current === 'offline' || statusRef.current === 'error') {
                void checkHealth();
            }
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            clearWarmRetry();
            window.removeEventListener('focus', handleFocus);
        };
    }, [checkHealth]);

    return {
        ...state,
        isOnline: state.status === 'connected',
        isOffline: state.status === 'offline' || state.status === 'error',
        retry
    };
}
