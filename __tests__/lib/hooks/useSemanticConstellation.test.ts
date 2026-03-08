/**
 * useSemanticConstellation — v3 migration tests
 */
import { renderHook, act } from '@testing-library/react';
import { useSemanticConstellation } from '@/lib/hooks/useSemanticConstellation';

// Mock coreClient dynamic import
jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
}));

describe('useSemanticConstellation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('fetches from /v3/relations/preview not /v1/', async () => {
        const { coreGet } = await import('@/lib/api/coreClient');
        (coreGet as jest.Mock).mockResolvedValue([
            { source: 'node-a', target: 'node-b', weight: 0.8 }
        ]);

        const { result } = renderHook(() => useSemanticConstellation());
        const nodePosMap = new Map([
            ['node-a', { x: 10, y: 20 }],
            ['node-b', { x: 50, y: 60 }],
        ]);

        await act(async () => {
            await result.current.fetchConstellation('node-a', nodePosMap);
        });

        expect(coreGet).toHaveBeenCalledWith(
            expect.stringContaining('/v3/relations/preview'),
            expect.anything()
        );
        expect(coreGet).not.toHaveBeenCalledWith(
            expect.stringContaining('/v1/'),
            expect.anything()
        );
    });

    it('returns empty connections when response is not an array', async () => {
        const { coreGet } = await import('@/lib/api/coreClient');
        (coreGet as jest.Mock).mockResolvedValue(null);

        const { result } = renderHook(() => useSemanticConstellation());

        await act(async () => {
            await result.current.fetchConstellation('node-a', new Map());
        });

        expect(result.current.connections).toEqual([]);
    });
});
