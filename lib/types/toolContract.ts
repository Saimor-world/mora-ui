/**
 * Tool contract types — TypeScript mirror of api_schemas/tool_contract.py.
 *
 * MUST stay in sync with the Pydantic models. Passive in P2a (no
 * consumer); P3's chat dialogue protocol will start rendering these.
 *
 * See: docs/superpowers/specs/2026-04-25-real-mora-design.md §3.
 */

export type RiskLevel = 'safe' | 'write' | 'destructive' | 'secret';

export interface AffectedPreview {
  id: string;
  type: string;
  role: 'will_create' | 'will_modify' | 'will_delete';
}

export interface AffectedActual {
  id: string;
  type: string;
  role: 'created' | 'modified' | 'deleted';
  new_state?: Record<string, unknown>;
}

export interface Preview {
  intent: string;
  scope_path: string;
  affected_entities: AffectedPreview[];
  reversible: boolean;
  estimated_duration_ms: number | null;
}

export interface ToolError {
  code: string;
  user_message: string;
  recovery_hint: string;
  technical_detail?: string;
}

export interface Result {
  ok: boolean;
  journal_id: string;
  tool_name: string;
  tool_version: string;

  // When ok=true
  output?: Record<string, unknown> | null;
  change_summary?: string | null;
  affected_entities?: AffectedActual[] | null;

  // When ok=false
  error?: ToolError | null;
  partial_changes?: AffectedActual[] | null;
}
