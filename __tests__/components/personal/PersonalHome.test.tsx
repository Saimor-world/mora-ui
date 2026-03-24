import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PersonalHome } from '@/components/personal/PersonalHome';
import { useMoraStore } from '@/lib/store/moraState';
import { useContextStore } from '@/lib/store/contextStore';
import { fetchPersonalSpace } from '@/lib/api/coreClient';

jest.mock('@/lib/api/coreClient', () => ({
    fetchPersonalSpace: jest.fn(),
    fetchPersonalHomeNote: jest.fn(),
    savePersonalHomeNote: jest.fn(),
}));

const mockFetchPersonalSpace = fetchPersonalSpace as jest.MockedFunction<typeof fetchPersonalSpace>;

describe('PersonalHome', () => {
    beforeEach(() => {
        useMoraStore.setState({
            user: { id: 'u-1', name: 'Max Mustermann', email: 'max@firma.de', role: 'member' },
        });
        useContextStore.getState().setPersonalSpaceId(null);
        (jest.requireMock('@/lib/api/coreClient') as any).fetchPersonalHomeNote.mockResolvedValue(null);
    });

    it('shows the user name as identity anchor', async () => {
        mockFetchPersonalSpace.mockResolvedValue({ id: 'space-1', name: 'Personal', owner_id: 'u-1' });
        render(<PersonalHome />);
        await waitFor(() => {
            expect(screen.getByText(/Max Mustermann/i)).toBeInTheDocument();
        });
    });

    it('shows the personal notes area', async () => {
        mockFetchPersonalSpace.mockResolvedValue(null);
        render(<PersonalHome />);
        await waitFor(() => {
            expect(screen.getByTestId('personal-notes-area')).toBeInTheDocument();
        });
    });

    it('shows server-confirmed label when fetchPersonalSpace succeeds', async () => {
        useContextStore.getState().setPersonalSpaceId('space-1');
        mockFetchPersonalSpace.mockResolvedValue({ id: 'space-1', name: 'Personal', owner_id: 'u-1' });
        render(<PersonalHome />);
        await waitFor(() => {
            // Should show the emerald badge (not the "kein Server" state)
            expect(screen.queryByText(/kein Server/i)).not.toBeInTheDocument();
            // The emerald badge label should appear
            expect(screen.getAllByText(/persönlicher Bereich/i).length).toBeGreaterThan(0);
        });
    });

    it('shows no-server label when fetchPersonalSpace returns null', async () => {
        mockFetchPersonalSpace.mockResolvedValue(null);
        render(<PersonalHome />);
        await waitFor(() => {
            expect(screen.getByText(/kein Server/i)).toBeInTheDocument();
        });
    });

    it('shows a navigation hint back to the company universe', async () => {
        mockFetchPersonalSpace.mockResolvedValue(null);
        render(<PersonalHome />);
        await waitFor(() => {
            expect(screen.getByText(/Unternehmen/i)).toBeInTheDocument();
        });
    });
});
