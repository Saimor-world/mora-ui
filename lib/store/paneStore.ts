import { create } from 'zustand';

export interface PaneConfig {
    id: string;
    type: 'document' | 'settings' | 'apps' | 'files' | 'grid' | 'space' | 'search';

    title: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    minimized: boolean;
    zIndex: number;
    tabs?: Array<{ id: string, title: string, content: any }>;
    activeTabId?: string;
    data?: any;
}

const normalizeFrontmost = (panes: PaneConfig[], activePaneId: string | null) => {
    const visiblePanes = panes.filter((pane) => !pane.minimized);
    if (visiblePanes.length === 0) {
        return { activePaneId: null };
    }

    const frontmost = visiblePanes.reduce((top, pane) => {
        if (!top) return pane;
        return pane.zIndex > top.zIndex ? pane : top;
    }, null as PaneConfig | null);

    if (!frontmost) {
        return { activePaneId: null };
    }

    if (frontmost.id !== activePaneId) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[PaneStore] Active pane drift detected; correcting.', {
                activePaneId,
                frontmostId: frontmost.id
            });
        }
        return { activePaneId: frontmost.id };
    }

    return { activePaneId };
};

interface PaneState {
    panes: PaneConfig[];
    nextZIndex: number;
    activePaneId: string | null;

    // Actions
    addPane: (pane: Omit<PaneConfig, 'zIndex'>) => void;
    removePane: (id: string) => void;
    updatePane: (id: string, updates: Partial<PaneConfig>) => void;
    focusPane: (id: string) => void;
    minimizePane: (id: string) => void;
    restorePane: (id: string) => void;
    getPane: (id: string) => PaneConfig | undefined;
    getVisiblePanes: () => PaneConfig[];
    updatePanePosition: (id: string, x: number, y: number) => void;
    updatePaneSize: (id: string, width: number, height: number) => void;
}

export const usePaneStore = create<PaneState>((set, get) => ({
    panes: [],
    nextZIndex: 100,
    activePaneId: null,

    addPane: (pane) => set((state) => {
        const nextPanes = pane.type === 'apps'
            ? state.panes
            : state.panes.filter(p => p.type !== 'apps');
        // Prevent duplicate panes with same ID
        const existingPane = nextPanes.find(p => p.id === pane.id);
        if (existingPane) {
            // If pane already exists, just focus it instead of creating duplicate
            const panes = nextPanes.map(p =>
                p.id === pane.id
                    ? { ...p, zIndex: state.nextZIndex, minimized: false }
                    : p
            );
            const normalized = normalizeFrontmost(panes, pane.id);
            return {
                panes,
                nextZIndex: state.nextZIndex + 1,
                activePaneId: normalized.activePaneId
            };
        }

        const newPane: PaneConfig = {
            ...pane,
            zIndex: state.nextZIndex,
            minimized: false
        };
        const panes = [...nextPanes, newPane];
        const normalized = normalizeFrontmost(panes, newPane.id);
        return {
            panes,
            nextZIndex: state.nextZIndex + 1,
            activePaneId: normalized.activePaneId
        };
    }),

    removePane: (id) => set((state) => {
        const panes = state.panes.filter(p => p.id !== id);
        const normalized = normalizeFrontmost(panes, state.activePaneId === id ? null : state.activePaneId);
        return {
            panes,
            activePaneId: normalized.activePaneId
        };
    }),

    updatePane: (id, updates) => set((state) => {
        const panes = state.panes.map(p =>
            p.id === id ? { ...p, ...updates } : p
        );
        const normalized = normalizeFrontmost(panes, state.activePaneId);
        return {
            panes,
            activePaneId: normalized.activePaneId
        };
    }),

    focusPane: (id) => set((state) => {
        const pane = state.panes.find(p => p.id === id);
        if (!pane) return state;

        const nextPanes = pane.type === 'apps'
            ? state.panes
            : state.panes.filter(p => p.type !== 'apps');

        const panes = nextPanes.map(p =>
            p.id === id
                ? { ...p, zIndex: state.nextZIndex, minimized: false }
                : p
        );
        const normalized = normalizeFrontmost(panes, id);
        return {
            panes,
            nextZIndex: state.nextZIndex + 1,
            activePaneId: normalized.activePaneId
        };
    }),

    minimizePane: (id) => set((state) => {
        const panes = state.panes.map(p =>
            p.id === id ? { ...p, minimized: true } : p
        );
        const normalized = normalizeFrontmost(panes, state.activePaneId === id ? null : state.activePaneId);
        return {
            panes,
            activePaneId: normalized.activePaneId
        };
    }),

    restorePane: (id) => set((state) => {
        const target = state.panes.find(p => p.id === id);
        if (!target) return state;
        const nextPanes = target.type === 'apps'
            ? state.panes
            : state.panes.filter(p => p.type !== 'apps');
        const panes = nextPanes.map(p =>
            p.id === id ? { ...p, minimized: false, zIndex: state.nextZIndex } : p
        );
        const normalized = normalizeFrontmost(panes, id);
        return {
            panes,
            nextZIndex: state.nextZIndex + 1,
            activePaneId: normalized.activePaneId
        };
    }),

    getPane: (id) => get().panes.find(p => p.id === id),

    getVisiblePanes: () => get().panes.filter(p => !p.minimized),

    updatePanePosition: (id, x, y) => set((state) => ({
        panes: state.panes.map(p =>
            p.id === id ? { ...p, position: { x, y } } : p
        )
    })),

    updatePaneSize: (id, width, height) => set((state) => ({
        panes: state.panes.map(p =>
            p.id === id ? { ...p, size: { width, height } } : p
        )
    }))
}));
