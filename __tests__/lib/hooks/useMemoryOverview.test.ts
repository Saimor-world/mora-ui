/**
 * useMemoryOverview.test.ts
 *
 * Validates:
 *   1. Returns zero counts when no companyId is available.
 *   2. Calls getMemoryOverview and returns structured_facts as structuredFacts.
 *   3. Returns zeroes on error (never throws).
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useMemoryOverview } from '@/lib/hooks/useMemoryOverview';
import { getMemoryOverview } from '@/lib/api/coreClient';

// Mock coreClient so we can control getMemoryOverview per-test
jest.mock('@/lib/api/coreClient', () => ({
    getMemoryOverview: jest.fn(),
}));

// Mock the store — only needs activeCompanyId
jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: (selector: (s: any) => any) =>
        selector({ activeCompanyId: 'co-test', companies: [] }),
}));

const mockGetMemoryOverview = getMemoryOverview as jest.MockedFunction<typeof getMemoryOverview>;

describe('useMemoryOverview', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns zero counts when companyId is null', async () => {
        // manualCompanyId=null means "no company" — hook short-circuits to ZERO
        // without calling getMemoryOverview (null !== undefined, so no store fallback).
        const { result } = renderHook(() => useMemoryOverview(null));
        await waitFor(() => {
            expect(result.current.structuredFacts).toBe(0);
            expect(result.current.pendingReviews).toBe(0);
        });
        // The API should not have been called since companyId is null
        expect(mockGetMemoryOverview).not.toHaveBeenCalled();
    });

    it('returns structured_facts from overview response', async () => {
        mockGetMemoryOverview.mockResolvedValue({
            metrics: { structured_facts: 17, pending_reviews: 4, episodic_total: 11 },
        });

        const { result } = renderHook(() => useMemoryOverview('co-test'));
        await waitFor(() => {
            expect(result.current.structuredFacts).toBe(17);
            expect(result.current.pendingReviews).toBe(4);
            expect(result.current.episodicTotal).toBe(11);
        });
    });

    it('returns zeroes on fetch error without throwing', async () => {
        mockGetMemoryOverview.mockRejectedValue(new Error('network'));

        const { result } = renderHook(() => useMemoryOverview('co-err'));
        await waitFor(() => {
            expect(result.current.structuredFacts).toBe(0);
        });
    });
});
