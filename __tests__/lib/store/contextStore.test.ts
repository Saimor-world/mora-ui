import { useContextStore } from '@/lib/store/contextStore';

describe('contextStore', () => {
    beforeEach(() => {
        useContextStore.getState().setOsContext('company');
    });

    it('defaults to company context -- Universe is primary', () => {
        expect(useContextStore.getState().osContext).toBe('company');
    });

    it('setOsContext changes to personal', () => {
        useContextStore.getState().setOsContext('personal');
        expect(useContextStore.getState().osContext).toBe('personal');
    });

    it('toggleContext switches company -> personal', () => {
        useContextStore.getState().toggleContext();
        expect(useContextStore.getState().osContext).toBe('personal');
    });

    it('toggleContext switches personal -> company', () => {
        useContextStore.getState().setOsContext('personal');
        useContextStore.getState().toggleContext();
        expect(useContextStore.getState().osContext).toBe('company');
    });
});
