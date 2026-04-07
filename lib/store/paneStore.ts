import { create } from 'zustand';
import type { PaneType } from '@/lib/surface/surfaceRegistry';

export interface PaneConfig {
    id: string;
    type: PaneType;

    title: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    minimized: boolean;
    zIndex: number;
    tabs?: Array<{ id: string, title: string, content: any }>;
    activeTabId?: string;
    data?: any;
}

export interface PaneOpenRequest {
    id: string;
    type: PaneConfig['type'];
    title: string;
    size: { width: number; height: number };
    position?: { x: number; y: number };
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

const getCenteredPosition = (size: { width: number; height: number }, offset: number = 0) => {
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Apply cascade offset for multiple windows (20px per open window)
    const cascadeOffset = offset * 25;

    let x = Math.floor((windowWidth - size.width) / 2) + cascadeOffset;
    let y = Math.floor((windowHeight - size.height) / 2) - 40 + cascadeOffset;

    // Ensure window stays on screen
    x = Math.max(20, Math.min(x, windowWidth - size.width - 20));
    y = Math.max(40, Math.min(y, windowHeight - size.height - 100));

    return { x, y };
};

interface PaneState {
    panes: PaneConfig[];
    nextZIndex: number;
    activePaneId: string | null;

    // Actions
    openPane: (request: PaneOpenRequest) => void;
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
    reset: () => void;
}

export const usePaneStore = create<PaneState>((set, get) => ({
    panes: [],
    nextZIndex: 500, // Start above all UI chrome (Dock=100, Navbar=100, etc.)
    activePaneId: null,

    reset: () => set({ panes: [], activePaneId: null }),

    openPane: (request) => {
        const existing = get().getPane(request.id);
        if (existing) {
            if (request.title !== existing.title || request.data !== existing.data) {
                get().updatePane(request.id, { title: request.title, data: request.data });
            }
            if (existing.minimized) {
                get().restorePane(request.id);
            } else {
                get().focusPane(request.id);
            }
            return;
        }

        // Calculate cascade offset based on number of open panes
        const openPaneCount = get().panes.filter(p => !p.minimized).length;
        const position = request.position ?? getCenteredPosition(request.size, openPaneCount);
        get().addPane({
            id: request.id,
            type: request.type,
            title: request.title,
            position,
            size: request.size,
            minimized: false,
            data: request.data
        });
    },

    addPane: (pane) => set((state) => {
        // Updated: Allow 'apps' (App Library) to coexist with other windows (Multitasking)
        const nextPanes = state.panes;

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

        // Updated: Allow multitasking, do not close 'apps' pane
        const nextPanes = state.panes;

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

        // Updated: Allow multitasking
        const nextPanes = state.panes;

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
