# Work Session V4 — Continuation Legibility Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a continued work session feel like one ongoing operational flow across WorkSessionPane (continuation split), ChatPane (live chip), and MoraShell (progress-aware copy).

**Architecture:** Four additive changes executed in dependency order: type extension → step split logic → reactive chip → progress copy. Pure helper functions are extracted for the split and copy logic to enable unit testing without component rendering.

**Tech Stack:** Next.js 15, React, TypeScript, Zustand, framer-motion, Tailwind v3, Jest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-18-work-session-v4-continuation-design.md`

**Test command:** `npx jest --no-coverage --testPathPattern="__tests__"`

---

## Chunk 1: Type extension + pure helpers

### Task 1: Add `planned_steps` to `WorkSessionShellSummary.stats`

**Files:**
- Modify: `lib/utils/moraExplanation.ts:49-58`

No test needed — this is a pure type extension. Existing tests confirm the type compiles.

- [ ] **Step 1: Add `planned_steps?: number` to the stats block**

In `lib/utils/moraExplanation.ts`, find the `WorkSessionShellSummary` interface's `stats` block (lines 49–58):

```typescript
// BEFORE:
stats?: {
    total_steps?: number;
    read_steps?: number;
    write_steps?: number;
    completed_steps?: number;
    pending_confirmations?: number;
    running_steps?: number;
    failed_steps?: number;
    skipped_steps?: number;
};

// AFTER:
stats?: {
    total_steps?: number;
    read_steps?: number;
    write_steps?: number;
    planned_steps?: number;
    completed_steps?: number;
    pending_confirmations?: number;
    running_steps?: number;
    failed_steps?: number;
    skipped_steps?: number;
};
```

- [ ] **Step 2: Run tests to confirm no breakage**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```

Expected: all 81 tests pass (type change only; no runtime behavior changes).

- [ ] **Step 3: Commit**

```bash
cd C:/saimor/mora-ui && git add lib/utils/moraExplanation.ts && git commit -m "feat(work-session): add planned_steps to WorkSessionShellSummary stats type"
```

---

### Task 2: Extract and test `splitAtPlannedSteps` helper

**Files:**
- Modify: `components/panes/WorkSessionPane.tsx` (add helper after last `import` line)
- Create: `__tests__/components/panes/WorkSessionPane.split.test.ts`

The split logic is a pure function — extract it for unit testing.

**Insertion point:** `WorkSessionPane.tsx` starts with `'use client'` on line 1, followed by imports (lines 2–33, ending with `import { toast } from 'sonner';`). The helper must be placed **after line 33** (after the last import), not before `'use client'`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/panes/WorkSessionPane.split.test.ts`:

```typescript
import { splitAtPlannedSteps } from '@/components/panes/WorkSessionPane';

const makeStep = (id: string) => ({
    step_id: id,
    kind: 'navigate',
    title: `Step ${id}`,
    status: 'done' as const,
});

