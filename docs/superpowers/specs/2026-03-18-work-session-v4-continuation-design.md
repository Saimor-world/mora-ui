# Work Session V4 — Continuation Legibility

**Date:** 2026-03-18
**Branch:** `stabilize/beta-1.5`
**Scope:** UI-only, four files, no new architecture

---

## Problem

A continued work session (plan created in chat → user navigates → navigation steps appended to plan) is currently not legible as one operational flow. The three surfaces — `ChatPane`, `MoraShell` shell card, `WorkSessionPane` — each hold partial information but do not narrate the same story. Continuation feels like noise, not progress.

---

## Goal

Make a continued session feel like one ongoing operational flow across:
1. **WorkSessionPane** — step list reads as original plan + live continuation, not flat noise
2. **ChatPane** — the "Plan anzeigen" chip feels live when the plan is the active plan
3. **MoraShell** — shell card is progress-aware and says so when the plan has grown

---

## Current State (post-Codex session wiring)

- `workSessionStore` holds `activePlanId`, `activeSessionId`, `setActiveSession`
- `ChatPane` already subscribes to `activePlanId` (line 419–423); no new subscription needed
- `WorkSessionPane` calls `setActiveSession({ planId, sessionId })` on every plan change
- `WORK_SESSION_PLAN_EVENT` dispatched by WorkSessionPane on every plan poll, received by MoraShell to update `workSessionSummary`
- `WorkSessionStats.planned_steps` (in `coreClient.ts`) is a non-optional `number` — the backend-supplied count of originally-planned steps at plan creation time; `total_steps - planned_steps` gives appended navigation step count
- `WorkSessionShellSummary.stats` (in `moraExplanation.ts`) does NOT currently include `planned_steps`

---

## Design

### 1. WorkSessionPane — Continuation Split

**Split point:** `plan.stats?.planned_steps ?? timelineSteps.length`

Split `timelineSteps` into:
- `originalSteps` — `timelineSteps.slice(0, splitPoint)`
- `continuationSteps` — `timelineSteps.slice(splitPoint)`

**Rendering:**
- `originalSteps` render exactly as today (no visual change)
- If `continuationSteps.length > 0`, insert a **"Weitergefuehrt"** divider between the two groups
  - Thin horizontal rule + small uppercase label, muted, operational tone
  - `continuationSteps` get a subtle left accent wrapper: `border-l-2 border-cyan-400/20 pl-1` applied around each `StepRow`, not inside it
  - The continuation block communicates: "these steps joined the run after it started"
- `StepRow` and `ConfirmStepCard` components are unchanged — only the wrapper/grouping changes

### 2. ChatPane — Live Plan Chip

**`activePlanId` is already in scope** at line 419–423; no additional hook call needed.

**When `msg.planId === activePlanId`:**
- Chip gets a small pulsing green dot before the label: `w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0`
- Button label stays `"Plan anzeigen"` — no wording change
- No changes when plan is not active (same as today)

**Constraint:** Chip remains a calm affordance. No step counts, no state badges in the chat bubble.

### 3. moraExplanation.ts — Type Extension

Add `planned_steps?: number` to `WorkSessionShellSummary.stats`.

The field is optional (`?`) because:
- `WorkSessionShellSummary` is a UI-side event payload, decoupled from the backend type
- Plans dispatched before this field is populated must still work without it
- The backend `WorkSessionStats.planned_steps` is non-optional, but this is a deliberate UI-side defensive choice

**WorkSessionPane dispatch does not require any additional code change.** The dispatch at lines 489–500 already passes `stats: plan.stats`, and `plan.stats` is typed as `WorkSessionStats | undefined`. `WorkSessionStats.planned_steps` is already present in that type. Once the type extension is added to `WorkSessionShellSummary.stats`, the field flows through automatically.

### 4. MoraShell — Progress-Aware Shell Copy

**Replace the static body text** (currently a 3-way `workSessionSummary.state` switch) with progress-aware copy using `workSessionSummary.stats`.

```
const completed = workSessionSummary.stats?.completed_steps ?? 0;
const total     = workSessionSummary.stats?.total_steps ?? 0;
const pending   = workSessionSummary.stats?.pending_confirmations ?? 0;
const planned   = workSessionSummary.stats?.planned_steps ?? total;
const extended  = total > planned && planned > 0;
```

**Body text logic:**
```
if (pending > 0):
  "Ein Schritt wartet auf Freigabe."
else if (workSessionSummary.state === 'running' && total > 0):
  "${completed}/${total} Schritte — Mora arbeitet."
else if (completed > 0 && total > 0):
  "${completed} von ${total} Schritten abgeschlossen."
else:
  "Mora haelt den Arbeitsplan bereit."
```

**Continuation note** (rendered below body text if `extended === true`):
```
"Navigation hat den Plan erweitert."
```
Rendered as a small muted line beneath the main body text, not appended inline.

**Note:** `workSessionSummary.state` is the correct variable reference — `MoraShell` uses `workSessionSummary.state` at line 1022 of the current source.

---

## Files Changed

| File | Change |
|------|--------|
| `components/panes/WorkSessionPane.tsx` | Split `timelineSteps` at `planned_steps`; add "Weitergefuehrt" divider + continuation accent |
| `components/panes/ChatPane.tsx` | Use already-subscribed `activePlanId` to add pulsing dot on active plan chip |
| `components/os/shell/MoraShell.tsx` | Replace static copy with progress-aware copy + optional continuation note |
| `lib/utils/moraExplanation.ts` | Add `planned_steps?: number` to `WorkSessionShellSummary.stats` |

---

## Constraints

- No persistent global banner
- No new stacking model
- No new pane
- No TeamPane changes
- No new store slices
- `StepRow` and `ConfirmStepCard` components unchanged

---

## Success Criteria

- Opening WorkSessionPane after navigation shows a visible "Weitergefuehrt" block
- The chat "Plan anzeigen" chip shows a pulsing dot when the plan is the `activePlanId`
- MoraShell card body text includes step counts and optional continuation note
- No visual regressions in existing step list behavior
- No TypeScript errors
