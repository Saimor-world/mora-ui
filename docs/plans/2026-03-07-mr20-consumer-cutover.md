# MR20 Consumer Cutover Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate `searchSemantic` to `coreClient`, remove `semanticClient.ts` dead code, confirm awareness is already v3, and run a full intelligence QA pass against core `6b09e84`.

**Architecture:** SearchPane already has the full local-first + semantic UX architecture; the only change needed is redirecting its `searchSemantic` import from the legacy `semanticClient` (with V12 mock fallback) to a clean `coreClient` implementation calling `GET /v3/search/semantic`. All other critical v3 migrations (`awarenessClient`, health probes, team presence) are confirmed already live.

**Tech Stack:** Next.js 15, TypeScript, Jest (jsdom), `coreGet` / `normalizeList` patterns from `lib/api/coreClient.ts`

---

## Pre-Audit Corrections (Verified Against Actual Files)

These facts were confirmed by reading the actual source before writing this plan:

| Claim | Reality |
|---|---|
| `awarenessClient.ts` still uses v1 | ❌ Already v3 — `coreGet('/v3/awareness/state')`, `coreGet('/v3/awareness/pulse')` |
| `semanticClient.ts` calls `/v1/semantic/search` | ❌ Already calls `/v3/search/semantic` via `corePost` |
| `useSemanticConstellation.ts` has no active consumer | ❌ `FinderPane.tsx` imports and uses it. `/v1/relations/preview` has no v3 equivalent — keep. |
| Test count is 53 | ❌ 65 tests currently (MR19 added 12 more). Target: 68+ after Task 1. |

---

## Task 1: Add `searchSemantic` to `coreClient.ts` (TDD)

**Files:**
- Modify: `lib/api/coreClient.ts` (after `searchGlobal`, line ~957)
- Modify: `__tests__/lib/api/coreClient.test.ts`

**Step 1: Write the 3 failing tests**

Open `__tests__/lib/api/coreClient.test.ts`. Add this new import at the top (alongside existing imports):

```typescript
import {
    // ... existing imports ...
    searchSemantic,
} from '@/lib/api/coreClient';
```

Add this test block after the `describe('searchGlobal', ...)` block (~line 539):

```typescript
describe('searchSemantic', () => {
    it('routes to GET /v3/search/semantic with query params', async () => {
        mockFetchV3({
            results: [
                { node_id: 'n-1', score: 0.87, content: 'Quarterly sales report', metadata: { title: 'Q4 Report', type: 'report' } },
            ],
        });

        const results = await searchSemantic('quarterly', 'co-abc', 5, 0.55);

        expect(lastFetchUrl()).toContain('/v3/search/semantic');
        expect(lastFetchUrl()).toContain('q=quarterly');
        expect(lastFetchUrl()).toContain('company_id=co-abc');
        expect(lastFetchUrl()).toContain('limit=5');
        expect(lastFetchInit().method).toBe('GET');
        expect(results).toHaveLength(1);
        expect(results[0].node_id).toBe('n-1');
        expect(results[0].score).toBe(0.87);
    });

    it('returns [] when response is null or error', async () => {
        mockFetchRaw(null);
        const results = await searchSemantic('anything', 'co-abc');
        expect(results).toEqual([]);
    });

    it('omits company_id param when companyId is null', async () => {
        mockFetchV3({ results: [] });
        await searchSemantic('test', null);
        expect(lastFetchUrl()).not.toContain('company_id');
    });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd /c/saimor/mora-ui
npx jest --no-coverage --testPathPattern="__tests__/lib/api/coreClient"
```

Expected: FAIL with `searchSemantic is not a function` (or similar import error).

**Step 3: Implement `searchSemantic` in `coreClient.ts`**

Open `lib/api/coreClient.ts`. After the `SearchResult` interface and `searchGlobal` function (~line 957), add:

```typescript
export interface SemanticSearchResult {
    node_id: string;
    score: number;
    content: string;
    metadata?: {
        title: string;
        type: string;
        space_id?: string;
        folder_id?: string;
    };
}

// GET /v3/search/semantic — vector similarity search
export async function searchSemantic(
    query: string,
    companyId: string | null,
    limit = 10,
    threshold = 0.55,
): Promise<SemanticSearchResult[]> {
    const q = encodeURIComponent(query);
    const c = companyId ? `&company_id=${encodeURIComponent(companyId)}` : '';
    const result = await coreGet(
        `/v3/search/semantic?q=${q}&limit=${limit}&threshold=${threshold}${c}`,
        { isOptional: true },
    );
    return normalizeList<SemanticSearchResult>(result, ['results', 'items', 'matches', 'data']);
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest --no-coverage --testPathPattern="__tests__/lib/api/coreClient"
```

