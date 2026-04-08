import { buildBriefing } from '@/lib/home/briefing';
import type { CoreDepartment } from '@/lib/types/core';
import type { CoreTreeNode } from '@/lib/types/core';

const dept = (id: string, name: string): CoreDepartment => ({
    id, name, slug: id, tenant_id: 't1', order: 0,
});

const treeNode = (id: string, children?: CoreTreeNode[]): CoreTreeNode => ({
    id, name: id, type: 'department', children,
} as CoreTreeNode);

describe('buildBriefing', () => {
    it('returns fallback when departments is empty', () => {
        expect(buildBriefing([], [])).toBe('Bereit wenn du es bist.');
    });

    it('returns fallback when treeData is null', () => {
        expect(buildBriefing([dept('d1', 'R&D')], null)).toBe('Bereit wenn du es bist.');
    });

    it('returns fallback when all dept nodes have undefined children (not loaded)', () => {
        const tree = [treeNode('d1')]; // children === undefined
        expect(buildBriefing([dept('d1', 'R&D')], tree)).toBe('Bereit wenn du es bist.');
    });

    it('reports a single active department', () => {
        const children = [treeNode('n1'), treeNode('n2'), treeNode('n3')];
        const tree = [treeNode('d1', children)];
        const result = buildBriefing([dept('d1', 'R&D')], tree);
        expect(result).toContain('R&D ist aktiv');
        expect(result).toContain('3 Inhalte');
    });

    it('uses singular Inhalt for count of 1', () => {
        const tree = [treeNode('d1', [treeNode('n1')])];
        const result = buildBriefing([dept('d1', 'R&D')], tree);
        expect(result).toContain('1 Inhalt');
        expect(result).not.toContain('1 Inhalte');
    });

    it('reports quiet departments with empty children array', () => {
        const tree = [treeNode('d1', [])];
        const result = buildBriefing([dept('d1', 'R&D')], tree);
        expect(result).toContain('R&D');
        expect(result).toContain('ruhig');
    });

    it('separates active and quiet departments in output', () => {
        const tree = [
            treeNode('d1', [treeNode('n1'), treeNode('n2')]),
            treeNode('d2', []),
        ];
        const result = buildBriefing([dept('d1', 'R&D'), dept('d2', 'Product')], tree);
        expect(result).toContain('R&D ist aktiv');
        expect(result).toContain('Product');
        expect(result).toContain('ruhig');
    });

    it('returns fallback when all loaded depts are quiet but none active', () => {
        const tree = [treeNode('d1', []), treeNode('d2', [])];
        const result = buildBriefing([dept('d1', 'R&D'), dept('d2', 'Product')], tree);
        expect(result).toContain('ruhig');
        expect(result).not.toBe('Bereit wenn du es bist.');
    });
});
