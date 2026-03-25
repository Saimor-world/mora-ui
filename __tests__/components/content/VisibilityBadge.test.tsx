// __tests__/components/content/VisibilityBadge.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { VisibilityBadge } from '@/components/content/VisibilityBadge';

describe('VisibilityBadge', () => {
    it('shows "Privat" for private visibility', () => {
        render(<VisibilityBadge visibility="private" />);
        expect(screen.getByTitle('Privat')).toBeInTheDocument();
    });

    it('shows "Abteilung" for department visibility', () => {
        render(<VisibilityBadge visibility="department" />);
        expect(screen.getByTitle('Abteilung')).toBeInTheDocument();
    });

    it('shows "Alle" for company visibility', () => {
        render(<VisibilityBadge visibility="company" />);
        expect(screen.getByTitle('Alle')).toBeInTheDocument();
    });

    it('shows "Öffentlicher Link" for public visibility', () => {
        render(<VisibilityBadge visibility="public" />);
        expect(screen.getByTitle('Öffentlicher Link')).toBeInTheDocument();
    });

    it('accepts size prop without error', () => {
        const { container } = render(<VisibilityBadge visibility="private" size={10} />);
        expect(container.firstChild).toBeInTheDocument();
    });

    it('shows label text when showLabel is true', () => {
        render(<VisibilityBadge visibility="private" showLabel />);
        expect(screen.getByText('Privat')).toBeInTheDocument();
    });
});
