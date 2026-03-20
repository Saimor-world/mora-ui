# Confirm/Skip Continuation UX — Design Spec

**Date:** 2026-03-20
**Baseline UI SHA:** 1b4eafb
**Baseline Core SHA:** 56ba131
**Beta 2.0 Claude track item:** 5 — Confirm/skip continuation UX

---

## Context

After the execution-continuity pass (5470e1a) the shell and session surfaces are
state-aware during plan execution. One gap remains: the moment a user confirms or
skips a step feels like a status change rather than a meaningful operational
advancement. The ConfirmStepCard disappears, the plan flips to `running`, and no
surface acknowledges what just happened or what comes next.

The backend (Core 56ba131) now makes `execution.next_message` transition-aware
immediately after a decision:

- after confirm: *"Schritt bestaetigt. Mora kann den aktuellen Arbeitslauf direkt fortsetzen."*
- after skip: *"Schritt uebersprungen. Naechster Schritt wartet auf Freigabe."*

`execution.last_transition_*` fields carry the decision record:

| Field | Content |
|---|---|
| `last_transition_step_id` | ID of the step that was just confirmed or skipped |
| `last_transition_type` | `"confirmed"` or `"skipped"` |
| `last_transition_label` | human label for the action (e.g. "Erstellen") |
| `last_transition_message` | narrative of what happened |

This spec wires those fields to three surfaces so the session feels like it
advanced, not merely changed status.

---

## Beta 2.0 alignment

This spec implements one surface of the **canonical receipt model** from the
Beta 2.0 Reset Plan. Every critical Mora operation should expose:

> **what happened · why · where · what next**

The ghost card established here is the first instance of that pattern applied to
confirm/skip. The same shape will be reused for upload/intake, search/open, and
navigation receipts in a subsequent spec.

Surface boundaries (not changed by this spec):

| Surface | Role |
|---|---|
| Shell/Dock | "now" — current state |
| WorkSessionPane | "current run" — full execution timeline |
| Action Center | "history" |

---

## Decisions

| Surface | Decision | Rationale |
|---|---|---|
| WorkSessionPane | Ghost card (B) | Spatial continuity — card transforms in place rather than disappearing; receipt stays until server state changes |
| MoraShell | `next_message` primary, `running_step_title` secondary (B) | Transition-aware message is the most useful post-decision signal; step title provides precision |
| ChatPane pill | State-aware dot + word (A) | Glanceable plan state without opening shell or pane; low footprint |

---

## Delta 0 — `lib/utils/moraExplanation.ts`

One field added to `WorkSessionShellSummary` to allow MoraShell to safely gate
`next_message` as primary body only in post-decision running state:

```ts
export interface WorkSessionShellSummary {
  // ... existing fields ...
  last_transition_step_id?: string;  // execution.last_transition_step_id — set after confirm/skip
}
```

WorkSessionPane dispatch enrichment (inside the `plan` effect):
```ts
last_transition_step_id: plan.execution?.last_transition_step_id,
```

ChatPane Sites 1–3 do **not** need to pass this field — they don't have access
to `last_transition_step_id` from the agent response shape. WorkSessionPane is
the authoritative dispatcher of this field.

`last_transition_message`, `last_transition_type`, and `last_transition_label`
remain on `plan.execution` only — read directly inside WorkSessionPane, not on
the event bus.

---

## Delta 1 — `components/panes/WorkSessionPane.tsx`

### Ghost card component

New component `TransitionGhostCard` renders where a `ConfirmStepCard` was, once
the step has been acted on.

**Props:**
```ts
interface TransitionGhostCardProps {
  stepTitle: string;
  transitionType: 'confirmed' | 'skipped' | string;
  message: string;           // last_transition_message ?? next_message
  segmentContext?: string;   // execution.current_segment_origin_label — "where"
}
```

**Appearance:**
- Container: `rounded-xl border border-white/[0.06] bg-white/[0.02] p-3`
- Badge row: `CheckCircle2` (emerald, confirmed) or `SkipForward` (white/20,
  skipped) + text label ("Bestaetigt" / "Uebersprungen") in matching muted color
- Step title: dimmed `text-white/32 text-xs`
- Message body: `text-[11px] text-blue-200/55 mt-1.5 leading-relaxed` —
  `last_transition_message ?? next_message`
- Segment context line (when present):
  `text-[10px] text-white/22 mt-1` — `↳ {segmentContext}`

### Detection and lifecycle

