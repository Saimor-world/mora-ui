import { create } from 'zustand';

export type ViewLevel = 'core' | 'department' | 'space' | 'folder';

interface MoraState {
    // Spatial Position
    viewLevel: ViewLevel;
    activeDepartmentId: string | null;
    activeSpaceId: string | null;

    // Actions
    setViewLevel: (level: ViewLevel) => void;
    setActiveDepartment: (id: string | null) => void;
    setActiveSpace: (id: string | null) => void;

    // Navigation Helpers
    navigateToCore: () => void;
    navigateToDepartment: (deptId: string) => void;
    navigateToSpace: (spaceId: string) => void;
}

export const useMoraStore = create<MoraState>((set) => ({
    viewLevel: 'core',
    activeDepartmentId: null,
    activeSpaceId: null,

    setViewLevel: (level) => set({ viewLevel: level }),
    setActiveDepartment: (id) => set({ activeDepartmentId: id }),
    setActiveSpace: (id) => set({ activeSpaceId: id }),

    navigateToCore: () => set({
        viewLevel: 'core',
        activeDepartmentId: null,
        activeSpaceId: null
    }),

    navigateToDepartment: (deptId) => set({
        viewLevel: 'department',
        activeDepartmentId: deptId,
        activeSpaceId: null
    }),

    navigateToSpace: (spaceId) => set({
        viewLevel: 'space',
        activeSpaceId: spaceId
    }),
}));
