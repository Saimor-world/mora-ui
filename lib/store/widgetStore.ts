'use client';

import { create } from 'zustand';
import type { WidgetInstance, WidgetSurface } from '@/lib/widgets/types';

const STORAGE_KEY = 'saimor_widget_layouts_v1';

// ── Default desktops ────────────────────────────────────────────────────────
// 12-column grid. These are the out-of-the-box arrangements; the user can drag,
// resize, add and remove from here, and their changes persist per surface.

const DEFAULT_HOME: WidgetInstance[] = [
    { i: 'mora-1', type: 'mora', x: 0, y: 0, w: 12, h: 2 },
    { i: 'meinTag-1', type: 'meinTag', x: 0, y: 2, w: 4, h: 6 },
    { i: 'team-1', type: 'team', x: 4, y: 2, w: 4, h: 6 },
    { i: 'signals-1', type: 'signals', x: 8, y: 2, w: 4, h: 6 },
    { i: 'orgStats-1', type: 'orgStats', x: 0, y: 8, w: 6, h: 3 },
    { i: 'quickActions-1', type: 'quickActions', x: 6, y: 8, w: 6, h: 3 },
];

const DEFAULT_DEPARTMENT: WidgetInstance[] = [
    { i: 'deptStats-1', type: 'deptStats', x: 0, y: 0, w: 6, h: 3 },
    { i: 'signals-1', type: 'signals', x: 6, y: 0, w: 6, h: 5 },
    { i: 'quickActions-1', type: 'quickActions', x: 0, y: 3, w: 6, h: 3 },
    { i: 'team-1', type: 'team', x: 0, y: 6, w: 6, h: 5 },
];

const DEFAULTS: Record<WidgetSurface, WidgetInstance[]> = {
    home: DEFAULT_HOME,
    department: DEFAULT_DEPARTMENT,
};

const clone = (items: WidgetInstance[]): WidgetInstance[] => items.map((it) => ({ ...it }));

function readStored(): Partial<Record<WidgetSurface, WidgetInstance[]>> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writeStored(layouts: Record<WidgetSurface, WidgetInstance[]>) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    } catch {
        /* quota / private mode — non-fatal, layout just won't persist */
    }
}

interface WidgetState {
    layouts: Record<WidgetSurface, WidgetInstance[]>;
    editMode: boolean;
    hydrated: boolean;
    hydrate: () => void;
    setEditMode: (value: boolean) => void;
    /** Apply geometry from react-grid-layout (drag/resize), preserving type. */
    applyLayout: (surface: WidgetSurface, next: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
    addWidget: (surface: WidgetSurface, type: string, geom: { w: number; h: number }) => void;
    removeWidget: (surface: WidgetSurface, i: string) => void;
    resetSurface: (surface: WidgetSurface) => void;
}

export const useWidgetStore = create<WidgetState>((set, get) => ({
    layouts: { home: clone(DEFAULT_HOME), department: clone(DEFAULT_DEPARTMENT) },
    editMode: false,
    hydrated: false,

    hydrate: () => {
        if (get().hydrated) return;
        const stored = readStored();
        set({
            hydrated: true,
            layouts: {
                home: stored.home && stored.home.length ? stored.home : clone(DEFAULT_HOME),
                department: stored.department && stored.department.length ? stored.department : clone(DEFAULT_DEPARTMENT),
            },
        });
    },

    setEditMode: (value) => set({ editMode: value }),

    applyLayout: (surface, next) => {
        const current = get().layouts[surface];
        const byId = new Map(current.map((w) => [w.i, w]));
        const merged = next
            .map((n) => {
                const existing = byId.get(n.i);
                if (!existing) return null;
                return { ...existing, x: n.x, y: n.y, w: n.w, h: n.h };
            })
            .filter((w): w is WidgetInstance => w !== null);
        const layouts = { ...get().layouts, [surface]: merged };
        set({ layouts });
        writeStored(layouts);
    },

    addWidget: (surface, type, geom) => {
        const current = get().layouts[surface];
        // Drop the new widget at the bottom of the grid.
        const maxY = current.reduce((m, w) => Math.max(m, w.y + w.h), 0);
        const instance: WidgetInstance = {
            i: `${type}-${Date.now().toString(36)}`,
            type,
            x: 0,
            y: maxY,
            w: geom.w,
            h: geom.h,
        };
        const layouts = { ...get().layouts, [surface]: [...current, instance] };
        set({ layouts });
        writeStored(layouts);
    },

    removeWidget: (surface, i) => {
        const layouts = { ...get().layouts, [surface]: get().layouts[surface].filter((w) => w.i !== i) };
        set({ layouts });
        writeStored(layouts);
    },

    resetSurface: (surface) => {
        const layouts = { ...get().layouts, [surface]: clone(DEFAULTS[surface]) };
        set({ layouts });
        writeStored(layouts);
    },
}));
