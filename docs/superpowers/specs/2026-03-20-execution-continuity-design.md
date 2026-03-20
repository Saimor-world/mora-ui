# Execution Continuity — Design Spec
**Date:** 2026-03-20
**Baseline UI:** b520ee6 · Core: 5eb99d4

---

## Goal

After confirm / reject / navigation / follow-up chat, the same work session should feel like one continuing operational run — not a refreshed plan snapshot. Three surfaces need to change: `WorkSessionPane`, `ChatPane`, and `MoraShell`.

The backend now delivers an `execution` object on `work_session_plan` (both GET and continued `/v3/cognition/agent` responses). This is the primary source of operational focus — the frontend no longer infers current step/state from positional heuristics.

---

## Constraints

- No new architecture
- Low blast radius — five target files only
- No TeamPane changes
- TDD discipline: tests written and confirmed failing before implementation
- Keep V5 segmentation (`segment_summaries`, `groupStepsBySegment`). Layer `execution` on top.

---

## Design Decisions (approved)

| Surface | Decision | Visual |
|---------|-----------|--------|
| WorkSessionPane active segment | Left-border accent on running segment group | `border-l-2 border-blue-400/25` |
| ChatPane continuation signal | Session pill above input when active plan | Violet dot + plan title |
| MoraShell session card | State-aware border + label + body | Blue/amber/dim by state |
| All surfaces — data source | `execution` object as primary; `segment_summaries` for timeline grouping | — |

---

## New Backend Contract: `WorkSessionExecution`

Live as of Core 5eb99d4. Present on `work_session_plan` in both GET responses and continued agent responses.

```ts
export interface WorkSessionExecution {
    state: string;
    can_continue: boolean;
    current_segment_index?: number;
    current_segment_origin?: string;
    current_segment_origin_label?: string;
    current_segment_state?: string;
    current_segment_title?: string;
    current_segment_summary?: string;
    current_step_id?: string;
    current_step_title?: string;
    current_step_status?: string;
    current_step_kind?: string;
    current_step_action_label?: string;
    current_step_origin?: string;
    pending_confirmation_step_id?: string;
    pending_confirmation_title?: string;
    pending_confirmation_action_label?: string;
    latest_activity_at?: string;
}
```

---

## Deltas

### Delta 0 — `lib/api/coreClient.ts`

Add `WorkSessionExecution` interface (full shape above) and extend `WorkSessionPlan`:

```ts
export interface WorkSessionPlan {
    // ... existing fields unchanged ...
    execution?: WorkSessionExecution;
}
```

`WorkSessionPlanState` is unchanged. Valid terminal state is `'done'` (and `'failed'`, `'partial'`). The value `'completed'` is NOT a valid state and must not appear in implementation.

---

### Delta 1 — `lib/utils/moraExplanation.ts`

**1a. Extend `WorkSessionShellSummary`** with two execution fields:

```ts
export interface WorkSessionShellSummary {
    // ... existing fields unchanged ...
    // Execution focus (V5+):
    running_step_title?: string;            // execution.current_step_title — only set when state === 'running'
    pending_confirmation_title?: string;    // execution.pending_confirmation_title — only set when state === 'waiting_confirmation'
}
```

Note: `can_continue` is intentionally excluded — no current consumer.

**1b. Update `getSessionBodyText`** to handle `'failed'` and `'partial'` states explicitly, before the existing `'running'`/`'done'`/`'waiting_confirmation'` branches:

```ts
if (s.state === 'failed') {
    return 'Arbeitsplan nicht abgeschlossen.';
}
if (s.state === 'partial') {
    const completed = s.stats?.completed_steps ?? 0;
    const total = s.stats?.total_steps ?? 0;
    return total > 0
        ? `${completed} von ${total} Schritten abgeschlossen (partiell).`
        : 'Arbeitsplan partiell abgeschlossen.';
}
```

No changes to `getSessionExtendedNote`.

---

### Delta 2 — `components/panes/WorkSessionPane.tsx`

**2a. Running-segment left-border accent**

The accent is only rendered when `plan.state === 'running'`. When `plan.state` is `'done'`, `'failed'`, `'partial'`, or `'pending'`, no accent is shown on any group.

Active segment detection when `plan.state === 'running'`:
1. Primary: group whose `summary.segment_index === plan.execution?.current_segment_index`
2. Fallback (execution absent): group with `summary.latest === true`
3. Fallback 2 (no summaries): group containing a step with `status === 'running'`

That group's step-rows container `<div>` receives:
```
border-l-2 border-blue-400/25 pl-2.5
```

Applies to the div wrapping step rows only — not to `SegmentDivider`. The existing `completed/total` counter in the divider label remains unchanged.

**2b. Dispatch enrichment**

