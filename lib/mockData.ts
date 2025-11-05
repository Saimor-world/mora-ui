import type { Snapshot } from './types';

// Mock snapshots for Timeline (t0, t1, t2)
export const mockSnapshots: Snapshot[] = [
  {
    ts: 't0',
    nodes: [
      { id: 'n1', type: 'project', title: 'Môra UI', spaceId: 's1', tags: ['active'], path: '/Work/Projects/Môra UI' },
      { id: 'n2', type: 'document', title: 'README.md', spaceId: 's1', tags: ['docs'], path: '/Work/Projects/Môra UI/README.md' },
      { id: 'n3', type: 'document', title: 'QUICKSTART.md', spaceId: 's1', tags: ['docs'], path: '/Work/Projects/Môra UI/QUICKSTART.md' },
    ],
    edges: [
      { sourceId: 'n1', targetId: 'n2', kind: 'contains', weight: 1 },
      { sourceId: 'n1', targetId: 'n3', kind: 'contains', weight: 1 },
    ],
  },
  {
    ts: 't1',
    nodes: [
      { id: 'n1', type: 'project', title: 'Môra UI', spaceId: 's1', tags: ['active'], path: '/Work/Projects/Môra UI' },
      { id: 'n2', type: 'document', title: 'README.md', spaceId: 's1', tags: ['docs'], path: '/Work/Projects/Môra UI/README.md' },
      { id: 'n3', type: 'document', title: 'QUICKSTART.md', spaceId: 's1', tags: ['docs'], path: '/Work/Projects/Môra UI/QUICKSTART.md' },
      { id: 'n4', type: 'code', title: 'app/page.tsx', spaceId: 's1', tags: ['code', 'react'], path: '/Work/Projects/Môra UI/app/page.tsx' },
      { id: 'n5', type: 'code', title: 'components/lens/Lens.tsx', spaceId: 's1', tags: ['code', 'react'], path: '/Work/Projects/Môra UI/components/lens/Lens.tsx' },
    ],
    edges: [
      { sourceId: 'n1', targetId: 'n2', kind: 'contains', weight: 1 },
      { sourceId: 'n1', targetId: 'n3', kind: 'contains', weight: 1 },
      { sourceId: 'n1', targetId: 'n4', kind: 'contains', weight: 1 },
      { sourceId: 'n1', targetId: 'n5', kind: 'contains', weight: 1 },
      { sourceId: 'n2', targetId: 'n3', kind: 'related', weight: 0.5 },
    ],
  },
  {
    ts: 't2',
    nodes: [
      { id: 'n1', type: 'project', title: 'Môra UI', spaceId: 's1', tags: ['active'], path: '/Work/Projects/Môra UI' },
      { id: 'n2', type: 'document', title: 'README.md', spaceId: 's1', tags: ['docs'], path: '/Work/Projects/Môra UI/README.md' },
      { id: 'n3', type: 'document', title: 'QUICKSTART.md', spaceId: 's1', tags: ['docs'], path: '/Work/Projects/Môra UI/QUICKSTART.md' },
      { id: 'n4', type: 'code', title: 'app/page.tsx', spaceId: 's1', tags: ['code', 'react'], path: '/Work/Projects/Môra UI/app/page.tsx' },
      { id: 'n5', type: 'code', title: 'components/lens/Lens.tsx', spaceId: 's1', tags: ['code', 'react'], path: '/Work/Projects/Môra UI/components/lens/Lens.tsx' },
      { id: 'n6', type: 'code', title: 'components/canvas/FieldMode.tsx', spaceId: 's1', tags: ['code', 'react', '3d'], path: '/Work/Projects/Môra UI/components/canvas/FieldMode.tsx' },
      { id: 'n7', type: 'insight', title: 'Field Mode implemented', spaceId: 's1', tags: ['milestone'], path: '/Insights/Field Mode' },
    ],
    edges: [
      { sourceId: 'n1', targetId: 'n2', kind: 'contains', weight: 1 },
      { sourceId: 'n1', targetId: 'n3', kind: 'contains', weight: 1 },
      { sourceId: 'n1', targetId: 'n4', kind: 'contains', weight: 1 },
      { sourceId: 'n1', targetId: 'n5', kind: 'contains', weight: 1 },
      { sourceId: 'n1', targetId: 'n6', kind: 'contains', weight: 1 },
      { sourceId: 'n2', targetId: 'n3', kind: 'related', weight: 0.5 },
      { sourceId: 'n4', targetId: 'n5', kind: 'imports', weight: 0.8 },
      { sourceId: 'n4', targetId: 'n6', kind: 'imports', weight: 0.8 },
      { sourceId: 'n6', targetId: 'n7', kind: 'generates', weight: 1 },
    ],
  },
];
