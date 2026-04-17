import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useOperationalFlip } from '@/lib/hooks/useOperationalFlip';
import { fetchUserProfile } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';
import { resetAllStores, createTestQueryClient } from '../../test-utils';
import { useSessionStore } from '@/lib/store/sessionStore';

// I/O boundaries — fine to mock
jest.mock('@/lib/api/coreClient', () => ({
    fetchUserProfile: jest.fn(),
}));

jest.mock('@/lib/api/realtimeClient', () => ({
    realtime: {
        on: jest.fn(),
        off: jest.fn(),
    },
}));

const mockFetchUserProfile = fetchUserProfile as jest.MockedFunction<typeof fetchUserProfile>;
const mockRealtime = realtime as jest.Mocked<typeof realtime>;

beforeEach(resetAllStores);

describe('useOperationalFlip', () => {
    let patchOperationalSession: jest.Mock;
    let qc: ReturnType<typeof createTestQueryClient>;

    beforeEach(() => {
        jest.clearAllMocks();
        patchOperationalSession = jest.fn();
        qc = createTestQueryClient();

        useSessionStore.setState({
            user: { operational_state: 'setup_required' },
            patchOperationalSession,
        } as any);
    });

    function wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(QueryClientProvider, { client: qc }, children);
    }

    it('subscribes to setup-completion realtime events only while setup is required', () => {
        renderHook(() => useOperationalFlip(), { wrapper });

        expect(mockRealtime.on).toHaveBeenCalledWith('company_created', expect.any(Function));
        expect(mockRealtime.on).toHaveBeenCalledWith('setup_complete', expect.any(Function));
    });

    it('does not subscribe when already operational', () => {
        useSessionStore.setState({
            user: { operational_state: 'operational' },
            patchOperationalSession,
        } as any);

        renderHook(() => useOperationalFlip(), { wrapper });

        expect(mockRealtime.on).not.toHaveBeenCalled();
    });

    it('patches operational session fields and invalidates companies after a realtime flip event', async () => {
        mockFetchUserProfile.mockResolvedValue({
            user_id: 'u-1',
            role: 'owner',
            tenant_id: 'tenant-demo',
            operational_state: 'operational',
            setup_required: false,
            active_company_id: 'co-1',
            active_company_name: 'Simple Coffee Group',
            company_count: 1,
            scope_source: 'tenant_default_company',
        });

        // Spy on the real QueryClient instead of mocking react-query
        const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

        renderHook(() => useOperationalFlip(), { wrapper });
        const handler = (mockRealtime.on as jest.Mock).mock.calls.find(
            ([event]) => event === 'company_created'
        )?.[1];

        await act(async () => {
            await handler?.({});
        });

        await waitFor(() => {
            expect(patchOperationalSession).toHaveBeenCalledWith({
                operational_state: 'operational',
                setup_required: false,
                active_company_id: 'co-1',
                active_company_name: 'Simple Coffee Group',
                company_count: 1,
                scope_source: 'tenant_default_company',
            });
            expect(invalidateSpy).toHaveBeenCalled();
        });
    });
});
