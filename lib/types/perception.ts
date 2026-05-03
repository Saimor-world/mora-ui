/**
 * PerceptionBundle — TypeScript mirror of api_schemas/perception.py (CORE).
 *
 * MUST stay in sync with the Pydantic models. If you change one, change both
 * and bump the version field.
 *
 * See: docs/superpowers/specs/2026-04-25-real-mora-design.md §2.1
 */

export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export type MemoryCategory = 'fact' | 'preference' | 'context' | 'summary';
export type EditKind = 'rename' | 'move' | 'content_update' | 'create' | 'delete';
export type IntentHint = 'read' | 'write_action' | 'navigate' | 'chat';

export interface ScopeEntity {
  id: string;
  name: string;
}

export interface Identity {
  user_id: string;
  name: string;
  role: Role;
  tenant_id: string;
  active_company: ScopeEntity;
}

export interface Scope {
  company:    ScopeEntity | null;
  department: ScopeEntity | null;
  space:      ScopeEntity | null;
  folder:     ScopeEntity | null;
}

export interface ActiveObject {
  id: string;
  type: string;
  title: string;
  path: string;
}

export interface NavigationEntry { to_id: string; to_type: string; at: string; }
export interface EditEntry      { entity_id: string; entity_type: string; kind: EditKind; at: string; }
export interface OpenPaneEntry  { id: string; type: string; summary: string; }
export interface DraftEntry     { pane_id: string; summary: string; updated_at: string; }

export interface RecentActivity {
  navigations: NavigationEntry[];
  edits:       EditEntry[];
  open_panes:  OpenPaneEntry[];
  drafts:      DraftEntry[];
}

export interface MemoryHit {
  id: string;
  summary: string;
  category: MemoryCategory;
  score: number;  // 0..1
}

export interface ToolRunSummary {
  journal_id: string;
  tool: string;
  change_summary: string | null;
  ok: boolean;
  at: string;
}

export interface Capabilities {
  tools_available:  string[];
  tools_degraded:   string[];
  providers_active: string[];
  memory_writable:  boolean;
}

export interface PerceptionBundle {
  version: 'v1';
  issued_at: string;
  identity: Identity;
  scope: Scope;
  active_object: ActiveObject | null;
  recent_activity: RecentActivity;
  relevant_memory: MemoryHit[];
  recent_tool_runs: ToolRunSummary[];
  capabilities: Capabilities;
}

export interface PerceptionRequest {
  query?: string;
  active_pane?: { type: string; data: Record<string, unknown> };
  user_intent_hint?: IntentHint;
}
