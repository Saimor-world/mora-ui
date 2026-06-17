'use client';

import { create } from 'zustand';
import type { WidgetInstance, WidgetSurface } from '@/lib/widgets/types';
import { filterWidgetsForSurface } from '@/lib/widgets/surfaceAllowlist';
import {
    fetchDesktopLayouts,
    saveDesktopLayouts,
    isDesktopLayoutConflict,
    conflictDetail,
    type DesktopLayoutsPayload,
} from '@/lib/api/desktopLayoutClient';
import { useNavStore } from '@/lib/store/navStore';

/** Legacy localStorage key — migrated once per company when server has no layouts. */
const LEGACY_STORAGE_KEY = 'saimor_widget_layouts_v2';
const MIGRATION_FLAG_PREFIX = 'saimor_desktop_layouts_migrated_';
const SYNC_DEBOUNCE_MS = 600;

type EditableSurface = 'universe' | 'department';

interface CompanyLayoutState {
    universe: WidgetInstance[];
    department: WidgetInstance[];
    departments: Record<string, WidgetInstance[]>;
}

const DEFAULT_DEPARTMENT: WidgetInstance[] = [
    { i: 'deptStats-1', type: 'deptStats', x: 0, y: 0, w: 6, h: 3 },
    { i: 'nightwatch-1', type: 'nightwatch', x: 6, y: 0, w: 6, h: 8 },
    { i: 'signals-1', type: 'signals', x: 0, y: 3, w: 6, h: 5 },
    { i: 'quickActions-1', type: 'quickActions', x: 0, y: 8, w: 6, h: 3 },
    { i: 'team-1', type: 'team', x: 6, y: 8, w: 6, h: 4 },
];

const DEFAULT_UNIVERSE: WidgetInstance[] = [
    { i: 'nightwatch-1', type: 'nightwatch', x: 0, y: 0, w: 4, h: 8 },
    { i: 'signals-1', type: 'signals', x: 4, y: 0, w: 4, h: 8 },
    { i: 'orgStats-1', type: 'orgStats', x: 8, y: 0, w: 4, h: 4 },
    { i: 'clock-1', type: 'clock', x: 8, y: 4, w: 4, h: 4 },
];

const DEFAULTS: Record<EditableSurface, WidgetInstance[]> = {
    department: DEFAULT_DEPARTMENT,
    universe: DEFAULT_UNIVERSE,
};

const clone = (items: WidgetInstance[]): WidgetInstance[] => items.map((it) => ({ ...it }));

function emptyCompanyLayouts(): CompanyLayoutState {
    return {
        universe: clone(DEFAULT_UNIVERSE),
        department: clone(DEFAULT_DEPARTMENT),
        departments: {},
    };
}

function readLegacyLocalStorage(): Partial<Record<WidgetSurface, WidgetInstance[]>> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function migrationFlagKey(companyId: string) {
    return `${MIGRATION_FLAG_PREFIX}${companyId}`;
}

function hasMigrated(companyId: string): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(migrationFlagKey(companyId)) === '1';
}

function markMigrated(companyId: string) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(migrationFlagKey(companyId), '1');
    } catch {
        /* non-fatal */
    }
}

function serverLayoutsEmpty(payload: Partial<DesktopLayoutsPayload> | undefined): boolean {
    if (!payload) return true;
    const hasUniverse = Array.isArray(payload.universe) && payload.universe.length > 0;
    const hasDepartment = Array.isArray(payload.department) && payload.department.length > 0;
    const hasDepartments =
        payload.departments &&
        typeof payload.departments === 'object' &&
        Object.values(payload.departments).some((items) => Array.isArray(items) && items.length > 0);
    return !hasUniverse && !hasDepartment && !hasDepartments;
}

