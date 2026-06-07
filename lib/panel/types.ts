export type PanelState =
  | 'verified'
  | 'unknown'
  | 'missing'
  | 'permission_missing'
  | 'blocked'
  | 'active'
  | 'resolved'
  | 'placeholder';

export interface PanelEvidence {
  source: string;
  source_type: string;
  status: string;
  confidence?: string;
  reason: string;
  timestamp?: string;
}

export interface IncidentStatusPanel {
  id: string;
  type: 'incident_status';
  state: PanelState;
  source: 'nightwatch';
  source_type: 'nightwatch.incident';
  timestamp?: string;
  confidence: 'verified' | 'unknown' | 'stale';
  reason: string;
  evidence: PanelEvidence[];
  payload: {
    incident_id: string;
    title: string;
    summary: string;
    severity: string;
    status: string;
    host?: string;
  };
}
