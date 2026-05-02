/**
 * MoraFrame — TypeScript mirror of api_schemas/mora_frame.py (CORE).
 *
 * The typed chat-stream contract per spec §4.1. Each frame kind maps
 * to a distinct card surface in the chat (PreviewCard / ConfirmCard /
 * ProgressFrame / ResultCard / ErrorCard / CapabilityGapCard).
 *
 * MUST stay in sync with the Pydantic models on CORE. If you change
 * one, change both.
 *
 * See: docs/superpowers/specs/2026-04-25-real-mora-design.md §4.1
 */

import type { Preview, Result, RiskLevel } from './toolContract';

// ── Individual frame shapes ─────────────────────────────────────────────────

export interface ThoughtFrame {
  kind: 'thought';
  text: string;
}

export interface PreviewFrame {
  kind: 'preview';
  preview: Preview;
  tool: string;
  tool_version: string;
  risk_level: RiskLevel;
}

export interface ProgressFrame {
  kind: 'progress';
  tool: string;
  phase: string;
  journal_id: string;
  pct?: number | null;
}

export interface ResultFrame {
  kind: 'result';
  result: Result;
  tool: string;
}

export interface NearestTool {
  tool: string;
  why_close: string;
}

export interface CapabilityGapFrame {
  kind: 'capability_gap';
  intent: string;
  nearest: NearestTool[];
}

// ── Discriminated union ─────────────────────────────────────────────────────

export type MoraFrame =
  | ThoughtFrame
  | PreviewFrame
  | ProgressFrame
  | ResultFrame
  | CapabilityGapFrame;

export type MoraFrameKind = MoraFrame['kind'];

// ── Type guards ─────────────────────────────────────────────────────────────

export function isThoughtFrame(f: MoraFrame): f is ThoughtFrame {
  return f.kind === 'thought';
}

export function isPreviewFrame(f: MoraFrame): f is PreviewFrame {
  return f.kind === 'preview';
}

export function isProgressFrame(f: MoraFrame): f is ProgressFrame {
  return f.kind === 'progress';
}

export function isResultFrame(f: MoraFrame): f is ResultFrame {
  return f.kind === 'result';
}

export function isCapabilityGapFrame(f: MoraFrame): f is CapabilityGapFrame {
  return f.kind === 'capability_gap';
}

// ── Parser ──────────────────────────────────────────────────────────────────

const KNOWN_KINDS: ReadonlySet<string> = new Set<MoraFrameKind>([
  'thought',
  'preview',
  'progress',
  'result',
  'capability_gap',
]);

/**
 * Parse a JSON-decoded payload into a MoraFrame. Returns null when the
 * payload doesn't carry a known kind — caller can fall back to a
 * legacy text token. Never throws.
 */
export function parseFrame(payload: unknown): MoraFrame | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  const kind = obj.kind;
  if (typeof kind !== 'string' || !KNOWN_KINDS.has(kind)) return null;

  // Shape validation is intentionally lightweight here — CORE is the
  // authoritative validator (Pydantic). At the consumer side we trust the
  // server but guard against `kind` mismatches.
  switch (kind as MoraFrameKind) {
    case 'thought':
      return typeof obj.text === 'string' ? { kind: 'thought', text: obj.text } : null;

    case 'preview':
      if (!obj.preview || typeof obj.tool !== 'string' || typeof obj.tool_version !== 'string') return null;
      if (typeof obj.risk_level !== 'string') return null;
      return {
        kind: 'preview',
        preview: obj.preview as Preview,
        tool: obj.tool,
        tool_version: obj.tool_version,
        risk_level: obj.risk_level as RiskLevel,
      };

    case 'progress':
      if (typeof obj.tool !== 'string' || typeof obj.phase !== 'string' || typeof obj.journal_id !== 'string') return null;
      return {
        kind: 'progress',
        tool: obj.tool,
        phase: obj.phase,
        journal_id: obj.journal_id,
        pct: typeof obj.pct === 'number' ? obj.pct : null,
      };

    case 'result':
      if (!obj.result || typeof obj.tool !== 'string') return null;
      return { kind: 'result', result: obj.result as Result, tool: obj.tool };

    case 'capability_gap':
      if (typeof obj.intent !== 'string' || !Array.isArray(obj.nearest)) return null;
      return {
        kind: 'capability_gap',
        intent: obj.intent,
        nearest: obj.nearest as NearestTool[],
      };
  }
}
