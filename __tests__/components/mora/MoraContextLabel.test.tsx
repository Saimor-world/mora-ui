// __tests__/components/mora/MoraContextLabel.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MoraContextLabel } from '@/components/mora/MoraContextLabel';

describe('MoraContextLabel', () => {
    it('renders personal scope label', () => {
        render(<MoraContextLabel scope="personal" />);
        expect(screen.getByText(/persoenlicher Kontext/i)).toBeInTheDocument();
    });

    it('renders shared scope label with source name', () => {
        render(<MoraContextLabel scope="shared" sourceName="Engineering" />);
        expect(screen.getByText(/Engineering/i)).toBeInTheDocument();
    });

    it('renders shared scope label without source name', () => {
        render(<MoraContextLabel scope="shared" />);
        expect(screen.getByText(/Organisationskontext/i)).toBeInTheDocument();
    });

    it('renders object scope label with source name', () => {
        render(<MoraContextLabel scope="object" sourceName="Projektplan.pdf" />);
        expect(screen.getByText(/Projektplan\.pdf/i)).toBeInTheDocument();
    });

    it('renders object scope label without source name', () => {
        render(<MoraContextLabel scope="object" />);
        expect(screen.getByText(/dieses Dokument/i)).toBeInTheDocument();
    });

    it('renders nothing when scope is undefined', () => {
        const { container } = render(<MoraContextLabel />);
        expect(container.firstChild).toBeNull();
    });
});
