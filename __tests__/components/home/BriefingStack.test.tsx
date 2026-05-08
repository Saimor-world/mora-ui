import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BriefingStack } from '@/components/home/BriefingStack';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const briefings = [
    { id: '1', label: 'Aktivität', title: 'Weiter in Team', detail: 'vor 12 Min.' },
    { id: '2', label: 'Mail', title: '3 ungelesene', detail: 'Letzte vor 2 Std.' },
    { id: '3', label: 'Termin', title: 'Standup um 10', detail: 'in 35 Min.' },
];

it('shows first briefing initially', () => {
    render(<BriefingStack briefings={briefings} />);
    expect(screen.getByText('Weiter in Team')).toBeInTheDocument();
});

it('swipes to next briefing on indicator click', () => {
    render(<BriefingStack briefings={briefings} />);
    const indicators = screen.getAllByRole('button', { name: /Briefing/i });
    fireEvent.click(indicators[1]);
    expect(screen.getByText('3 ungelesene')).toBeInTheDocument();
});

it('handles single briefing without indicators', () => {
    render(<BriefingStack briefings={[briefings[0]]} />);
    expect(screen.queryByRole('button', { name: /Briefing/i })).toBeNull();
});
