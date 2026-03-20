# Execution Continuity — Design Spec
**Date:** 2026-03-20
**Baseline UI:** b520ee6 · Core: 5eb99d4

---

## Goal

After confirm / reject / navigation / follow-up chat, the same work session should feel like one continuing operational run — not a refreshed plan snapshot. Three surfaces need to change: `WorkSessionPane`, `ChatPane`, and `MoraShell`.

The backend now delivers an `execution` object on `work_session_plan` (both GET and continued `/v3/cognition/agent` responses). This is the primary source of operational focus — the frontend no longer infers current step/state from positional heuristics or `segment_summaries`.

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
    state: string;                          // mirrors plan state
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

No other changes to coreClient.ts.

---

### Delta 1 — `lib/utils/moraExplanation.ts`

Extend `WorkSessionShellSummary` to carry key execution fields through the event bus:

```ts
export interface WorkSessionShellSummary {
    // ... existing fields unchanged ...
    // Execution focus (V5+):
    running_step_title?: string;            // execution.current_step_title
    pending_confirmation_title?: string;    // execution.pending_confirmation_title
    can_continue?: boolean;                 // execution.can_continue
}
```

No changes to `getSessionBodyText` or `getSessionExtendedNote`.

---

### Delta 2 — `components/panes/WorkSessionPane.tsx`

**2a. Running-segment left-border accent**

Detect the active segment using `plan.execution?.current_segment_index` as primary source:
- Primary: group whose `summary.segment_index === plan.execution?.current_segment_index`
- Fallback (execution absent): group with `summary.latest === true`
- Fallback 2 (no summaries): group containing a step with `status === 'running'`

That group's step-rows container `<div>` receives:
```
border-l-2 border-blue-400/25 pl-2.5
```

Applies to the wrapping div around step rows only — not to `SegmentDivider`. The existing `completed/total` counter in the divider label remains unchanged.

**2b. Dispatch enrichment**

In the `dispatchWorkSessionPlan` call inside WorkSessionPane's polling `useEffect`, add:
```ts
running_step_title:         plan.execution?.current_step_title,
pending_confirmation_title: plan.execution?.pending_confirmation_title,
can_continue:               plan.execution?.can_continue,
```

Using `execution` directly — no `plan.steps.find()` heuristic needed.

---

### Delta 3 — `components/panes/ChatPane.tsx`

**3a. Session pill**

Add local state:
```ts
const [activeSessionTitle, setActiveSessionTitle] = useState<string | null>(null);
```

Set when plan is fetched: `setActiveSessionTitle(plan.title)`.

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

**3b. Dispatch enrichment** — fetched-plan branch (Site 1) only:
```ts
running_step_title:         plan.execution?.current_step_title,
pending_confirmation_title: plan.execution?.pending_confirmation_title,
can_continue:               plan.execution?.can_continue,
```

Fallback branches (Sites 2 and 3) unchanged — they have no `plan.execution` access.

---

### Delta 4 — `components/os/shell/MoraShell.tsx`

**State derivation** from `workSessionSummary.state`:
```ts
const isRunning = workSessionSummary?.state === 'running';
const isWaiting = workSessionSummary?.state === 'waiting_confirmation';
const isDone    = workSessionSummary?.state === 'done'
               || workSessionSummary?.state === 'completed';
```

**4a. Card border tint** — replaces static `border-violet-400/18`:
```
isRunning  → border-blue-400/28
isWaiting  → border-amber-400/28
isDone     → border-white/8
default    → border-violet-400/18   (unchanged)
```

**4b. Card label** — replaces static "Mora erkläert":
```
isRunning  → "Läuft gerade"           text-blue-200/70
isWaiting  → "Freigabe erforderlich"  text-amber-200/70
isDone     → "Abgeschlossen"          text-white/30
default    → "Mora erkläert"          existing violet (unchanged)
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
  Falls back to `getSessionBodyText` if `running_step_title` is absent.

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
WorkSessionPane polling:
  GET /v3/work-session/plan/{id}
    → plan.execution.current_step_title
    → plan.execution.pending_confirmation_title
    → plan.execution.can_continue
  → dispatchWorkSessionPlan({ running_step_title, pending_confirmation_title, can_continue })
    → WORK_SESSION_PLAN_EVENT
      → MoraShell.setWorkSessionSummary()
        → isRunning/isWaiting/isDone → state-aware card

ChatPane fetch (continued agent response):
  plan.execution.current_step_title → dispatch enrichment
  plan.title → setActiveSessionTitle → pill render
```

---

## Testing

**Delta 0 — `coreClient.ts`**: Interface-only, no tests needed.

**Delta 1 — `moraExplanation.ts`**: Interface-only addition. Existing 18 tests unchanged.

**Delta 2 — `WorkSessionPane.tsx`**:
1. Active segment accent: group with `summary.segment_index === execution.current_segment_index` receives accent class
2. Fallback: `summary.latest === true` group gets accent when `execution` absent
3. Dispatch includes `running_step_title` from `execution.current_step_title`
4. Dispatch includes `pending_confirmation_title` from `execution.pending_confirmation_title`

**Delta 3 — `ChatPane.tsx`**:
1. `activeSessionTitle` is set when plan is fetched
2. Pill renders when `activePlanId && activeSessionTitle` are both set
3. Pill is absent when `activePlanId` is null

**Delta 4 — `MoraShell.tsx`**:
1. `border-blue-400/28` when `state === 'running'`
2. `border-amber-400/28` when `state === 'waiting_confirmation'`
3. "Läuft gerade" label when running
4. "Freigabe erforderlich" label when waiting
5. "Abgeschlossen" label when done
6. `running_step_title` renders in running body; falls back to `getSessionBodyText`
7. `pending_confirmation_title` renders in waiting body; falls back to static string

---

## Blast Radius

| File | Change | Risk |
|------|--------|------|
| `lib/api/coreClient.ts` | New interface + 1 optional field on WorkSessionPlan | Zero |
| `lib/utils/moraExplanation.ts` | +3 optional fields on WorkSessionShellSummary interface | Zero |
| `components/panes/WorkSessionPane.tsx` | Accent class on 1 group + 3 dispatch fields | Low |
| `components/panes/ChatPane.tsx` | 1 useState + pill UI + 3 dispatch fields | Low |
| `components/os/shell/MoraShell.tsx` | State-derived styling + conditional body content | Low |

No new files. No new hooks. No new event types. No architecture changes.

---

## What This Unlocks

- **WorkSessionPane** reads as an active operational run — the live segment is spatially distinct, identified precisely via `execution.current_segment_index` rather than heuristics
- **ChatPane** confirms continuation context — pill removes "am I starting fresh?" ambiguity
- **MoraShell** gives at-a-glance operational status using backend-provided execution state: what step is running, what confirmation is pending, when the session is done — no more inference
