import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

type TreeNodeLike = {
  id?: string;
  type?: string;
  children?: TreeNodeLike[];
};

function collectIncidentNodeIds(incident: NightwatchIncidentItem): Set<string> {
  return new Set(
    [
      incident.id,
      incident.node_id,
      ...(Array.isArray(incident.relatedNodeIds) ? incident.relatedNodeIds : []),
    ].filter((value): value is string => Boolean(value))
  );
}

function treeContainsIncidentUnderDepartment(
  nodes: TreeNodeLike[] | null | undefined,
  departmentId: string,
  incidentNodeIds: Set<string>,
): boolean {
  if (!Array.isArray(nodes) || incidentNodeIds.size === 0) return false;

  const visit = (node: TreeNodeLike, insideDepartment: boolean): boolean => {
    const nodeId = node.id;
    const nextInsideDepartment = insideDepartment || nodeId === departmentId;

    if (nextInsideDepartment && nodeId && incidentNodeIds.has(nodeId)) {
      return true;
    }

    if (!Array.isArray(node.children)) return false;
    return node.children.some((child) => visit(child, nextInsideDepartment));
  };

  return nodes.some((node) => visit(node, false));
}

export function incidentBelongsToDepartment(
  incident: NightwatchIncidentItem,
  activeDepartmentId: string | null | undefined,
  treeData?: TreeNodeLike[] | null,
): boolean {
  if (!activeDepartmentId) return false;

  if (incident.department_id === activeDepartmentId) return true;
  if (incident.affected_department_id === activeDepartmentId) return true;

  return treeContainsIncidentUnderDepartment(
    treeData,
    activeDepartmentId,
    collectIncidentNodeIds(incident),
  );
}

export function filterIncidentsForDepartment(
  incidents: NightwatchIncidentItem[] | null | undefined,
  activeDepartmentId: string | null | undefined,
  treeData?: TreeNodeLike[] | null,
): NightwatchIncidentItem[] {
  if (!Array.isArray(incidents)) return [];
  return incidents.filter((incident) => incidentBelongsToDepartment(incident, activeDepartmentId, treeData));
}
