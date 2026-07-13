import { applyMyceliumRelations, type MyceliumNode } from '@/lib/utils/myceliumDataMapper';

const nodes: MyceliumNode[] = [
  { id: 'a', title: 'A', type: 'document', position: [0, 0, 0], color: '#fff', size: 1, connections: ['c'] },
  { id: 'b', title: 'B', type: 'document', position: [1, 0, 0], color: '#fff', size: 1, connections: [] },
  { id: 'c', title: 'C', type: 'document', position: [2, 0, 0], color: '#fff', size: 1, connections: ['a'] },
];

describe('applyMyceliumRelations', () => {
  it('uses persisted CORE edges instead of visual guesses', () => {
    const result = applyMyceliumRelations(nodes, [
      { source_id: 'a', target_id: 'b' },
      { source_id: 'missing', target_id: 'a' },
    ]);

    expect(result.find((node) => node.id === 'a')?.connections).toEqual(['b']);
    expect(result.find((node) => node.id === 'b')?.connections).toEqual(['a']);
    expect(result.find((node) => node.id === 'c')?.connections).toEqual([]);
  });
});
