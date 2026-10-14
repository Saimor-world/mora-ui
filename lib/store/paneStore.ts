import { create } from 'zustand';
import type { PaneType } from '@/lib/surface/surfaceRegistry';
import { useActivityStore } from '@/lib/store/activityStore';

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

const getViewport = () => ({
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
});

// Workspace insets reserve the breadcrumb (top), Dock (bottom) and the universe
// widget bands (left/right cols) so sheets never bury peripheral glance panels.
const getWorkspaceInsets = (windowWidth: number, windowHeight: number) => {
    const leftInset = windowWidth >= 1440 ? 420 : windowWidth >= 1180 ? 400 : windowWidth >= 1024 ? 280 : 20;
    const rightInset = windowWidth >= 1440 ? 320 : 20;
    const topInset = windowHeight >= 760 ? 86 : 48;
    const bottomInset = windowHeight >= 760 ? 150 : 96;
    const workspaceWidth = Math.max(360, windowWidth - leftInset - rightInset);
    const workspaceHeight = Math.max(360, windowHeight - topInset - bottomInset);
    return { leftInset, rightInset, topInset, bottomInset, workspaceWidth, workspaceHeight };
};

const getCenteredPosition = (size: { width: number; height: number }) => {
    const { windowWidth, windowHeight } = getViewport();
    const compact = windowWidth < 720;
    // Match the rendered GlassPanel bounds, including oversized app requests.
    // Sidebar reservations and app-specific edge anchors must not shift the centre.
    const renderedWidth = compact ? Math.max(304, windowWidth - 16) : Math.min(size.width, windowWidth - 32);
    const renderedHeight = compact ? Math.max(360, windowHeight - 148) : Math.min(size.height, windowHeight - 160);
    return {
        x: Math.max(0, Math.floor((windowWidth - renderedWidth) / 2)),
        y: Math.max(0, Math.floor((windowHeight - renderedHeight) / 2)),
    };
};

export type LayoutPreset = 'focus_single' | 'split_50_50' | 'split_33_66' | 'triple_columns' | 'tile_quad' | 'close_all';

// Stand 0 intentionally starts a fresh OS pane session instead of carrying the
// historical desktop/Desk naming into the unified Saimôr OS.
const OS_PANE_SESSION_KEY = 'saimor_os_panes_v1';

const loadPersistedPanes = (): PaneConfig[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(OS_PANE_SESSION_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            // Validate basic pane shape
            return parsed.filter((p: any) => p && typeof p.id === 'string' && typeof p.type === 'string');
        }
        return [];
    } catch {
        return [];
    }
};

const savePersistedPanes = (panes: PaneConfig[]) => {
    if (typeof window === 'undefined') return;
    try {
        // Only persist relevant user panes, skip fleeting overlays
        const persistable = panes
            .filter(p => !['settings', 'apps'].includes(p.type))
            .slice(0, 8); // max 8 saved panes
        localStorage.setItem(OS_PANE_SESSION_KEY, JSON.stringify(persistable));
    } catch {
        // storage quota exceeded or disabled
    }
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
    applyLayoutPreset: (preset: LayoutPreset) => void;
    closeAllPanes: () => void;
    reset: () => void;
}