In the existing `dispatchWorkSessionPlan` call inside WorkSessionPane's polling `useEffect`, add:
```ts
// Guard: only emit running_step_title when actually running to prevent stale values
running_step_title:
    plan.state === 'running'
        ? plan.execution?.current_step_title
        : undefined,
// Guard: only emit pending_confirmation_title when waiting
pending_confirmation_title:
    plan.state === 'waiting_confirmation'
        ? plan.execution?.pending_confirmation_title
        : undefined,
```

The state guard ensures that once the plan transitions (e.g. `running` → `waiting_confirmation`), the next dispatch explicitly clears `running_step_title` to `undefined` — preventing stale data in the MoraShell card.

---

### Delta 3 — `components/panes/ChatPane.tsx`

**3a. Session pill**

Add local state inside `ChatPane` (component-local `useState` — not `workSessionStore`, not `moraState`):
```ts
const [activeSessionTitle, setActiveSessionTitle] = useState<string | null>(null);
```

This is local state because the pill is a ChatPane-only UI element. `workSessionStore` already owns `activePlanId` and `activeSessionId` — the title is a display annotation on top of that, not shared state.

Set `activeSessionTitle` on ALL three dispatch branches so the pill title stays consistent regardless of which path ran:

- **Site 1** (fetched plan): `setActiveSessionTitle(plan.title)`
- **Site 2** (null plan fallback): `setActiveSessionTitle(agentResponse.work_session_plan?.title ?? null)`
- **Site 3** (catch fallback): `setActiveSessionTitle(agentResponse.work_session_plan?.title ?? null)`

This prevents stale title from a prior session appearing under a new plan ID.

Render above the input row, conditional on `activePlanId && activeSessionTitle`:
```tsx
{activePlanId && activeSessionTitle && (
    <div className="flex items-center gap-2 px-1 mb-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-violet-400/70" />
        <span className="text-[10px] text-violet-300/60">
            Aktiver Plan: {activeSessionTitle}
        </span>
    </div>
)}
```

Disappears naturally when `activePlanId` is cleared.

**3b. Dispatch enrichment — Site 1 only**

In the fetched-plan branch (Site 1, lines ~837–848) only, add the guarded execution fields:
```ts
running_step_title:
    plan.state === 'running'
        ? plan.execution?.current_step_title
        : undefined,
pending_confirmation_title:
    plan.state === 'waiting_confirmation'
        ? plan.execution?.pending_confirmation_title
        : undefined,
```

**Sites 2 and 3 (fallback branches)**: These produce `state: 'pending'` — `isRunning` and `isWaiting` are both false in MoraShell for this state, so no execution fields are rendered. Explicitly: Sites 2 and 3 do NOT add execution fields. They are out-of-scope for execution enrichment because they cannot reliably access `plan.execution` — emitting `undefined` for those fields is correct.

**`searchOpen.ts` dispatch** (`dispatchWorkSessionPlan` called on navigation outcomes): This dispatch receives a full plan from the navigation endpoint (`/v3/work-session/navigation`) and fires with whatever `state` the backend returns — which may include `'running'`. However, the navigation endpoint does not return a `WorkSessionExecution` object. Execution fields (`running_step_title`, `pending_confirmation_title`) will therefore be absent. MoraShell will evaluate `isRunning` correctly from `state`, but the running body will fall through to `getSessionBodyText()` since `running_step_title` is absent. This is accepted as graceful degradation — the "Laeuft gerade" label and pulsing dot render correctly; only the step-level detail is missing until the navigation endpoint adds `execution` support (a future backend improvement, out of scope here).

---

### Delta 4 — `components/os/shell/MoraShell.tsx`

**State derivation** from `workSessionSummary.state`:
```ts
const isRunning = workSessionSummary?.state === 'running';
const isWaiting = workSessionSummary?.state === 'waiting_confirmation';
const isDone    = workSessionSummary?.state === 'done';
// Note: 'failed' and 'partial' fall through to default — no special accent/label
```

**4a. Card border tint** — replaces static `border-violet-400/18`:
```
isRunning  → border-blue-400/28
isWaiting  → border-amber-400/28
isDone     → border-white/8
default    → border-violet-400/18   (unchanged)
```

**4b. Card label** — replaces static "Mora erklaert" (note: no umlaut, matching existing codebase convention):
```
isRunning  → "Laeuft gerade"            text-blue-200/70
isWaiting  → "Freigabe erforderlich"    text-amber-200/70
isDone     → "Abgeschlossen"            text-white/30
default    → "Mora erklaert"            existing violet (unchanged)
```

**4c. Card body area** (between label and plan box):

- **`isRunning`**: pulsing dot + `workSessionSummary.running_step_title`
  ```tsx
  <div className="flex items-center gap-2 mb-2">
      <div className="h-1.5 w-1.5 rounded-full bg-blue-400/80 animate-pulse" />
      <span className="text-sm text-white/78">
          {workSessionSummary.running_step_title
              ?? getSessionBodyText(workSessionSummary)}
      </span>
  </div>
  ```
  Falls back to `getSessionBodyText` if `running_step_title` is absent (pre-execution or stale).

