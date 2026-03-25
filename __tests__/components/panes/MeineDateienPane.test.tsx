// __tests__/components/panes/MeineDateienPane.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MeineDateienPane } from '@/components/panes/MeineDateienPane';
import { fetchMyContent } from '@/lib/api/coreClient';

jest.mock('@/lib/api/coreClient', () => ({
    fetchMyContent: jest.fn(),
}));

const mockFetch = fetchMyContent as jest.MockedFunction<typeof fetchMyContent>;

const mockNodes = [
    {
        id: 'n-1',
        title: 'Projektplan Q2',
        type: 'document' as const,
        space_id: 's-1',
        owner_id: 'u-me',
        visibility: 'private' as const,
    },
    {
        id: 'n-2',
        title: 'Team-Präsentation',
        type: 'document' as const,
        space_id: 's-1',
        owner_id: 'u-me',
        visibility: 'department' as const,
    },
];

describe('MeineDateienPane', () => {
    beforeEach(() => jest.clearAllMocks());

    it('shows loading state initially', () => {
        mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves
        render(<MeineDateienPane />);
        expect(screen.getByTestId('meine-dateien-loading')).toBeInTheDocument();
    });

    it('shows documents after loading', async () => {
        mockFetch.mockResolvedValue(mockNodes);
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByText(/Projektplan Q2/i)).toBeInTheDocument();
            expect(screen.getByText(/Team-Präsentation/i)).toBeInTheDocument();
        });
    });

    it('shows visibility badge for each document', async () => {
        mockFetch.mockResolvedValue(mockNodes);
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByTitle('Privat')).toBeInTheDocument();
            expect(screen.getByTitle('Abteilung')).toBeInTheDocument();
        });
    });

    it('degrades gracefully when fetchMyContent returns null', async () => {
        mockFetch.mockResolvedValue(null);
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByText(/nicht verfügbar/i)).toBeInTheDocument();
        });
    });

    it('shows empty state when no documents exist', async () => {
        mockFetch.mockResolvedValue([]);
        render(<MeineDateienPane />);
        await waitFor(() => {
            expect(screen.getByText(/keine dateien/i)).toBeInTheDocument();
        });
    });
});