Expected: All 68 tests PASS (65 existing + 3 new).

**Step 5: Update header comment in test file**

In `__tests__/lib/api/coreClient.test.ts`, update line 7:
```
 *   2. All 10 migrated memory endpoints route to /v3/ (7 reads + 3 writes).
```
→ no change needed. But update the top-level comment if it mentions an endpoint count.

**Step 6: Commit**

```bash
git add lib/api/coreClient.ts __tests__/lib/api/coreClient.test.ts
git commit -m "feat(mr20): add searchSemantic API function + tests (GET /v3/search/semantic)"
```

---

## Task 2: Update SearchPane Import (1 line)

**Files:**
- Modify: `components/panes/SearchPane.tsx` (line 9)

**Step 1: Change the import**

In `components/panes/SearchPane.tsx`, change line 9:

```typescript
// FROM:
import { searchSemantic } from '@/lib/api/semanticClient';

// TO:
import { searchSemantic } from '@/lib/api/coreClient';
```

No other changes needed. SearchPane maps `result.node_id`, `result.score`, `result.content`, `result.metadata?.title`, `result.metadata?.type` — all present in `SemanticSearchResult`.

**Step 2: Verify TypeScript**

```bash
npm run verify:types
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/panes/SearchPane.tsx
git commit -m "feat(mr20): wire SearchPane to coreClient searchSemantic (drop semanticClient)"
```

---

## Task 3: Delete `semanticClient.ts`

**Files:**
- Delete: `lib/api/semanticClient.ts`

**Step 1: Confirm no remaining consumers**

```bash
grep -r "semanticClient" /c/saimor/mora-ui --include="*.ts" --include="*.tsx" -l
```

Expected: No output (SearchPane was the only consumer; it now uses coreClient).

If any file still imports from `semanticClient`, fix it before proceeding.

**Step 2: Delete the file**

```bash
rm /c/saimor/mora-ui/lib/api/semanticClient.ts
```

**Step 3: Verify TypeScript**

```bash
npm run verify:types
```

Expected: 0 errors.

**Step 4: Run full test suite**

```bash
npx jest --no-coverage --testPathPattern="__tests__/lib/api/coreClient"
```

