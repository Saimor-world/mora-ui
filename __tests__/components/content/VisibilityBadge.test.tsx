// __tests__/components/content/VisibilityBadge.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { VisibilityBadge } from '@/components/content/VisibilityBadge';

describe('VisibilityBadge', () => {
    it('shows "Nur ich" for private visibility', () => {
        render(<VisibilityBadge visibility="private" />);
        expect(screen.getByTitle('Nur ich')).toBeInTheDocument();
    });

    it('shows "Bereich sichtbar" for department visibility', () => {
        render(<VisibilityBadge visibility="department" />);
        expect(screen.getByTitle('Bereich sichtbar')).toBeInTheDocument();
    });

    it('shows "Workspace sichtbar" for company visibility', () => {
        render(<VisibilityBadge visibility="company" />);
        expect(screen.getByTitle('Workspace sichtbar')).toBeInTheDocument();
    });

    it('shows "Freigabelink" for public visibility', () => {
        render(<VisibilityBadge visibility="public" />);
        expect(screen.getByTitle('Freigabelink')).toBeInTheDocument();
    });

    it('normalizes file visibility scopes', () => {
        render(<VisibilityBadge visibility="public_link" />);
        expect(screen.getByTitle('Freigabelink')).toBeInTheDocument();
    });

    it('accepts size prop without error', () => {
        const { container } = render(<VisibilityBadge visibility="private" size={10} />);
        expect(container.firstChild).toBeInTheDocument();
    });

    it('shows label text when showLabel is true', () => {
        render(<VisibilityBadge visibility="private" showLabel />);
        expect(screen.getByText('Nur ich')).toBeInTheDocument();
    });
});