function normalizeFromServer(raw: Partial<DesktopLayoutsPayload> | undefined): CompanyLayoutState {
    const base = emptyCompanyLayouts();
    if (!raw) return base;
    if (Array.isArray(raw.universe) && raw.universe.length) {
        base.universe = filterWidgetsForSurface(clone(raw.universe), 'universe');
    }
    if (Array.isArray(raw.department) && raw.department.length) {
        base.department = filterWidgetsForSurface(clone(raw.department), 'department');
    }
    if (raw.departments && typeof raw.departments === 'object') {
        for (const [deptId, items] of Object.entries(raw.departments)) {
            if (Array.isArray(items) && items.length) {
                base.departments[deptId] = filterWidgetsForSurface(clone(items), 'department');
            }
        }
    }
    return base;
}

function legacyToCompanyLayouts(): CompanyLayoutState {
    const stored = readLegacyLocalStorage();
    const base = emptyCompanyLayouts();
    if (stored.universe?.length) base.universe = filterWidgetsForSurface(clone(stored.universe), 'universe');
    if (stored.department?.length) {
        base.department = filterWidgetsForSurface(clone(stored.department), 'department');
    }
    return base;
}

function toPayload(state: CompanyLayoutState): DesktopLayoutsPayload {
    return {
        universe: state.universe,
        department: state.department,
        departments: state.departments,
    };
}

function resolveDepartmentItems(state: CompanyLayoutState, departmentId?: string | null): WidgetInstance[] {
    if (departmentId && state.departments[departmentId]?.length) {
        return state.departments[departmentId];
    }
    return state.department;
}

function resolveSurfaceItems(
    state: CompanyLayoutState,
    surface: WidgetSurface,
    departmentId?: string | null,
): WidgetInstance[] {
    if (surface === 'home') return [];
    if (surface === 'universe') return state.universe;
    return resolveDepartmentItems(state, departmentId);
}

function writeDepartmentItems(
    state: CompanyLayoutState,
    items: WidgetInstance[],
    departmentId?: string | null,
): CompanyLayoutState {
    if (departmentId) {
        return { ...state, departments: { ...state.departments, [departmentId]: items } };
    }
    return { ...state, department: items };
}

interface WidgetState {
    /** Legacy shape for callers that read layouts[surface] — mirrors active company. */
    layouts: Record<WidgetSurface, WidgetInstance[]>;
    editMode: boolean;
    hydrated: boolean;
    activeCompanyId: string | null;
    activeDepartmentId: string | null;
    serverUpdatedAt: string | null;
    /** In-flight hydrate per company to avoid duplicate fetches. */
    _hydrating: Record<string, boolean>;
    _syncTimer: ReturnType<typeof setTimeout> | null;

    setLayoutScope: (companyId: string | null, departmentId?: string | null) => void;
    hydrate: () => void;
    getSurfaceItems: (surface: WidgetSurface, departmentId?: string | null) => WidgetInstance[];
    setEditMode: (value: boolean) => void;
    applyLayout: (
        surface: WidgetSurface,
        next: Array<{ i: string; x: number; y: number; w: number; h: number }>,
        departmentId?: string | null,
    ) => void;
    addWidget: (
        surface: WidgetSurface,
        type: string,
        geom: { w: number; h: number },
        departmentId?: string | null,
    ) => void;
    removeWidget: (surface: WidgetSurface, i: string, departmentId?: string | null) => void;
    resetSurface: (surface: WidgetSurface, departmentId?: string | null) => void;
}

let companyCache: Record<string, CompanyLayoutState> = {};

function publishLayouts(
    companyId: string | null,
    departmentId: string | null,
    state: CompanyLayoutState,
): Record<WidgetSurface, WidgetInstance[]> {
    return {
        home: [],
        universe: state.universe,
        department: resolveDepartmentItems(state, departmentId),
    };
}

