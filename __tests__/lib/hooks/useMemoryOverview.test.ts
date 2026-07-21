/**
 * useMemoryOverview.test.ts
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useMemoryOverview } from '@/lib/hooks/useMemoryOverview';
import { getMemoryOverview } from '@/lib/api/coreClient';
import { resetAllStores, createTestQueryClient } from '../../test-utils';

// Mock coreClient so we can control getMemoryOverview per-test
jest.mock('@/lib/api/coreClient', () => ({
    getMemoryOverview: jest.fn(),
}));

const mockGetMemoryOverview = getMemoryOverview as jest.MockedFunction<typeof getMemoryOverview>;

beforeEach(resetAllStores);

describe('useMemoryOverview', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    function wrapper({ children }: { children: React.ReactNode }) {
        const qc = createTestQueryClient();
        return React.createElement(QueryClientProvider, { client: qc }, children);
    }

    it('returns zero counts when companyId is null', async () => {
        // manualCompanyId=null means "no company" — hook short-circuits to ZERO
        // without calling getMemoryOverview (null !== undefined, so no store fallback).
        const { result } = renderHook(() => useMemoryOverview(null), { wrapper });
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

        const { result } = renderHook(() => useMemoryOverview('co-test'), { wrapper });
        await waitFor(() => {
            expect(result.current.structuredFacts).toBe(17);
            expect(result.current.pendingReviews).toBe(4);
            expect(result.current.episodicTotal).toBe(11);
        });
    });

    it('returns zeroes on fetch error without throwing', async () => {
        mockGetMemoryOverview.mockRejectedValue(new Error('network'));

        const { result } = renderHook(() => useMemoryOverview('co-err'), { wrapper });
        await waitFor(() => {
            expect(result.current.structuredFacts).toBe(0);
        });
    });
});