```ts
// In WorkSessionPane render block, computed from plan:
const lastTransitionStepId = plan?.execution?.last_transition_step_id;
const ghostStep = lastTransitionStepId
  ? plan?.steps.find(s => s.step_id === lastTransitionStepId)
  : null;
// Show ghost only when the step has reached a terminal post-decision state.
// 'done' = confirmed+executed, 'skipped' = rejected.
// Explicitly excludes 'pending', 'running', 'failed', 'pending_confirmation'
// to prevent false ghost renders on non-decision transitions.
// If last_transition_step_id points to a step not in plan.steps (removed by
// backend), ghostStep is undefined → showGhost is false → silent no-op.
const showGhost =
  ghostStep != null &&
  (ghostStep.status === 'done' || ghostStep.status === 'skipped');
```

**Render location:** The ghost has its own keyed `motion.div` inside the
`AnimatePresence` block. The existing block condition changes from
`pendingSteps.length > 0` to `pendingSteps.length > 0 || showGhost` so the
block renders when all steps have been resolved but the ghost should still
appear. The ghost renders first (above any remaining `ConfirmStepCard`s):

```tsx
<AnimatePresence>
  {(pendingSteps.length > 0 || showGhost) && (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="px-4 pt-4 pb-2"
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300/55 mb-2.5">
        Bestaetigung erforderlich
      </div>
      <div className="space-y-2">
        {showGhost && (
          <motion.div key={`ghost-${lastTransitionStepId}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TransitionGhostCard ... />
          </motion.div>
        )}
        {pendingSteps.map((step) => (
          <ConfirmStepCard key={step.step_id} ... />
        ))}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

The section label "Bestaetigung erforderlich" shows when `pendingSteps.length > 0`
(unchanged meaning). When only the ghost is present the label is suppressed —
replace with a bare ghost-only container with no header label.

**Lifecycle:** Server-state-driven — no local timers. Ghost disappears when the
backend's next response changes `last_transition_step_id` (new decision) or
clears it. WorkSessionPane polls every 3 s; ghost persists until that poll.

**Ghost message priority:**
```ts
const ghostMessage =
  plan.execution?.last_transition_message ??
  plan.execution?.next_message ??
  '';
```

### No dispatch changes needed

WorkSessionPane already dispatches `next_message` and `last_transition_*` does
not need to travel via the event bus for the surfaces in this spec.

---

## Delta 2 — `components/os/shell/MoraShell.tsx`

### Running body — `next_message` primary

**Current:**
```tsx
{isRunning && (
  <div className="flex items-center gap-2 mb-2 mt-1">
    <div className="h-1.5 w-1.5 rounded-full bg-blue-400/80 animate-pulse shrink-0" />
    <span className="text-sm text-white/78">
      {workSessionSummary.running_step_title ?? getSessionBodyText(workSessionSummary)}
    </span>
  </div>
)}
```

**After:**
```tsx
{isRunning && (() => {
  // next_message is only used as primary body when it is post-decision:
  // i.e. last_transition_step_id is set, meaning a confirm/skip just happened.
  // During normal running (no recent decision), next_message may be generic
  // ("Mora fuehrt den naechsten Schritt aus") — in that case running_step_title
  // is the more precise primary signal.
  const isPostDecision = !!workSessionSummary.last_transition_step_id;
  const primaryText = isPostDecision && workSessionSummary.next_message
    ? workSessionSummary.next_message
    : (workSessionSummary.running_step_title ?? getSessionBodyText(workSessionSummary));
  const secondaryText = isPostDecision && workSessionSummary.next_message
    ? workSessionSummary.running_step_title   // may be undefined → not rendered
    : null;
  return (
    <div className="mb-2 mt-1">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-400/80 animate-pulse shrink-0" />
        <span className="text-sm text-white/78">{primaryText}</span>
      </div>
      {secondaryText && (
        <div className="ml-[14px] mt-1 text-[11px] text-white/38">
          {secondaryText}
        </div>
      )}
    </div>
  );
})()}
```

**Behaviour:**
- Post-decision (`last_transition_step_id` set) AND `next_message` present →
  `next_message` primary, `running_step_title` secondary dim line
- All other running states → `running_step_title ?? getSessionBodyText()` —
  unchanged existing behaviour

---

## Delta 3 — `components/panes/ChatPane.tsx`

### State-aware session pill

**New state:**
```ts
const [activeSessionTitle, setActiveSessionTitle] = useState<string | null>(null);  // existing
const [activeSessionState, setActiveSessionState] = useState<string | null>(null);  // new
```

