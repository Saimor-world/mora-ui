import { renderHook } from '@testing-library/react';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';

let bridgeState = 'core_only';

jest.mock('@/lib/hooks/useIntegrationsOverview', () => ({
    useIntegrationsOverview: () => ({
        overview: {
            runtime: {
                surfaces: {
                    local_truth: 'http://127.0.0.1:3000/home',
                    connect_surface: 'about:saimor-connect',
                },
            },
            capabilities: {},
        },
        browserBridge: { permission: 'default', supported: true },
    }),
}));

jest.mock('@/lib/hooks/useLocalTruthBridge', () => ({
    useLocalTruthBridge: () => ({
        state: bridgeState,
        selectedUiUrl: bridgeState === 'core_only' ? null : 'http://127.0.0.1:3000/home',
        refresh: jest.fn(),
    }),
}));

describe('useCommunicationSurface Local Truth routing', () => {
    it('treats core_only as reachable but not safe to open as UI', () => {
        bridgeState = 'core_only';

        const { result } = renderHook(() => useCommunicationSurface());

        expect(result.current.summary.localTruthReachable).toBe(true);
        expect(result.current.summary.localTruthUiOpenable).toBe(false);
        expect(result.current.summary.connectSurfaceUrl).toBe('about:saimor-connect');
    });

    it.each(['ready', 'ui_only'])('allows opening Local Truth UI for %s', (state) => {
        bridgeState = state;

        const { result } = renderHook(() => useCommunicationSurface());

        expect(result.current.summary.localTruthUiOpenable).toBe(true);
    });
});
