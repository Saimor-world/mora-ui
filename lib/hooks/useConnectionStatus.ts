/**
 * V12: Connection Status Hook
 *
 * Monitors backend connectivity and provides:
 * - Online/Offline status
 * - Last successful connection time
 * - Retry mechanism
 */

import { useState, useEffect, useCallback } from 'react';
import { coreGet } from '@/lib/api/coreClient';

export type ConnectionStatus = 'connected' | 'connecting' | 'offline' | 'error';

interface ConnectionState {
    status: ConnectionStatus;
    lastConnected: Date | null;
    errorMessage: string | null;
    retryCount: number;
}

const HEALTH_CHECK_INTERVAL = 60000; // Check every 60 seconds
const MAX_RETRIES = 3;

export function useConnectionStatus() {
    const [state, setState] = useState<ConnectionState>({
        status: 'connecting',
        lastConnected: null,
        errorMessage: null,
        retryCount: 0
    });

    const checkHealth = useCallback(async () => {
        try {
            // Health should be reachable without auth; otherwise an unauthenticated UI would falsely show "offline".
            const response = await coreGet('/v1/health', { isOptional: true, skipAuth: true });

            if (response && response.status === 'healthy') {
                setState({
                    status: 'connected',
                    lastConnected: new Date(),
                    errorMessage: null,
                    retryCount: 0
                });
                return true;
            } else {
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    errorMessage: 'Backend unhealthy',
                    retryCount: prev.retryCount + 1
                }));
                return false;
            }
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                status: 'offline',
                errorMessage: error.message || 'Connection failed',
                retryCount: prev.retryCount + 1
            }));
            return false;
        }
    }, []);

    const retry = useCallback(() => {
        setState(prev => ({ ...prev, status: 'connecting', retryCount: 0 }));
        checkHealth();
    }, [checkHealth]);

    useEffect(() => {
        // Initial check
        checkHealth();

        // Periodic health checks
        const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

        // Also check on window focus (user returns to tab)
        const handleFocus = () => {
            if (state.status === 'offline' || state.status === 'error') {
                checkHealth();
            }
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [checkHealth, state.status]);

    return {
        ...state,
        isOnline: state.status === 'connected',
        isOffline: state.status === 'offline' || state.status === 'error',
        retry
    };
}
