# SessionChip Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quiet, always-visible `SessionChip` pill to the Dock's right-cluster that appears when a work session is active and opens the `WorkSessionPane` on click.

**Architecture:** Named export `SessionChip` added inline to `components/mora/Dock.tsx`. `Dock` reads `activePlanId` from `useWorkSessionStore` via a primitive selector and gates `{activePlanId && <SessionChip .../>}` — narrowing `string | null` → `string`. `data` object memoized per spec to avoid spurious `paneStore.updatePane` on repeated focus clicks. Tests import the real `SessionChip` export and mock Dock's store dependencies at module level following the `ActionTray.test.tsx` pattern.

**Tech Stack:** React 18, Zustand, Tailwind v3, Jest + Testing Library

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `components/mora/Dock.tsx` | Modify | Add `OpenPaneFn` type + `useWorkSessionStore` import, named-export `SessionChip`, `activePlanId` selector, chip mount in right-cluster |
| `__tests__/components/mora/SessionChip.test.tsx` | Create | 3 tests exercising real `SessionChip`: renders, click payload, null-gate |

---

## Chunk 1: Tests + Implementation

### Task 1: Write the failing tests (TDD)

**Files:**
- Create: `__tests__/components/mora/SessionChip.test.tsx`

- [ ] **Step 1.1: Create the test file**

`SessionChip` is a named export from `Dock.tsx`. Tests import it directly and mock Dock's store and heavy-UI dependencies at module level (same pattern as `ActionTray.test.tsx`). The three tests exercise the real component — if the `data-testid`, label, or `openPane` payload don't match, tests fail.

```tsx
// __tests__/components/mora/SessionChip.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mock Dock's store / hook deps (module level, pre-import) ─────────────────
// SessionChip itself has no store reads (all props-driven), but importing Dock.tsx
// evaluates Dock's module, which imports store hooks. We stub those here following
// the ActionTray.test.tsx pattern to keep the import clean.

const mockOpenPane = jest.fn();

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: (selector: (s: any) => unknown) =>
        selector({ isStandardMode: false, orbState: 'idle', user: null, companies: [],
                   activeCompanyId: null, viewMode: 'standard', setViewLevel: jest.fn(),
                   setActiveDepartment: jest.fn(), setActiveCompany: jest.fn() }),
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector: (s: any) => unknown) =>
        selector({
            panes: [],
            openPane: mockOpenPane,
            restorePane: jest.fn(),
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            removePane: jest.fn(),
            getPane: jest.fn(),
        }),
}));

jest.mock('@/lib/store/workSessionStore', () => ({
    useWorkSessionStore: (selector: (s: any) => unknown) =>
        selector({ activePlanId: null }),
}));

jest.mock('@/lib/hooks/useMemoryPendingCount', () => ({
    useMemoryPendingCount: () => 0,
}));

jest.mock('@/lib/hooks/usePlatformModifier', () => ({
    usePlatformModifier: () => '⌘',
}));

jest.mock('@/components/os/FocusMode', () => ({
    FocusModeWidget: () => null,
    useFocusModeShortcut: () => {},
}));

jest.mock('@/components/os/ActionTray', () => ({
    ActionTray: () => null,
}));

jest.mock('@/components/os/NotificationCenter', () => ({
    NotificationCenter: () => null,
}));

jest.mock('@/components/mora/PlasmaOrb', () => ({
    PlasmaOrb: () => null,
}));

jest.mock('@/components/mora/SearchPopup', () => ({
    SearchPopup: () => null,
}));

// ─── Import the real SessionChip after mocks are registered ──────────────────
import { SessionChip } from '@/components/mora/Dock';

describe('SessionChip', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders "Plan aktiv" label and session-chip testid when given a planId', () => {
        render(
            <SessionChip
                planId="plan-abc"
                openPane={mockOpenPane}
                isStandardMode={false}
            />
        );
        expect(screen.getByTestId('session-chip')).toBeInTheDocument();
        expect(screen.getByText('Plan aktiv')).toBeInTheDocument();
    });

    it('calls openPane with correct id, type, and plan_id on click', () => {
        render(
            <SessionChip
                planId="plan-xyz"
                openPane={mockOpenPane}
                isStandardMode={false}
            />
        );
        fireEvent.click(screen.getByTestId('session-chip'));
        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'work-session-plan-xyz',
                type: 'work-session',
                data: { plan_id: 'plan-xyz' },
            })
        );
    });

    it('passes correct openPane payload when planId changes', () => {
        const { rerender } = render(
            <SessionChip
                planId="plan-1"
                openPane={mockOpenPane}
                isStandardMode={false}
            />
        );
        fireEvent.click(screen.getByTestId('session-chip'));
        expect(mockOpenPane).toHaveBeenLastCalledWith(
            expect.objectContaining({ id: 'work-session-plan-1', data: { plan_id: 'plan-1' } })
        );

        rerender(
            <SessionChip
                planId="plan-2"
                openPane={mockOpenPane}
                isStandardMode={false}
            />
        );
        fireEvent.click(screen.getByTestId('session-chip'));
        expect(mockOpenPane).toHaveBeenLastCalledWith(
            expect.objectContaining({ id: 'work-session-plan-2', data: { plan_id: 'plan-2' } })
        );
    });
});
```

