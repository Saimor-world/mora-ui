import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DemoWelcomeCard } from '@/components/entry/DemoWelcomeCard';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

const mockCtx: WebsiteEntryContext = {
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 82,
    level: 'mittel',
    title: 'Security Check',
    rooms: [],
    documents: [],
    tasks: [{ title: 'Website analysieren', priority: 'hoch' }],
};

it('shows company name and score', () => {
    render(<DemoWelcomeCard context={mockCtx} onOpen={jest.fn()} />);
    expect(screen.getByText('Acme GmbH')).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();
});

it('calls onOpen when CTA clicked', () => {
    const onOpen = jest.fn();
    render(<DemoWelcomeCard context={mockCtx} onOpen={onOpen} />);
    screen.getByRole('button', { name: /Workspace öffnen/i }).click();
    expect(onOpen).toHaveBeenCalledTimes(1);
});
