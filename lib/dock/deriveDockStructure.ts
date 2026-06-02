import type { CoreTreeNode } from '@/lib/types/core';

export type DockDerivedSpace = {
    id: string;
    name: string;
    color?: string | null;
    folder_count?: number | null;
};

export type DockDerivedFolder = {
    id: string;
    name: string;
    color?: string | null;
    node_count?: number | null;
};

/**
 * Flattens the company tree into the Dock's lookup maps: spaces per department
 * and folders per space (with counts). Pure — only top-level departments are
 * walked. Extracted from components/mora/Dock.tsx.
 */
export function deriveDockStructure(tree: CoreTreeNode[]) {
    const spacesByDepartment: Record<string, DockDerivedSpace[]> = {};
    const foldersBySpace: Record<string, DockDerivedFolder[]> = {};

    tree.forEach((department) => {
        if (department.type !== 'department') return;
        const spaces = (department.children || []).filter((child) => child.type === 'space');
        spacesByDepartment[department.id] = spaces.map((space) => {
            const folders = (space.children || []).filter((child) => child.type === 'folder');
            foldersBySpace[space.id] = folders.map((folder) => ({
                id: folder.id,
                name: folder.name,
                color: folder.color,
                node_count: (folder.children || []).filter((child) => child.type === 'node').length,
            }));
            return {
                id: space.id,
                name: space.name,
                color: space.color,
                folder_count: folders.length,
            };
        });
    });

    return { spacesByDepartment, foldersBySpace };
}
