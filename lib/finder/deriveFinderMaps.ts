import type { CoreTreeNode } from '@/lib/types/core';

export interface FinderMaps {
    spacesByDepartment: Record<string, any[]>;
    foldersBySpace: Record<string, any[]>;
    nodesByFolder: Record<string, any[]>;
}

/**
 * Flattens the company tree into lookup maps the Finder uses for fast,
 * level-keyed access: spaces per department, folders per space, nodes per
 * folder. Pure — derived entirely from the tree, with space/department context
 * propagated down to each node. Extracted from apps/finder/index.tsx.
 */
export function deriveFinderMaps(tree: CoreTreeNode[]): FinderMaps {
    const spacesByDepartment: Record<string, any[]> = {};
    const foldersBySpace: Record<string, any[]> = {};
    const nodesByFolder: Record<string, any[]> = {};

    const walk = (nodes: CoreTreeNode[], context: { departmentId?: string; spaceId?: string } = {}) => {
        nodes.forEach((node) => {
            if (node.type === 'department') {
                const spaces = (node.children || []).filter((child) => child.type === 'space');
                spacesByDepartment[node.id] = spaces.map((space) => ({
                    id: space.id,
                    type: space.type,
                    name: space.name,
                    color: space.color,
                    folder_count: (space.children || []).filter((child) => child.type === 'folder').length,
                }));
                walk(node.children || [], { departmentId: node.id });
                return;
            }

            if (node.type === 'space') {
                const folders = (node.children || []).filter((child) => child.type === 'folder');
                foldersBySpace[node.id] = folders.map((folder) => ({
                    id: folder.id,
                    type: folder.type,
                    name: folder.name,
                    color: folder.color,
                    node_count: (folder.children || []).filter((child) => child.type === 'node').length,
                }));
                walk(node.children || [], { ...context, spaceId: node.id });
                return;
            }

            if (node.type === 'folder') {
                nodesByFolder[node.id] = (node.children || [])
                    .filter((child) => child.type === 'node')
                    .map((child) => ({
                        id: child.id,
                        type: child.nodeType || 'document',
                        title: child.name,
                        name: child.name,
                        folder_id: node.id,
                        space_id: context.spaceId,
                        department_id: context.departmentId,
                    }));
                walk(node.children || [], context);
            }
        });
    };

    walk(tree);
    return { spacesByDepartment, foldersBySpace, nodesByFolder };
}
