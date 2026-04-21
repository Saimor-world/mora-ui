import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CalendarIntegration } from '@/components/integrations/CalendarIntegration';
import { renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
}));

jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('@/lib/integrations/calendarOAuth', () => ({
    getCalendarOAuthReturnTo: jest.fn(() => 'http://127.0.0.1:3000/home'),
    openCalendarOAuthPopup: jest.fn(),
}));

jest.mock('@/lib/integrations/communicationEvents', () => ({
    COMMUNICATION_SYNC_EVENT: 'saimor:communication-sync',
    getCommunicationSyncStorageKey: jest.fn(() => 'saimor:communication-sync'),
    broadcastCommunicationSync: jest.fn(),
}));

const coreClient = jest.requireMock('@/lib/api/coreClient') as {
    coreGet: jest.Mock;
    corePost: jest.Mock;
};

const calendarOAuth = jest.requireMock('@/lib/integrations/calendarOAuth') as {
    openCalendarOAuthPopup: jest.Mock;
};

const communicationEvents = jest.requireMock('@/lib/integrations/communicationEvents') as {
    broadcastCommunicationSync: jest.Mock;
};

function mockCoreGetRoutes({
    overview,
    calendarStatus,
    providerConfig,
}: {
    overview: any;
    calendarStatus: any;
    providerConfig: any;
}) {
    coreClient.coreGet.mockImplementation((path: string) => {
        if (path === '/v3/integrations/overview') return Promise.resolve(overview);
        if (path === '/v3/integrations/calendar') return Promise.resolve(calendarStatus);
        if (path === '/v3/integrations/calendar/provider-config') return Promise.resolve(providerConfig);
        return Promise.resolve(null);
    });
}

