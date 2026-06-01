import type { DepartmentRecentDoc } from '@/components/home/DepartmentView';

interface TreeNodeLike {
  id: string;
  type?: string;
  name?: string;
  title?: string;
  updated_at?: string;
  created_at?: string;
  children?: TreeNodeLike[];
}

function findNode(nodes: TreeNodeLike[], targetId: string): TreeNodeLike | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (node.children) {
      const hit = findNode(node.children, targetId);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Collects the document nodes nested anywhere under a department, sorted by
 * recency (newest first). Read-only derivation over the existing tree — no new
 * data source. Used by the Department overview surface.
 */
export function selectRecentDepartmentDocs(
  tree: TreeNodeLike[],
  departmentId: string,
  limit: number,
): DepartmentRecentDoc[] {
  const root = findNode(tree, departmentId);
  if (!root) return [];

  const docs: DepartmentRecentDoc[] = [];
  const walk = (node: TreeNodeLike) => {
    if (node.type === 'node') {
      docs.push({
        id: node.id,
        title: node.title || node.name || 'Dokument',
        updatedAt: node.updated_at || node.created_at,
      });
    }
    node.children?.forEach(walk);
  };
  root.children?.forEach(walk);

  return docs
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, limit);
}
