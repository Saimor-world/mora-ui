import { useCallback, useRef, useState } from 'react';
import { connectDemoSource, fetchDemoInstance, forceResetDemo, type DemoInstanceState } from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';

export function useDemoFlow() {
    const { loadTree } = useMoraStore();
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasRunRef = useRef(false);

    const runDemoFlow = useCallback(async (tenantId?: string): Promise<DemoInstanceState | null> => {
        if (isRunning) return null;
        setIsRunning(true);
        setError(null);
        try {
            await forceResetDemo();
            await connectDemoSource('simple_coffee_group');
            const instance = await fetchDemoInstance();
            const resolvedTenant = tenantId || instance?.tenant_id;
            await loadTree(resolvedTenant || undefined);
            hasRunRef.current = true;
            return instance;
        } catch (err: any) {
            setError(err?.message || 'Failed to run demo flow');
            throw err;
        } finally {
            setIsRunning(false);
        }
    }, [isRunning, loadTree]);

    return {
        runDemoFlow,
        isRunning,
        error,
        hasRun: hasRunRef.current,
    };
}
