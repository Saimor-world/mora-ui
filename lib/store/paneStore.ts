import { create } from 'zustand';

export interface PaneConfig {
    id: string;
    type: 'document' | 'chat' | 'node-detail' | 'settings' | 'timeline' | 'apps' | 'finder' | 'notes' | 'scanner' | 'grid' | 'space' | 'integrations' | 'search' | 'users' | 'company-detail' | 'mail' | 'team' | 'calendar' | 'terminal';

    title: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    minimized: boolean;
    zIndex: number;
    tabs?: Array<{ id: string, title: string, content: any }>;
    activeTabId?: string;
    data?: any;
}

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
        // Prevent duplicate panes with same ID
        const existingPane = state.panes.find(p => p.id === pane.id);
        if (existingPane) {
            // If pane already exists, just focus it instead of creating duplicate
            return {
                panes: state.panes.map(p =>
                    p.id === pane.id
                        ? { ...p, zIndex: state.nextZIndex, minimized: false }
                        : p
                ),
                nextZIndex: state.nextZIndex + 1,
                activePaneId: pane.id
            };
        }

        const newPane: PaneConfig = {
            ...pane,
            zIndex: state.nextZIndex,
            minimized: false
        };
        return {
            panes: [...state.panes, newPane],
            nextZIndex: state.nextZIndex + 1,
            activePaneId: newPane.id
        };
    }),

    removePane: (id) => set((state) => ({
        panes: state.panes.filter(p => p.id !== id),
        activePaneId: state.activePaneId === id ? null : state.activePaneId
    })),

    updatePane: (id, updates) => set((state) => ({
        panes: state.panes.map(p =>
            p.id === id ? { ...p, ...updates } : p
        )
    })),

    focusPane: (id) => set((state) => {
        const pane = state.panes.find(p => p.id === id);
        if (!pane) return state;

        return {
            panes: state.panes.map(p =>
                p.id === id
                    ? { ...p, zIndex: state.nextZIndex, minimized: false }
                    : p
            ),
            nextZIndex: state.nextZIndex + 1,
            activePaneId: id
        };
    }),

    minimizePane: (id) => set((state) => ({
        panes: state.panes.map(p =>
            p.id === id ? { ...p, minimized: true } : p
        ),
        activePaneId: state.activePaneId === id ? null : state.activePaneId
    })),

    restorePane: (id) => set((state) => ({
        panes: state.panes.map(p =>
            p.id === id ? { ...p, minimized: false, zIndex: state.nextZIndex } : p
        ),
        nextZIndex: state.nextZIndex + 1,
        activePaneId: id
    })),

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