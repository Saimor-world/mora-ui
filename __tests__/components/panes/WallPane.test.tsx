import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock coreGet
jest.mock('@/lib/api/http', () => ({
    coreGet: jest.fn(),
}));
import { coreGet } from '@/lib/api/http';

// Mock paneStore openPane
const mockOpenPane = jest.fn();
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (sel?: any) => {
        const state = { openPane: mockOpenPane };
        return typeof sel === 'function' ? sel(state) : state;
    },
}));

const MOCK_ENTRIES = [
    { id: 'entry-1', domain: 'acme.de', score: 28, grade: 'D', level: 'Kritisch', industry: 'Handwerk', message: 'War schockierend', confirmed_at: '2026-05-29T10:00:00Z' },
    { id: 'entry-2', domain: 'beta.de', score: 65, grade: 'B-', level: 'Mittel', industry: 'SaaS', confirmed_at: '2026-05-28T09:00:00Z' },
    { id: 'entry-3', domain: 'good.de', score: 91, grade: 'A', level: 'Sicher', confirmed_at: '2026-05-27T08:00:00Z' },
];

describe('WallPane', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (coreGet as jest.Mock).mockResolvedValue({ entries: MOCK_ENTRIES });
    });

    it('renders all entry cards after loading', async () => {
        const { WallPane } = await import('@/components/panes/WallPane');
        render(<WallPane />);
        await waitFor(() => {
            expect(screen.getByText('acme.de')).toBeInTheDocument();
            expect(screen.getByText('beta.de')).toBeInTheDocument();
            expect(screen.getByText('good.de')).toBeInTheDocument();
        });
    });

    it('filters to Kritisch entries only when filter chip clicked', async () => {
        const { WallPane } = await import('@/components/panes/WallPane');
        render(<WallPane />);
        await waitFor(() => expect(screen.getByText('acme.de')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /kritisch/i }));

        expect(screen.getByText('acme.de')).toBeInTheDocument();
        expect(screen.queryByText('beta.de')).not.toBeInTheDocument();
        expect(screen.queryByText('good.de')).not.toBeInTheDocument();
    });

    it('opens chat pane with pre-seeded prompt when Mora button clicked', async () => {
        const { WallPane } = await import('@/components/panes/WallPane');
        render(<WallPane />);
        await waitFor(() => expect(screen.getAllByRole('button', { name: /mora/i }).length).toBeGreaterThan(0));

        const moraButtons = screen.getAllByRole('button', { name: /mora/i });
        fireEvent.click(moraButtons[0]);

        expect(mockOpenPane).toHaveBeenCalledWith(expect.objectContaining({ type: 'chat' }));
    });

    it('shows detail drawer when card is clicked', async () => {
        const { WallPane } = await import('@/components/panes/WallPane');
        render(<WallPane />);
        await waitFor(() => expect(screen.getByText('acme.de')).toBeInTheDocument());

        fireEvent.click(screen.getByText('acme.de'));
        expect(screen.getByTestId('wall-detail-drawer')).toBeInTheDocument();
    });
});
