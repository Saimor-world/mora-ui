// TypeScript Interfaces from SHARED_CONTEXT.md ## UI/Contract

export interface MoraObject {
  id: string;
  type: string;
  title: string;
  path?: string;
  url?: string;
  tags: string[];
  spaceId: string;
  ts?: string;
  metadata?: Record<string, any>;
  source?: 'mock' | 'real'; // Data source indicator
}

export interface Relation {
  sourceId: string;
  targetId: string;
  kind: string;
  weight?: number;
}

export interface Snapshot {
  ts: string;
  nodes: MoraObject[];
  edges: Relation[];
}

export interface Insight {
  id: string;
  ts: string;
  text: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface RunTrace {
  runId: string;
  steps: Array<{
    step: string;
    status: string;
    durationMs: number;
  }>;
  status: 'running' | 'success' | 'error';
  durationMs: number;
}

// Space & Department types
export interface Space {
  id: string;
  name: string;
  type: 'personal' | 'shared' | 'department';
  privacy: 'private' | 'team' | 'public';
}

export interface Department {
  id: string;
  name: string;
  spaceId: string;
  projects: string[];
}
