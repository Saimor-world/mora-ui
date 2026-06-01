import { selectRecentDepartmentDocs } from '@/lib/openflow/departmentContext';

const tree = [
  {
    id: 'dept-1', type: 'department', name: 'Vertrieb', children: [
      {
        id: 'space-1', type: 'space', name: 'Team', children: [
          { id: 'n1', type: 'node', title: 'Älteres Dok', updated_at: '2026-05-01T00:00:00.000Z' },
          { id: 'n2', type: 'node', name: 'Neustes Dok', updated_at: '2026-06-01T00:00:00.000Z' },
        ],
      },
    ],
  },
  { id: 'dept-2', type: 'department', name: 'HR', children: [] },
];

describe('selectRecentDepartmentDocs', () => {
  it('collects nodes nested under the department, newest first', () => {
    const docs = selectRecentDepartmentDocs(tree as any, 'dept-1', 10);
    expect(docs.map((d) => d.id)).toEqual(['n2', 'n1']);
    expect(docs[0].title).toBe('Neustes Dok');
  });

  it('respects the limit', () => {
    expect(selectRecentDepartmentDocs(tree as any, 'dept-1', 1).map((d) => d.id)).toEqual(['n2']);
  });

  it('returns empty when the department is not found', () => {
    expect(selectRecentDepartmentDocs(tree as any, 'nope', 10)).toEqual([]);
  });
});
