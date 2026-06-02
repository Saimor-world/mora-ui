import { deriveFinderMaps } from '@/lib/finder/deriveFinderMaps';

const tree: any = [
  {
    id: 'dept-1', type: 'department', name: 'Vertrieb', children: [
      {
        id: 'space-1', type: 'space', name: 'Team', color: '#abc', children: [
          {
            id: 'folder-1', type: 'folder', name: 'Angebote', color: '#def', children: [
              { id: 'n1', type: 'node', nodeType: 'pdf', name: 'Angebot A' },
              { id: 'n2', type: 'node', name: 'Notiz B' },
            ],
          },
          { id: 'folder-2', type: 'folder', name: 'Leer', children: [] },
        ],
      },
    ],
  },
];

describe('deriveFinderMaps', () => {
  it('maps spaces by department with folder counts', () => {
    const { spacesByDepartment } = deriveFinderMaps(tree);
    expect(spacesByDepartment['dept-1']).toEqual([
      { id: 'space-1', type: 'space', name: 'Team', color: '#abc', folder_count: 2 },
    ]);
  });

  it('maps folders by space with node counts', () => {
    const { foldersBySpace } = deriveFinderMaps(tree);
    expect(foldersBySpace['space-1']).toEqual([
      { id: 'folder-1', type: 'folder', name: 'Angebote', color: '#def', node_count: 2 },
      { id: 'folder-2', type: 'folder', name: 'Leer', color: undefined, node_count: 0 },
    ]);
  });

  it('maps nodes by folder, propagating space/department context and defaulting type', () => {
    const { nodesByFolder } = deriveFinderMaps(tree);
    expect(nodesByFolder['folder-1']).toEqual([
      { id: 'n1', type: 'pdf', title: 'Angebot A', name: 'Angebot A', folder_id: 'folder-1', space_id: 'space-1', department_id: 'dept-1' },
      { id: 'n2', type: 'document', title: 'Notiz B', name: 'Notiz B', folder_id: 'folder-1', space_id: 'space-1', department_id: 'dept-1' },
    ]);
    expect(nodesByFolder['folder-2']).toEqual([]);
  });

  it('returns empty maps for an empty tree', () => {
    expect(deriveFinderMaps([])).toEqual({ spacesByDepartment: {}, foldersBySpace: {}, nodesByFolder: {} });
  });
});
