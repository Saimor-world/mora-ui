import React from 'react';
import { render, screen } from '@testing-library/react';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import type { WidgetContext } from '@/lib/widgets/types';

const RenderDeinFeed = WIDGET_REGISTRY.deinFeed.render;

describe('DeinFeedWidget', () => {
    it('shows hero thumbnail in compact home glance using imageUrl', () => {
        const context: WidgetContext = {
            surface: 'home',
            compact: true,
            data: {
                mailState: 'configured',
                calendarState: 'configured',
                cloudState: 'unconfigured',
                rssState: 'configured',
                feedPreview: [{
                    id: 'xkcd-1',
                    sourceTitle: 'xkcd',
                    title: 'Baryon Asymmetry',
                    imageUrl: 'https://imgs.xkcd.com/comics/baryon_asymmetry.png',
                }],
            },
            openFeed: jest.fn(),
        };

        render(<RenderDeinFeed context={context} />);

        expect(screen.getByTestId('feed-hero-thumb')).toBeInTheDocument();
        const image = screen.getByTestId('feed-hero-thumb').querySelector('img');
        expect(image).toHaveAttribute('src', 'https://imgs.xkcd.com/comics/baryon_asymmetry.png');
        expect(screen.getByText('Baryon Asymmetry')).toBeInTheDocument();
        expect(screen.getByText('xkcd')).toBeInTheDocument();
    });
});
