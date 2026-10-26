import { create } from 'zustand';
import { getDataScopeKey, subscribeDataScope } from './dataScope';

export interface RecentItem {
    id: string;
    label: string;
    openedAt: number;
    paneType: string;
    paneData?: any;
}

interface ActivityState {
    recentItems: RecentItem[];
    recordActivity: (item: Omit<RecentItem, 'openedAt'>) => void;
    clearActivity: () => void;
}

const MAX_RECENT = 20;

export const useActivityStore = create<ActivityState>()(
        (set) => ({
            recentItems: [],
            recordActivity: (item) =>
                set((state) => {
                    const entry: RecentItem = { ...item, openedAt: Date.now() };
                    const deduped = state.recentItems.filter((r) => r.id !== item.id);
                    return { recentItems: [entry, ...deduped].slice(0, MAX_RECENT) };
                }),
            clearActivity: () => set({ recentItems: [] }),
        })
);

// Recent-item labels and payloads are private to the current working context.
if (typeof window !== 'undefined') {
    try { localStorage.removeItem('mora.recent-items'); } catch { /* disabled storage */ }
}
let activityScope = getDataScopeKey();
subscribeDataScope(() => {
    const next = getDataScopeKey();
    if (next === activityScope) return;
    activityScope = next;
    useActivityStore.getState().clearActivity();
});
