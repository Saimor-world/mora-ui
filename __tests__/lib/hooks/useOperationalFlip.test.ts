import { renderHook, act, waitFor } from '@testing-library/react';
import { useOperationalFlip } from '@/lib/hooks/useOperationalFlip';
import { fetchUserProfile } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';

const patchOperationalSession = jest.fn();
const loadCompanies = jest.fn().mockResolvedValue(undefined);

let mockState: any = {
    user: { operational_state: 'setup_required' },
    patchOperationalSession,
    loadCompanies,
};

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: (selector: (s: any) => any) => selector(mockState),
}));

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

describe('useOperationalFlip', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockState = {
            user: { operational_state: 'setup_required' },
            patchOperationalSession,
            loadCompanies,
        };
    });

    it('subscribes to setup-completion realtime events only while setup is required', () => {
        renderHook(() => useOperationalFlip());

        expect(mockRealtime.on).toHaveBeenCalledWith('company_created', expect.any(Function));
        expect(mockRealtime.on).toHaveBeenCalledWith('setup_complete', expect.any(Function));
    });

    it('does not subscribe when already operational', () => {
        mockState.user = { operational_state: 'operational' };

        renderHook(() => useOperationalFlip());

        expect(mockRealtime.on).not.toHaveBeenCalled();
    });

    it('patches operational session fields and reloads companies after a realtime flip event', async () => {
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

        renderHook(() => useOperationalFlip());
        const handler = (mockRealtime.on as jest.Mock).mock.calls.find(([event]) => event === 'company_created')?.[1];

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
            expect(loadCompanies).toHaveBeenCalled();
        });
    });
});
