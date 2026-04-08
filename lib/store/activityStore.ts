import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    persist(
        (set) => ({
            recentItems: [],
            recordActivity: (item) =>
                set((state) => {
                    const entry: RecentItem = { ...item, openedAt: Date.now() };
                    const deduped = state.recentItems.filter((r) => r.id !== item.id);
                    return { recentItems: [entry, ...deduped].slice(0, MAX_RECENT) };
                }),
            clearActivity: () => set({ recentItems: [] }),
        }),
        { name: 'mora.recent-items' }
    )
);
