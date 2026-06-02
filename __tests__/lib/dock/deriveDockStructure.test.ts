import { deriveDockStructure } from '@/lib/dock/deriveDockStructure';

const tree: any = [
  {
    id: 'dept-1', type: 'department', name: 'Vertrieb', children: [
      {
        id: 'space-1', type: 'space', name: 'Team', color: '#abc', children: [
          {
            id: 'folder-1', type: 'folder', name: 'Angebote', color: '#def', children: [
              { id: 'n1', type: 'node', name: 'A' },
              { id: 'n2', type: 'node', name: 'B' },
            ],
          },
          { id: 'folder-2', type: 'folder', name: 'Leer', children: [] },
        ],
      },
    ],
  },
  { id: 'loose', type: 'space', name: 'NichtUnterDept', children: [] },
];

describe('deriveDockStructure', () => {
  it('maps spaces by department with folder counts', () => {
    const { spacesByDepartment } = deriveDockStructure(tree);
    expect(spacesByDepartment['dept-1']).toEqual([
      { id: 'space-1', name: 'Team', color: '#abc', folder_count: 2 },
    ]);
  });

  it('maps folders by space with node counts', () => {
    const { foldersBySpace } = deriveDockStructure(tree);
    expect(foldersBySpace['space-1']).toEqual([
      { id: 'folder-1', name: 'Angebote', color: '#def', node_count: 2 },
      { id: 'folder-2', name: 'Leer', color: undefined, node_count: 0 },
    ]);
  });

  it('ignores top-level nodes that are not departments', () => {
    const { spacesByDepartment } = deriveDockStructure(tree);
    expect(spacesByDepartment['loose']).toBeUndefined();
  });

  it('returns empty maps for an empty tree', () => {
    expect(deriveDockStructure([])).toEqual({ spacesByDepartment: {}, foldersBySpace: {} });
  });
});
