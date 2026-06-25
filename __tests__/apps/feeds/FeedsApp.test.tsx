import React from 'react';
import { render, screen } from '@testing-library/react';
import FeedsApp from '@/apps/feeds';
import { usePaneStore } from '@/lib/store/paneStore';

jest.mock('@/lib/queries/useRssFeed', () => ({
    useRssFeed: () => ({
        data: [],
        isLoading: false,
        isFetching: false,
        refetch: jest.fn(),
        error: null,
        dataUpdatedAt: Date.now(),
    }),
}));

jest.mock('@/lib/hooks/useCommunicationSurface', () => ({
    useCommunicationSurface: () => ({
        overview: { rss: { configured: true, feeds: [{ id: 'rss_xkcd' }], count: 1 } },
    }),
}));

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children, zIndex }: { children: React.ReactNode; zIndex?: number }) => (
        <div data-testid="glass-panel" data-z-index={zIndex}>{children}</div>
    ),
}));

describe('FeedsApp', () => {
    beforeEach(() => {
        usePaneStore.setState({
            panes: [{
                id: 'feeds-main',
                type: 'feeds',
                title: 'Dein Feed',
                position: { x: 120, y: 80 },
                size: { width: 920, height: 640 },
                minimized: false,
                zIndex: 512,
            }],
            nextZIndex: 513,
            activePaneId: 'feeds-main',
        });
    });

    it('passes pane zIndex to GlassPanel so the sheet stacks above Home (z-44)', () => {
        render(<FeedsApp paneId="feeds-main" />);
        expect(screen.getByTestId('glass-panel')).toHaveAttribute('data-z-index', '512');
    });
});
