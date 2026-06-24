import {
    resolveIntegrationConnectionState,
    resolveIntegrationConnectionStates,
} from '@/lib/integrations/connectionState';

describe('integration connection state', () => {
    it.each([
        [{ configured: true, hasOverview: true, isLoading: false }, 'configured'],
        [{ configured: false, hasOverview: true, isLoading: true }, 'loading'],
        [{ configured: false, hasOverview: true, isLoading: false }, 'unconfigured'],
        [{ configured: false, hasOverview: false, isLoading: false }, 'error'],
        [{ configured: false, hasOverview: true, isLoading: false, error: 'offline' }, 'error'],
    ] as const)('resolves %o as %s', (input, expected) => {
        expect(resolveIntegrationConnectionState(input)).toBe(expected);
    });

    it('derives mail, calendar and cloud from the same overview truth', () => {
        expect(resolveIntegrationConnectionStates({
            mail: { configured: true },
            calendar: { configured: false },
            cloud_storage: { configured: true },
        }, false)).toEqual({
            mail: 'configured',
            calendar: 'unconfigured',
            cloud: 'configured',
        });
    });
});
