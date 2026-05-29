import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SecurityCheckEntry } from '@/components/entry/SecurityCheckEntry';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

jest.mock('@/components/entry/SecurityCheckPlaygroundLogin', () => ({
    SecurityCheckPlaygroundLogin: ({ onReady }: any) => {
        React.useEffect(() => { onReady(); }, [onReady]);
        return null;
    },
}));

const mockCtx: WebsiteEntryContext = {
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 62,
    level: 'Mittel',
    title: 'Test',
    rooms: [],
    documents: [],
    tasks: [
        { title: 'SSL-Zertifikat erneuern', priority: 'hoch' },
        { title: 'CSP-Header einrichten', priority: 'mittel' },
    ],
};

it('shows company greeting', () => {
    render(<SecurityCheckEntry context={mockCtx} />);
    expect(screen.getByText(/Acme GmbH/)).toBeInTheDocument();
});

it('shows score number', () => {
    render(<SecurityCheckEntry context={mockCtx} />);
    expect(screen.getByTestId('entry-score')).toHaveTextContent('62');
});

it('shows score narrative', () => {
    render(<SecurityCheckEntry context={mockCtx} />);
    expect(screen.getByTestId('entry-narrative')).toHaveTextContent('acme.de');
});

it('shows 4 dimension bars', () => {
    render(<SecurityCheckEntry context={mockCtx} />);
    expect(screen.getAllByTestId('score-dimension')).toHaveLength(4);
});

it('shows CTA button', () => {
    render(<SecurityCheckEntry context={mockCtx} />);
    expect(screen.getByRole('button', { name: /Workspace öffnen/i })).toBeInTheDocument();
});

it('CTA redirects to /home after auth ready', async () => {
    const assign = jest.fn();
    Object.defineProperty(window, 'location', { value: { href: '', assign }, writable: true, configurable: true });

    render(<SecurityCheckEntry context={mockCtx} />);
    await waitFor(() => {
        screen.getByRole('button', { name: /Workspace öffnen/i }).click();
        expect(window.location.href).toBe('/home');
    });
});