function scheduleSync(get: () => WidgetState, set: (partial: Partial<WidgetState>) => void) {
    const companyId = get().activeCompanyId;
    if (!companyId) return;

    const existing = get()._syncTimer;
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
        const snapshot = get();
        const cached = companyCache[companyId];
        if (!cached || !snapshot.activeCompanyId) return;

        try {
            const response = await saveDesktopLayouts(
                companyId,
                toPayload(cached),
                snapshot.serverUpdatedAt,
            );
            if (response?.updated_at) {
                set({ serverUpdatedAt: response.updated_at });
            }
        } catch (err) {
            if (isDesktopLayoutConflict(err)) {
                const detail = conflictDetail(err);
                if (detail?.layouts) {
                    const serverState = normalizeFromServer(detail.layouts);
                    companyCache[companyId] = serverState;
                    set({
                        layouts: publishLayouts(companyId, snapshot.activeDepartmentId, serverState),
                        serverUpdatedAt: detail.updated_at ?? null,
                    });
                }
            }
        }
    }, SYNC_DEBOUNCE_MS);

    set({ _syncTimer: timer });
}

async function hydrateCompany(companyId: string, get: () => WidgetState, set: (partial: Partial<WidgetState>) => void) {
    if (!companyId || get()._hydrating[companyId]) return;
    set({ _hydrating: { ...get()._hydrating, [companyId]: true } });

    try {
        const response = await fetchDesktopLayouts(companyId);
        let companyState: CompanyLayoutState;
        let updatedAt: string | null = response?.updated_at ?? null;

        if (response && !serverLayoutsEmpty(response.layouts)) {
            companyState = normalizeFromServer(response.layouts);
        } else if (!hasMigrated(companyId)) {
            companyState = legacyToCompanyLayouts();
            markMigrated(companyId);
            try {
                const migrated = await saveDesktopLayouts(companyId, toPayload(companyState), null);
                updatedAt = migrated?.updated_at ?? updatedAt;
            } catch {
                /* offline — local migration still applied in memory */
            }
        } else {
            companyState = emptyCompanyLayouts();
        }

        companyCache[companyId] = companyState;

        if (get().activeCompanyId === companyId) {
            set({
                hydrated: true,
                serverUpdatedAt: updatedAt,
                layouts: publishLayouts(companyId, get().activeDepartmentId, companyState),
            });
        }
    } finally {
        const next = { ...get()._hydrating };
        delete next[companyId];
        set({ _hydrating: next });
    }
}

