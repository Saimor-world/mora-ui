import { useContextStore } from '@/lib/store/contextStore';

describe('contextStore', () => {
    beforeEach(() => {
        useContextStore.setState({ isAdminMode: false, personalSpaceId: null });
    });

    it('isAdminMode defaults to false', () => {
        expect(useContextStore.getState().isAdminMode).toBe(false);
    });

    it('setAdminMode sets isAdminMode to true', () => {
        useContextStore.getState().setAdminMode(true);
        expect(useContextStore.getState().isAdminMode).toBe(true);
    });

    it('setAdminMode sets isAdminMode back to false', () => {
        useContextStore.getState().setAdminMode(true);
        useContextStore.getState().setAdminMode(false);
        expect(useContextStore.getState().isAdminMode).toBe(false);
    });

    it('personalSpaceId defaults to null', () => {
        expect(useContextStore.getState().personalSpaceId).toBeNull();
    });

    it('setPersonalSpaceId stores the id', () => {
        useContextStore.getState().setPersonalSpaceId('space-abc-123');
        expect(useContextStore.getState().personalSpaceId).toBe('space-abc-123');
    });

    it('setPersonalSpaceId accepts null to clear', () => {
        useContextStore.getState().setPersonalSpaceId('space-abc-123');
        useContextStore.getState().setPersonalSpaceId(null);
        expect(useContextStore.getState().personalSpaceId).toBeNull();
    });

    it('osContext does not exist on store (removed)', () => {
        expect((useContextStore.getState() as any).osContext).toBeUndefined();
    });

    it('toggleContext does not exist on store (removed)', () => {
        expect((useContextStore.getState() as any).toggleContext).toBeUndefined();
    });
});
