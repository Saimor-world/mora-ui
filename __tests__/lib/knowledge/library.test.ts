import { knowledgeLibrary } from '@/lib/knowledge/library';
import type { CoreTreeNode } from '@/lib/types/core';

const tree: CoreTreeNode[] = [{ id: 'd', type: 'department', name: 'Werkstatt', children: [
  { id: 's', type: 'space', name: 'Projekte', children: [{ id: 'f', type: 'folder', name: 'Planung', children: [
    { id: 'n', type: 'node', name: 'Fahrplan' },
  ] }] },
] }, { id: 'private', type: 'department', name: 'Privat', children: [{ id: 'secret', type: 'node', name: 'Vertraulich' }] }];

it('opens content with the real IDs of its containing workspace and folder', () => {
  const entries = knowledgeLibrary(tree, 'company-a', new Set(['d']));
  expect(entries.find(entry => entry.id === 'n')).toMatchObject({
    nodeId: 'n', folderId: 'f', spaceId: 's', departmentId: 'd', companyId: 'company-a', path: 'Werkstatt › Projekte › Planung › Fahrplan',
  });
});

it('omits inaccessible departments and all their descendants', () => {
  const entries = knowledgeLibrary(tree, 'company-a', new Set(['d']));
  expect(entries.some(entry => entry.id === 'private' || entry.id === 'secret')).toBe(false);
  expect(knowledgeLibrary(tree, 'company-a', new Set())).toEqual([]);
});

it('keeps a company workspace that has no department', () => {
  expect(knowledgeLibrary([{ id: 'free', type: 'space', name: 'Allgemein' }], 'company-a', new Set())).toEqual([
    { id: 'free', type: 'space', title: 'Allgemein', spaceId: 'free', companyId: 'company-a', path: 'Allgemein' },
  ]);
});

it('keeps the backend unassigned-workspace container without turning it into a department ID', () => {
  const entries = knowledgeLibrary([{ id: '__unassigned__', type: 'department', name: 'Allgemein', children: [{ id: 'free', type: 'space', name: 'Eingang' }] }], 'company-a', new Set());
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({ spaceId: 'free', companyId: 'company-a', path: 'Allgemein › Eingang' });
  expect(entries[0].departmentId).toBeUndefined();
});
