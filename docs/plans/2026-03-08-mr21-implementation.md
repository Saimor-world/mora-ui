# MR21 Implementation Plan — Operational UX + Full v3 Consumer Cutover

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (1) Make the system feel operationally coherent — one truth source (`useMoraContext()`) for provenance across Chat, Hub, Sidebar; fullscreen chat = real workspace mode. (2) Migrate all 6 unblocked client files + 1 hook from v1 to v3 now that backend `172994f` is live.

**Architecture:** UX anchors first (Commits 1-5), client cutover in blast-radius order (Commits 6-11), Nexus polish last (Commit 12). All client migrations use `coreGet`/`corePost`/`coreDelete` — v3 envelope unwrap is automatic. TDD on every client migration.

**Tech Stack:** Next.js 15, TypeScript, React, Tailwind v3, Jest (jsdom), `coreGet`/`corePost`/`normalizeList` from `lib/api/coreClient.ts`

**Baseline:** 61 tests pass. Target: 72+ after all client TDD tasks.

---

## Pre-Flight Facts (Verified Against Source)

| Item | Reality |
|---|---|
| MoraContextChip variants | `'bar' \| 'sidebar' \| 'hub'` — adding `'compact'` as 4th |
| ChatPane default size (all callers) | `width: 1080, height: 820` — changing to `860 × 680` |
| ChatPane fullscreen z-index | `z-[500]` — bumping to `z-[9000]` |
| ChatPane fullscreen event | Sets body class only; **never dispatches** `mora-pane-fullscreen-change` |
| `intelClient.ts` style | Raw `fetch` + devToken — full rewrite to `corePost` |
| `MoraUpdatesFeed` zero-state text | `"No updates yet"` (English, no icon) — needs German + icon |
| coreClient node calls (v1) | `fetchNodeRelations` (line 502), `getSemanticallySimilarNodes` (line 912) |

---

## Commit 1 — `feat: add compact variant to MoraContextChip`

**File:** `components/mora/MoraContextChip.tsx`

**Step 1: Update the variant union**

Change line 13:
```tsx
// FROM:
variant?: 'bar' | 'sidebar' | 'hub';
// TO:
variant?: 'bar' | 'sidebar' | 'hub' | 'compact';
```

**Step 2: Update maxChars**

Change line 84:
```tsx
// FROM:
const maxChars = variant === 'hub' ? 36 : variant === 'sidebar' ? 28 : 22;
// TO:
const maxChars = variant === 'hub' ? 36 : variant === 'sidebar' ? 28 : variant === 'compact' ? 16 : 22;
```

**Step 3: Suppress memory badge in compact**

Change lines 124-135 (the `{hasMemory && (...)}` block):
```tsx
// FROM:
{hasMemory && (
// TO:
{hasMemory && variant !== 'compact' && (
```

**Step 4: Icon-only source pill in compact**

The source pill block (lines 138-155) renders `cfg.label` text and mode text. For compact: suppress `cfg.label`, keep mode abbreviation only. Change the source pill's inner span:

```tsx
// Replace the inner pill content (keep the outer div and className):
<ArrowRight size={9} className="shrink-0" />
{variant !== 'compact' && (
    <span className="text-[10px]">{cfg.label}</span>
)}
{lastAnswerSourceMode && MODE_LABELS[lastAnswerSourceMode] && (
    <span className="text-[9px] opacity-60 italic">
        {variant === 'compact' ? MODE_LABELS[lastAnswerSourceMode] : `· ${MODE_LABELS[lastAnswerSourceMode]}`}
    </span>
)}
```

**Step 5: Verify TypeScript**
```bash
cd /c/saimor/mora-ui && npm run verify:types
```
Expected: 0 errors.

**Step 6: Commit**
```bash
cd /c/saimor/mora-ui
git add components/mora/MoraContextChip.tsx
git commit -m "feat: add compact variant to MoraContextChip"
```

---

## Commit 2 — `feat: use MoraContextChip in ChatPane header (delete scope renderer)`

**File:** `components/panes/ChatPane.tsx`

**Step 1: Add imports at top of file**

Find the import block. Add alongside existing imports:
```tsx
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from '@/components/mora/MoraContextChip';
```

**Step 2: Add useMoraContext call**

Find where `const { lastChatScope } = useMoraStore();` is (around line 393). Add after the state declarations (before `lastChatScope` destructuring):
```tsx
const moraCtx = useMoraContext();
```

**Step 3: Remove bespoke scope state**

