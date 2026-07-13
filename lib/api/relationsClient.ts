import { coreGet } from './coreClient';
import { corePost, coreDelete, corePatch } from './coreClient';

export interface RelationEdge {
  id: string;
  source_id: string;
  target_id: string;
  kind: string;
  weight: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface SpaceRelationsResponse {
  relations: RelationEdge[];
  nodes?: any[];
}

export interface MyceliumOverview {
  status: 'active' | string;
  nodes: number;
  edges: number;
  connected_nodes: number;
  unconnected_nodes: number;
  by_type: Record<string, number>;
  company_id?: string | null;
}

export const getRelationsForSpace = async (spaceId: string): Promise<SpaceRelationsResponse> => {
  return coreGet(`/v3/relations/space/${spaceId}`) as Promise<SpaceRelationsResponse>;
};

export const getRelationsForNode = async (nodeId: string): Promise<RelationEdge[]> => {
  return coreGet(`/v3/relations/node/${nodeId}`) as Promise<RelationEdge[]>;
};

export const getMyceliumOverview = async (companyId?: string | null): Promise<MyceliumOverview> => {
  const query = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
  return coreGet(`/v3/relations/mycelium/overview${query}`) as Promise<MyceliumOverview>;
};

// Relation payload types
export interface CreateRelationPayload {
  source_id: string;
  target_id: string;
  kind: string;
  weight?: number;
  metadata?: Record<string, any>;
}

export const createRelation = async (payload: CreateRelationPayload): Promise<RelationEdge> => {
  return corePost('/v3/relations', payload) as Promise<RelationEdge>;
};

export const deleteRelation = async (relationId: string): Promise<void> => {
  return coreDelete(`/v3/relations/${relationId}`);
};
