import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock only the HTTP boundary — never the store.
jest.mock('@/lib/api/http', () => ({
    coreGet: jest.fn(),
}));
import { coreGet } from '@/lib/api/http';

// Real paneStore — no mock. Read actual state through the real hook.
import { usePaneStore } from '@/lib/store/paneStore';

// Tiny probe that surfaces the live pane list from the real store.
function PaneProbe() {
    const panes = usePaneStore((s) => s.panes);
    return <div data-testid="pane-types">{panes.map((p) => p.type).join(',')}</div>;
}

const MOCK_ENTRIES = [
    { id: 'entry-1', domain: 'acme.de', score: 28, grade: 'D', level: 'Kritisch', industry: 'Handwerk', message: 'War schockierend', confirmed_at: '2026-05-29T10:00:00Z' },
    { id: 'entry-2', domain: 'beta.de', score: 65, grade: 'B-', level: 'Mittel', industry: 'SaaS', confirmed_at: '2026-05-28T09:00:00Z' },
    { id: 'entry-3', domain: 'good.de', score: 91, grade: 'A', level: 'Sicher', confirmed_at: '2026-05-27T08:00:00Z' },
];

describe('WallPane', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        usePaneStore.getState().reset();
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

    it('opens a chat pane when the Mora button is clicked', async () => {
        const { WallPane } = await import('@/components/panes/WallPane');
        render(
            <>
                <WallPane />
                <PaneProbe />
            </>
        );
        await waitFor(() => expect(screen.getAllByRole('button', { name: /môra/i }).length).toBeGreaterThan(0));

        fireEvent.click(screen.getAllByRole('button', { name: /môra/i })[0]);

        // Real store updated → probe reflects a chat pane.
        await waitFor(() => {
            expect(screen.getByTestId('pane-types').textContent).toContain('chat');
        });
    });
});
