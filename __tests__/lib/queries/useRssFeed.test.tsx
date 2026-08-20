import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRssFeed } from '@/lib/queries/useRssFeed';
import { queryKeys } from '@/lib/queries/queryKeys';
import { coreGet } from '@/lib/api/coreClient';

jest.mock('@/lib/api/coreClient', () => ({ coreGet: jest.fn().mockResolvedValue({ items: [] }) }));

function createWrapper() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe('useRssFeed tenant scope', () => {
    beforeEach(() => jest.clearAllMocks());

    it('includes the company in both request and cache identity', async () => {
        const { result } = renderHook(() => useRssFeed(30, true, 'company-alpha'), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(coreGet).toHaveBeenCalledWith(
            '/v3/integrations/rss/items?limit=30&company_id=company-alpha',
            { isOptional: true },
        );
        expect(queryKeys.rssFeed(30, 'company-alpha')).not.toEqual(queryKeys.rssFeed(30, 'company-beta'));
    });

    it('keeps the account-wide endpoint only when no company is selected', async () => {
        const { result } = renderHook(() => useRssFeed(5, true, null), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(coreGet).toHaveBeenCalledWith('/v3/integrations/rss/items?limit=5', { isOptional: true });
    });
});
