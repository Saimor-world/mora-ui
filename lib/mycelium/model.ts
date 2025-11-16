export type MoraNode = {
  id: string;
  label: string;
  type: 'person' | 'team' | 'project' | 'document' | 'channel' | 'kpi' | string;
  space?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
};

export type MoraEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: 'uses' | 'belongs_to' | 'mentions' | 'depends_on' | string;
  weight?: number;
};

export type MoraSpace = {
  id: string;
  label: string;
  kind: 'bereich' | 'projekt' | 'baum' | string;
};