Remove these items (they're now handled by MoraContextChip via useMoraContext):
- `const { lastChatScope } = useMoraStore();` — entire line
- `const scopeBoundaryLevel = lastChatScope?.scope_contract?.boundary_level;`
- `const droppedScopeFields = lastChatScope?.scope_contract?.dropped_fields ?? [];`
- The `chatScopeLabel` useMemo block (~lines 396-402)
- The `chatScopePath` useMemo block (~lines 403-417)

> **Caution:** `lastChatScope` may be used elsewhere in ChatPane (e.g., for context sent to the backend). Only remove the scope *display* derivations, not any reference passed to API calls.

Run grep to check: `grep -n "lastChatScope\|chatScopePath\|chatScopeLabel\|scopeBoundaryLevel\|droppedScopeFields" components/panes/ChatPane.tsx`

Remove only the lines used exclusively for the header display.

**Step 4: Replace header scope display**

In the ChatPane header (around lines 698-722), find this block:
```tsx
<p className={`text-[10px] ${isStandardMode ? 'text-gray-500' : 'text-white/50'}`}>
    Scope: {chatScopePath}
</p>
```
And:
```tsx
<div className={`ml-auto flex items-center gap-2 text-xs ...`}>
    <Wand2 size={12} />
    <span>{chatScopeLabel}</span>
    {scopeBoundaryLevel && (
        <span className="text-[10px] text-white/35">• {scopeBoundaryLevel}</span>
    )}
    {/* Fullscreen toggle */}
    <button ...>...</button>
</div>
```

Replace with:
```tsx
<div className="ml-auto flex items-center gap-2">
    <MoraContextChip variant="compact" snapshot={moraCtx} />
    {/* Fullscreen toggle */}
    <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="ml-2 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
        title={isFullscreen ? 'Normalmodus (Esc)' : 'Vollbild'}
    >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
    </button>
</div>
```

Also remove the `<p>Scope: {chatScopePath}</p>` line from the orb text block.

**Step 5: Delete scopeEnforced warning strip**

Remove the entire block (~lines 724-738):
```tsx
{scopeEnforced && (
    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/8 border-b border-amber-500/15 ...">
        ...
    </div>
)}
```

Also remove `const scopeEnforced = ...` if it was derived from `lastChatScope`.

**Step 6: Remove unused imports**

Remove `Wand2` from the lucide-react import if nothing else uses it.

**Step 7: Verify TypeScript**
```bash
npm run verify:types
```
Expected: 0 errors.

**Step 8: Commit**
```bash
git add components/panes/ChatPane.tsx
git commit -m "feat: use MoraContextChip in ChatPane header (delete scope renderer)"
```

---

## Commit 3 — `fix: chat fullscreen connects to mora-pane-fullscreen-change event bus`

**File:** `components/panes/ChatPane.tsx`

**Step 1: Find the fullscreen useEffect**

Locate the useEffect at ~line 470:
```tsx
// Fullscreen: toggle dock visibility via body class
useEffect(() => {
    if (isFullscreen) {
        document.body.classList.add('chat-fullscreen');
    } else {
        document.body.classList.remove('chat-fullscreen');
    }
    return () => { document.body.classList.remove('chat-fullscreen'); };
}, [isFullscreen]);
```

**Step 2: Replace with event-dispatching version**
```tsx
// Fullscreen: sync body class + fire event bus for MoraShell
useEffect(() => {
    document.body.classList.toggle('chat-fullscreen', isFullscreen);
    window.dispatchEvent(new CustomEvent('mora-pane-fullscreen-change', {
        detail: { paneId: id, isFullscreen }
    }));
    return () => {
        document.body.classList.remove('chat-fullscreen');
        window.dispatchEvent(new CustomEvent('mora-pane-fullscreen-change', {
            detail: { paneId: id, isFullscreen: false }
        }));
    };
}, [isFullscreen, id]);
```

Note: `id` comes from `pane.id` — confirm that `const id = pane.id` or equivalent is available in scope. If not, add `const id = pane?.id;` near the top of the component.

**Step 3: Bump fullscreen z-index**

Find the fullscreen wrapper (~line 898-910):
```tsx
className="fixed inset-0 z-[500] flex flex-col bg-black/95 backdrop-blur-xl"
```

Change `z-[500]` → `z-[9000]`:
```tsx
className="fixed inset-0 z-[9000] flex flex-col bg-black/95 backdrop-blur-xl"
```

**Step 4: Verify TypeScript**
```bash
npm run verify:types
```

**Step 5: Commit**
```bash
git add components/panes/ChatPane.tsx
git commit -m "fix: chat fullscreen connects to mora-pane-fullscreen-change event bus"
```

---

## Commit 4 — `fix: suppress MemorySidebar in fullscreen mode`

**File:** `components/os/shell/MoraShell.tsx`

**Step 1: Find MemorySidebar mount**

Run: `grep -n "MemorySidebar" components/os/shell/MoraShell.tsx`

It will be near line 560, adjacent to the Dock:
```tsx
{!hasFullscreenPane && <Dock />}
<MemorySidebar />    {/* ← this line */}
```

**Step 2: Mirror the Dock pattern**

Change:
```tsx
<MemorySidebar />
```
to:
```tsx
{!hasFullscreenPane && <MemorySidebar />}
```

**Step 3: Verify TypeScript**
```bash
npm run verify:types
```

**Step 4: Commit**
```bash
git add components/os/shell/MoraShell.tsx
git commit -m "fix: suppress MemorySidebar in fullscreen mode"
```

---

## Commit 5 — `fix: chat default pane size sane on 1440 screens`

**Files:** 5 call sites that open the chat pane.

Run first to find all call sites:
```bash
grep -rn "type: 'chat'" /c/saimor/mora-ui/components --include="*.tsx" -l
```

Expected files (confirmed by source read):
- `components/os/shell/MoraShell.tsx` (line ~368): `size: { width: 1080, height: 820 }`
- `components/mora/Dock.tsx` (line ~201): `size: { width: 1080, height: 820 }`
- `components/mora/MoraPlayground.tsx` (line ~204): `size: { width: 1080, height: 820 }`
- `components/mora/PhysicsDock.tsx` (line ~39): `size: { width: 1080, height: 820 }`
- `components/panes/MemberFocusPane.tsx` (line ~38): `size: { width: 1080, height: 820 }`

**Step 1: Update all chat pane sizes**

In each file, change every chat `openPane` call:
```tsx
// FROM:
size: { width: 1080, height: 820 }
// TO:
size: { width: 860, height: 680 }
```

There should be exactly one chat `openPane` per file (5 total). Verify with grep after.

**Step 2: Verify TypeScript**
```bash
npm run verify:types
```
Expected: 0 errors.

**Step 3: Run tests**
```bash
cd /c/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```
Expected: 61 PASS.

**Step 4: Commit**
```bash
git add components/os/shell/MoraShell.tsx components/mora/Dock.tsx components/mora/MoraPlayground.tsx components/mora/PhysicsDock.tsx components/panes/MemberFocusPane.tsx
git commit -m "fix: chat default pane size sane on 1440 screens (1080→860, 820→680)"
```

---

## Commit 6 — `feat(mr21): migrate useSemanticConstellation to v3 (GET /v3/relations/preview)`

**Files:**
- Modify: `lib/hooks/useSemanticConstellation.ts` (line 44)
- Create: `__tests__/lib/hooks/useSemanticConstellation.test.ts`

**Step 1: Write the failing test**

Create `__tests__/lib/hooks/useSemanticConstellation.test.ts`:
```typescript
/**
 * useSemanticConstellation — v3 migration tests
 */
import { renderHook, act } from '@testing-library/react';
import { useSemanticConstellation } from '@/lib/hooks/useSemanticConstellation';

// Mock coreClient dynamic import
jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
}));

describe('useSemanticConstellation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('fetches from /v3/relations/preview not /v1/', async () => {
        const { coreGet } = await import('@/lib/api/coreClient');
        (coreGet as jest.Mock).mockResolvedValue([
            { source: 'node-a', target: 'node-b', weight: 0.8 }
        ]);

        const { result } = renderHook(() => useSemanticConstellation());
        const nodeMap = new Map([
            ['node-a', { x: 10, y: 20 }],
            ['node-b', { x: 50, y: 60 }],
        ]);

        await act(async () => {
            await result.current.fetchConstellation('node-a', nodeMap);
        });

        expect(coreGet).toHaveBeenCalledWith(
            expect.stringContaining('/v3/relations/preview'),
            expect.anything()
        );
        expect(coreGet).not.toHaveBeenCalledWith(
            expect.stringContaining('/v1/'),
            expect.anything()
        );
    });

    it('returns empty connections when response is not an array', async () => {
        const { coreGet } = await import('@/lib/api/coreClient');
        (coreGet as jest.Mock).mockResolvedValue(null);

        const { result } = renderHook(() => useSemanticConstellation());

        await act(async () => {
            await result.current.fetchConstellation('node-a', new Map());
        });

        expect(result.current.connections).toEqual([]);
    });
});
```

**Step 2: Run test to verify it fails**
```bash
cd /c/saimor/mora-ui && npx jest --no-coverage --testPathPattern="useSemanticConstellation"
```
Expected: FAIL — `coreGet` called with `/v1/` not `/v3/`.

**Step 3: Implement the migration**

In `lib/hooks/useSemanticConstellation.ts`, change line 44:
```typescript
// FROM:
const relations = await coreGet('/v1/relations/preview?limit=50', { isOptional: true }) as any[];
// TO:
const relations = await coreGet('/v3/relations/preview?limit=50', { isOptional: true }) as any[];
```

**Step 4: Run test to verify it passes**
```bash
npx jest --no-coverage --testPathPattern="useSemanticConstellation"
```
Expected: 2 PASS.

**Step 5: Full suite**
```bash
npx jest --no-coverage --testPathPattern="__tests__"
```
Expected: 63 PASS.

**Step 6: Commit**
```bash
git add lib/hooks/useSemanticConstellation.ts __tests__/lib/hooks/useSemanticConstellation.test.ts
git commit -m "feat(mr21): migrate useSemanticConstellation to v3 (GET /v3/relations/preview)"
```

---

## Commit 7 — `feat(mr21): migrate relationsClient to v3`

**Files:**
- Modify: `lib/api/relationsClient.ts`
- Create: `__tests__/lib/api/relationsClient.test.ts`

**Step 1: Write failing tests**

Create `__tests__/lib/api/relationsClient.test.ts`:
```typescript
/**
 * relationsClient — v3 migration tests
 */
import {
    fetchRelationsForSpace,
    fetchRelationsForNode,
    createRelation,
    deleteRelation,
} from '@/lib/api/relationsClient';

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
    coreDelete: jest.fn(),
}));

import { coreGet, corePost, coreDelete } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('relationsClient v3', () => {
    it('fetchRelationsForSpace routes to GET /v3/relations/space/{id}', async () => {
        (coreGet as jest.Mock).mockResolvedValue([]);
        await fetchRelationsForSpace('sp-1');
        expect(coreGet).toHaveBeenCalledWith(
            expect.stringContaining('/v3/relations/space/sp-1'),
            expect.anything()
        );
    });

    it('fetchRelationsForNode routes to GET /v3/relations/node/{id}', async () => {
        (coreGet as jest.Mock).mockResolvedValue([]);
        await fetchRelationsForNode('nd-2');
        expect(coreGet).toHaveBeenCalledWith(
            expect.stringContaining('/v3/relations/node/nd-2'),
            expect.anything()
        );
    });

    it('createRelation routes to POST /v3/relations', async () => {
        (corePost as jest.Mock).mockResolvedValue({ id: 'rel-1' });
        await createRelation({ source_id: 'a', target_id: 'b', weight: 0.7 });
        expect(corePost).toHaveBeenCalledWith(
            expect.stringContaining('/v3/relations'),
            expect.anything()
        );
    });

    it('deleteRelation routes to DELETE /v3/relations/{id}', async () => {
        (coreDelete as jest.Mock).mockResolvedValue(null);
        await deleteRelation('rel-99');
        expect(coreDelete).toHaveBeenCalledWith(
            expect.stringContaining('/v3/relations/rel-99')
        );
    });
});
```

Note: The existing `relationsClient.ts` exports functions named per the table in the design doc. Verify by reading the file — function names may differ (`getRelationsForSpace` vs `fetchRelationsForSpace`). Adjust test imports to match actual exports.

**Step 2: Run test to verify it fails**
```bash
npx jest --no-coverage --testPathPattern="relationsClient"
```
Expected: FAIL — 4 tests fail (URLs contain `/v1/`).

**Step 3: Migrate relationsClient.ts**

Read current function bodies. Change every URL:
```typescript
// 4 URL changes — one per function:
/v1/relations/space/${spaceId}  → /v3/relations/space/${spaceId}
/v1/relations/node/${nodeId}    → /v3/relations/node/${nodeId}
/v1/relations                   → /v3/relations       (POST create)
/v1/relations/${relationId}     → /v3/relations/${relationId}  (DELETE)
```

If `coreDelete` doesn't exist in the file yet, it may be named differently (check coreClient exports). Add `coreDelete` import if needed.

**Step 4: Run test to verify it passes**
```bash
npx jest --no-coverage --testPathPattern="relationsClient"
```
Expected: 4 PASS.

**Step 5: Full suite**
```bash
npx jest --no-coverage --testPathPattern="__tests__"
```
Expected: 67 PASS (63 + 4).

**Step 6: Verify TypeScript**
```bash
npm run verify:types
```

**Step 7: Commit**
```bash
git add lib/api/relationsClient.ts __tests__/lib/api/relationsClient.test.ts
git commit -m "feat(mr21): migrate relationsClient to v3"
```

---

## Commit 8 — `feat(mr21): migrate coreClient node relation calls to v3`

**File:** `lib/api/coreClient.ts`

Only 2 URL changes. These functions are already tested via coreClient.test.ts — add tests there.

**Step 1: Write failing tests in coreClient.test.ts**

Add to `__tests__/lib/api/coreClient.test.ts` after the last `describe` block:
```typescript
describe('fetchNodeRelations', () => {
    it('routes to GET /v3/nodes/{id}/relations', async () => {
        mockFetchV3({ relations: [{ id: 'r1' }] });
        await fetchNodeRelations('nd-abc');
        expect(lastFetchUrl()).toContain('/v3/nodes/nd-abc/relations');
        expect(lastFetchUrl()).not.toContain('/v1/');
    });
});

describe('getSemanticallySimilarNodes', () => {
    it('routes to GET /v3/nodes/{id}/similar', async () => {
        mockFetchV3({ results: [{ id: 'nd-x', title: 'Related' }] });
        await getSemanticallySimilarNodes('nd-abc');
        expect(lastFetchUrl()).toContain('/v3/nodes/nd-abc/similar');
        expect(lastFetchUrl()).not.toContain('/v1/');
    });
});
```

Add `fetchNodeRelations` and `getSemanticallySimilarNodes` to the import line at the top of the test file.

**Step 2: Run tests to verify they fail**
```bash
npx jest --no-coverage --testPathPattern="coreClient.test"
```
Expected: 2 new FAIL.

**Step 3: Migrate the two functions in coreClient.ts**

Line ~502: `coreGet('/v1/nodes/${nodeId}/relations', ...)` → `/v3/nodes/${nodeId}/relations`
Line ~912: `coreGet('/v1/nodes/${nodeId}/similar?...', ...)` → `/v3/nodes/${nodeId}/similar?...`

**Step 4: Run tests to verify they pass**
```bash
npx jest --no-coverage --testPathPattern="coreClient.test"
```
Expected: All pass.

**Step 5: Full suite**
```bash
npx jest --no-coverage --testPathPattern="__tests__"
```
Expected: 69 PASS.

**Step 6: Commit**
```bash
git add lib/api/coreClient.ts __tests__/lib/api/coreClient.test.ts
git commit -m "feat(mr21): migrate coreClient node relation calls to v3"
```

---

## Commit 9 — `feat(mr21): migrate scanClient + intelClient to v3`

**Files:**
- Modify: `lib/api/scanClient.ts`
- Modify: `lib/api/intelClient.ts` (full rewrite to corePost pattern)
- Create: `__tests__/lib/api/scanClient.test.ts`
- Create: `__tests__/lib/api/intelClient.test.ts`

### scanClient.ts

**Step 1: Write failing scan test**

Create `__tests__/lib/api/scanClient.test.ts`:
```typescript
import { triggerFolderScan } from '@/lib/api/scanClient';

jest.mock('@/lib/api/coreClient', () => ({
    corePost: jest.fn(),
}));
import { corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('triggerFolderScan', () => {
    it('routes to POST /v3/scan/analyze/{folderId}', async () => {
        (corePost as jest.Mock).mockResolvedValue({
            report_id: 'r1', report_node_id: 'nd-1', summary: 'ok',
            stats: { nodes_analyzed: 3, relations_found: 2, insights_generated: 1 },
            folder_id: 'folder-abc'
        });
        const result = await triggerFolderScan('folder-abc');
        expect(corePost).toHaveBeenCalledWith(
            expect.stringContaining('/v3/scan/analyze/folder-abc'),
            expect.anything()
        );
        expect(result.report_id).toBe('r1');
        expect(result.report_node_id).toBe('nd-1');
    });
});
```

**Step 2: Run scan test — verify FAIL**
```bash
npx jest --no-coverage --testPathPattern="scanClient"
```

**Step 3: Migrate scanClient.ts**

Current file:
```typescript
// FROM:
export const triggerFolderScan = async (folderId: string): Promise<ScanResult> => {
    return corePost(`/v1/scan/analyze/${folderId}`, {}) as Promise<ScanResult>;
};
```

Replace the interface and function:
```typescript
import { corePost } from './coreClient';

export interface ScanResult {
    report_id: string;
    report_node_id: string;
    summary: string;
    stats: {
        nodes_analyzed: number;
        relations_found: number;
        insights_generated: number;
    };
    folder_id: string;
}

export const triggerFolderScan = async (folderId: string): Promise<ScanResult> => {
    return corePost(`/v3/scan/analyze/${folderId}`, {}) as Promise<ScanResult>;
};
```

**Step 4: Run scan test — verify PASS**
```bash
npx jest --no-coverage --testPathPattern="scanClient"
```

### intelClient.ts

Current implementation uses raw `fetch` + devToken. Full rewrite to `corePost` pattern.

**Step 5: Write failing intel test**

Create `__tests__/lib/api/intelClient.test.ts`:
```typescript
import { triggerMoraScan } from '@/lib/api/intelClient';

jest.mock('@/lib/api/coreClient', () => ({
    corePost: jest.fn(),
}));
import { corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('triggerMoraScan', () => {
    it('routes to POST /v3/intel/scan via corePost (not raw fetch)', async () => {
        (corePost as jest.Mock).mockResolvedValue({
            report_id: 'r2', report_node_id: 'nd-2', summary: 'Intel summary',
            stats: { nodes_analyzed: 5, relations_found: 3, insights_generated: 2 },
            folder_id: 'f-abc'
        });
        const result = await triggerMoraScan('f-abc');
        expect(corePost).toHaveBeenCalledWith(
            '/v3/intel/scan',
            { folder_id: 'f-abc' }
        );
        expect(result.report_id).toBe('r2');
    });

    it('throws on error (no silent swallow)', async () => {
        (corePost as jest.Mock).mockRejectedValue(new Error('Intel scan failed'));
        await expect(triggerMoraScan('bad-folder')).rejects.toThrow('Intel scan failed');
    });
});
```

**Step 6: Run intel test — verify FAIL**
```bash
npx jest --no-coverage --testPathPattern="intelClient"
```
Expected: FAIL — currently uses raw fetch, corePost not called.

**Step 7: Rewrite intelClient.ts**

Replace the entire file:
```typescript
/**
 * Intel Client - Mora Intelligence Scan API
 * Migrated to v3 in MR21 — uses corePost pattern (no devToken).
 */
import { corePost } from '@/lib/api/coreClient';

export interface IntelScanRequest {
    folder_id: string;
}

export interface IntelScanResponse {
    report_id: string;
    report_node_id: string;
    summary: string;
    stats: {
        nodes_analyzed: number;
        relations_found: number;
        insights_generated: number;
    };
    folder_id: string;
}

/**
 * Trigger Mora Intelligence Scan for a folder
 * POST /v3/intel/scan
 */
export async function triggerMoraScan(folderId: string): Promise<IntelScanResponse> {
    return corePost('/v3/intel/scan', { folder_id: folderId }) as Promise<IntelScanResponse>;
}
```

**Step 8: Run intel test — verify PASS**
```bash
npx jest --no-coverage --testPathPattern="intelClient"
```

**Step 9: Full suite**
```bash
npx jest --no-coverage --testPathPattern="__tests__"
```
Expected: 73 PASS (69 + 1 scan + 2 intel + other carrying forward).

**Step 10: Verify TypeScript**
```bash
npm run verify:types
```
Expected: 0 errors. If `IntelScanResponse` consumers used old shape fields (e.g. `node_id`, `title`, `type`, `content`), TypeScript will flag them — fix those call sites.

**Step 11: Commit**
```bash
git add lib/api/scanClient.ts lib/api/intelClient.ts \
    __tests__/lib/api/scanClient.test.ts __tests__/lib/api/intelClient.test.ts
git commit -m "feat(mr21): migrate scanClient + intelClient to v3 (corePost, no devToken)"
```

---

## Commit 10 — `feat(mr21): migrate cognitionClient to v3`

**Files:**
- Modify: `lib/api/cognitionClient.ts`
- Create: `__tests__/lib/api/cognitionClient.test.ts`

**Step 1: Write failing tests**

Create `__tests__/lib/api/cognitionClient.test.ts`:
```typescript
import {
    getProactiveSuggestions,
    triggerWorkspaceAnalysis,
    enrichContent,
    synthesizeContext,
    getCognitionStatus,
    executeAgenticLoop,
} from '@/lib/api/cognitionClient';

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
}));
import { coreGet, corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('cognitionClient v3', () => {
    it('getProactiveSuggestions calls GET /v3/autonomous/suggestions', async () => {
        (coreGet as jest.Mock).mockResolvedValue({ suggestions: [] });
        await getProactiveSuggestions();
        expect(coreGet).toHaveBeenCalledWith('/v3/autonomous/suggestions', expect.anything());
    });

    it('triggerWorkspaceAnalysis calls POST /v3/autonomous/analyze', async () => {
        (corePost as jest.Mock).mockResolvedValue({ success: true });
        await triggerWorkspaceAnalysis();
        expect(corePost).toHaveBeenCalledWith('/v3/autonomous/analyze', expect.anything());
    });

    it('enrichContent calls POST /v3/autonomous/enrich', async () => {
        (corePost as jest.Mock).mockResolvedValue({ success: true });
        await enrichContent('nd-1', 'Title', 'Content');
        expect(corePost).toHaveBeenCalledWith('/v3/autonomous/enrich', expect.anything());
    });

    it('synthesizeContext calls POST /v3/autonomous/synthesize', async () => {
        (corePost as jest.Mock).mockResolvedValue({ success: true });
        await synthesizeContext('nd-1');
        expect(corePost).toHaveBeenCalledWith('/v3/autonomous/synthesize', expect.anything());
    });

    it('getCognitionStatus calls GET /v3/autonomous/status', async () => {
        (coreGet as jest.Mock).mockResolvedValue({ active: true, queue_length: 0, is_running: false, capabilities: [], timestamp: '' });
        await getCognitionStatus();
        expect(coreGet).toHaveBeenCalledWith('/v3/autonomous/status', expect.anything());
    });

    it('executeAgenticLoop calls POST /v3/cognition/agent', async () => {
        (corePost as jest.Mock).mockResolvedValue({ success: true, final_state: 'done', final_message: '', iterations: [], tools_executed: [], pending_confirmations: [], mode: 'auto', transparency_note: '' });
        await executeAgenticLoop('do something');
        expect(corePost).toHaveBeenCalledWith('/v3/cognition/agent', expect.anything());
    });
});
```

**Step 2: Run tests — verify all 6 FAIL**
```bash
npx jest --no-coverage --testPathPattern="cognitionClient"
```

**Step 3: Migrate cognitionClient.ts — 6 URL changes**

```typescript
// getProactiveSuggestions:
'/v1/autonomous/suggestions' → '/v3/autonomous/suggestions'

// triggerWorkspaceAnalysis:
'/v1/autonomous/analyze' → '/v3/autonomous/analyze'

// enrichContent:
'/v1/autonomous/enrich' → '/v3/autonomous/enrich'

// synthesizeContext:
'/v1/autonomous/synthesize' → '/v3/autonomous/synthesize'

// getCognitionStatus:
'/v1/autonomous/status' → '/v3/autonomous/status'

// executeAgenticLoop:
'/v1/cognition/agent' → '/v3/cognition/agent'
```

No interface changes needed — response shapes are identical per backend `172994f`.

**Step 4: Run tests — verify all 6 PASS**
```bash
npx jest --no-coverage --testPathPattern="cognitionClient"
```

**Step 5: Full suite**
```bash
npx jest --no-coverage --testPathPattern="__tests__"
```
Expected: 79+ PASS.

**Step 6: Commit**
```bash
git add lib/api/cognitionClient.ts __tests__/lib/api/cognitionClient.test.ts
git commit -m "feat(mr21): migrate cognitionClient to v3"
```

---

## Commit 11 — `feat(mr21): migrate moraAgentClient tools to v3 (list + execute)`

**Files:**
- Modify: `lib/api/moraAgentClient.ts`
- Create: `__tests__/lib/api/moraAgentClient.test.ts`

**Step 1: Write failing tests**

Create `__tests__/lib/api/moraAgentClient.test.ts`:
```typescript
import { moraAgentClient } from '@/lib/api/moraAgentClient';

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
}));
import { coreGet, corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('moraAgentClient v3', () => {
    it('listTools calls GET /v3/mora/tools', async () => {
        (coreGet as jest.Mock).mockResolvedValue([]);
        await moraAgentClient.listTools();
        expect(coreGet).toHaveBeenCalledWith('/v3/mora/tools');
    });

    it('executeTools calls POST /v3/mora/tools/execute', async () => {
        (corePost as jest.Mock).mockResolvedValue({ result: 'ok' });
        const payload = { tool: 'summarize', params: { node_id: 'nd-1' } };
        await moraAgentClient.executeTools(payload);
        expect(corePost).toHaveBeenCalledWith('/v3/mora/tools/execute', payload);
    });

    it('getTaskStatus exists but is deprecated (no active consumer)', async () => {
        // Should still work, just deprecated
        (coreGet as jest.Mock).mockResolvedValue({ status: 'done' });
        await moraAgentClient.getTaskStatus('task-123');
        expect(coreGet).toHaveBeenCalledWith(expect.stringContaining('task-123'));
    });
});
```

**Step 2: Run tests — verify FAIL**
```bash
npx jest --no-coverage --testPathPattern="moraAgentClient"
```
Expected: FAIL on `listTools` (v1) and `executeTools` (doesn't exist).

**Step 3: Migrate moraAgentClient.ts**

Find the `m` object (~lines 97-134). Make these changes:

```typescript
// m.getTaskStatus: add deprecation comment, keep function
/** @deprecated — no active consumer. Do not remove until confirmed dead across all panes. */
getTaskStatus: async (taskId: string) => {
    return coreGet(`/v1/mora/tools/task/${taskId}`);
},

// m.listTools: URL bump
listTools: async () => {
    return coreGet('/v3/mora/tools');  // was /v1/mora/tools
},

// m.executeTools: add new function
executeTools: async (payload: Record<string, unknown>) => {
    return corePost('/v3/mora/tools/execute', payload);
},
```

**Step 4: Run tests — verify all 3 PASS**
```bash
npx jest --no-coverage --testPathPattern="moraAgentClient"
```

**Step 5: Full suite**
```bash
npx jest --no-coverage --testPathPattern="__tests__"
```
Expected: 82+ PASS.

**Step 6: Verify TypeScript**
```bash
npm run verify:types
```

**Step 7: Commit**
```bash
git add lib/api/moraAgentClient.ts __tests__/lib/api/moraAgentClient.test.ts
git commit -m "feat(mr21): migrate moraAgentClient tools to v3 (list + execute)"
```

---

## Commit 12 — `fix: Nexus zero-states when data is absent`

**Files:**
- Modify: `components/mora/MoraUpdatesFeed.tsx`
- Modify: `components/mora/MoraMemory.tsx`

### MoraUpdatesFeed

**Step 1: Find the zero-state div**

In `MoraUpdatesFeed.tsx` (~line 386-390):
```tsx
{prioritizedEvents.length === 0 && !loading && (
    <div className="text-center text-xs text-gray-500 py-8">
        No updates yet
    </div>
)}
```

**Step 2: Replace with German text + icon**

```tsx
{prioritizedEvents.length === 0 && !loading && (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <Activity className="w-5 h-5 text-white/15" />
        <span className="text-xs text-white/30">Keine aktuellen Aktivitäten</span>
    </div>
)}
```

`Activity` is already imported at the top of this file.

### MoraMemory

**Step 3: Find the compact zero-state in MoraMemory.tsx**

Read `components/mora/MoraMemory.tsx` lines 60-120 to find the compact render path. Look for the empty/zero state when no memory entries exist.

Run: `grep -n "empty\|zero\|keine\|no.*entr\|noch\|nothing" components/mora/MoraMemory.tsx -i`

When found, replace the empty render path with:
```tsx
<div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
    <Brain className="w-5 h-5 text-white/15" />
    <span className="text-xs text-white/30">Noch keine Erkenntnisse gespeichert</span>
</div>
```

`Brain` is already imported at the top of `MoraMemory.tsx`.

**Step 4: Run full test suite**
```bash
cd /c/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```
Expected: 82+ PASS.

**Step 5: Verify TypeScript**
```bash
npm run verify:types
```

**Step 6: Commit**
```bash
git add components/mora/MoraUpdatesFeed.tsx components/mora/MoraMemory.tsx
git commit -m "fix: Nexus zero-states when data is absent"
```

---

## Final Verification

```bash
cd /c/saimor/mora-ui
npx jest --no-coverage --testPathPattern="__tests__"
npm run verify:types
```

Expected:
- 72+ tests PASS (started at 61, added ~21+ from TDD tasks)
- 0 TypeScript errors

---

## Acceptance Criteria

- [ ] `useMoraContext()` is the single data source for provenance in Chat, Hub, Sidebar
- [ ] No bespoke scope renderer remains in ChatPane
- [ ] Maximized chat: dock and MemorySidebar unmount, background panes are behind z-[9000]
- [ ] Normal chat: default size 860×680, no immediate chrome collision
- [ ] ESC exits fullscreen (already wired, regression test)
- [ ] All 6 clients + 1 hook migrated to v3 paths
- [ ] `useSemanticConstellation` uses GET /v3/ not /v1/
- [ ] `getTaskStatus()` marked `@deprecated`, not deleted
- [ ] Zero-states present in Nexus (German text + icon) when data is absent
- [ ] 72+ tests pass, 0 TypeScript errors
- [ ] `intelClient` uses `corePost` — no raw fetch, no devToken

---

## Files NOT Changing

| File | Reason |
|---|---|
| `lib/auth.ts` | NextAuth login — requires auth refactor |
| `lib/api/coreClient.ts` tree calls (`/v1/tree`) | No v3 tree endpoint |
| `lib/api/devToken.ts` | Dev-only, intentional |
| Demo endpoints | Non-critical, intentional |
| `lib/api/awarenessClient.ts` | Already on v3 (confirmed MR20) |
