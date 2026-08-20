import { buildFabricLayout } from '@/lib/universe/fabricLayout';
import type { CoreTreeNode } from '@/lib/types/core';

const tree: CoreTreeNode[] = [{
    id: 'dept-product', type: 'department', name: 'Product', children: [{
        id: 'space-roadmap', type: 'space', name: 'Roadmap', children: [{
            id: 'folder-q3', type: 'folder', name: 'Q3', children: [
                { id: 'doc-launch', type: 'node', name: 'Launch', nodeType: 'document' },
            ],
        }],
    }],
}];

describe('buildFabricLayout', () => {
    it('preserves the real hierarchy as parent-child relationships', () => {
        const nodes = buildFabricLayout(tree);
        expect(nodes.map(({ id, parentId }) => ({ id, parentId }))).toEqual([
            { id: 'dept-product', parentId: null },
            { id: 'space-roadmap', parentId: 'dept-product' },
            { id: 'folder-q3', parentId: 'space-roadmap' },
            { id: 'doc-launch', parentId: 'folder-q3' },
        ]);
    });

    it('caps dense workspaces without inventing content', () => {
        expect(buildFabricLayout(tree, 2)).toHaveLength(2);
    });
});
