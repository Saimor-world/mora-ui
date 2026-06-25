// lib/store/navStore.ts
// Navigation state — all synchronous, zero async actions.
// Setting activeCompanyId does NOT trigger any data fetches.
// Data fetching is handled by TanStack Query hooks enabled/disabled by these IDs.

import { create } from 'zustand';
import type { ViewLevel, ViewMode, CoreMode, NameConflictState } from '@/lib/types/mora';

const getStandardModeKey = (companyId?: string | null) =>
  companyId ? `saimor_standard_mode_${companyId}` : 'saimor_standard_mode_default';

const readStandardMode = (companyId?: string | null): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(getStandardModeKey(companyId));
  return stored === '1' || stored === 'true';
};

interface NavState {
  viewLevel: ViewLevel;
  coreMode: CoreMode;
  viewMode: ViewMode;
  activeCompanyId: string | null;
  activeDepartmentId: string | null;
  activeSpaceId: string | null;
  activeFolderId: string | null;
  isStandardMode: boolean;
  nameConflict: NameConflictState | null;
  activeMode: 'real_hq' | 'public_playground' | 'personal_demo' | 'private_preview' | 'visitor';
  /** 'org' = planet map (admin/owner); 'dept' = DeptSpaceMap (single-dept employee) */
  universeScope: 'org' | 'dept';
  /** Dept whose spaces DeptSpaceMap renders (set when universeScope === 'dept') */
  universeScopeDeptId: string | null;
  /**
   * Viewport-percentage point of the planet last flown into ({x,y} in 0–100).
   * Drives the cinematic zoom transform-origin so entering a department feels
   * like flying into that planet, and backing out reverses from the same spot.
   * null = use the cosmos center (no specific planet origin).
   */
  departmentEntryOrigin: { x: number; y: number } | null;
  /** Voice mode overlay — sits above the active surface without changing viewLevel. */
  voiceOverlayOpen: boolean;

  setViewLevel(level: ViewLevel): void;
  setVoiceOverlayOpen(open: boolean): void;
  toggleVoiceOverlay(): void;
  setCoreMode(mode: CoreMode): void;
  setViewMode(mode: ViewMode): void;
  setActiveCompany(id: string | null): void;
  setActiveDepartment(id: string | null): void;
  setActiveSpace(id: string | null): void;
  setActiveFolder(id: string | null): void;
  setIsStandardMode(active: boolean): void;
  setNameConflict(conflict: NameConflictState | null): void;
  cancelNameConflict(): void;
  navigateToCore(): void;
  navigateToExplore(): void;
  navigateToAmbient(): void;
  navigateToDepartment(deptId: string, entryOrigin?: { x: number; y: number } | null): void;
  navigateToSpace(spaceId: string): void;
  setDepartmentEntryOrigin(origin: { x: number; y: number } | null): void;
  navigateToFolder(folderId: string | null): void;
  setActiveMode(mode: 'real_hq' | 'public_playground' | 'personal_demo' | 'private_preview' | 'visitor'): void;
  setUniverseScope(scope: 'org' | 'dept', deptId?: string | null): void;
}

export const useNavStore = create<NavState>((set, get) => ({
  viewLevel: 'core',
  coreMode: 'home',
  viewMode: 'workspace',
  activeCompanyId: null,
  activeDepartmentId: null,
  activeSpaceId: null,
  activeFolderId: null,
  isStandardMode: false,
  nameConflict: null,
  activeMode: (typeof window !== 'undefined' ? localStorage.getItem('saimor_active_mode') as any : null) || 'real_hq',
  universeScope: 'org',
  universeScopeDeptId: null,
  departmentEntryOrigin: null,
  voiceOverlayOpen: false,

  setViewLevel: (level) => set({ viewLevel: level }),
  setVoiceOverlayOpen: (open) => set({ voiceOverlayOpen: open }),
  toggleVoiceOverlay: () => set((state) => ({ voiceOverlayOpen: !state.voiceOverlayOpen })),
  setCoreMode: (mode) => set({ coreMode: mode }),
  setViewMode: (mode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('saimor_view_mode', mode);
    }
    set({ viewMode: mode });
    if (mode === 'owner') set({ viewLevel: 'company' });
    else if (mode === 'demo' || mode === 'workspace') set({ viewLevel: 'core' });
  },

  setActiveMode: (mode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('saimor_active_mode', mode);
    }
    set({ activeMode: mode });
  },

  setUniverseScope: (scope, deptId = null) => set({
    universeScope: scope,
    universeScopeDeptId: scope === 'dept' ? deptId : null,
  }),

  setActiveCompany: (id) => {
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('last_company_id', id);
      else localStorage.removeItem('last_company_id');
    }
    set({
      activeCompanyId: id,
      activeDepartmentId: null,
      activeSpaceId: null,
      activeFolderId: null,
      viewLevel: 'core',
      coreMode: 'home',
      isStandardMode: readStandardMode(id),
    });
  },

  setActiveDepartment: (id) => set({ activeDepartmentId: id }),
  setActiveSpace: (id) => set({ activeSpaceId: id }),
  setActiveFolder: (id) => set({ activeFolderId: id }),

  setIsStandardMode: (active) => {
    const companyId = get().activeCompanyId;
    if (typeof window !== 'undefined') {
      localStorage.setItem(getStandardModeKey(companyId), active ? '1' : '0');
    }
    set({ isStandardMode: active });
  },

  setNameConflict: (conflict) => set({ nameConflict: conflict }),
  cancelNameConflict: () => set({ nameConflict: null }),

  setDepartmentEntryOrigin: (origin) => set({ departmentEntryOrigin: origin }),

  navigateToCore: () => set({
    viewLevel: 'core',
    coreMode: 'home',
    activeDepartmentId: null,
    activeSpaceId: null,
    activeFolderId: null,
    voiceOverlayOpen: false,
  }),

  navigateToExplore: () => set({
    viewLevel: 'core',
    coreMode: 'explore',
    activeDepartmentId: null,
    activeSpaceId: null,
    activeFolderId: null,
  }),

  navigateToAmbient: () => set({ voiceOverlayOpen: true }),

  // entryOrigin (planet viewport %) keeps the zoom anchored to the clicked
  // planet. When absent (e.g. breadcrumb/search jumps) the prior origin is
  // preserved so the transition still has a sensible focal point.
  navigateToDepartment: (deptId, entryOrigin) => set((state) => ({
    viewLevel: 'department',
    activeDepartmentId: deptId,
    activeSpaceId: null,
    activeFolderId: null,
    departmentEntryOrigin: entryOrigin === undefined ? state.departmentEntryOrigin : entryOrigin,
  })),

  navigateToSpace: (spaceId) => set({
    viewLevel: 'space',
    activeSpaceId: spaceId,
    activeFolderId: null,
  }),

  navigateToFolder: (folderId) => {
    const { activeSpaceId, activeDepartmentId } = get();
    const nextViewLevel: ViewLevel = activeSpaceId
      ? 'space'
      : activeDepartmentId ? 'department' : 'core';
    set({ viewLevel: nextViewLevel, activeFolderId: folderId });
    // NOTE: openPane for finder is called by the component that calls navigateToFolder
    // (paneStore is not imported here to avoid circular dependency risk)
  },
}));
