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

**No structural changes required.** `WorkSessionShellSummary` already carries all
fields needed by MoraShell and ChatPane:

- `state: string` — consumed by ChatPane pill
- `next_message?: string` — consumed by MoraShell running body
- `running_step_title?: string` — consumed by MoraShell running body secondary

`last_transition_*` fields are read directly from `plan.execution` inside
WorkSessionPane, which holds the full `WorkSessionPlan` object.

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
// Show ghost only when the step is no longer pending_confirmation
// (i.e. it has been acted on this round)
const showGhost = ghostStep != null && ghostStep.status !== 'pending_confirmation';
```

**Render location:** Top of the `pendingSteps` section, inside the existing
`AnimatePresence` block. Ghost uses `motion.div` with `initial={{ opacity: 0, y: -4 }}`
and `exit={{ opacity: 0 }}`.

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
{isRunning && (
  <div className="mb-2 mt-1">
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-1.5 rounded-full bg-blue-400/80 animate-pulse shrink-0" />
      <span className="text-sm text-white/78">
        {workSessionSummary.next_message
          ?? workSessionSummary.running_step_title
          ?? getSessionBodyText(workSessionSummary)}
      </span>
    </div>
    {workSessionSummary.next_message && workSessionSummary.running_step_title && (
      <div className="ml-[14px] mt-1 text-[11px] text-white/38">
        {workSessionSummary.running_step_title}
      </div>
    )}
  </div>
)}
```

**Behaviour:**
- `next_message` present → primary body, `running_step_title` as secondary dim line
- `next_message` absent → `running_step_title ?? getSessionBodyText()` — unchanged
  existing behaviour

---

## Delta 3 — `components/panes/ChatPane.tsx`

### State-aware session pill

**New state:**
```ts
const [activeSessionTitle, setActiveSessionTitle] = useState<string | null>(null);  // existing
const [activeSessionState, setActiveSessionState] = useState<string | null>(null);  // new
```

**Sync from event bus** (inside the existing `WORK_SESSION_PLAN_EVENT` listener):
```ts
if (detail.planId === activePlanId) {
  setActiveSessionTitle(detail.title);
  setActiveSessionState(detail.state);   // add this line
}
```

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
| `__tests__/components/panes/WorkSessionPane.ghost.test.tsx` | 4 | ghost appears when `last_transition_step_id` set + step not pending; ghost absent when step still pending; ghost uses `last_transition_message` over `next_message`; ghost absent when no `last_transition_step_id` |
| `__tests__/components/os/shell/MoraShell.running-body.test.tsx` | 3 | `next_message` shown as primary when present; `running_step_title` shown as secondary when both present; falls back to `running_step_title` when `next_message` absent |
| `__tests__/components/panes/ChatPane.pill-state.test.tsx` | 4 | blue dot + "Laeuft" for running; amber dot + "Wartet" for waiting_confirmation; dim + "Abgeschlossen" for done; violet + "Aktiver Plan:" for default |

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
