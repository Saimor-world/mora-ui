# MR19: Memory Overview + Answer Source Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire `/v3/memory/overview` to populate `memoryFactCount`, close the `answerSourceMode` normalization gap, and surface mode as a sub-label on the `MoraContextChip` source pill.

**Architecture:** New `useMemoryOverview` hook parallels `useMemoryPendingCount` — 60s poll, zeroes on error, company-scoped. `answerSourceMode` travels the same path as `answerSource`: `StreamFrame` → `setAnswerProvenance` → store → `useMoraContext` snapshot → chip. Chip gains a German mode sub-label (`direkt`, `synthese`, `hybrid`) without any structural changes.

**Tech Stack:** Next.js App Router, Zustand, React hooks, Jest + jsdom, TypeScript strict

---

## Pre-flight

Run from: `C:\saimor\mora-ui`

```bash
npm test -- --passWithNoTests 2>&1 | tail -5
npm run verify:types 2>&1 | tail -3
```

Both must pass before starting. If types fail, stop and investigate.

---

### Task 1: Add `getMemoryOverview` to `coreClient.ts`

**Files:**
- Modify: `lib/api/coreClient.ts` (after `getMemoryMetrics`, around line 1005)
- Test: `__tests__/lib/api/coreClient.test.ts` (extend existing file)

**Step 1: Write the failing test**

Add this `describe` block to `__tests__/lib/api/coreClient.test.ts` just before the final closing line:

```typescript
describe('getMemoryOverview', () => {
    it('routes to /v3/memory/overview with company_id', async () => {
        mockFetchV3({ metrics: { structured_facts: 12, pending_reviews: 3, episodic_total: 8 } });
        await getMemoryOverview('co-123');
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v3/memory/overview?company_id=co-123'),
            expect.any(Object)
        );
    });

    it('returns metrics.structured_facts from v3 envelope', async () => {
        mockFetchV3({ metrics: { structured_facts: 42, pending_reviews: 5, episodic_total: 20 } });
        const result = await getMemoryOverview('co-abc');
        expect(result?.metrics.structured_facts).toBe(42);
    });

    it('returns null on error (isOptional)', async () => {
        mockFetchError(500);
        const result = await getMemoryOverview('co-err');
        expect(result).toBeNull();
    });
});
```

Also add `getMemoryOverview` to the import at the top of `coreClient.test.ts`.

**Step 2: Run test to verify it fails**

```bash
cd C:\saimor\mora-ui && npx jest __tests__/lib/api/coreClient.test.ts --testNamePattern="getMemoryOverview" 2>&1 | tail -10
```

Expected: FAIL — "getMemoryOverview is not exported"

**Step 3: Add interface and function to `coreClient.ts`**

After the `getMemoryMetrics` function (around line 1005), add:

```typescript
// GET /v3/memory/overview - Aggregated memory surface (MR19)
export interface MemoryOverviewMetrics {
    structured_facts: number;
    pending_reviews: number;
    episodic_total: number;
    episodic_memories?: Record<string, number>;
}

export interface MemoryOverview {
    metrics: MemoryOverviewMetrics;
}

export async function getMemoryOverview(companyId: string): Promise<MemoryOverview | null> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest()
    return coreGet(`/v3/memory/overview${companyQuery}`, { isOptional: true });
}
```

**Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/api/coreClient.test.ts --testNamePattern="getMemoryOverview" 2>&1 | tail -10
```

Expected: 3 passing

**Step 5: Run full suite**

```bash
npm test 2>&1 | tail -8
```

Expected: all previously-passing tests still pass + 3 new

**Step 6: Commit**

```bash
git add lib/api/coreClient.ts __tests__/lib/api/coreClient.test.ts
git commit -m "feat(mr19): add getMemoryOverview API function + tests"
```

---

### Task 2: Create `useMemoryOverview` hook

**Files:**
- Create: `lib/hooks/useMemoryOverview.ts`
- Create: `__tests__/lib/hooks/useMemoryOverview.test.ts`

**Step 1: Create the test file**

Create `__tests__/lib/hooks/useMemoryOverview.test.ts`:

```typescript
/**
 * useMemoryOverview.test.ts
 *
 * Validates:
 *   1. Returns zero counts when no companyId is available.
 *   2. Calls getMemoryOverview and returns structured_facts as structuredFacts.
 *   3. Returns zeroes on error (never throws).
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useMemoryOverview } from '@/lib/hooks/useMemoryOverview';
import * as coreClient from '@/lib/api/coreClient';

// Mock the store — only needs activeCompanyId
jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: (selector: (s: any) => any) =>
        selector({ activeCompanyId: 'co-test', companies: [] }),
}));

describe('useMemoryOverview', () => {
    it('returns zero counts when companyId is null', async () => {
        jest.spyOn(coreClient, 'getMemoryOverview').mockResolvedValue(null);

        // Override mock to return null company
        jest.resetModules();
        const { useMoraStore } = jest.requireMock('@/lib/store/moraState');
        const origImpl = useMoraStore;
        (coreClient as any).getMemoryOverview = jest.fn().mockResolvedValue(null);

        const { result } = renderHook(() => useMemoryOverview(null));
        await waitFor(() => {
            expect(result.current.structuredFacts).toBe(0);
            expect(result.current.pendingReviews).toBe(0);
        });
    });

    it('returns structured_facts from overview response', async () => {
        jest.spyOn(coreClient, 'getMemoryOverview').mockResolvedValue({
            metrics: { structured_facts: 17, pending_reviews: 4, episodic_total: 11 },
        });

        const { result } = renderHook(() => useMemoryOverview('co-test'));
        await waitFor(() => {
            expect(result.current.structuredFacts).toBe(17);
            expect(result.current.pendingReviews).toBe(4);
            expect(result.current.episodicTotal).toBe(11);
        });
    });

    it('returns zeroes on fetch error without throwing', async () => {
        jest.spyOn(coreClient, 'getMemoryOverview').mockRejectedValue(new Error('network'));

        const { result } = renderHook(() => useMemoryOverview('co-err'));
        await waitFor(() => {
            expect(result.current.structuredFacts).toBe(0);
        });
    });
});
```

**Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/hooks/useMemoryOverview.test.ts 2>&1 | tail -10
```

Expected: FAIL — "Cannot find module '@/lib/hooks/useMemoryOverview'"

**Step 3: Create `lib/hooks/useMemoryOverview.ts`**

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { getMemoryOverview } from "@/lib/api/coreClient";
import { useMoraStore } from "@/lib/store/moraState";

export interface MemoryOverviewCounts {
    structuredFacts: number;
    pendingReviews: number;
    episodicTotal: number;
}

const ZERO: MemoryOverviewCounts = {
    structuredFacts: 0,
    pendingReviews: 0,
    episodicTotal: 0,
};

export function useMemoryOverview(manualCompanyId?: string | null): MemoryOverviewCounts {
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const companies = useMoraStore((s) => s.companies);
    const safeCompanies = Array.isArray(companies) ? companies : [];
    const scopedCompanyId =
        manualCompanyId !== undefined
            ? manualCompanyId
            : activeCompanyId ?? safeCompanies[0]?.id ?? null;

    const [counts, setCounts] = useState<MemoryOverviewCounts>(ZERO);

    const load = useCallback(async () => {
        if (!scopedCompanyId) {
            setCounts(ZERO);
            return;
        }
        try {
            const data = await getMemoryOverview(scopedCompanyId);
            if (data?.metrics) {
                setCounts({
                    structuredFacts: data.metrics.structured_facts ?? 0,
                    pendingReviews: data.metrics.pending_reviews ?? 0,
                    episodicTotal: data.metrics.episodic_total ?? 0,
                });
            } else {
                setCounts(ZERO);
            }
        } catch {
            // Best-effort — badge counts are non-critical
            setCounts(ZERO);
        }
    }, [scopedCompanyId]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        const t = setInterval(() => { void load(); }, 60_000);
        return () => clearInterval(t);
    }, [load]);

    return counts;
}
```

**Step 4: Run tests**

```bash
npx jest __tests__/lib/hooks/useMemoryOverview.test.ts 2>&1 | tail -10
```

Expected: 3 passing (note: the first test has a slightly clunky setup — if it proves fragile, simplify to just test the null-company path via the `manualCompanyId=null` param directly)

**Step 5: Full suite**

```bash
npm test 2>&1 | tail -8
```

**Step 6: Commit**

```bash
git add lib/hooks/useMemoryOverview.ts __tests__/lib/hooks/useMemoryOverview.test.ts
git commit -m "feat(mr19): add useMemoryOverview hook — polls /v3/memory/overview every 60s"
```

---

### Task 3: Extend store for `answerSourceMode`

**Files:**
- Modify: `lib/store/moraState.ts`

**Step 1: No new test needed** — store mutation is covered implicitly by the `useMoraContext` test in Task 5. Proceed to implementation.

**Step 2: Add `lastAnswerSourceMode` to `MoraState` interface**

In `lib/store/moraState.ts`, find the block:
```typescript
    // Answer provenance — populated by useMoraStream from SSE preamble (MR18)
    lastAnswerSource: 'memory' | 'context' | 'inference' | null;
    lastAnswerScopeLabel: string | null;
```

Replace with:
```typescript
    // Answer provenance — populated by useMoraStream from SSE preamble (MR18/MR19)
    lastAnswerSource: 'memory' | 'context' | 'inference' | null;
    lastAnswerSourceMode: string | null;   // e.g. 'retrieval' | 'synthesis' | 'hybrid'
    lastAnswerScopeLabel: string | null;
```

**Step 3: Update action signature in interface**

Find:
```typescript
    setAnswerProvenance: (source: 'memory' | 'context' | 'inference' | null, label: string | null) => void;
```

Replace with:
```typescript
    setAnswerProvenance: (
        source: 'memory' | 'context' | 'inference' | null,
        mode: string | null,
        label: string | null,
    ) => void;
```

**Step 4: Add initial state value**

Find `lastAnswerScopeLabel: null,` in the initial state block. Replace with:
```typescript
    lastAnswerSource: null,
    lastAnswerSourceMode: null,
    lastAnswerScopeLabel: null,
```

(Note: `lastAnswerSource: null` line is already there — just insert `lastAnswerSourceMode: null,` between the two existing lines.)

**Step 5: Update `setAnswerProvenance` implementation**

Find:
```typescript
    setAnswerProvenance: (source, label) => set({
        lastAnswerSource: source,
        lastAnswerScopeLabel: label,
    }),
```

Replace with:
```typescript
    setAnswerProvenance: (source, mode, label) => set({
        lastAnswerSource: source,
        lastAnswerSourceMode: mode,
        lastAnswerScopeLabel: label,
    }),
```

**Step 6: Update `resetStore`**

In the `resetStore` block, find `lastAnswerScopeLabel: null,`. Insert `lastAnswerSourceMode: null,` before it:
```typescript
            lastAnswerSource: null,
            lastAnswerSourceMode: null,
            lastAnswerScopeLabel: null,
```

**Step 7: Verify types**

```bash
npm run verify:types 2>&1 | tail -5
```

Expected: TypeScript will now error on the one `setAnswerProvenance` call site in `useMoraStream.ts` — that is correct and expected. Fix it in Task 4.

---

### Task 4: Wire `useMoraStream.ts` + `useMoraContext.ts`

**Files:**
- Modify: `lib/hooks/useMoraStream.ts`
- Modify: `lib/mora/useMoraContext.ts`

#### 4a — `useMoraStream.ts`

**Step 1: Add `answerSourceMode` to `StreamFrame`**

Find the provenance comment block in `StreamFrame`:
```typescript
    // Answer provenance — MR18: live in backend /v3/chat/stream preamble
    answerSource?: string;
    answer_source?: string;
    answerScopeLabel?: string;
    answer_scope_label?: string;
```

Replace with:
```typescript
    // Answer provenance — MR18/MR19: live in backend /v3/chat/stream preamble
    answerSource?: string;
    answer_source?: string;
    answerSourceMode?: string;
    answer_source_mode?: string;
    answerScopeLabel?: string;
    answer_scope_label?: string;
```

**Step 2: Extract mode in the stream loop**

Find:
```typescript
                            // MR18: Extract answer provenance from same preamble frame.
                            const rawSource = json.answerSource ?? json.answer_source;
                            const rawLabel = json.answerScopeLabel ?? json.answer_scope_label;
                            if (rawSource !== undefined || rawLabel !== undefined) {
                                const VALID_SOURCES = new Set(['memory', 'context', 'inference']);
                                const validSource = VALID_SOURCES.has(rawSource ?? '')
                                    ? (rawSource as 'memory' | 'context' | 'inference')
                                    : null;
                                useMoraStore.getState().setAnswerProvenance(validSource, rawLabel ?? null);
                            }
```

Replace with:
```typescript
                            // MR18/MR19: Extract answer provenance from same preamble frame.
                            const rawSource = json.answerSource ?? json.answer_source;
                            const rawMode = json.answerSourceMode ?? json.answer_source_mode ?? null;
                            const rawLabel = json.answerScopeLabel ?? json.answer_scope_label;
                            if (rawSource !== undefined || rawLabel !== undefined || rawMode !== null) {
                                const VALID_SOURCES = new Set(['memory', 'context', 'inference']);
                                const validSource = VALID_SOURCES.has(rawSource ?? '')
                                    ? (rawSource as 'memory' | 'context' | 'inference')
                                    : null;
                                useMoraStore.getState().setAnswerProvenance(
                                    validSource,
                                    rawMode,
                                    rawLabel ?? null,
                                );
                            }
```

#### 4b — `useMoraContext.ts`

**Step 1: Add `lastAnswerSourceMode` to `MoraContextSnapshot` interface**

Find:
```typescript
    // Answer provenance — null until backend sends answer_source in StreamFrame
    lastAnswerSource: 'memory' | 'context' | 'inference' | null;
    lastAnswerScopeLabel: string | null;
```

Replace with:
```typescript
    // Answer provenance — null until backend sends answer_source in StreamFrame
    lastAnswerSource: 'memory' | 'context' | 'inference' | null;
    lastAnswerSourceMode: string | null;   // e.g. 'retrieval' | 'synthesis' | 'hybrid'
    lastAnswerScopeLabel: string | null;
```

**Step 2: Add store selectors and `useMemoryOverview` call**

Find:
```typescript
    // Answer provenance — wired from store (MR18 backend now live)
    const storeAnswerSource = useMoraStore((s) => s.lastAnswerSource);
    const storeAnswerScopeLabel = useMoraStore((s) => s.lastAnswerScopeLabel);

    const memoryPendingCount = useMemoryPendingCount();
```

Replace with:
```typescript
    // Answer provenance — wired from store (MR18/MR19 backend now live)
    const storeAnswerSource = useMoraStore((s) => s.lastAnswerSource);
    const storeAnswerSourceMode = useMoraStore((s) => s.lastAnswerSourceMode);
    const storeAnswerScopeLabel = useMoraStore((s) => s.lastAnswerScopeLabel);

    const memoryPendingCount = useMemoryPendingCount();
    const memoryOverview = useMemoryOverview();
```

Also add the import at the top of the file:
```typescript
import { useMemoryOverview } from '@/lib/hooks/useMemoryOverview';
```

**Step 3: Wire in `useMemo` body**

Find:
```typescript
        // Answer provenance — wired from store, populated by useMoraStream SSE preamble (MR18)
        const lastAnswerSource = storeAnswerSource;
        const lastAnswerScopeLabel = storeAnswerScopeLabel;
```

Replace with:
```typescript
        // Answer provenance — wired from store, populated by useMoraStream SSE preamble (MR18/MR19)
        const lastAnswerSource = storeAnswerSource;
        const lastAnswerSourceMode = storeAnswerSourceMode;
        const lastAnswerScopeLabel = storeAnswerScopeLabel;
```

**Step 4: Add `memoryFactCount` and `lastAnswerSourceMode` to the return**

Find:
```typescript
            memoryPendingCount,
            memoryFactCount: 0, // extend when metrics are in store
```

Replace with:
```typescript
            memoryPendingCount,
            memoryFactCount: memoryOverview.structuredFacts,
```

Find:
```typescript
            lastAnswerSource,
            lastAnswerScopeLabel,
```

Replace with:
```typescript
            lastAnswerSource,
            lastAnswerSourceMode,
            lastAnswerScopeLabel,
```

**Step 5: Add new deps to `useMemo` dependency array**

Find:
```typescript
        storeAnswerSource, storeAnswerScopeLabel,
    ]);
```

Replace with:
```typescript
        storeAnswerSource, storeAnswerSourceMode, storeAnswerScopeLabel,
        memoryOverview,
    ]);
```

**Step 6: Verify types**

```bash
npm run verify:types 2>&1 | tail -5
```

Expected: 0 errors

**Step 7: Run full test suite**

```bash
npm test 2>&1 | tail -8
```

Expected: all tests pass

**Step 8: Commit**

```bash
git add lib/hooks/useMoraStream.ts lib/mora/useMoraContext.ts lib/store/moraState.ts
git commit -m "feat(mr19): wire answerSourceMode + memoryFactCount through store → useMoraContext"
```

---

### Task 5: Mode sub-label in `MoraContextChip`

**Files:**
- Modify: `components/mora/MoraContextChip.tsx`

**Step 1: No test file for chip exists** — changes are visual/structural. Verify via types and manual inspection.

**Step 2: Add `MODE_LABELS` map and destructure `lastAnswerSourceMode`**

At the top of the component file, after `SOURCE_CONFIG`, add:

```typescript
// ─── Answer source mode labels ────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
    retrieval: 'direkt',
    synthesis: 'synthese',
    hybrid: 'hybrid',
};
```

In the component destructuring, find:
```typescript
    const {
        scopeLevel,
        scopeLabels,
        scopeEnforced,
        scopeReason,
        memoryPendingCount,
        lastAnswerSource,
    } = snapshot;
```

Replace with:
```typescript
    const {
        scopeLevel,
        scopeLabels,
        scopeEnforced,
        scopeReason,
        memoryPendingCount,
        lastAnswerSource,
        lastAnswerSourceMode,
    } = snapshot;
```

**Step 3: Update the source pill to show the mode sub-label**

Find the answer source pill render block:
```typescript
                    <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] leading-none transition-colors duration-150 ${cfg.className}`}
                        title={`Antwortquelle: ${cfg.label}`}
                    >
                        <ArrowRight size={9} className="shrink-0" />
                        {cfg.label}
                    </div>
```

Replace with:
```typescript
                    <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border leading-none transition-colors duration-150 ${cfg.className}`}
                        title={`Antwortquelle: ${cfg.label}${lastAnswerSourceMode ? ` · ${lastAnswerSourceMode}` : ''}`}
                    >
                        <ArrowRight size={9} className="shrink-0" />
                        <span className="text-[10px]">{cfg.label}</span>
                        {lastAnswerSourceMode && MODE_LABELS[lastAnswerSourceMode] && (
                            <span className="text-[9px] opacity-60 italic">
                                · {MODE_LABELS[lastAnswerSourceMode]}
                            </span>
                        )}
                    </div>
```

**Step 4: Verify types**

```bash
npm run verify:types 2>&1 | tail -5
```

Expected: 0 errors

**Step 5: Run full suite + critical-flow gate**

```bash
npm test 2>&1 | tail -8
npm run verify:critical-flow 2>&1 | tail -5
```

Expected: all pass

**Step 6: Commit**

```bash
git add components/mora/MoraContextChip.tsx
git commit -m "feat(mr19): add mode sub-label to MoraContextChip source pill (direkt/synthese/hybrid)"
```

---

### Task 6: Final verification + push

**Step 1: Run complete verification**

```bash
cd C:\saimor\mora-ui
npm test 2>&1 | tail -10
npm run verify:types 2>&1 | tail -3
npm run verify:critical-flow 2>&1 | tail -3
```

Expected:
- Tests: all pass (46+ unit tests)
- Types: 0 errors
- Critical-flow: 0 violations

**Step 2: Confirm MR19 commit range**

```bash
git log --oneline d772a97..HEAD
```

Expected: 4 commits (tasks 1–5, one per task)

**Step 3: Push**

```bash
git push origin main
```

**Step 4: Report**

Deliver final SHA, commit range, and updated normalization mismatch table to user.

---

## Normalization Mismatch Status After MR19

| Backend field | Frontend field | Status |
|---|---|---|
| `answer_source` / `answerSource` | `lastAnswerSource` | ✅ MR18 |
| `answer_source_mode` / `answerSourceMode` | `lastAnswerSourceMode` | ✅ MR19 |
| `answer_scope_label` / `answerScopeLabel` | `lastAnswerScopeLabel` | ✅ MR18 |
| `scope_reason` | `scopeReason` | ✅ MR18 |
| `overview.metrics.structured_facts` | `memoryFactCount` | ✅ MR19 |
| `overview.metrics.pending_reviews` | *(pending list API still used)* | P2 |
| `dropped_fields` | `scopeDroppedFields` | ✅ wired, not rendered |
