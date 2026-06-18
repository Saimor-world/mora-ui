import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders } from '@/__tests__/test-utils';
import { PersonalHomeZone } from '@/components/home/PersonalHomeZone';
import { fetchPersonalHomeNote, savePersonalHomeNote } from '@/lib/api/contentClient';

jest.mock('@/lib/api/contentClient', () => ({
    fetchPersonalHomeNote: jest.fn(),
    savePersonalHomeNote: jest.fn(),
}));

const mockFetch = fetchPersonalHomeNote as jest.MockedFunction<typeof fetchPersonalHomeNote>;
const mockSave = savePersonalHomeNote as jest.MockedFunction<typeof savePersonalHomeNote>;

describe('PersonalHomeZone', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockResolvedValue({ content: 'Vorhandene Notiz' });
        mockSave.mockResolvedValue({ content: 'Neue Notiz' });
    });

    it('renders personal scope label and note from server', async () => {
        renderWithProviders(
            <PersonalHomeZone
                privateLabel="Mein Space"
                folderCount={2}
                documentCount={3}
                fileCount={1}
            />
        );

        expect(await screen.findByTestId('personal-home-zone')).toBeInTheDocument();
        expect(screen.getByText('Mein Bereich')).toBeInTheDocument();
        expect(screen.getByText('Mein Space')).toBeInTheDocument();
        expect(await screen.findByDisplayValue('Vorhandene Notiz')).toBeInTheDocument();
    });

    it('debounces server save when note is edited', async () => {
        jest.useFakeTimers();
        renderWithProviders(<PersonalHomeZone />);

        const textarea = await screen.findByTestId('personal-home-note-input');
        fireEvent.change(textarea, { target: { value: 'Neue Notiz' } });

        jest.advanceTimersByTime(750);

        await waitFor(() => {
            expect(mockSave).toHaveBeenCalledWith('Neue Notiz');
        });

        jest.useRealTimers();
    });
});
