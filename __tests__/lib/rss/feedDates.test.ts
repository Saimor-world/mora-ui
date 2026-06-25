import {
    feedCadenceHint,
    formatLastUpdatedLabel,
    formatRelativeDe,
    sortFeedItemsByDateDesc,
} from '@/lib/rss/feedDates';
import type { RssFeedItem } from '@/lib/rss/parseRssItem';

describe('feedDates', () => {
    it('sorts items newest first by published timestamp', () => {
        const items: RssFeedItem[] = [
            { id: 'old', sourceTitle: 'A', title: 'Alt', published: '2026-06-20T10:00:00Z' },
            { id: 'new', sourceTitle: 'B', title: 'Neu', published: '2026-06-24T10:00:00Z' },
        ];

        expect(sortFeedItemsByDateDesc(items).map((item) => item.id)).toEqual(['new', 'old']);
    });

    it('formats relative German labels', () => {
        const recent = new Date(Date.now() - 15 * 60_000).toISOString();
        expect(formatRelativeDe(recent)).toBe('vor 15 Min.');
    });

    it('adds last-updated prefix', () => {
        const recent = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
        expect(formatLastUpdatedLabel(recent)).toBe('Zuletzt aktualisiert · vor 2 Std.');
    });

    it('explains xkcd cadence separately from generic feeds', () => {
        expect(feedCadenceHint('xkcd.com')).toContain('Mo/Mi/Fr');
        expect(feedCadenceHint('Sprudge')).toContain('Quelle');
    });
});
