import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MoraModeAnswer } from '@/components/mora/MoraModeAnswer';

const proposal = {
    id: 'prop_1', label: 'Deploy vorbereiten', risk: 'external', status: 'awaiting_approval', requiresConfirmation: true,
    payload: { tool: 'deploy', args: {}, risk: 'external', source: 'mora.mode.bauen' },
};

describe('MoraModeAnswer', () => {
    it('shows build proposals as not executed and keeps approval disabled without verified path', () => {
        const onApprove = jest.fn();
        render(<MoraModeAnswer result={{ proposals: [proposal], sources: [], citations: [], flags: [] }} onApprove={onApprove} />);
        expect(screen.getByText('Noch nicht ausgeführt')).toBeInTheDocument();
        const btn = screen.getByRole('button', { name: 'Freigeben' });
        expect(btn).toBeDisabled();
        fireEvent.click(btn);
        expect(onApprove).not.toHaveBeenCalled();
        expect(screen.getByText('Kein verifizierter Ausführungsweg')).toBeInTheDocument();
    });

    it('enables approval only for a verified execution path', () => {
        const onApprove = jest.fn();
        const verified = { ...proposal, execution: { verified: true, endpoint: '/v3/actions/prop_1/execute' } };
        render(<MoraModeAnswer result={{ proposals: [verified], sources: [], citations: [], flags: [] }} onApprove={onApprove} />);
        fireEvent.click(screen.getByRole('button', { name: 'Freigeben' }));
        expect(onApprove).toHaveBeenCalledWith('prop_1');
    });

    it('lists sources, marks uncited ones and shows missing evidence', () => {
        render(<MoraModeAnswer result={{
            proposals: [],
            sources: [{ title: 'Notiz A', kind: 'gedächtnis' }, { title: 'Doku B', url: 'https://example.org' }],
            citations: [1],
            flags: ['uncited', 'no_sources'],
        }} />);
        expect(screen.getByText(/Notiz A/)).toBeInTheDocument();
        expect(screen.getByText('Doku B').closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
        expect(screen.getByText(/nicht zitiert/)).toBeInTheDocument();
        expect(screen.getAllByTestId('mora-flag')).toHaveLength(2);
    });

    it('renders nothing for plain answers', () => {
        const { container } = render(<MoraModeAnswer result={{ proposals: [], sources: [], citations: [], flags: [] }} />);
        expect(container).toBeEmptyDOMElement();
    });
});