Expected: 68 PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore(mr20): delete semanticClient.ts (replaced by coreClient searchSemantic)"
```

---

## Task 4: Awareness v3 Audit (Documentation — Expected No Code Change)

**Context:** The design doc said to migrate `awarenessClient.ts` from v1 to v3. Pre-audit confirmed it's **already on v3**. This task is the formal verification step.

**Step 1: Confirm the file**

Read `lib/api/awarenessClient.ts`. Both functions must show:
- `fetchAwarenessState()` → `coreGet('/v3/awareness/state', ...)`
- `fetchAwarenessPulse()` → `coreGet('/v3/awareness/pulse', ...)`

If confirmed: no code change. Skip to Step 2.

If somehow still on v1 (regression): change the 2 URL strings to `/v3/awareness/state` and `/v3/awareness/pulse`. Response shape is identical — `coreGet` unwraps the v3 envelope transparently. Commit as:
```bash
git commit -m "feat(mr20): migrate awarenessClient to v3 (state + pulse)"
```

**Step 2: Check phaseout gate in diagnostics**

In MemorySidebar's DiagnosticsPanel (next task), confirm the v1/v3 count is consistent with awareness paths being v3.

---

## Task 5: MemorySidebar Telemetry QA

**Context:** The telemetry DiagnosticsPanel was implemented in `6e22bbc` (already live). This task audits presentation quality only — no re-implementation.

**Files:**
- Inspect: `components/os/MemorySidebar.tsx`
- Modify only if QA reveals presentation issues

**Step 1: Read the DiagnosticsPanel section**

Search for `getApiVersionPerformance` or `DiagnosticsPanel` in `components/os/MemorySidebar.tsx`.

**Step 2: Verify these 4 things render correctly**

1. **v3 / v1 counts** — shown as numbers or percentages, not "undefined" or "NaN"
2. **Phaseout gate** — shows "PASS" (green) or "FAIL" (red/amber) — never blank
3. **Top legacy routes** — if list is empty (no v1 calls), shows a zero-state message, not an empty div
4. **Critical legacy routes count** — if 0, ideally shows "Phaseout gate: clean" rather than "0 routes"

**Step 3: Fix any presentation issues found**

Only fix actual visual defects. Do not re-implement or restructure.

**Step 4: Commit only if changes were made**

```bash
git add components/os/MemorySidebar.tsx
git commit -m "fix(mr20): MemorySidebar telemetry — presentation polish"
```

If nothing needed fixing, skip the commit.

---

## Task 6: Intelligence QA Pass

**Context:** Core `6b09e84` added deterministic, data-grounded replies for management questions. This task validates the full pipeline end-to-end from the frontend perspective.

**Files:**
- Inspect: `components/mora/MoraContextChip.tsx`, `lib/mora/useMoraContext.ts`, `lib/hooks/useMoraStream.ts`
- Modify only what QA reveals as broken

**Step 1: Run the dev server**

```bash
npm run dev
# Navigate to localhost:3000
```

**Step 2: QA checklist — work through each item**

**2a. "was weißt du gerade?" reply quality**
- Open Mora chat, type "was weißt du gerade?"
- Expected: reply is operational and scoped (references actual company data, specific counts)
- Failure: reply feels generic or says "I don't have access to..."
- If frontend issue: check MoraContextChip `memoryFactCount` value, check `answer_source` in stream frame

**2b. "was kannst du mir vorschlagen?" coherence**
- Type "was kannst du mir vorschlagen?"
- Expected: suggestion references actual context visible in MoraContextChip scope label
- Failure: boilerplate response unrelated to visible context

**2c. MoraContextChip fields after a chat turn**
- After sending a message, inspect the chip
- `lastAnswerSource` must be non-null (`memory` / `direct` / `synthesis`)
- `lastAnswerSourceMode` must be non-null (`retrieval` / `synthesis` / `hybrid`)
- Mode sub-label must appear in German: `direkt` / `synthese` / `hybrid`
- `lastAnswerScopeLabel` must reflect company scope

**2d. `memoryFactCount` is non-zero**
- In MemorySidebar, check "Gespeicherte Fakten" or equivalent count
- Must be non-zero for a company with actual memory entries
- If still 0: trace `useMemoryOverview` → `getMemoryOverview` → `/v3/memory/overview` response

**2e. Startup connection flash**
- Hard-reload the page (`Ctrl+Shift+R`)
- Watch connection indicator in header/sidebar
- On `ce4311c`, health probes use `/v3/health` and `/v3/auth/session`
- If flash persists: check timing of `useHealthCheck` vs auth session bootstrap. Root-cause only — do not patch with arbitrary delays.

**2f. Empty/placeholder states**
- Check for hardcoded "0", "coming soon", or "—" contradicting live data
- Check MemorySidebar DiagnosticsPanel zero states
- Check MoraContextChip when no answer has been given (chip hidden or shows neutral state)

**Step 3: Fix any confirmed frontend issues**

Fix only confirmed issues. Do not add features. If a failure is clearly a backend issue (non-200 from a live endpoint), document it but don't patch around it with mock data.

**Step 4: Commit only if changes were made**

```bash
git add <changed files>
git commit -m "fix(mr20): intelligence QA pass — <brief description of what was fixed>"
```

If nothing needed fixing, no commit.

---

## Commit Structure (Expected)

| # | Commit | Files |
|---|---|---|
| 1 | `feat(mr20): add searchSemantic API function + tests (GET /v3/search/semantic)` | `coreClient.ts`, `coreClient.test.ts` |
| 2 | `feat(mr20): wire SearchPane to coreClient searchSemantic (drop semanticClient)` | `SearchPane.tsx` |
| 3 | `chore(mr20): delete semanticClient.ts (replaced by coreClient searchSemantic)` | delete `semanticClient.ts` |
| 4 | `fix(mr20): MemorySidebar telemetry — presentation polish` | `MemorySidebar.tsx` (if needed) |
| 5 | `fix(mr20): intelligence QA pass — <description>` | TBD (zero if clean) |

---

## Files NOT Changing

| File | Reason |
|---|---|
| `lib/api/awarenessClient.ts` | Already on v3 — confirmed `/v3/awareness/state` and `/v3/awareness/pulse` |
| `lib/hooks/useSemanticConstellation.ts` | Active consumer in `FinderPane.tsx`. Calls `/v1/relations/preview` — no v3 equivalent yet. Deferred. |
| `components/semantic/SemanticLinesRenderer.tsx` | Depends on `useSemanticConstellation` types — keep |
| Auth, tree, nodes, relations, cognition clients | No v3 backend endpoints — blocked |

---

## Acceptance Criteria

- 68+ unit tests pass (`npx jest --no-coverage --testPathPattern="__tests__/lib/api/coreClient"`)
- 0 TypeScript errors (`npm run verify:types`)
- `searchSemantic` in coreClient routes to GET `/v3/search/semantic`
- `semanticClient.ts` deleted, no orphan imports
- SearchPane continues showing local results instantly + semantic results after debounce
- "was weißt du gerade?" reply feels operational (grounded, scoped, non-generic)
- MoraContextChip mode sub-label appears in German after a chat turn
- `memoryFactCount` is non-zero for a company with memory
- Startup connection flash root-caused (or confirmed resolved in `ce4311c`)
