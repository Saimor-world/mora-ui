import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { RssIntegration } from '@/components/integrations/RssIntegration';
import { coreDelete, coreGet } from '@/lib/api/coreClient';
import { renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('@/lib/api/coreClient', () => ({
    coreDelete: jest.fn(),
    coreGet: jest.fn(),
    corePost: jest.fn(),
}));

jest.mock('sonner', () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
    },
}));

jest.mock('@/lib/integrations/communicationEvents', () => ({
    broadcastCommunicationSync: jest.fn(),
}));

const mockCoreGet = coreGet as jest.MockedFunction<typeof coreGet>;
const mockCoreDelete = coreDelete as jest.MockedFunction<typeof coreDelete>;

const feed = {
    url: 'https://news.saimor.world/feed.xml',
    title: 'Saimôr News',
    enabled: true,
};

beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
    mockCoreGet.mockImplementation(async (path) => (
        path.includes('/items')
            ? { items: [], errors: [] }
            : { feeds: [feed] }
    ));
    mockCoreDelete.mockResolvedValue(undefined);
});

describe('RssIntegration actions', () => {
    it('exposes refresh as a named button and reloads the RSS data', async () => {
        renderWithProviders(<RssIntegration />);
        await screen.findByText('Saimôr News');

        const refresh = screen.getByRole('button', { name: 'RSS-Quellen aktualisieren' });
        expect(refresh).toHaveAttribute('type', 'button');
        expect(mockCoreGet).toHaveBeenCalledTimes(2);

        fireEvent.click(refresh);
        await waitFor(() => expect(mockCoreGet).toHaveBeenCalledTimes(4));
    });

    it('gives the neighboring edit and remove actions unique accessible names', async () => {
        renderWithProviders(<RssIntegration />);
        await screen.findByText('Saimôr News');

        const edit = screen.getByRole('button', { name: 'Name von Saimôr News bearbeiten' });
        const remove = screen.getByRole('button', { name: 'Feed Saimôr News entfernen' });
        expect(edit).toHaveAttribute('type', 'button');
        expect(remove).toHaveAttribute('type', 'button');

        fireEvent.click(edit);
        expect(screen.getByRole('button', { name: 'Namen für Saimôr News speichern' }))
            .toHaveAttribute('type', 'button');
        expect(screen.getByRole('button', { name: 'Bearbeitung für Saimôr News abbrechen' }))
            .toHaveAttribute('type', 'button');

        fireEvent.click(screen.getByRole('button', { name: 'Bearbeitung für Saimôr News abbrechen' }));
        fireEvent.click(screen.getByRole('button', { name: 'Feed Saimôr News entfernen' }));

        await waitFor(() => {
            expect(mockCoreDelete).toHaveBeenCalledWith(
                '/v3/integrations/rss?url=https%3A%2F%2Fnews.saimor.world%2Ffeed.xml'
            );
        });
    });
});
