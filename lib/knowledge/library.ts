import type { CoreTreeNode } from '@/lib/types/core';
import type { OpenableSearchResult } from '@/lib/utils/searchOpen';
import { UNASSIGNED_DEPARTMENT_ID } from '@/lib/constants/tree';

/** Carry the real containing IDs through the tree; names are never navigation IDs. */
export function knowledgeLibrary(tree: CoreTreeNode[], companyId: string, allowedDepartments: ReadonlySet<string>): OpenableSearchResult[] {
  const entries: OpenableSearchResult[] = [];
  const walk = (nodes: CoreTreeNode[], path: string[], context: Partial<OpenableSearchResult>) => {
    for (const node of nodes) {
      if (node.type === 'department' && node.id === UNASSIGNED_DEPARTMENT_ID) {
        if (node.children?.length) walk(node.children, [...path, node.name], context);
        continue;
      }
      if (node.type === 'department' && !allowedDepartments.has(node.id)) continue;
      const location = [...path, node.name];
      const next = { ...context, ...(node.type === 'department' ? { departmentId: node.id } : node.type === 'space' ? { spaceId: node.id } : node.type === 'folder' ? { folderId: node.id } : {}) };
      entries.push({ ...next, id: node.id, type: node.type, title: node.name, companyId, path: location.join(' › '), ...(node.type === 'node' ? { nodeId: node.id } : {}) });
      if (node.children?.length) walk(node.children, location, next);
    }
  };
  walk(tree, [], {});
  return entries;
}
