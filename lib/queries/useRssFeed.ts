'use client';

import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/coreClient';
import { normalizeList } from '@/lib/api/http';
import { queryKeys, STALE_TIMES } from '@/lib/queries/queryKeys';
import { parseRssItem, type RssFeedItem } from '@/lib/rss/parseRssItem';
import { sortFeedItemsByDateDesc } from '@/lib/rss/feedDates';

export type { RssFeedItem };

export function useRssFeed(limit = 30, enabled = true) {
    return useQuery({
        queryKey: queryKeys.rssFeed(limit),
        queryFn: async (): Promise<RssFeedItem[]> => {
            const data = await coreGet(`/v3/integrations/rss/items?limit=${limit}`, { isOptional: true });
            const items = normalizeList<Record<string, unknown>>(data, ['items', 'feeds', 'data']);
            return sortFeedItemsByDateDesc(items.map(parseRssItem));
        },
        enabled,
        staleTime: STALE_TIMES.rssFeed,
        refetchInterval: STALE_TIMES.rssFeed,
        refetchIntervalInBackground: false,
        refetchOnMount: (query) => query.isStale(),
        placeholderData: (previous) => previous,
    });
}
