import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AdminHome } from '@/components/admin/AdminHome';
import { coreGet } from '@/lib/api/coreClient';
import { usePaneStore } from '@/lib/store/paneStore';
import { renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
}));

jest.mock('@/components/admin/AdminRosterView', () => ({
    AdminRosterView: () => <div>Roster</div>,
}));

jest.mock('@/components/admin/DepartmentVisibilityEditor', () => ({
    DepartmentVisibilityEditor: () => <div>Visibility</div>,
}));

jest.mock('@/components/admin/WebsiteLeadLedger', () => ({
    WebsiteLeadLedger: () => <div>Leads</div>,
}));

const mockedCoreGet = coreGet as jest.MockedFunction<typeof coreGet>;

describe('AdminHome integration truth', () => {
    beforeEach(() => {
        resetAllStores();
        usePaneStore.getState().reset();
        mockedCoreGet.mockReset();
        mockedCoreGet.mockResolvedValue({
            mail: { configured: true },
            calendar: { configured: true },
            cloud_storage: {
                connectors: [{ id: 'drive-1', provider: 'google_drive', label: 'Google Drive', enabled: true }],
            },
        });
    });

    it('shows CORE-backed source status and opens the internal integrations surface', async () => {
        renderWithProviders(<AdminHome />);

        await waitFor(() => expect(screen.getByText('CORE Status')).toBeInTheDocument());
        expect(screen.getAllByText('Verbunden')).toHaveLength(3);
        expect(mockedCoreGet).toHaveBeenCalledWith('/v3/integrations/overview', { isOptional: true });

        fireEvent.click(screen.getByRole('button', { name: 'Google & Quellen verwalten' }));

        expect(usePaneStore.getState().panes).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'integrations-main',
                type: 'integrations',
                title: 'Integrationen',
            }),
        ]));
    });
});
