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

/** Build stable parent-child clusters instead of a random radial cloud. */
export function buildFabricLayout(tree: CoreTreeNode[], maxNodes = 48): FabricLayoutNode[] {
    const result: FabricLayoutNode[] = [];
    const departments = tree.filter((item) => item.type === 'department');
    const departmentCount = Math.max(1, departments.length);

    const append = (
        item: CoreTreeNode,
        parentId: string | null,
        x: number,
        y: number,
    ) => {
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
        const angle = -Math.PI / 2 + (departmentIndex / departmentCount) * Math.PI * 2;
        const departmentX = Math.cos(angle) * 340;
        const departmentY = Math.sin(angle) * 255;
        if (!append(department, null, departmentX, departmentY)) return;

        const spaces = (department.children || []).filter((child) => child.type === 'space');
        spaces.slice(0, 5).forEach((space, spaceIndex) => {
            const spread = (spaceIndex - (spaces.length - 1) / 2) * 0.5;
            const spaceAngle = angle + spread;
            const spaceX = departmentX + Math.cos(spaceAngle) * 118;
            const spaceY = departmentY + Math.sin(spaceAngle) * 88;
            if (!append(space, department.id, spaceX, spaceY)) return;

            const folders = (space.children || []).filter((child) => child.type === 'folder');
            folders.slice(0, 4).forEach((folder, folderIndex) => {
                const folderAngle = spaceAngle + (folderIndex - (folders.length - 1) / 2) * 0.52;
                const folderX = spaceX + Math.cos(folderAngle) * 76;
                const folderY = spaceY + Math.sin(folderAngle) * 58;
                if (!append(folder, space.id, folderX, folderY)) return;

                const documents = (folder.children || []).filter((child) => child.type === 'node');
                documents.slice(0, 3).forEach((document, documentIndex) => {
                    const documentAngle = folderAngle + (documentIndex - 1) * 0.42;
                    append(
                        document,
                        folder.id,
                        folderX + Math.cos(documentAngle) * 48,
                        folderY + Math.sin(documentAngle) * 38,
                    );
                });
            });
        });
    });

    return result;
}
