'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';

/**
 * ShellBreadcrumb — persistent OS-level location indicator.
 *
 * Mounts in MoraShell above ViewPort. Only renders when the user has
 * navigated into a department, space, or folder — the three layers that
 * need a "where am I?" anchor in the shell frame.
 *
 * Navigation contract (matches DepartmentLayer / SpaceLayer breadcrumbs):
 *   Root  → setViewLevel('core') + setCoreMode('explore')
 *   Dept  → navigateToDepartment(activeDepartmentId)   [space/folder level only]
 *   Space → (future: navigateToSpace)
 *
 * Hidden at viewLevel 'core' and 'company' — those surfaces own their chrome.
 */
export const ShellBreadcrumb: React.FC = () => {
    const viewLevel          = useMoraStore((s) => s.viewLevel);
    const activeDepartmentId = useMoraStore((s) => s.activeDepartmentId);
    const activeSpaceId      = useMoraStore((s) => s.activeSpaceId);
    const departments        = useMoraStore((s) => s.departments);
    const spacesByDepartment = useMoraStore((s) => s.spacesByDepartment);
    const setViewLevel       = useMoraStore((s) => s.setViewLevel);
    const setCoreMode        = useMoraStore((s) => s.setCoreMode);
    const navigateToDepartment = useMoraStore((s) => s.navigateToDepartment);

    // Only render inside a layer
    if (!viewLevel || viewLevel === 'core' || viewLevel === 'company') return null;

    const dept  = departments?.find((d) => d.id === activeDepartmentId) ?? null;
    const space = activeSpaceId && dept
        ? (spacesByDepartment?.[dept.id] ?? []).find((s) => s.id === activeSpaceId) ?? null
        : null;

    const handleRoot = () => {
        setViewLevel('core');
        setCoreMode('explore');
    };

    const handleDept = () => {
        if (activeDepartmentId) navigateToDepartment(activeDepartmentId);
    };

    const atSpace  = viewLevel === 'space' || viewLevel === 'folder';
    const atFolder = viewLevel === 'folder';

    return (
        <nav
            data-testid="shell-breadcrumb"
            aria-label="Navigation"
            className="flex items-center gap-1 px-4 py-2 text-[11px] text-white/35 select-none pointer-events-auto shrink-0"
        >
            {/* Root — always Universe / Explore */}
            <button
                data-testid="breadcrumb-root"
                onClick={handleRoot}
                className="hover:text-white/60 transition-colors"
            >
                Universum
            </button>

            {/* Department */}
            {dept && (
                <>
                    <ChevronRight size={10} className="opacity-40" />
                    <button
                        data-testid="breadcrumb-dept"
                        onClick={atSpace ? handleDept : undefined}
                        className={atSpace ? 'hover:text-white/60 transition-colors' : 'text-white/55 cursor-default'}
                    >
                        {dept.name}
                    </button>
                </>
            )}

            {/* Space */}
            {space && atSpace && (
                <>
                    <ChevronRight size={10} className="opacity-40" />
                    <span
                        data-testid="breadcrumb-space"
                        className={atFolder ? 'text-white/55' : 'text-white/70'}
                    >
                        {space.name}
                    </span>
                </>
            )}
        </nav>
    );
};