export const usePaneStore = create<PaneState>((set, get) => ({
    panes: loadPersistedPanes(),
    nextZIndex: 500, // Start above all UI chrome (Dock=100, Navbar=100, etc.)
    activePaneId: null,

    reset: () => {
        if (typeof window !== 'undefined') {
            try { localStorage.removeItem(OS_PANE_SESSION_KEY); } catch {}
        }
        set({ panes: [], activePaneId: null });
    },

    closeAllPanes: () => {
        if (typeof window !== 'undefined') {
            try { localStorage.removeItem(OS_PANE_SESSION_KEY); } catch {}
        }
        set({ panes: [], activePaneId: null });
    },

    applyLayoutPreset: (preset: LayoutPreset) => set((state) => {
        const { windowWidth, windowHeight } = getViewport();
        const { leftInset, rightInset, topInset, bottomInset, workspaceWidth, workspaceHeight } = getWorkspaceInsets(windowWidth, windowHeight);
        const visiblePanes = state.panes.filter(p => !p.minimized);

        if (visiblePanes.length === 0) return state;

        let updatedPanes = [...state.panes];

        if (preset === 'close_all') {
            if (typeof window !== 'undefined') {
                try { localStorage.removeItem(OS_PANE_SESSION_KEY); } catch {}
            }
            return { panes: [], activePaneId: null };
        }

        if (preset === 'focus_single') {
            const targetId = state.activePaneId || visiblePanes[0]?.id;
            if (!targetId) return state;

            updatedPanes = state.panes.map(p => {
                if (p.id === targetId) {
                    return {
                        ...p,
                        position: { x: leftInset, y: topInset },
                        size: { width: workspaceWidth, height: workspaceHeight },
                        minimized: false,
                        zIndex: state.nextZIndex + 1,
                    };
                }
                return p;
            });
        } else if (preset === 'split_50_50') {
            const p1 = visiblePanes[0];
            const p2 = visiblePanes[1] || visiblePanes[0];
            const halfWidth = Math.floor((workspaceWidth - 16) / 2);

            updatedPanes = state.panes.map(p => {
                if (p.id === p1.id) {
                    return {
                        ...p,
                        position: { x: leftInset, y: topInset },
                        size: { width: halfWidth, height: workspaceHeight },
                        minimized: false,
                    };
                }
                if (p2 && p.id === p2.id && p2.id !== p1.id) {
                    return {
                        ...p,
                        position: { x: leftInset + halfWidth + 16, y: topInset },
                        size: { width: halfWidth, height: workspaceHeight },
                        minimized: false,
                    };
                }
                return p;
            });
        } else if (preset === 'split_33_66') {
            const p1 = visiblePanes[0];
            const p2 = visiblePanes[1];
            const leftWidth = Math.floor(workspaceWidth * 0.36);
            const rightWidth = workspaceWidth - leftWidth - 16;

            updatedPanes = state.panes.map(p => {
                if (p.id === p1.id) {
                    return {
                        ...p,
                        position: { x: leftInset, y: topInset },
                        size: { width: leftWidth, height: workspaceHeight },
                        minimized: false,
                    };
                }
                if (p2 && p.id === p2.id && p2.id !== p1.id) {
                    return {
                        ...p,
                        position: { x: leftInset + leftWidth + 16, y: topInset },
                        size: { width: rightWidth, height: workspaceHeight },
                        minimized: false,
                    };
                }
                return p;
            });
        } else if (preset === 'triple_columns') {
            const p1 = visiblePanes[0];
            const p2 = visiblePanes[1];
            const p3 = visiblePanes[2];
            const colWidth = Math.floor((workspaceWidth - 32) / 3);

            updatedPanes = state.panes.map(p => {
                if (p1 && p.id === p1.id) {
                    return { ...p, position: { x: leftInset, y: topInset }, size: { width: colWidth, height: workspaceHeight }, minimized: false };
                }
                if (p2 && p.id === p2.id) {
                    return { ...p, position: { x: leftInset + colWidth + 16, y: topInset }, size: { width: colWidth, height: workspaceHeight }, minimized: false };
                }
                if (p3 && p.id === p3.id) {
                    return { ...p, position: { x: leftInset + (colWidth * 2) + 32, y: topInset }, size: { width: colWidth, height: workspaceHeight }, minimized: false };
                }
                return p;
            });
        }

        savePersistedPanes(updatedPanes);
        return {
            panes: updatedPanes,
            nextZIndex: state.nextZIndex + 2,
        };
    }),

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

        // Default app windows are centred; explicit user/layout positions still win.
        const position = request.position ?? getCenteredPosition(request.size);
        get().addPane({
            id: request.id,
            type: request.type,
            title: request.title,
            position,
            size: request.size,
            minimized: false,
            data: request.data
        });

        // OS-level activity tracking: record every user-facing pane open
        const skipTypes = new Set(['settings', 'apps', 'grid']);
        if (!skipTypes.has(request.type)) {
            useActivityStore.getState().recordActivity({
                id: request.id,
                label: request.title,
                paneType: request.type,
                paneData: request.data,
            });
        }
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
        savePersistedPanes(panes);
        return {
            panes,
            nextZIndex: state.nextZIndex + 1,
            activePaneId: normalized.activePaneId
        };
    }),

    removePane: (id) => set((state) => {
        const panes = state.panes.filter(p => p.id !== id);
        const normalized = normalizeFrontmost(panes, state.activePaneId === id ? null : state.activePaneId);
        savePersistedPanes(panes);
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
        savePersistedPanes(panes);
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
        savePersistedPanes(panes);
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
        savePersistedPanes(panes);
        return {
            panes,
            nextZIndex: state.nextZIndex + 1,
            activePaneId: normalized.activePaneId
        };
    }),

    getPane: (id) => get().panes.find(p => p.id === id),

    getVisiblePanes: () => get().panes.filter(p => !p.minimized),

    updatePanePosition: (id, x, y) => set((state) => {
        const panes = state.panes.map(p =>
            p.id === id ? { ...p, position: { x, y } } : p
        );
        savePersistedPanes(panes);
        return { panes };
    }),

    updatePaneSize: (id, width, height) => set((state) => {
        const panes = state.panes.map(p =>
            p.id === id ? { ...p, size: { width, height } } : p
        );
        savePersistedPanes(panes);
        return { panes };
    })
}));
