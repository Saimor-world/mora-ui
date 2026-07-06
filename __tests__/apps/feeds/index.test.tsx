import React from 'react';
import { act, screen } from '@testing-library/react';
import FeedsApp from '@/apps/feeds';
import { feedsPaneRequest } from '@/lib/rss/feedsPane';
import { usePaneStore } from '@/lib/store/paneStore';
import { renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children, onClose, title }: any) => (
        <section data-testid="feed-glass-panel">
            <header>{title}</header>
            <button type="button" onClick={onClose}>Schliessen</button>
            {children}
        </section>
    ),
}));

jest.mock('@/components/feeds/FeedItemCard', () => ({
    FeedItemCard: ({ item }: any) => <article data-testid="feed-item">{item.title}</article>,
}));

jest.mock('@/lib/hooks/useCommunicationSurface', () => ({
    useCommunicationSurface: () => ({
        overview: {
            rss: {
                configured: true,
                feeds: [{ url: 'https://example.com/feed.xml' }],
                count: 1,
            },
        },
    }),
}));

jest.mock('@/lib/queries/useRssFeed', () => {
    const items = [
        {
            id: 'feed-1',
            title: 'Asteroid Threat',
            sourceTitle: 'xkcd.com',
            published: '2026-06-30T10:00:00Z',
        },
    ];
    const refetch = jest.fn();
    return {
        useRssFeed: () => ({
            data: items,
            isLoading: false,
            isFetching: false,
            refetch,
            error: null,
            dataUpdatedAt: Date.now(),
        }),
    };
});

beforeEach(() => {
    resetAllStores();
    usePaneStore.getState().reset();
});

it('does not crash when the feed pane disappears during close', () => {
    act(() => {
        usePaneStore.getState().openPane(feedsPaneRequest());
    });

    const { rerender } = renderWithProviders(<FeedsApp paneId="feeds-main" />);
    expect(screen.getByTestId('feed-glass-panel')).toBeInTheDocument();
    expect(screen.getByTestId('feed-item')).toHaveTextContent('Asteroid Threat');

    act(() => {
        usePaneStore.getState().removePane('feeds-main');
    });

    expect(() => rerender(<FeedsApp paneId="feeds-main" />)).not.toThrow();
    expect(screen.queryByTestId('feed-glass-panel')).not.toBeInTheDocument();
});
