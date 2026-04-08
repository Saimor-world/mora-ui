import { useActivityStore } from '@/lib/store/activityStore';

beforeEach(() => {
    useActivityStore.setState({ recentItems: [] });
    localStorage.clear();
});

describe('activityStore', () => {
    it('starts with empty recentItems', () => {
        expect(useActivityStore.getState().recentItems).toEqual([]);
    });

    it('recordActivity adds an item with openedAt timestamp', () => {
        const before = Date.now();
        useActivityStore.getState().recordActivity({
            id: 'doc-1',
            label: 'Projektplan Q2',
            paneType: 'document',
            paneData: { nodeId: 'doc-1' },
        });
        const after = Date.now();
        const items = useActivityStore.getState().recentItems;
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe('doc-1');
        expect(items[0].label).toBe('Projektplan Q2');
        expect(items[0].openedAt).toBeGreaterThanOrEqual(before);
        expect(items[0].openedAt).toBeLessThanOrEqual(after);
    });

    it('prepends new items (most recent first)', () => {
        useActivityStore.getState().recordActivity({ id: 'a', label: 'A', paneType: 'document' });
        useActivityStore.getState().recordActivity({ id: 'b', label: 'B', paneType: 'finder' });
        const items = useActivityStore.getState().recentItems;
        expect(items[0].id).toBe('b');
        expect(items[1].id).toBe('a');
    });

    it('deduplicates — re-opening moves item to front', () => {
        useActivityStore.getState().recordActivity({ id: 'a', label: 'A', paneType: 'document' });
        useActivityStore.getState().recordActivity({ id: 'b', label: 'B', paneType: 'document' });
        useActivityStore.getState().recordActivity({ id: 'a', label: 'A', paneType: 'document' });
        const items = useActivityStore.getState().recentItems;
        expect(items).toHaveLength(2);
        expect(items[0].id).toBe('a');
        expect(items[1].id).toBe('b');
    });

    it('caps at 20 items', () => {
        for (let i = 0; i < 25; i++) {
            useActivityStore.getState().recordActivity({ id: `item-${i}`, label: `Item ${i}`, paneType: 'document' });
        }
        expect(useActivityStore.getState().recentItems).toHaveLength(20);
    });

    it('clearActivity empties the list', () => {
        useActivityStore.getState().recordActivity({ id: 'a', label: 'A', paneType: 'document' });
        useActivityStore.getState().clearActivity();
        expect(useActivityStore.getState().recentItems).toHaveLength(0);
    });
});
