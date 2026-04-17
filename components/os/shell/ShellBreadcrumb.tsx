'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useSpaces } from '@/lib/queries/useSpaces';

/**
 * ShellBreadcrumb — deep-location anchor for folder work only.
 *
 * UniverseControls now carries the primary context at department/space level.
 * This breadcrumb stays reserved for folder depth where a persistent path is
 * still useful while panes and overlays are open.
 */
export const ShellBreadcrumb: React.FC = () => {
    const viewLevel = useNavStore((state) => state.viewLevel);
    const activeDepartmentId = useNavStore((state) => state.activeDepartmentId);
    const activeSpaceId = useNavStore((state) => state.activeSpaceId);
    const activeCompanyId = useNavStore((state) => state.activeCompanyId);
    const navigateToExplore = useNavStore((state) => state.navigateToExplore);
    const navigateToDepartment = useNavStore((state) => state.navigateToDepartment);
    const navigateToSpace = useNavStore((state) => state.navigateToSpace);
    const { data: departments = [] } = useDepartments(activeCompanyId);
    const { data: spaces = [] } = useSpaces(activeDepartmentId);

    if (viewLevel !== 'folder') return null;

    const dept = departments.find((department) => department.id === activeDepartmentId) ?? null;
    const space = activeSpaceId && dept
        ? spaces.find((entry) => entry.id === activeSpaceId) ?? null
        : null;

    return (
        <nav
            data-testid="shell-breadcrumb"
            aria-label="Navigation"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[11px] text-white/35 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl select-none pointer-events-auto"
        >
            <button
                data-testid="breadcrumb-root"
                onClick={navigateToExplore}
                className="transition-colors hover:text-white/60"
            >
                Universum
            </button>

            {dept && (
                <>
                    <ChevronRight size={10} className="opacity-40" />
                    <button
                        data-testid="breadcrumb-dept"
                        onClick={() => navigateToDepartment(dept.id)}
                        className="transition-colors hover:text-white/60"
                    >
                        {dept.name}
                    </button>
                </>
            )}

            {space && (
                <>
                    <ChevronRight size={10} className="opacity-40" />
                    <button
                        data-testid="breadcrumb-space"
                        onClick={() => navigateToSpace(space.id)}
                        className="text-white/55 transition-colors hover:text-white/72"
                    >
                        {space.name}
                    </button>
                </>
            )}
        </nav>
    );
};
