# SessionChip — Ambient Active-Session Indicator
**Date:** 2026-03-19
**Status:** Approved — Option B

---

## Problem

After a work session is created from chat:
1. The shell card appears (transient, dismissed by user or auto).
2. The pulsing chat chip is only visible if the user scrolls back to that message.
3. Once both are gone, there is **no persistent signal** that a session is live.

The user can navigate away, open other panes, forget the session exists.
This is the remaining V4 gap: continuous reachability from OS chrome.

---

## Solution

A `SessionChip` — a compact pill in the Dock's right-cluster (status/action zone) that:
- Renders **only** when `activePlanId` is non-null.
- Shows a pulsing dot + "Plan aktiv" label.
- Clicking it opens or focuses the active `WorkSessionPane`.
- Disappears when the session is cleared (`setActiveSession({ planId: null })`).

---

## Architecture

### Placement

Dock right-cluster, between `NotificationCenter` and the glowing divider that precedes the company badge:

```
[FocusModeWidget] [ActionTray] [NotificationCenter] [SessionChip?] | [CompanyBadge] | [MoraOrb]
```

`SessionChip` is conditional — zero DOM when `activePlanId === null`.

### Component

**File:** `components/mora/Dock.tsx` — inline `SessionChip` sub-component (not a new file).

Props:
```ts
interface SessionChipProps {
    planId: string;
    openPane: OpenPaneFn;
    isStandardMode: boolean;
}
```

Behaviour:
- Reads `activePlanId` from `useWorkSessionStore(s => s.activePlanId)` at the `Dock` level (primitive selector — no object selector anti-pattern).
- On click: `openPane({ id: \`work-session-\${planId}\`, type: 'work-session', title: 'Arbeitsplan', size: { width: 900, height: 700 }, data: { plan_id: planId } })`.
- `paneStore.openPane` already handles focus-if-exists via its `id` deduplication.

Visual spec:
- Dark mode: `bg-violet-500/10 border border-violet-400/20 text-violet-200/80` — soft violet to match the existing work-session card palette.
- Standard mode: `bg-blue-50 border border-blue-200 text-blue-700` — matches standard blue accent.
- Pulsing dot: `w-2 h-2 rounded-full bg-violet-400 animate-pulse` (dark) / `bg-blue-500` (standard).
- Label: `"Plan aktiv"` — calm, no exclamation, no count.
- Size: `px-3 py-1.5 text-[11px]` — same scale as FocusModeWidget.
- Hover: slight border brightening, scale-[1.02].

### Store change

None required. `workSessionStore` already exposes `activePlanId`.
The selector is already split per-field in `Dock` (no object anti-pattern).

---

## Data Flow

```
ChatPane sets activePlanId via setActiveSession
    → workSessionStore.activePlanId is non-null
    → Dock reads activePlanId (primitive selector)
    → SessionChip renders
    → User clicks chip
    → openPane({ id: `work-session-${planId}`, ... })
    → WorkSessionPane opens / focuses
```

---

## Tests

File: `__tests__/components/mora/SessionChip.test.tsx`

1. Does not render when `activePlanId` is null.
2. Renders pill with "Plan aktiv" when `activePlanId` is set.
3. Calls `openPane` with correct `id`, `type`, `data.plan_id` on click.

---

## Constraints

- No persistent global banner.
- No new pane.
- No TeamPane changes.
- No new store fields.
- Blast radius: `Dock.tsx` only (+ 1 test file).
- `isOptional: true` / `useShallow` patterns not needed (primitive selector).