describe('CalendarIntegration', () => {
    beforeEach(() => {
        resetAllStores();
        jest.clearAllMocks();
    });

    it('renders tenant-configured Google OAuth state and allows OS-first connect', async () => {
        mockCoreGetRoutes({
            overview: {
                capabilities: { calendar_oauth_enabled: true },
                setup: {
                    calendar: {
                        source: 'tenant',
                        redirect_url: 'http://127.0.0.1:8081/v1/auth/google/callback',
                        required_env: [
                            'GOOGLE_CALENDAR_CLIENT_ID',
                            'GOOGLE_CALENDAR_CLIENT_SECRET',
                            'GOOGLE_CALENDAR_REDIRECT_URL',
                        ],
                        missing_env: [],
                    },
                },
            },
            calendarStatus: {
                configured: false,
                status: 'not_configured',
            },
            providerConfig: {
                configured: true,
                source: 'tenant',
                client_id_preview: 'tenant-c...6789',
                redirect_url: 'http://127.0.0.1:8081/v1/auth/google/callback',
                required_fields: [],
                missing_fields: [],
            },
        });
        coreClient.corePost.mockResolvedValue({
            auth_url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=tenant-client-456789',
        });
        calendarOAuth.openCalendarOAuthPopup.mockResolvedValue({ ok: true });

        renderWithProviders(<CalendarIntegration />);

        expect(await screen.findByText('Google Calendar')).toBeInTheDocument();
        expect(screen.getByText(/Tenant-Konfiguration/i)).toBeInTheDocument();
        expect(screen.getByText(/tenant-c\.\.\.6789/i)).toBeInTheDocument();
        expect(screen.getByText(/http:\/\/127\.0\.0\.1:8081\/v1\/auth\/google\/callback/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Verbinden' }));

        await waitFor(() => {
            expect(coreClient.corePost).toHaveBeenCalledWith('/v3/integrations/calendar/connect', {
                return_to: 'http://127.0.0.1:3000/home',
            });
        });
        expect(calendarOAuth.openCalendarOAuthPopup).toHaveBeenCalledWith(
            expect.stringContaining('accounts.google.com')
        );
        await waitFor(() => {
            expect(communicationEvents.broadcastCommunicationSync).toHaveBeenCalledWith('calendar-config-connect');
        });
    });

    it('saves tenant Google OAuth config from the owner form when OAuth is not ready', async () => {
        mockCoreGetRoutes({
            overview: {
                capabilities: { calendar_oauth_enabled: false, owner_manageable: true },
                setup: {
                    calendar: {
                        source: 'env',
                        redirect_url: 'http://127.0.0.1:8081/v1/auth/google/callback',
                        required_env: [
                            'GOOGLE_CALENDAR_CLIENT_ID',
                            'GOOGLE_CALENDAR_CLIENT_SECRET',
                            'GOOGLE_CALENDAR_REDIRECT_URL',
                        ],
                        missing_env: [
                            'GOOGLE_CALENDAR_CLIENT_ID',
                            'GOOGLE_CALENDAR_CLIENT_SECRET',
                        ],
                    },
                },
            },
            calendarStatus: {
                configured: false,
                status: 'not_configured',
            },
            providerConfig: {
                configured: false,
                source: 'env',
                redirect_url: 'http://127.0.0.1:8081/v1/auth/google/callback',
                required_fields: [
                    'GOOGLE_CALENDAR_CLIENT_ID',
                    'GOOGLE_CALENDAR_CLIENT_SECRET',
                    'GOOGLE_CALENDAR_REDIRECT_URL',
                ],
                missing_fields: [
                    'GOOGLE_CALENDAR_CLIENT_ID',
                    'GOOGLE_CALENDAR_CLIENT_SECRET',
                ],
            },
        });
        coreClient.corePost.mockResolvedValue({
            configured: true,
            source: 'tenant',
            redirect_url: 'http://127.0.0.1:8081/v1/auth/google/callback',
        });

        renderWithProviders(<CalendarIntegration />);

        expect(await screen.findByText(/Google OAuth für diesen Tenant/i)).toBeInTheDocument();

        const clientIdInput = screen.getByPlaceholderText('Google OAuth Client ID');
        const clientSecretInput = screen.getByPlaceholderText('Google OAuth Client Secret');
        const redirectInput = screen.getByDisplayValue('http://127.0.0.1:8081/v1/auth/google/callback');

        fireEvent.change(clientIdInput, { target: { value: 'tenant-client-456789' } });
        fireEvent.change(clientSecretInput, { target: { value: 'tenant-secret-456789' } });
        fireEvent.change(redirectInput, { target: { value: 'http://127.0.0.1:8081/v1/auth/google/callback' } });

        fireEvent.click(screen.getByRole('button', { name: 'OAuth für Tenant speichern' }));

        await waitFor(() => {
            expect(coreClient.corePost).toHaveBeenCalledWith('/v3/integrations/calendar/provider-config', {
                client_id: 'tenant-client-456789',
                client_secret: 'tenant-secret-456789',
                redirect_url: 'http://127.0.0.1:8081/v1/auth/google/callback',
            });
        });
        await waitFor(() => {
            expect(communicationEvents.broadcastCommunicationSync).toHaveBeenCalledWith('calendar-provider-config-save');
        });
    });

    it('shows a member-safe hint instead of the tenant OAuth form when OAuth is not ready', async () => {
        mockCoreGetRoutes({
            overview: {
                capabilities: { calendar_oauth_enabled: false, owner_manageable: false },
                setup: {
                    calendar: {
                        source: 'env',
                        redirect_url: 'http://127.0.0.1:8081/v1/auth/google/callback',
                        required_env: [
                            'GOOGLE_CALENDAR_CLIENT_ID',
                            'GOOGLE_CALENDAR_CLIENT_SECRET',
                            'GOOGLE_CALENDAR_REDIRECT_URL',
                        ],
                        missing_env: [
                            'GOOGLE_CALENDAR_CLIENT_ID',
                            'GOOGLE_CALENDAR_CLIENT_SECRET',
                        ],
                    },
                },
            },
            calendarStatus: {
                configured: false,
                status: 'not_configured',
            },
            providerConfig: {
                configured: false,
                source: 'env',
                redirect_url: 'http://127.0.0.1:8081/v1/auth/google/callback',
                required_fields: [],
                missing_fields: ['GOOGLE_CALENDAR_CLIENT_ID'],
            },
        });

        renderWithProviders(<CalendarIntegration />);

        expect(await screen.findByText(/muss zuerst von einem Eigentümer eingerichtet werden/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'OAuth für Tenant speichern' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Eigentümer muss OAuth freischalten' })).toBeDisabled();
    });
});