export const useWidgetStore = create<WidgetState>((set, get) => ({
    layouts: { home: [], universe: clone(DEFAULT_UNIVERSE), department: clone(DEFAULT_DEPARTMENT) },
    editMode: false,
    hydrated: false,
    activeCompanyId: null,
    activeDepartmentId: null,
    serverUpdatedAt: null,
    _hydrating: {},
    _syncTimer: null,

    setLayoutScope: (companyId, departmentId = null) => {
        const prevCompany = get().activeCompanyId;
        const prevDept = get().activeDepartmentId;
        if (prevCompany === companyId && prevDept === departmentId) return;

        set({ activeCompanyId: companyId, activeDepartmentId: departmentId ?? null });

        if (companyId && companyCache[companyId]) {
            set({
                layouts: publishLayouts(companyId, departmentId ?? null, companyCache[companyId]),
                hydrated: true,
            });
        } else if (companyId) {
            set({ hydrated: false });
            void hydrateCompany(companyId, get, set);
        } else {
            set({ hydrated: true, layouts: { home: [], universe: clone(DEFAULT_UNIVERSE), department: clone(DEFAULT_DEPARTMENT) } });
        }
    },

    hydrate: () => {
        const companyId =
            get().activeCompanyId ??
            (typeof window !== 'undefined' ? useNavStore.getState().activeCompanyId : null);
        if (!companyId) {
            set({ hydrated: true });
            return;
        }
        if (get().activeCompanyId !== companyId) {
            get().setLayoutScope(companyId, get().activeDepartmentId);
            return;
        }
        if (companyCache[companyId]) {
            set({
                hydrated: true,
                layouts: publishLayouts(companyId, get().activeDepartmentId, companyCache[companyId]),
            });
            return;
        }
        void hydrateCompany(companyId, get, set);
    },

    getSurfaceItems: (surface, departmentId) => {
        const companyId = get().activeCompanyId;
        const state = companyId ? companyCache[companyId] ?? emptyCompanyLayouts() : emptyCompanyLayouts();
        const deptId = departmentId ?? get().activeDepartmentId;
        return resolveSurfaceItems(state, surface, deptId);
    },

    setEditMode: (value) => set({ editMode: value }),

    applyLayout: (surface, next, departmentId) => {
        if (surface === 'home') return;
        const companyId = get().activeCompanyId;
        if (!companyId) return;

        const state = companyCache[companyId] ?? emptyCompanyLayouts();
        const deptId = surface === 'department' ? (departmentId ?? get().activeDepartmentId) : null;
        const current = resolveSurfaceItems(state, surface, deptId);
        const byId = new Map(current.map((w) => [w.i, w]));
        const merged = next
            .map((n) => {
                const existing = byId.get(n.i);
                if (!existing) return null;
                return { ...existing, x: n.x, y: n.y, w: n.w, h: n.h };
            })
            .filter((w): w is WidgetInstance => w !== null);

        const filtered = filterWidgetsForSurface(merged, surface);
        let nextState = state;
        if (surface === 'universe') {
            nextState = { ...state, universe: filtered };
        } else {
            nextState = writeDepartmentItems(state, filtered, deptId);
        }

        companyCache[companyId] = nextState;
        set({ layouts: publishLayouts(companyId, get().activeDepartmentId, nextState) });
        scheduleSync(get, set);
    },

    addWidget: (surface, type, geom, departmentId) => {
        if (surface === 'home') return;
        const companyId = get().activeCompanyId;
        if (!companyId) return;

        const state = companyCache[companyId] ?? emptyCompanyLayouts();
        const deptId = surface === 'department' ? (departmentId ?? get().activeDepartmentId) : null;
        const current = resolveSurfaceItems(state, surface, deptId);
        const maxY = current.reduce((m, w) => Math.max(m, w.y + w.h), 0);
        const instance: WidgetInstance = {
            i: `${type}-${Date.now().toString(36)}`,
            type,
            x: 0,
            y: maxY,
            w: geom.w,
            h: geom.h,
        };
        const nextItems = filterWidgetsForSurface([...current, instance], surface);
        let nextState = state;
        if (surface === 'universe') {
            nextState = { ...state, universe: nextItems };
        } else {
            nextState = writeDepartmentItems(state, nextItems, deptId);
        }

        companyCache[companyId] = nextState;
        set({ layouts: publishLayouts(companyId, get().activeDepartmentId, nextState) });
        scheduleSync(get, set);
    },

    removeWidget: (surface, i, departmentId) => {
        if (surface === 'home') return;
        const companyId = get().activeCompanyId;
        if (!companyId) return;

        const state = companyCache[companyId] ?? emptyCompanyLayouts();
        const deptId = surface === 'department' ? (departmentId ?? get().activeDepartmentId) : null;
        const current = resolveSurfaceItems(state, surface, deptId);
        const nextItems = current.filter((w) => w.i !== i);
        let nextState = state;
        if (surface === 'universe') {
            nextState = { ...state, universe: nextItems };
        } else {
            nextState = writeDepartmentItems(state, nextItems, deptId);
        }

        companyCache[companyId] = nextState;
        set({ layouts: publishLayouts(companyId, get().activeDepartmentId, nextState) });
        scheduleSync(get, set);
    },

    resetSurface: (surface, departmentId) => {
        if (surface === 'home') return;
        const companyId = get().activeCompanyId;
        if (!companyId) return;

        const state = companyCache[companyId] ?? emptyCompanyLayouts();
        const deptId = surface === 'department' ? (departmentId ?? get().activeDepartmentId) : null;
        const defaults = clone(DEFAULTS[surface as EditableSurface]);
        let nextState = state;
        if (surface === 'universe') {
            nextState = { ...state, universe: defaults };
        } else {
            nextState = writeDepartmentItems(state, defaults, deptId);
        }

        companyCache[companyId] = nextState;
        set({ layouts: publishLayouts(companyId, get().activeDepartmentId, nextState) });
        scheduleSync(get, set);
    },
}));
