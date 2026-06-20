import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeDataSourceError } from '@/components/home/HomeDataSourceError';

describe('HomeDataSourceError', () => {
    it('renders nothing when show is false', () => {
        const { container } = render(<HomeDataSourceError show={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows Datenquelle nicht erreichbar when show is true', () => {
        render(<HomeDataSourceError show={true} />);
        expect(screen.getByTestId('home-datasource-error')).toBeInTheDocument();
        expect(screen.getByText('Datenquelle nicht erreichbar')).toBeInTheDocument();
    });
});
