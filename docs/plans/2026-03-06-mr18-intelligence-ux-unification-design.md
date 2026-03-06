# MR18 Design — Intelligence UX Unification
**Date:** 2026-03-06
**Status:** Approved — ready for implementation
**Author:** Claude (Frontend Track)
**Prerequisite:** MR17 (`78c0675`) — native-upgrade foundation must be landed
**Worktree:** `bold-visvesvaraya`

---

## Problem Statement

Three UI surfaces display Mora's state independently with no shared contract:

| Surface | Current behavior |
|---|---|
| `MoraIntelligenceBar` | Reads `lastChatScope` partially — `boundary_level` shown as unreadable 10px text |
| `MemorySidebar` | Reads `useMemory()` in isolation — zero awareness of active chat scope |
| `MoraHubPane` | Shows `MoraPlayground` + memory tabs — not connected to scope state at all |

The result: the same question ("what scope is Mora in?") has three different non-answers depending on which surface the user looks at. The surfaces feel like separate products.

**MR18 thesis:** One normalized hook. One shared chip component. Three surfaces answering the same four questions:
1. What scope is Mora currently operating in?
2. Is that scope enforced (narrowed by backend)?
3. Why?
4. Did the last answer come from memory, context, or inference?

---

## Approach: Option A — Shared `useMoraContext()` + Chip

Selected over:
- **Option B** (new `intelligenceStore.ts`): creates source-of-truth ambiguity alongside `moraState` during a live sprint
- **Option C** (per-surface hardening): preserves fragmented-product feel

`moraState` remains the single frontend truth. `useMoraContext()` is a normalization/presentation hook only. No new store, no new API calls.

---

## The `MoraContextSnapshot` Contract

```typescript
// lib/mora/useMoraContext.ts

import type { OrbState } from '@/lib/api/awarenessClient';

export interface MoraContextSnapshot {
  // ── Active Mora scope ──────────────────────────────────────────────
  scopeLevel: 'global' | 'company' | 'department' | 'space' | 'folder';
  scopeLabels: {
    company?: string;
    department?: string;
    space?: string;
    folder?: string;
  };
  scopeEnforced: boolean;
  scopeReason: string | null;         // human-readable: why scope was narrowed
  scopeDroppedFields: string[];        // fields backend removed (diagnostics/admin only)

  // ── Mora runtime state ─────────────────────────────────────────────
  orbState: OrbState;
  isOffline: boolean;

  // ── Memory state ───────────────────────────────────────────────────
  memoryPendingCount: number;
  memoryFactCount: number;

  // ── Freshness / traceability ───────────────────────────────────────
  lastScopeUpdateAt: string | null;   // ISO timestamp from latest scope update
  lastScopeSource: 'stream' | 'memory_overview' | 'local' | null;

  // ── Answer provenance (BACKEND DEPENDENCY) ─────────────────────────
  // null until backend sends answer_source in StreamFrame.
  // UI must degrade gracefully — show "—" not invented truth.
  lastAnswerSource: 'memory' | 'context' | 'inference' | null;
  lastAnswerScopeLabel: string | null; // e.g. "Scoped to Vertrieb"
}
```

### Hook data sources (read-only, no fetches)

| Field | Source |
|---|---|
| `scopeLevel` | Derived from `moraState.lastChatScope.resolved_scope` key depth |
| `scopeLabels` | Derived from company/department/space/folder names in `moraState` |
| `scopeEnforced` | `moraState.lastChatScope.scope_enforced` |
| `scopeReason` | `moraState.lastChatScope.scope_contract?.scope_reason` (backend dep, graceful null) |
| `scopeDroppedFields` | `moraState.lastChatScope.scope_contract?.dropped_fields ?? []` |
| `orbState` | `moraState.orbState` |
| `isOffline` | `moraState.coreError !== null` |
| `memoryPendingCount` | `useMemoryPendingCount()` (hook already exists) |
| `memoryFactCount` | `moraState` memory metrics if present, else `0` — no extra fetch |
| `lastScopeUpdateAt` | Extend `LastChatScopeState` with `updatedAt: string` set in `setLastChatScope` |
| `lastScopeSource` | `'stream'` when set via `useMoraStream`, `'local'` fallback |
| `lastAnswerSource` | Future `StreamFrame.answer_source` — null until backend lands it |
| `lastAnswerScopeLabel` | Future `StreamFrame.answer_scope_label` — null until backend lands it |

---

## Shared Component: `<MoraContextChip />`

**Location:** `components/mora/MoraContextChip.tsx`

**Visual contract:**
```
[ ● Vertrieb › Deals ]  [🔒 Scope eingeschränkt]  [12 pending]  [memory]
  scope breadcrumb         enforced badge           memory badge   source pill
```

- Scope icon (`MapPin` or `Layers`) + breadcrumb label (max 3 levels, truncated at 24 chars)
- Amber lock icon if `scopeEnforced=true` — `scopeReason` shown in CSS title/tooltip
- Memory pending badge if `memoryPendingCount > 0`
- Answer source pill: `memory` (violet) / `context` (emerald) / `inference` (blue) / `—` (gray, when null)
- **Zero Framer Motion** — pure CSS transitions only (performance rule)
- Renders nothing if `scopeLevel === 'global'` and no scope enforced and no pending

**Props:**
```typescript
interface MoraContextChipProps {
  snapshot: MoraContextSnapshot;
  variant: 'bar' | 'sidebar' | 'hub';  // controls density/layout
  className?: string;
}
```

---

## Surface Changes

### 1. `MoraIntelligenceBar` (bottom-left)