- **`isWaiting`**: amber cue using `pending_confirmation_title` if available:
  ```tsx
  <div className="flex items-center gap-2 mb-2 px-3 py-2
                  rounded-lg border border-amber-400/14 bg-amber-500/6">
      <div className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
      <span className="text-sm text-amber-100/75">
          {workSessionSummary.pending_confirmation_title
              ?? 'Mora wartet auf deine Entscheidung'}
      </span>
  </div>
  ```

- **`isDone` / default**: `getSessionBodyText(workSessionSummary)` — unchanged.

---

## Data Flow

```
WorkSessionPane polling (state === 'running'):
  GET /v3/work-session/plan/{id}
    → plan.execution.current_step_title
  → dispatchWorkSessionPlan({ running_step_title: title, pending_confirmation_title: undefined })
    → WORK_SESSION_PLAN_EVENT → MoraShell → isRunning card

WorkSessionPane polling (state === 'waiting_confirmation'):
  → dispatchWorkSessionPlan({ running_step_title: undefined, pending_confirmation_title: title })
    → WORK_SESSION_PLAN_EVENT → MoraShell → isWaiting card
    (running_step_title explicitly undefined — stale value not carried forward)

ChatPane fetch (state === 'running'):
  plan.execution.current_step_title → dispatch enrichment (Site 1)
  plan.title → setActiveSessionTitle → pill render

ChatPane fetch (fallback, Sites 2/3):
  state: 'pending' → no execution fields (isRunning/isWaiting both false in MoraShell)
  agentResponse.work_session_plan?.title → setActiveSessionTitle (title stays fresh)
```

---

## Testing

**Delta 0 — `coreClient.ts`**: Interface-only, no tests needed.

**Delta 1 — `moraExplanation.ts`** (2 new tests for `getSessionBodyText`):
1. `state === 'failed'` → returns "Arbeitsplan nicht abgeschlossen."
2. `state === 'partial'` with `total_steps` → returns "N von M Schritten abgeschlossen (partiell)."

**Delta 2 — `WorkSessionPane.tsx`** (4 tests):
1. Accent class applied to group where `summary.segment_index === execution.current_segment_index` when `plan.state === 'running'`
2. Fallback: accent applied to group with `summary.latest === true` when execution absent and plan running
3. Accent NOT rendered when `plan.state === 'done'`
4. Dispatch emits `running_step_title` from `execution.current_step_title` when `state === 'running'`; emits `undefined` for `running_step_title` when `state === 'waiting_confirmation'`

**Delta 3 — `ChatPane.tsx`** (4 tests):
1. `activeSessionTitle` is set from `plan.title` when plan is fetched (Site 1)
2. `activeSessionTitle` is set from `agentResponse.work_session_plan?.title` in fallback (Sites 2/3)
3. Pill renders when `activePlanId && activeSessionTitle` are both set
4. Pill is absent when `activePlanId` is null

**Delta 4 — `MoraShell.tsx`** (10 tests):
1. `border-blue-400/28` when `state === 'running'`
2. `border-amber-400/28` when `state === 'waiting_confirmation'`
3. `border-white/8` when `state === 'done'`
4. "Laeuft gerade" label when running
5. "Freigabe erforderlich" label when waiting
6. "Abgeschlossen" label when done
7. `running_step_title` value renders in running body
8. `running_step_title` absent → falls back to `getSessionBodyText` output (graceful degradation, covers searchOpen.ts dispatch path)
9. `pending_confirmation_title` renders in waiting body
10. `pending_confirmation_title` absent → falls back to static "Mora wartet auf deine Entscheidung"

---

## Blast Radius

| File | Change | Risk |
|------|--------|------|
| `lib/api/coreClient.ts` | New interface + 1 optional field on WorkSessionPlan | Zero |
| `lib/utils/moraExplanation.ts` | +2 optional fields on WorkSessionShellSummary interface | Zero |
| `components/panes/WorkSessionPane.tsx` | Accent class on 1 group (state-guarded) + 2 guarded dispatch fields | Low |
| `components/panes/ChatPane.tsx` | 1 useState + pill UI + 2 dispatch fields (Site 1) + title in Sites 2/3 | Low |
| `components/os/shell/MoraShell.tsx` | State-derived styling + conditional body content | Low |

No new files. No new hooks. No new event types. No architecture changes.

---

## What This Unlocks

- **WorkSessionPane** reads as a live operational run — the active segment is spatially distinct, identified via `execution.current_segment_index` rather than positional heuristics, and disappears cleanly when the plan finishes
- **ChatPane** confirms continuation context — pill removes "am I starting fresh?" ambiguity; title stays fresh across all fetch paths
- **MoraShell** delivers at-a-glance operational status: exactly what step is running, what confirmation is pending, when the session is done — no inference, explicit state guards prevent stale data between transitions
