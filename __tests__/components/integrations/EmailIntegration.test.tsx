import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EmailIntegration } from '@/components/integrations/EmailIntegration';
import { renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
    coreDelete: jest.fn(),
}));

jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('@/lib/integrations/communicationEvents', () => ({
    COMMUNICATION_SYNC_EVENT: 'saimor:communication-sync',
    getCommunicationSyncStorageKey: jest.fn(() => 'saimor:communication-sync'),
    broadcastCommunicationSync: jest.fn(),
}));

const coreClient = jest.requireMock('@/lib/api/coreClient') as {
    coreGet: jest.Mock;
    corePost: jest.Mock;
    coreDelete: jest.Mock;
};

const communicationEvents = jest.requireMock('@/lib/integrations/communicationEvents') as {
    broadcastCommunicationSync: jest.Mock;
};

function mockMailRoutes({
    overview,
    mailStatus,
}: {
    overview: any;
    mailStatus: any;
}) {
    coreClient.coreGet.mockImplementation((path: string) => {
        if (path === '/v3/integrations/overview') return Promise.resolve(overview);
        if (path === '/v3/integrations/mail') return Promise.resolve(mailStatus);
        return Promise.resolve(null);
    });
}

describe('EmailIntegration', () => {
    beforeEach(() => {
        resetAllStores();
        jest.clearAllMocks();
    });

    it('allows a member to configure a personal mail account', async () => {
        mockMailRoutes({
            overview: {
                capabilities: { mail_local_mode: false, owner_manageable: false },
                setup: {
                    mail: {
                        detail: 'Diese Verbindung wird direkt im OS gespeichert und danach von Mail, Home und Mora genutzt.',
                        required_fields: ['provider', 'email', 'app_password'],
                        optional_fields: ['host', 'port', 'smtp_host', 'smtp_port'],
                        provider_options: ['gmail', 'outlook', 'custom'],
                    },
                },
            },
            mailStatus: {
                configured: false,
                enabled: false,
                status: 'not_configured',
            },
        });
        coreClient.corePost.mockResolvedValue({
            configured: true,
            enabled: true,
            provider: 'outlook',
            email: 'member@example.com',
            status: 'configured',
        });

        renderWithProviders(<EmailIntegration />);

        expect(await screen.findByText('E-Mail-Verbindung')).toBeInTheDocument();
        expect(screen.queryByText(/nur für Eigentümer/i)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Outlook/Office 365' }));
        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'member@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('App-Passwort eingeben'), {
            target: { value: 'abcdefghijklmnop' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

        await waitFor(() => {
            expect(coreClient.corePost).toHaveBeenCalledWith('/v3/integrations/mail', {
                provider: 'outlook',
                email: 'member@example.com',
                app_password: 'abcdefghijklmnop',
                host: undefined,
                port: undefined,
            });
        });
        await waitFor(() => {
            expect(communicationEvents.broadcastCommunicationSync).toHaveBeenCalledWith('mail-config-save');
        });
    });
});