describe('splitAtPlannedSteps', () => {
    it('returns all steps as original when no plannedCount given', () => {
        const steps = [makeStep('a'), makeStep('b'), makeStep('c')];
        const { original, continuation } = splitAtPlannedSteps(steps, null);
        expect(original).toHaveLength(3);
        expect(continuation).toHaveLength(0);
    });

    it('returns all steps as original when plannedCount >= steps.length', () => {
        const steps = [makeStep('a'), makeStep('b')];
        const { original, continuation } = splitAtPlannedSteps(steps, 5);
        expect(original).toHaveLength(2);
        expect(continuation).toHaveLength(0);
    });

    it('splits correctly when continuation exists', () => {
        const steps = [makeStep('a'), makeStep('b'), makeStep('c'), makeStep('d')];
        const { original, continuation } = splitAtPlannedSteps(steps, 2);
        expect(original).toHaveLength(2);
        expect(continuation).toHaveLength(2);
        expect(original[0].step_id).toBe('a');
        expect(continuation[0].step_id).toBe('c');
    });

    it('handles empty steps array', () => {
        const { original, continuation } = splitAtPlannedSteps([], 3);
        expect(original).toHaveLength(0);
        expect(continuation).toHaveLength(0);
    });

    it('returns all as original when plannedCount is 0', () => {
        const steps = [makeStep('a'), makeStep('b')];
        const { original, continuation } = splitAtPlannedSteps(steps, 0);
        expect(original).toHaveLength(2);
        expect(continuation).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="WorkSessionPane.split"
```

Expected: FAIL — `splitAtPlannedSteps` is not exported.

- [ ] **Step 3: Add `splitAtPlannedSteps` export to WorkSessionPane.tsx**

After `import { toast } from 'sonner';` (last import line, approximately line 33), insert:

```typescript
// ─── exported for unit testing ───────────────────────────────────────────────
export function splitAtPlannedSteps<T>(
    steps: T[],
    plannedCount: number | null | undefined,
): { original: T[]; continuation: T[] } {
    if (!plannedCount || plannedCount <= 0 || plannedCount >= steps.length) {
        return { original: steps, continuation: [] };
    }
    return {
        original: steps.slice(0, plannedCount),
        continuation: steps.slice(plannedCount),
    };
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="WorkSessionPane.split"
```

Expected: 5 tests PASS.

- [ ] **Step 5: Run full suite**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```

Expected: 81 + 5 = 86 tests pass.

- [ ] **Step 6: Commit**

```bash
cd C:/saimor/mora-ui && git add components/panes/WorkSessionPane.tsx __tests__/components/panes/WorkSessionPane.split.test.ts && git commit -m "feat(work-session): extract and test splitAtPlannedSteps helper"
```

---

### Task 3: Extract and test `getSessionBodyText` / `getSessionExtendedNote` helpers

**Files:**
- Modify: `components/os/shell/MoraShell.tsx` (add helpers before `MoraShell` component, after `ErrorScreen`)
- Create: `__tests__/components/os/MoraShell.sessionCopy.test.ts`

**Insertion point:** `ErrorScreen` ends at approximately line 212. The helpers go after line 212, before the `// MAIN SHELL COMPONENT` comment at line 214.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/os/MoraShell.sessionCopy.test.ts`:

```typescript
import { getSessionBodyText, getSessionExtendedNote } from '@/components/os/shell/MoraShell';

describe('getSessionBodyText', () => {
    it('returns confirmation waiting copy when pending > 0', () => {
        const result = getSessionBodyText({ state: 'running', stats: { pending_confirmations: 2, completed_steps: 1, total_steps: 5 } });
        expect(result).toBe('Ein Schritt wartet auf Freigabe.');
    });

    it('returns progress copy when running and has totals', () => {
        const result = getSessionBodyText({ state: 'running', stats: { pending_confirmations: 0, completed_steps: 3, total_steps: 7 } });
        expect(result).toBe('3/7 Schritte — Mora arbeitet.');
    });

    it('returns completion copy when not running and completed > 0', () => {
        const result = getSessionBodyText({ state: 'done', stats: { completed_steps: 5, total_steps: 5 } });
        expect(result).toBe('5 von 5 Schritten abgeschlossen.');
    });

    it('returns fallback when no stats available', () => {
        const result = getSessionBodyText({ state: 'pending', stats: undefined });
        expect(result).toBe('Mora haelt den Arbeitsplan bereit.');
    });

    it('returns fallback when totals are zero', () => {
        const result = getSessionBodyText({ state: 'running', stats: { completed_steps: 0, total_steps: 0 } });
        expect(result).toBe('Mora haelt den Arbeitsplan bereit.');
    });
});

describe('getSessionExtendedNote', () => {
    it('returns continuation note when total > planned and planned > 0', () => {
        const result = getSessionExtendedNote({ total_steps: 7, planned_steps: 5 });
        expect(result).toBe('Navigation hat den Plan erweitert.');
    });

    it('returns null when total equals planned', () => {
        expect(getSessionExtendedNote({ total_steps: 5, planned_steps: 5 })).toBeNull();
    });

    it('returns null when total is less than planned', () => {
        expect(getSessionExtendedNote({ total_steps: 3, planned_steps: 5 })).toBeNull();
    });

    it('returns null when planned_steps is missing', () => {
        expect(getSessionExtendedNote({ total_steps: 7 })).toBeNull();
    });

    it('returns null when planned_steps is 0', () => {
        expect(getSessionExtendedNote({ total_steps: 7, planned_steps: 0 })).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="MoraShell.sessionCopy"
```

Expected: FAIL — exports not found.

- [ ] **Step 3: Add helpers to MoraShell.tsx**

After the closing `};` of `ErrorScreen` (approximately line 212) and before `// MAIN SHELL COMPONENT`, insert:

```typescript
// ─── exported for unit testing ───────────────────────────────────────────────
export function getSessionBodyText(summary: {
    state: string;
    stats?: {
        pending_confirmations?: number;
        completed_steps?: number;
        total_steps?: number;
    } | undefined;
}): string {
    const pending = summary.stats?.pending_confirmations ?? 0;
    const completed = summary.stats?.completed_steps ?? 0;
    const total = summary.stats?.total_steps ?? 0;

    if (pending > 0) return 'Ein Schritt wartet auf Freigabe.';
    if (summary.state === 'running' && total > 0) return `${completed}/${total} Schritte — Mora arbeitet.`;
    if (completed > 0 && total > 0) return `${completed} von ${total} Schritten abgeschlossen.`;
    return 'Mora haelt den Arbeitsplan bereit.';
}

export function getSessionExtendedNote(stats: {
    total_steps?: number;
    planned_steps?: number;
}): string | null {
    const total = stats.total_steps ?? 0;
    const planned = stats.planned_steps ?? 0;
    if (planned > 0 && total > planned) return 'Navigation hat den Plan erweitert.';
    return null;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="MoraShell.sessionCopy"
```

Expected: 10 tests PASS (5 + 5).

- [ ] **Step 5: Run full suite**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```

Expected: 86 + 10 = 96 tests pass.

- [ ] **Step 6: Commit**

```bash
cd C:/saimor/mora-ui && git add components/os/shell/MoraShell.tsx __tests__/components/os/MoraShell.sessionCopy.test.ts && git commit -m "feat(work-session): extract and test session copy helpers"
```

---

## Chunk 2: WorkSessionPane rendering

### Task 4: Wire continuation split into WorkSessionPane render

**Files:**
- Modify: `components/panes/WorkSessionPane.tsx` (component body + render block)

**Important:** The derivation of `originalSteps`/`continuationSteps` must be placed in the **component function body** (before `return`), not inline in JSX. `timelineSteps` is available from the existing derivation (line 542), and `plan` may be null at that point so use optional chaining.

- [ ] **Step 1: Add derivation to component body**

In `WorkSessionPane.tsx`, after the existing stat derivations (approximately lines 545–550, just before `return (`), add:

```tsx
const { original: originalSteps, continuation: continuationSteps } = splitAtPlannedSteps(
    timelineSteps,
    plan?.stats?.planned_steps,
);
```

- [ ] **Step 2: Replace the timeline render block**

Find the existing block (approximately lines 675–693):

```tsx
{timelineSteps.length > 0 && (
    <div className="px-4 py-4">
        {pendingSteps.length > 0 && (
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-3">Schritte</div>
        )}
        <div className="space-y-1">
            {timelineSteps.map((step, idx) => (
                <motion.div
                    key={step.step_id}
                    initial={{ opacity: 0, x: -3 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.025, duration: 0.15 }}
                >
                    <StepRow step={step} onOpen={(targetStep) => openWorkSessionNavigation(targetStep, openPane)} />
                </motion.div>
            ))}
        </div>
    </div>
)}
```

Replace with:

```tsx
{timelineSteps.length > 0 && (
    <div className="px-4 py-4">
        {pendingSteps.length > 0 && (
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-3">Schritte</div>
        )}
        <div className="space-y-1">
            {originalSteps.map((step, idx) => (
                <motion.div
                    key={step.step_id}
                    initial={{ opacity: 0, x: -3 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.025, duration: 0.15 }}
                >
                    <StepRow step={step} onOpen={(targetStep) => openWorkSessionNavigation(targetStep, openPane)} />
                </motion.div>
            ))}
        </div>

        {continuationSteps.length > 0 && (
            <>
                <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-[9px] uppercase tracking-[0.22em] text-white/28 shrink-0">
                        Weitergefuehrt
                    </span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <div className="space-y-1">
                    {continuationSteps.map((step, idx) => (
                        <motion.div
                            key={step.step_id}
                            initial={{ opacity: 0, x: -3 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.025, duration: 0.15 }}
                            className="border-l-2 border-cyan-400/20 pl-1"
                        >
                            <StepRow step={step} onOpen={(targetStep) => openWorkSessionNavigation(targetStep, openPane)} />
                        </motion.div>
                    ))}
                </div>
            </>
        )}
    </div>
)}
```

- [ ] **Step 3: Run full test suite**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```

Expected: 96 tests pass. The `splitAtPlannedSteps` tests from Task 2 confirm the helper is intact.

- [ ] **Step 4: Build check**

```bash
cd C:/saimor/mora-ui && npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
cd C:/saimor/mora-ui && git add components/panes/WorkSessionPane.tsx && git commit -m "feat(work-session): show continuation steps in separate labeled section"
```

---

## Chunk 3: ChatPane + MoraShell wiring

### Task 5: Add pulsing dot to active plan chip in ChatPane

**Files:**
- Modify: `components/panes/ChatPane.tsx` (the `msg.planId &&` button, lines 1030–1049)
- Modify: `__tests__/components/panes/ChatPane.agentic.test.tsx`

`activePlanId` is already in scope (destructured at lines 419–423 from `useWorkSessionStore`). No new hook needed.

The test file currently has no `workSessionStore` mock. One must be added **before** the `import { ChatPane }` line (line 106 in the current file) so Jest's module hoisting works correctly.

- [ ] **Step 1: Write the failing test**

In `__tests__/components/panes/ChatPane.agentic.test.tsx`, add the `workSessionStore` mock and `fetchWorkSessionPlan` mock **before** the `import { ChatPane }` line.

The file currently has `jest.mock('@/lib/api/coreClient', ...)` which only mocks `learnInsight` and `searchMemory`. Extend that mock to also include `fetchWorkSessionPlan`. Update the existing `jest.mock('@/lib/api/coreClient', ...)` block:

```typescript
// Update existing coreClient mock to add fetchWorkSessionPlan
jest.mock('@/lib/api/coreClient', () => ({
  learnInsight: jest.fn(),
  searchMemory: jest.fn().mockResolvedValue([]),
  fetchWorkSessionPlan: jest.fn().mockResolvedValue(null),
}));
```

Add the following **after** the `jest.mock('sonner', ...)` line and **before** the `import { ChatPane }` line:

```typescript
jest.mock('@/lib/utils/moraExplanation', () => ({
  dispatchWorkSessionPlan: jest.fn(),
}));

jest.mock('@/lib/store/workSessionStore', () => {
  const mockSetActiveSession = jest.fn();
  return {
    useWorkSessionStore: jest.fn((selector: (s: any) => any) =>
      selector({
        activePlanId: null,
        activeSessionId: null,
        setActiveSession: mockSetActiveSession,
      })
    ),
  };
});
```

Then add a new `describe` block **inside** the existing `describe('ChatPane agentic file ops', ...)` (after the last existing `test(...)` block):

```typescript
describe('plan chip live affordance', () => {
    it('shows pulsing dot when msg.planId matches activePlanId', async () => {
        const { useWorkSessionStore } = require('@/lib/store/workSessionStore');

        // Override store to return 'plan-test-123' as the active plan
        (useWorkSessionStore as jest.Mock).mockImplementation((selector: (s: any) => any) =>
            selector({ activePlanId: 'plan-test-123', activeSessionId: null, setActiveSession: jest.fn() })
        );

        // Mock agent response that creates a plan with plan_id: 'plan-test-123'
        mockExecuteAgenticLoop.mockResolvedValue({
            final_state: 'S6_REPORT',
            final_message: 'Ich habe einen Arbeitsplan erstellt.',
            work_session_plan: { plan_id: 'plan-test-123', title: 'Testplan' },
            tools_executed: [],
        });

        render(<ChatPane id="chat-main" />);

        // Trigger the agentic loop with a file operation intent
        fireEvent.change(screen.getByPlaceholderText(/Schreib Mora/i), {
            target: { value: 'Erstelle einen Ordner Testplan' },
        });
        fireEvent.keyDown(screen.getByPlaceholderText(/Schreib Mora/i), { key: 'Enter', code: 'Enter' });

        // Wait for the plan chip to appear
        await waitFor(() => {
            expect(screen.getByText('Plan anzeigen')).toBeInTheDocument();
        });

        // The live dot should be present because activePlanId === msg.planId
        expect(screen.getByTestId('plan-chip-live-dot')).toBeInTheDocument();
    });

    it('does not show pulsing dot when activePlanId does not match', async () => {
        const { useWorkSessionStore } = require('@/lib/store/workSessionStore');

        // Store has a different active plan
        (useWorkSessionStore as jest.Mock).mockImplementation((selector: (s: any) => any) =>
            selector({ activePlanId: 'different-plan', activeSessionId: null, setActiveSession: jest.fn() })
        );

        mockExecuteAgenticLoop.mockResolvedValue({
            final_state: 'S6_REPORT',
            final_message: 'Ich habe einen Arbeitsplan erstellt.',
            work_session_plan: { plan_id: 'plan-test-456', title: 'Anderer Plan' },
            tools_executed: [],
        });

        render(<ChatPane id="chat-main" />);

        fireEvent.change(screen.getByPlaceholderText(/Schreib Mora/i), {
            target: { value: 'Erstelle einen Ordner Testplan' },
        });
        fireEvent.keyDown(screen.getByPlaceholderText(/Schreib Mora/i), { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(screen.getByText('Plan anzeigen')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('plan-chip-live-dot')).not.toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run tests to confirm new tests fail**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="ChatPane.agentic"
```

Expected: new tests FAIL — `plan-chip-live-dot` testId not found (it hasn't been added to the component yet).

- [ ] **Step 3: Update the chip in ChatPane.tsx**

Find the `{msg.planId && (...)}` button (lines 1030–1049). Update it:

```tsx
{msg.planId && (
    <button
        type="button"
        onClick={() => openPane({
            id: `work-session-${msg.planId}`,
            type: 'work-session',
            title: 'Arbeitsplan',
            size: { width: 480, height: 640 },
            data: { plan_id: msg.planId },
        })}
        className={`mt-2 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-colors ${
            isStandardMode
                ? 'border-[#0078D4]/25 bg-[#0078D4]/[0.05] text-[#0078D4]/80 hover:border-[#0078D4]/40 hover:bg-[#0078D4]/[0.1]'
                : 'border-cyan-400/20 bg-cyan-500/[0.06] text-cyan-200/65 hover:border-cyan-400/35 hover:bg-cyan-500/[0.12] hover:text-cyan-200'
        }`}
    >
        {msg.planId === activePlanId && (
            <span
                data-testid="plan-chip-live-dot"
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"
            />
        )}
        <LayoutList size={11} />
        Plan anzeigen
    </button>
)}
```

- [ ] **Step 4: Run ChatPane tests**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="ChatPane.agentic"
```

Expected: all tests pass including the 2 new live-dot tests.

- [ ] **Step 5: Run full suite**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```

Expected: 96 + 2 = 98 tests pass.

- [ ] **Step 6: Commit**

```bash
cd C:/saimor/mora-ui && git add components/panes/ChatPane.tsx __tests__/components/panes/ChatPane.agentic.test.tsx && git commit -m "feat(work-session): show live dot on plan chip when session is active"
```

---

### Task 6: Wire progress-aware copy into MoraShell

**Files:**
- Modify: `components/os/shell/MoraShell.tsx` (the `workSessionSummary && !isShellDropActive` block, lines 1008–1110)

`getSessionBodyText` and `getSessionExtendedNote` are already exported from `MoraShell.tsx` (added in Task 3). Now use them in the render.

- [ ] **Step 1: Locate the body text in the shell card**

Find the static text block at lines 1022–1026 (inside `workSessionSummary && !isShellDropActive`):

```tsx
<div className="mt-1 text-sm text-white/82">
    {workSessionSummary.state === 'waiting_confirmation'
        ? 'Ein Arbeitsplan wartet auf Freigabe.'
        : workSessionSummary.state === 'running'
            ? 'Mora arbeitet in einem fortlaufenden Arbeitskontext.'
            : 'Mora haelt den aktuellen Arbeitsplan im Scope bereit.'}
</div>
```

- [ ] **Step 2: Replace static text with helper calls**

```tsx
<div className="mt-1 text-sm text-white/82">
    {getSessionBodyText(workSessionSummary)}
</div>
{getSessionExtendedNote(workSessionSummary.stats ?? {}) && (
    <div className="mt-1 text-xs text-white/45">
        {getSessionExtendedNote(workSessionSummary.stats ?? {})}
    </div>
)}
```

- [ ] **Step 3: Run full test suite**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```

Expected: 98 tests pass. The `MoraShell.sessionCopy` tests from Task 3 still cover the logic.

- [ ] **Step 4: Build check**

```bash
cd C:/saimor/mora-ui && npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
cd C:/saimor/mora-ui && git add components/os/shell/MoraShell.tsx && git commit -m "feat(work-session): replace static shell card copy with progress-aware text"
```

---

## Final verification

- [ ] **Run full test suite one last time**

```bash
cd C:/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```

Expected: 98 tests pass (81 baseline + 5 split helper + 10 session copy + 2 chat chip).

- [ ] **Build check**

```bash
cd C:/saimor/mora-ui && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Capture final SHA**

```bash
cd C:/saimor/mora-ui && git log --oneline -6
```

Report: SHA, exact files changed, what became clearer about session continuation.

---

## Deliverable Summary

| Surface | Change |
|---------|--------|
| `lib/utils/moraExplanation.ts` | `planned_steps?: number` added to shell stats type |
| `components/panes/WorkSessionPane.tsx` | `splitAtPlannedSteps` helper + "Weitergefuehrt" divider + cyan left-border on continuation steps |
| `components/panes/ChatPane.tsx` | Pulsing green dot on "Plan anzeigen" chip when `msg.planId === activePlanId` |
| `components/os/shell/MoraShell.tsx` | `getSessionBodyText` / `getSessionExtendedNote` helpers + progress-aware shell card copy |
| `__tests__/components/panes/WorkSessionPane.split.test.ts` | 5 unit tests for `splitAtPlannedSteps` |
| `__tests__/components/os/MoraShell.sessionCopy.test.ts` | 10 unit tests for session copy helpers |
| `__tests__/components/panes/ChatPane.agentic.test.tsx` | 2 tests for live plan chip dot |
