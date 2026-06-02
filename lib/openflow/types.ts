export type OpenFlowSourceKind =
  | 'mail'
  | 'calendar'
  | 'cloud'
  | 'feed'
  | 'crm'
  | 'erp'
  | 'server'
  | 'git'
  | 'manual'
  | 'os';

export type OpenFlowPriority = 'low' | 'normal' | 'high' | 'urgent';
export type OpenFlowSignalStatus = 'new' | 'seen' | 'triaged' | 'linked' | 'resolved' | 'dismissed';
export type OpenFlowTrustScope = 'personal' | 'department' | 'organization';

export type OpenFlowActionKind =
  | 'reply'
  | 'create_decision'
  | 'open_flow'
  | 'assign_task'
  | 'archive'
  | 'ask_user'
  | 'open_pane'
  | 'connect_source';

export interface OpenFlowSuggestedAction {
  id: string;
  label: string;
  kind: OpenFlowActionKind;
  paneType?: string;
  paneData?: Record<string, unknown>;
}

export interface OpenFlowSignal {
  id: string;
  source: OpenFlowSourceKind;
  title: string;
  summary: string;
  priority: OpenFlowPriority;
  status: OpenFlowSignalStatus;
  trustScope: OpenFlowTrustScope;
  occurredAt?: string;
  relatedInitiativeId?: string;
  relatedNodeIds: string[];
  relatedRelationIds: string[];
  suggestedActions: OpenFlowSuggestedAction[];
}

export interface InitiativeSummary {
  id: string;
  title: string;
  signalCount: number;
  riskCount: number;
  decisionCount: number;
  sourceKinds: OpenFlowSourceKind[];
  updatedAt?: string;
}

export type ConnectorHealth = 'connected' | 'local' | 'needs_setup' | 'degraded' | 'offline';

export interface ConnectorStatus {
  id: string;
  label: string;
  source: OpenFlowSourceKind;
  status: ConnectorHealth;
  detail: string;
  actionLabel?: string;
}

export type OpenFlowRunStatus = 'running' | 'waiting_for_human' | 'completed' | 'failed';

export interface OpenFlowRun {
  id: string;
  title: string;
  status: OpenFlowRunStatus;
  currentStepLabel: string;
  relatedSignalIds: string[];
}

export interface OpenFlowLagebild {
  /**
   * The single most important thing right now — the dynamic "situation" headline
   * (smartphone-home style). null = calm state (nothing needs the operator).
   */
  headline: OpenFlowSignal | null;
  changed: OpenFlowSignal[];
  attention: OpenFlowSignal[];
  nextSteps: OpenFlowSignal[];
  initiatives: InitiativeSummary[];
  connectors: ConnectorStatus[];
}

export type AppUniverseGroupId =
  | 'work'
  | 'sources'
  | 'agents_flows'
  | 'people'
  | 'studio'
  | 'system';

export interface AppUniverseGroup {
  id: AppUniverseGroupId;
  label: string;
  description: string;
  appIds: string[];
}