**Sync from event bus** — the existing `WORK_SESSION_PLAN_EVENT` listener in
ChatPane has no `planId` guard today. The full listener body must be **replaced**
(not appended) to add the guard and sync both fields atomically:

```ts
// Replace existing listener body entirely:
const handlePlanEvent = (e: Event) => {
  const detail = (e as CustomEvent<WorkSessionShellSummary>).detail;
  if (!detail || !activePlanId || detail.planId !== activePlanId) return;
  setActiveSessionTitle(detail.title ?? null);
  setActiveSessionState(detail.state ?? null);  // new
};
window.addEventListener(WORK_SESSION_PLAN_EVENT, handlePlanEvent as EventListener);
return () => window.removeEventListener(WORK_SESSION_PLAN_EVENT, handlePlanEvent as EventListener);
```

`activeSessionTitle` and `activeSessionState` must use the same `planId` guard —
they must never arrive from different events. Without the guard both could reflect
a different plan if multiple WorkSessionPanes are open simultaneously.

`detail.state` is a required field on `WorkSessionShellSummary` (non-optional).
It is present on all three ChatPane dispatch sites because all three call
`dispatchWorkSessionPlan` with `state: plan.state`. The sync is complete across
all dispatch sites.

**Pill rendering** (replaces current violet-only pill):
```tsx
{activePlanId && activeSessionTitle && (() => {
  const isRunning = activeSessionState === 'running';
  const isWaiting = activeSessionState === 'waiting_confirmation';
  const isDone    = activeSessionState === 'done';
  const dotCls = isRunning
    ? 'bg-blue-400/70'
    : isWaiting
      ? 'bg-amber-400/80'
      : isDone
        ? 'bg-white/20'
        : 'bg-violet-400/70';
  const textCls = isRunning
    ? 'text-blue-300/60'
    : isWaiting
      ? 'text-amber-300/65'
      : isDone
        ? 'text-white/28'
        : 'text-violet-300/60';
  const stateWord = isRunning
    ? 'Laeuft'
    : isWaiting
      ? 'Wartet'
      : isDone
        ? 'Abgeschlossen'
        : 'Aktiver Plan:';
  return (
    <div className="flex items-center gap-1.5 px-1 mb-1.5">
      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`} />
      <span className={`text-[10px] truncate ${textCls}`}>
        {stateWord} · {activeSessionTitle}
      </span>
    </div>
  );
})()}
```

**Note:** `activeSessionState` is component-local `useState` (same rationale as
`activeSessionTitle`). Plan state in ChatPane is a display signal only — it does
not drive navigation or dispatch actions.

---

## Tests

### New test files

| File | Count | What it covers |
|---|---|---|
| `__tests__/components/panes/WorkSessionPane.ghost.test.tsx` | 6 | ghost appears when `last_transition_step_id` set + step is `done`; ghost appears when step is `skipped`; ghost absent when step is `pending_confirmation` (not yet acted); ghost absent when step is `running` or `pending` (non-decision state — prevents false ghost); ghost absent when `last_transition_step_id` not in `plan.steps` (orphan step_id, silent no-op); ghost absent when no `last_transition_step_id` |
| `__tests__/components/os/shell/MoraShell.running-body.test.tsx` | 4 | `next_message` shown as primary when `last_transition_step_id` set; `running_step_title` shown as secondary in that case; falls back to `running_step_title` when `next_message` absent even if `last_transition_step_id` set; falls back to `running_step_title` when `last_transition_step_id` not set (normal running) |
| `__tests__/components/panes/ChatPane.pill-state.test.tsx` | 5 | blue dot + "Laeuft" for running; amber dot + "Wartet" for waiting_confirmation; dim + "Abgeschlossen" for done; violet + "Aktiver Plan:" for default; violet + title shown when `activeSessionState` is null (before first event fires — startup ordering) |

**Existing tests unchanged.** Full suite baseline: 252 passing.

---

## Out of scope

- `searchOpen.ts` navigation dispatch — already updated in Core 1b4eafb; no UI
  change needed
- ChatPane follow-up message after confirm/skip — out of scope; the pane and shell
  carry feedback
- Beta 2.0 items 1–4, 6 (Universe command-center, canonical receipt
  componentization, degraded/error rendering) — separate specs

---

## Deliver-back targets

- Final UI SHA
- Exact files changed
- What became clearer about the canonical receipt pattern post-confirm/skip
- What still blocks execution-grade continuity in the next surface (upload/intake)
