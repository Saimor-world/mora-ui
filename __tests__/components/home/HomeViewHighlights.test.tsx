import { render, screen } from '@testing-library/react';
import { HomeViewHighlights } from '@/components/home/HomeViewHighlights';

it('renders attention and next-step highlights with stable labels', () => {
    render(
        <HomeViewHighlights
            view={{
                attention: [
                    { id: 'a1', title: 'SSL klären', severity: 0.82 },
                ],
                next_steps: [
                    { id: 'n1', title: 'Owner festlegen' },
                ],
            } as any}
        />
    );

    expect(screen.getByText('Was braucht Aufmerksamkeit')).toBeInTheDocument();
    expect(screen.getByText('Nächste Aufgaben')).toBeInTheDocument();
    expect(screen.getByText('SSL klären')).toBeInTheDocument();
    expect(screen.getByText('Owner festlegen')).toBeInTheDocument();
});
