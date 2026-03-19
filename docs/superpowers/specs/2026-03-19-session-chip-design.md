# SessionChip — Ambient Active-Session Indicator
**Date:** 2026-03-19
**Status:** Approved — Option B (revised after spec review)

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

The real Dock right-section layout (from `Dock.tsx` lines 418–431):

```
[FocusModeWidget] [ActionTray] [NotificationCenter]  ← right cluster div
  <divider>
[CompanyBadge]
  <divider>
[MoraOrb + label]
```

`SessionChip` is inserted **inside the right-cluster `<div>`**, after `NotificationCenter` and before the divider:

```
[FocusModeWidget] [ActionTray] [NotificationCenter] [SessionChip?]
  <existing divider (line ~430)>
[CompanyBadge]
  <existing divider>
[MoraOrb + label]
```

The chip is conditional — zero DOM when `activePlanId === null`.

### Component

**File:** `components/mora/Dock.tsx` — inline `SessionChip` sub-component (no new file), following the same pattern as `MagneticDockIcon`.

Props:
```ts
// OpenPaneFn sourced from ReturnType<typeof usePaneStore.getState>['openPane']
// (defined locally in Dock.tsx, same as WorkSessionPane.tsx line 55)
interface SessionChipProps {
    planId: string;          // always non-null — Dock gates rendering with {activePlanId && ...}
    openPane: OpenPaneFn;
    isStandardMode: boolean; // follows MagneticDockIcon prop pattern
}
```

`OpenPaneFn` is typed as `ReturnType<typeof usePaneStore.getState>['openPane']`, defined at the top of `Dock.tsx` (no import needed, derives from existing `usePaneStore` import).

### Nullability narrowing

In `Dock`, read `activePlanId` as a primitive selector:
```ts
const activePlanId = useWorkSessionStore(s => s.activePlanId);
```

Render the chip with narrowing guard:
```tsx
{activePlanId && (
    <SessionChip
        planId={activePlanId}   // narrowed: string, not string | null
        openPane={openPane}
        isStandardMode={isStandardMode}
    />
)}
```

This makes `planId: string` always correct — no non-null assertion needed.

### `activeSessionId` — intentionally ignored

The chip's only job is "is a plan live?" answered by `activePlanId !== null`.
`activeSessionId` is a secondary correlation ID used for navigation recording and is not required to determine chip visibility. The chip does not read or use `activeSessionId`.

### `openPane` call — memoize data to avoid gratuitous updates

`paneStore.openPane` re-runs `updatePane` on every call when `data` is a new object literal (referential inequality). Memoize the `data` object inside `SessionChip`:

```ts
const paneData = React.useMemo(() => ({ plan_id: planId }), [planId]);

const handleClick = React.useCallback(() => {
    openPane({
        id: `work-session-${planId}`,
        type: 'work-session',
        title: 'Arbeitsplan',
        size: { width: 900, height: 700 },
        data: paneData,
    });
}, [openPane, planId, paneData]);
```

This means `updatePane` only fires when `planId` changes (i.e., a different session becomes active), not on every click.

### Visual spec

Dark mode:
- Container: `bg-violet-500/10 border border-violet-400/20 text-violet-200/80 hover:border-violet-300/35 hover:bg-violet-500/18`
- Pulsing dot: `w-2 h-2 rounded-full bg-violet-400 animate-pulse`
- Label: `"Plan aktiv"` — `text-[11px]`
- Size: `px-3 py-1.5` — matches FocusModeWidget scale

Standard mode:
- Container: `bg-blue-50 border border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-100`
- Pulsing dot: `w-2 h-2 rounded-full bg-blue-500 animate-pulse`

Shared: `flex items-center gap-1.5 rounded-full transition-all cursor-pointer`

Tooltip (via `title` attribute): `"Aktiven Arbeitsplan oeffnen"`

---

## Data Flow

```
ChatPane sets activePlanId via setActiveSession({ planId, sessionId })
    → workSessionStore.activePlanId is non-null
    → Dock reads activePlanId (primitive selector)
    → {activePlanId && <SessionChip planId={activePlanId} ... />} renders
    → User clicks chip
    → openPane({ id: `work-session-${planId}`, data: memoized paneData })
    → paneStore: if pane exists → focus; else open new
    → WorkSessionPane surfaces
```

---

## Tests

File: `__tests__/components/mora/SessionChip.test.tsx`

Tests are written at the **`Dock` level** (not `SessionChip` in isolation) for the null-case test, because `planId: string` (non-nullable) cannot represent null. The store is controlled via `useWorkSessionStore.setState(...)` — consistent with how other Zustand store tests work in this codebase.

1. **Null case (Dock level):** When `useWorkSessionStore` has `activePlanId: null`, `SessionChip` does not appear in the rendered Dock output.
2. **Active case (Dock level):** When `useWorkSessionStore` has `activePlanId: 'plan-123'`, a button/element with text "Plan aktiv" is present.
3. **Click (SessionChip isolated):** Given `planId="plan-123"` and a mock `openPane`, clicking the chip calls `openPane` with `id: "work-session-plan-123"`, `type: "work-session"`, `data: { plan_id: "plan-123" }`.

---

## Constraints

- No persistent global banner.
- No new pane.
- No TeamPane changes.
- No new store fields.
- Blast radius: `Dock.tsx` only (+ 1 test file).
- Zustand object-selector anti-pattern avoided: `activePlanId` read as primitive.
- `openPane` data object memoized to avoid spurious `updatePane` calls.
