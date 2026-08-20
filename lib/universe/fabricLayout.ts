import type { CoreTreeNode } from '@/lib/types/core';

export interface FabricLayoutNode {
    id: string;
    type: CoreTreeNode['type'];
    title: string;
    subtitle: string;
    x: number;
    y: number;
    color: string;
    parentId: string | null;
    data: CoreTreeNode;
}

const TYPE_COLOR: Record<CoreTreeNode['type'], string> = {
    department: '#67e8f9',
    space: '#c4b5fd',
    folder: '#fde68a',
    node: '#6ee7b7',
};

const TYPE_LABEL: Record<CoreTreeNode['type'], string> = {
    department: 'Abteilung',
    space: 'Bereich',
    folder: 'Ordner',
    node: 'Dokument',
};

const ISLAND_ANCHORS = [
    { x: -300, y: -170 },
    { x: 300, y: -155 },
    { x: -280, y: 185 },
    { x: 285, y: 180 },
    { x: 0, y: -245 },
    { x: 0, y: 245 },
];

/**
 * Turns the real company tree into calm, independent context islands.
 * Root departments are not connected to an invented global hub. Only actual
 * parent-child relationships receive a path in the spatial surface.
 */
export function buildFabricLayout(tree: CoreTreeNode[], maxNodes = 48): FabricLayoutNode[] {
    const result: FabricLayoutNode[] = [];
    const departments = tree.filter((item) => item.type === 'department');

    const append = (item: CoreTreeNode, parentId: string | null, x: number, y: number) => {
        if (result.length >= maxNodes) return false;
        result.push({
            id: item.id,
            type: item.type,
            title: item.name || 'Ohne Titel',
            subtitle: item.nodeType === 'task' ? 'Aufgabe' : TYPE_LABEL[item.type],
            x,
            y,
            color: item.color || TYPE_COLOR[item.type],
            parentId,
            data: item,
        });
        return true;
    };

    departments.forEach((department, departmentIndex) => {
        const anchor = ISLAND_ANCHORS[departmentIndex]
            ?? {
                x: Math.cos((departmentIndex / departments.length) * Math.PI * 2) * 320,
                y: Math.sin((departmentIndex / departments.length) * Math.PI * 2) * 210,
            };
        if (!append(department, null, anchor.x, anchor.y)) return;

        const spaces = (department.children || []).filter((child) => child.type === 'space').slice(0, 5);
        spaces.forEach((space, spaceIndex) => {
            const angle = -Math.PI / 2 + (spaceIndex / Math.max(1, spaces.length)) * Math.PI * 2;
            const spaceX = anchor.x + Math.cos(angle) * 104;
            const spaceY = anchor.y + Math.sin(angle) * 76;
            if (!append(space, department.id, spaceX, spaceY)) return;

            const folders = (space.children || []).filter((child) => child.type === 'folder').slice(0, 3);
            folders.forEach((folder, folderIndex) => {
                const fan = (folderIndex - (folders.length - 1) / 2) * 0.58;
                const folderAngle = angle + fan;
                const folderX = spaceX + Math.cos(folderAngle) * 68;
                const folderY = spaceY + Math.sin(folderAngle) * 50;
                if (!append(folder, space.id, folderX, folderY)) return;

                const documents = (folder.children || []).filter((child) => child.type === 'node').slice(0, 2);
                documents.forEach((document, documentIndex) => {
                    const documentAngle = folderAngle + (documentIndex === 0 ? -0.28 : 0.28);
                    append(
                        document,
                        folder.id,
                        folderX + Math.cos(documentAngle) * 44,
                        folderY + Math.sin(documentAngle) * 34,
                    );
                });
            });
        });
    });

    return result;
}