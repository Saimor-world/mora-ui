import React from 'react';
import { render, screen } from '@testing-library/react';
import { PersonalHome } from '@/components/personal/PersonalHome';
import { useMoraStore } from '@/lib/store/moraState';

describe('PersonalHome', () => {
    beforeEach(() => {
        useMoraStore.setState({
            user: { id: 'u-1', name: 'Max Mustermann', email: 'max@firma.de', role: 'member' },
        });
    });

    it('shows the user name as identity anchor', () => {
        render(<PersonalHome />);
        expect(screen.getByText(/Max Mustermann/i)).toBeInTheDocument();
    });

    it('shows the personal notes area', () => {
        render(<PersonalHome />);
        expect(screen.getByTestId('personal-notes-area')).toBeInTheDocument();
    });

    it('shows a label indicating this is personal context for Mora', () => {
        render(<PersonalHome />);
        expect(screen.getByText(/persönlicher Bereich/i)).toBeInTheDocument();
    });

    it('shows a navigation hint back to the company universe', () => {
        render(<PersonalHome />);
        expect(screen.getByText(/Unternehmen/i)).toBeInTheDocument();
    });
});