- [ ] **Step 1.2: Run the tests to verify they fail (SessionChip not exported yet)**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="SessionChip" 2>&1
```

Expected: `FAIL` — `export { SessionChip }` does not exist in `Dock.tsx` yet, so the named import will throw a compile/runtime error. This confirms the tests are wired to real implementation code.

---

### Task 2: Implement `SessionChip` in `Dock.tsx`

**Files:**
- Modify: `components/mora/Dock.tsx`

- [ ] **Step 2.1: Add `useWorkSessionStore` import and `OpenPaneFn` type**

After the existing store imports (lines 9–10), add:

```ts
import { useWorkSessionStore } from '@/lib/store/workSessionStore';

// Derived from paneStore — consistent with WorkSessionPane.tsx
type OpenPaneFn = ReturnType<typeof usePaneStore.getState>['openPane'];
```

- [ ] **Step 2.2: Add `SessionChipProps` interface and exported `SessionChip` sub-component**

Add this block immediately after `const MagneticDockIconMemo = React.memo(MagneticDockIcon);` (line 110) and before `const MINIMIZED_ICON_MAP`:

```tsx
// ─── Session Chip ─────────────────────────────────────────────────────────────
// Quiet ambient indicator: renders only when a work-session plan is active.
// Clicking opens / focuses the WorkSessionPane. Exported for testing.
// Follows the MagneticDockIcon inline sub-component pattern.
interface SessionChipProps {
    planId: string; // always non-null — Dock gates with {activePlanId && ...}
    openPane: OpenPaneFn;
    isStandardMode: boolean;
}

export const SessionChip: React.FC<SessionChipProps> = ({ planId, openPane, isStandardMode }) => {
    const paneData = React.useMemo(() => ({ plan_id: planId }), [planId]);

    const handleClick = React.useCallback(() => {
        openPane({
            id: `work-session-${paneData.plan_id}`,  // derive from paneData, not planId
            type: 'work-session',
            title: 'Arbeitsplan',
            size: { width: 900, height: 700 },
            data: paneData,
        });
    }, [openPane, paneData]);  // exhaustive: paneData captures planId, no direct planId dep

    return (
        <button
            type="button"
            onClick={handleClick}
            title="Aktiven Arbeitsplan oeffnen"
            data-testid="session-chip"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-all ${
                isStandardMode
                    ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-100'
                    : 'bg-violet-500/10 border border-violet-400/20 text-violet-200/80 hover:border-violet-300/35 hover:bg-violet-500/20'
            }`}
        >
            <span
                className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                    isStandardMode ? 'bg-blue-500' : 'bg-violet-400'
                }`}
            />
            Plan aktiv
        </button>
    );
};
```

Note: `hover:bg-violet-500/20` is used (valid Tailwind v3 opacity scale). `planId` removed from `useCallback` deps — `paneData` already captures the same value.

- [ ] **Step 2.3: Read `activePlanId` in the `Dock` component body**

Inside the `Dock` component, after the existing store reads (around line 136), add one line:

```ts
const activePlanId = useWorkSessionStore(s => s.activePlanId);
```

Primitive selector — no object literal, no re-render loop.

- [ ] **Step 2.4: Mount `SessionChip` in the right-cluster JSX**

In the right-section `<div className="flex items-center gap-2">` (lines 418–427), after `<NotificationCenter />`, add the conditional chip:

```tsx
{/* RIGHT SECTION: Focus Mode + Notifications + Actions + Company */}
<div className="flex items-center gap-2">
    {/* Focus Mode Widget */}
    <FocusModeWidget />

    {/* Action Tray */}
    <ActionTray />

    {/* Notification Center */}
    <NotificationCenter />

    {/* Session Chip — visible only while a work-session plan is active */}
    {activePlanId && (
        <SessionChip
            planId={activePlanId}
            openPane={openPane}
            isStandardMode={isStandardMode}
        />
    )}
</div>
```

`{activePlanId && ...}` narrows `string | null` → `string` satisfying `planId: string`.

---

### Task 3: Verify, commit, push

- [ ] **Step 3.1: Run SessionChip tests — all 3 should now pass**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="SessionChip" 2>&1
```

Expected: `PASS __tests__/components/mora/SessionChip.test.tsx` — 3 tests green.

- [ ] **Step 3.2: Run the full test suite to confirm no regressions**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__" 2>&1
```

Expected: 210 passing (207 baseline + 3 new). `ChatPane.agentic.test.tsx` remains a pre-existing failure from Codex commit `0471225` — do not fix here.

- [ ] **Step 3.3: Commit**

```bash
cd C:/saimor/mora-ui && git add components/mora/Dock.tsx __tests__/components/mora/SessionChip.test.tsx
git commit -m "$(cat <<'EOF'
feat(work-session): add SessionChip ambient indicator to Dock right-cluster

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3.4: Push to origin/main**

```bash
cd C:/saimor/mora-ui && git push origin main 2>&1
```

---

## Deliverables checklist

- [ ] `SessionChip` exported from `Dock.tsx` and renders when `activePlanId` is non-null
- [ ] Chip is invisible when no session is active (zero DOM via `{activePlanId && ...}` gate)
- [ ] Click opens or focuses `WorkSessionPane` for the active plan
- [ ] `data` object memoized — no spurious `updatePane` on repeated focus clicks
- [ ] Primitive selector — no Zustand object-selector re-render loop
- [ ] 3 new tests passing against the real `SessionChip` export
- [ ] Full suite passes (pre-existing `ChatPane.agentic` failure excluded)
- [ ] Pushed to `origin/main`