**File:** `components/mora/MoraIntelligenceBar.tsx`

**Change:** Replace the `boundary_level` span and `scopeEnforced` amber strip (currently lines ~70–90) with `<MoraContextChip variant="bar" snapshot={ctx} />`. The chip slots into the existing context area between the status dot and the actions group. Existing layout preserved.

**Before:** unreadable `text-[10px]` `boundary_level` text, amber strip with no explanation
**After:** readable chip with scope label + enforced indicator + source pill

### 2. `MemorySidebar` (right pull-out)

**File:** `components/os/MemorySidebar.tsx`

**Change:** Add a 32px context header above the pending queue (before the `QuickMemoryInputInline` block):
```tsx
<div className="px-3 py-2 border-b border-white/5">
  <MoraContextChip variant="sidebar" snapshot={ctx} />
</div>
```

No memory data changes. No new API calls. The chip uses `useMoraContext()` from the same hook.

### 3. `MoraHubPane` — Overview tab

**File:** `components/panes/MoraHubPane.tsx`

**Change:** In the `case "overview":` render path, replace the ambient `PlasmaOrb` + vague status text at the top with a proper context header row:
```tsx
<div className="px-4 pt-3 pb-2 border-b border-white/5">
  <MoraContextChip variant="hub" snapshot={ctx} />
</div>
```
Then the existing `MoraPlayground` / `MoraUpdatesFeed` content continues below.

**Stats tab addition:** Add `lastScopeUpdateAt` freshness label beneath the BarChart3 header: `"Scope zuletzt aktualisiert: {time}"` — gray, small, honest about staleness.

---

## Store Extension (minimal)

To support `lastScopeUpdateAt`, extend `LastChatScopeState` in `moraState.ts`:

```typescript
export interface LastChatScopeState {
  resolved_scope: Record<string, string | undefined>;
  scope_policy: string;
  scope_enforced: boolean;
  scope_contract?: ScopeContract;
  ui_scope_hints?: UiScopeHints;
  updatedAt?: string;   // ADD: ISO timestamp, set in setLastChatScope
}
```

And in `setLastChatScope`:
```typescript
setLastChatScope: (scope) => set({
  lastChatScope: scope ? { ...scope, updatedAt: new Date().toISOString() } : null
})
```

This is the only store mutation. No new store created.

---

## Acceptance Criteria

| Surface | Criterion |
|---|---|
| Intel Bar | Shows scope level + enforced badge. Readable at normal font size. |
| Intel Bar | No contradictory state vs. Memory Sidebar or Hub. |
| Memory Sidebar | Shows same scope as Intel Bar. |
| Memory Sidebar | If `lastAnswerSource` is null → shows `—`, not blank, not invented text. |
| Mora Hub | Overview tab shows scope chip. Never visually empty when `lastChatScope` is populated. |
| Mora Hub | Stats tab shows `lastScopeUpdateAt` freshness. |
| All three | Scope labels show resolved names, not raw UUIDs. |
| All three | If `scopeEnforced=true` and `scopeReason=null` → shows `"Scope eingeschränkt"` as fallback. |
| All three | No extra API calls introduced. |
| All three | TypeScript strict — no `any` on `MoraContextSnapshot` fields. |
| All three | No Framer Motion added to chip (CSS transitions only). |

---

## Backend Dependencies (for Codex)

| # | Field | Where | Priority | Notes |
|---|---|---|---|---|
| 1 | `answer_source: 'memory' \| 'context' \| 'inference'` | `StreamFrame` | **P0** | Needed to light up answer provenance pill |
| 2 | `answer_scope_label: string` | `StreamFrame` | **P0** | Human-readable scope label in stream response |
| 3 | `scope_reason: string` | `ScopeContract` (type exists, needs population) | **P1** | Tooltip/label text for enforced lock icon |
| 4 | `v3/memory/overview` unified route | Backend API | **In flight** | Codex already shipping this |

Frontend degrades gracefully on all four. If `answer_source` is absent from `StreamFrame`, `lastAnswerSource` stays `null` and chip shows `—`. No invented truth.

---

## Files Touched

| File | Change type |
|---|---|
| `lib/mora/useMoraContext.ts` | **NEW** — normalization hook |
| `components/mora/MoraContextChip.tsx` | **NEW** — shared chip component |
| `lib/store/moraState.ts` | **EXTEND** — add `updatedAt` to `LastChatScopeState` |
| `components/mora/MoraIntelligenceBar.tsx` | **MODIFY** — replace tiny scope text with chip |
| `components/os/MemorySidebar.tsx` | **MODIFY** — add context header with chip |
| `components/panes/MoraHubPane.tsx` | **MODIFY** — add chip to overview, freshness to stats |

**Not touched:** `paneStore.ts`, `FinderPane`, `ChatPane`, `Dock`, `MoraPlayground`, `MoraMemory` — no scope needed there in MR18.

---

## What MR18 Does NOT Do

- Does not touch backend contracts (Codex owns that)
- Does not introduce a second Zustand store
- Does not add extra API calls
- Does not redo MR17 work (maximize, finder guards, dock perf already landed)
- Does not expose `scopeDroppedFields` in primary UI (diagnostics/admin only)
- Does not invent answer provenance when backend hasn't sent it

---

## Out of Scope for MR18 (future MR19+)

- Chat pane message-level source badges (needs `answer_source` in stream + UX design)
- FinderPane scope integration
- Mora Nexus Diagnose view redesign
- Performance pass (already covered in MR17 Workstream D)
- Visual cleanup / icon standardization pass
