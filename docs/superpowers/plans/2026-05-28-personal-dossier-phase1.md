# Personal Dossier Phase 1 — Bridge: Security Scan → OS Node

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a visitor arrives from a Security Check on saimor.world, automatically materialise their scan result as a real private Node (document) in the OS — persisted for 20 days — and add a stub "Auf die Wall" button that queues the node for Phase 2.

**Architecture:** Three pure units (content builder, localStorage key manager, creation hook) + minimal HomeSurface changes. The hook fires once per context.id using a localStorage dedup key, so page reloads never create duplicate nodes. No Wall logic is built — the button just `console.log`s the nodeId.

**Tech Stack:** Next.js 15, Zustand (`useNavStore`), `createNode()` from `lib/api/orgClient.ts`, Jest + React Testing Library

---

## Current State (READ THIS FIRST)

### Key files
```
lib/api/orgClient.ts:331         createNode(payload: CreateNodePayload): Promise<CoreNode>
                                   → POST /v3/nodes
                                   → payload: { company_id?, folder_id?, title, type, content, metadata }
lib/websiteEntryContext.ts       WebsiteEntryContext type (companyName, domain, score, tasks, …)
lib/websiteEntryStorage.ts       loadWebsiteEntryContext() → StoredWebsiteEntryContext | null
lib/store/navStore.ts            useNavStore → activeCompanyId
components/home/HomeSurface.tsx  website-entry-home-card at line ~965, openWebsiteDossier callback
```

### What already exists
- `websiteEntryContext` stored in localStorage as `StoredWebsiteEntryContext` (has `id`, `companyName`, `domain`, `score`, `tasks`, `storedAt`)
- `HomeSurface` reads this and shows the amber card with "Dossier öffnen" button
- `createNode({ company_id, title, type, content, metadata })` is already implemented and tested against CORE

### What we are NOT touching
- The website-entry flow itself (`WebsiteEntryPersistence`, `WebsiteEntryTokenLogin`)
- The existing "Dossier öffnen" button (opens `website-dossier` pane — stays as-is)
- Any Wall functionality (Phase 2)
- CORE backend (no changes needed — `POST /v3/nodes` already works)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/dossier/buildDossierContent.ts` | Create | Pure fn: `WebsiteEntryContext → markdown string` |
| `lib/dossier/dossierNodeStorage.ts` | Create | get/set/clear dossier nodeId in localStorage |
| `lib/hooks/useCreateDossierNode.ts` | Create | React hook: create node once, return nodeId |
| `__tests__/lib/dossier/buildDossierContent.test.ts` | Create | Unit tests for markdown builder |
| `__tests__/lib/dossier/dossierNodeStorage.test.ts` | Create | Unit tests for localStorage util |
| `__tests__/lib/hooks/useCreateDossierNode.test.tsx` | Create | Hook integration test |
| `components/home/HomeSurface.tsx` | Modify | Add hook + "Auf die Wall" stub button |
| `__tests__/components/home/HomeSurface.test.tsx` | Modify | Add test for "Auf die Wall" button |

---

## Task 1: `buildDossierContent` — markdown builder

**Files:**
- Create: `lib/dossier/buildDossierContent.ts`
- Test: `__tests__/lib/dossier/buildDossierContent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/dossier/buildDossierContent.test.ts`:

```ts
import { buildDossierContent } from '@/lib/dossier/buildDossierContent';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

const ctx: WebsiteEntryContext = {
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 62,
    level: 'mittel',
    summary: 'Mittleres Risiko.',
    title: 'Nightwatch Security Signal aus WORLD',
    rooms: [],
    documents: [],
    tasks: [
        { title: 'SSL erneuern', priority: 'hoch' },
        { title: 'CSP einrichten', priority: 'mittel' },
    ],
};

it('includes company name and domain', () => {
    const md = buildDossierContent(ctx);
    expect(md).toContain('Acme GmbH');
    expect(md).toContain('acme.de');
});

it('includes score as number', () => {
    const md = buildDossierContent(ctx);
    expect(md).toContain('62');
});

it('includes all task titles', () => {
    const md = buildDossierContent(ctx);
    expect(md).toContain('SSL erneuern');
    expect(md).toContain('CSP einrichten');
});

it('works when score is undefined', () => {
    const { score, ...noScore } = ctx;
    expect(() => buildDossierContent(noScore as WebsiteEntryContext)).not.toThrow();
});
```

- [ ] **Step 2: Run test to confirm FAIL**

```powershell
Set-Location "E:\saimor\INTERFACE"
npx jest --no-coverage "buildDossierContent" 2>&1 | Select-Object -Last 8
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the builder**

Create `lib/dossier/buildDossierContent.ts`:

```ts
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

/**
 * Converts a WebsiteEntryContext into a markdown document
 * suitable for storage as a Node in the OS.
 * Pure function — no side effects.
 */
export function buildDossierContent(ctx: WebsiteEntryContext): string {
    const scoreStr = ctx.score !== undefined ? `${ctx.score}/100` : 'k. A.';
    const level = ctx.level ?? ctx.grade ?? '—';
    const domain = ctx.domain ?? '—';
    const summary = ctx.summary ?? '';

    const taskLines = ctx.tasks
        .map(t => `- [${t.priority === 'hoch' ? '!' : ' '}] **${t.title}** _(${t.priority})_`)
        .join('\n');

    return [
        `# ${ctx.companyName} — Nightwatch Dossier`,
        '',
        `**Domain:** ${domain}  `,
        `**Score:** ${scoreStr}  `,
        `**Risiko-Level:** ${level}  `,
        '',
        summary ? `> ${summary}` : '',
        '',
        '## Sofortmaßnahmen',
        '',
        taskLines || '_Keine Aufgaben definiert._',
        '',
        '---',
        '_Erstellt automatisch aus dem SAIMÔR Security Check. Gültig 20 Tage._',
    ]
        .filter(line => line !== null)
        .join('\n');
}
```

- [ ] **Step 4: Run test to confirm PASS**

```powershell
npx jest --no-coverage "buildDossierContent" 2>&1 | Select-Object -Last 8
```
Expected: `Tests: 4 passed`

- [ ] **Step 5: Commit**

```powershell
git add lib/dossier/buildDossierContent.ts __tests__/lib/dossier/buildDossierContent.test.ts
git commit -m "feat(dossier): buildDossierContent — WebsiteEntryContext → markdown"
```

---

## Task 2: `dossierNodeStorage` — localStorage dedup key

**Files:**
- Create: `lib/dossier/dossierNodeStorage.ts`
- Test: `__tests__/lib/dossier/dossierNodeStorage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/dossier/dossierNodeStorage.test.ts`:

```ts
import {
    getDossierNodeId,
    setDossierNodeId,
    clearDossierNodeId,
    DOSSIER_NODE_KEY_PREFIX,
} from '@/lib/dossier/dossierNodeStorage';

beforeEach(() => localStorage.clear());

it('returns null when nothing is stored', () => {
    expect(getDossierNodeId('ctx-abc')).toBeNull();
});

it('stores and retrieves a node id', () => {
    setDossierNodeId('ctx-abc', 'node-xyz');
    expect(getDossierNodeId('ctx-abc')).toBe('node-xyz');
});

it('uses a key prefixed with the constant', () => {
    setDossierNodeId('ctx-abc', 'node-xyz');
    const raw = localStorage.getItem(`${DOSSIER_NODE_KEY_PREFIX}ctx-abc`);
    expect(raw).toBe('node-xyz');
});

it('clears the stored id', () => {
    setDossierNodeId('ctx-abc', 'node-xyz');
    clearDossierNodeId('ctx-abc');
    expect(getDossierNodeId('ctx-abc')).toBeNull();
});

it('returns null gracefully when window is unavailable', () => {
    // jsdom always has localStorage; just test it doesn't throw with bad key
    expect(() => getDossierNodeId('')).not.toThrow();
});
```

- [ ] **Step 2: Run test to confirm FAIL**

```powershell
npx jest --no-coverage "dossierNodeStorage" 2>&1 | Select-Object -Last 8
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the storage util**

Create `lib/dossier/dossierNodeStorage.ts`:

```ts
/**
 * Persists the OS node id for a given websiteEntryContext.id.
 * Used to avoid creating duplicate nodes on page reload.
 */

export const DOSSIER_NODE_KEY_PREFIX = 'saimor_dossier_node_';

function key(contextId: string) {
    return `${DOSSIER_NODE_KEY_PREFIX}${contextId}`;
}

export function getDossierNodeId(contextId: string): string | null {
    if (typeof window === 'undefined' || !contextId) return null;
    try {
        return window.localStorage.getItem(key(contextId));
    } catch {
        return null;
    }
}

export function setDossierNodeId(contextId: string, nodeId: string): void {
    if (typeof window === 'undefined' || !contextId) return;
    try {
        window.localStorage.setItem(key(contextId), nodeId);
    } catch {
        // Storage unavailable — not fatal; next page load will retry.
    }
}

export function clearDossierNodeId(contextId: string): void {
    if (typeof window === 'undefined' || !contextId) return;
    try {
        window.localStorage.removeItem(key(contextId));
    } catch {
        // Best-effort cleanup.
    }
}
```

- [ ] **Step 4: Run test to confirm PASS**

```powershell
npx jest --no-coverage "dossierNodeStorage" 2>&1 | Select-Object -Last 8
```
Expected: `Tests: 5 passed`

- [ ] **Step 5: Commit**

```powershell
git add lib/dossier/dossierNodeStorage.ts __tests__/lib/dossier/dossierNodeStorage.test.ts
git commit -m "feat(dossier): dossierNodeStorage — localStorage dedup key for dossier nodes"
```

---

## Task 3: `useCreateDossierNode` — creation hook

**Files:**
- Create: `lib/hooks/useCreateDossierNode.ts`
- Test: `__tests__/lib/hooks/useCreateDossierNode.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/hooks/useCreateDossierNode.test.tsx`:

```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useCreateDossierNode } from '@/lib/hooks/useCreateDossierNode';
import { createNode } from '@/lib/api/orgClient';
import { getDossierNodeId, setDossierNodeId } from '@/lib/dossier/dossierNodeStorage';
import { useNavStore } from '@/lib/store/navStore';

jest.mock('@/lib/api/orgClient', () => ({
    createNode: jest.fn(),
}));

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: jest.fn(),
}));

const mockContext = {
    id: 'ctx-001',
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 72,
    title: 'Test',
    rooms: [],
    documents: [],
    tasks: [{ title: 'Fix SSL', priority: 'hoch' as const }],
    storedAt: new Date().toISOString(),
};

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    (useNavStore as jest.Mock).mockReturnValue({ activeCompanyId: 'company-1' });
    (createNode as jest.Mock).mockResolvedValue({ id: 'node-created-123' });
});

it('creates a node when context has an id and company is available', async () => {
    const { result } = renderHook(() => useCreateDossierNode(mockContext));
    await waitFor(() => expect(result.current.nodeId).toBe('node-created-123'));
    expect(createNode).toHaveBeenCalledTimes(1);
    expect(createNode).toHaveBeenCalledWith(
        expect.objectContaining({
            company_id: 'company-1',
            type: 'document',
            title: expect.stringContaining('Acme GmbH'),
        })
    );
});

it('stores the nodeId in localStorage after creation', async () => {
    renderHook(() => useCreateDossierNode(mockContext));
    await waitFor(() => getDossierNodeId('ctx-001') === 'node-created-123');
    expect(getDossierNodeId('ctx-001')).toBe('node-created-123');
});

it('does not call createNode again if nodeId already in localStorage', async () => {
    setDossierNodeId('ctx-001', 'existing-node-456');
    const { result } = renderHook(() => useCreateDossierNode(mockContext));
    await waitFor(() => result.current.nodeId === 'existing-node-456');
    expect(createNode).not.toHaveBeenCalled();
});

it('returns null nodeId when context is null', () => {
    const { result } = renderHook(() => useCreateDossierNode(null));
    expect(result.current.nodeId).toBeNull();
    expect(createNode).not.toHaveBeenCalled();
});

it('sets metadata.expires_at to 20 days from now', async () => {
    renderHook(() => useCreateDossierNode(mockContext));
    await waitFor(() => expect(createNode).toHaveBeenCalled());
    const payload = (createNode as jest.Mock).mock.calls[0][0];
    const expiresAt = new Date(payload.metadata.expires_at);
    const diffDays = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(19);
    expect(diffDays).toBeLessThan(21);
});
```

- [ ] **Step 2: Run test to confirm FAIL**

```powershell
npx jest --no-coverage "useCreateDossierNode" 2>&1 | Select-Object -Last 8
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `lib/hooks/useCreateDossierNode.ts`:

```ts
import { useEffect, useState } from 'react';
import { createNode } from '@/lib/api/orgClient';
import { buildDossierContent } from '@/lib/dossier/buildDossierContent';
import { getDossierNodeId, setDossierNodeId } from '@/lib/dossier/dossierNodeStorage';
import { useNavStore } from '@/lib/store/navStore';
import type { StoredWebsiteEntryContext } from '@/lib/websiteEntryStorage';

interface Result {
    nodeId: string | null;
    isCreating: boolean;
}

/**
 * Creates a private OS Node for the given websiteEntryContext exactly once.
 * On subsequent renders / page loads the stored nodeId is returned from localStorage.
 * Returns { nodeId, isCreating }.
 */
export function useCreateDossierNode(
    context: StoredWebsiteEntryContext | null
): Result {
    const { activeCompanyId } = useNavStore();
    const contextId = context?.id ?? null;

    // Initialise from localStorage so we don't flash null on remount.
    const [nodeId, setNodeId] = useState<string | null>(() =>
        contextId ? getDossierNodeId(contextId) : null
    );
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!context || !contextId || !activeCompanyId) return;

        // Dedup: already created for this context.
        const existing = getDossierNodeId(contextId);
        if (existing) {
            setNodeId(existing);
            return;
        }

        let cancelled = false;
        setIsCreating(true);

        const expiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();

        createNode({
            company_id: activeCompanyId,
            title: `${context.companyName} — Nightwatch Dossier`,
            type: 'document',
            content: buildDossierContent(context),
            metadata: {
                source: 'website-entry',
                context_id: contextId,
                domain: context.domain,
                score: context.score,
                expires_at: expiresAt,
            },
        })
            .then(node => {
                if (cancelled) return;
                setDossierNodeId(contextId, node.id);
                setNodeId(node.id);
            })
            .catch(() => {
                // Silent failure — demo still works without the node.
            })
            .finally(() => {
                if (!cancelled) setIsCreating(false);
            });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextId, activeCompanyId]);

    return { nodeId, isCreating };
}
```

- [ ] **Step 4: Run test to confirm PASS**

```powershell
npx jest --no-coverage "useCreateDossierNode" 2>&1 | Select-Object -Last 10
```
Expected: `Tests: 5 passed`

- [ ] **Step 5: Commit**

```powershell
git add lib/hooks/useCreateDossierNode.ts __tests__/lib/hooks/useCreateDossierNode.test.tsx
git commit -m "feat(dossier): useCreateDossierNode hook — auto-create OS node from website entry context"
```

---

## Task 4: HomeSurface — hook integration + "Auf die Wall" button

**Files:**
- Modify: `components/home/HomeSurface.tsx`
- Modify: `__tests__/components/home/HomeSurface.test.tsx`

The website-entry-home-card lives at line ~965. We add:
1. `useCreateDossierNode(websiteEntryContext)` near the top of the component (alongside other hooks)
2. A second small button "Auf die Wall" below the existing "Dossier öffnen" — stub only.

- [ ] **Step 1: Write the failing test**

Add to `__tests__/components/home/HomeSurface.test.tsx` inside the `HomeSurface — rendering` describe block:

```tsx
it('shows "Auf die Wall" button when website entry context is present', async () => {
    localStorage.setItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY, JSON.stringify({
        surface: 'website',
        entity: 'security-audit',
        id: 'audit-wall-test',
        companyName: 'Wall Corp',
        domain: 'wall.de',
        score: 55,
        title: 'Test',
        rooms: [],
        documents: [],
        tasks: [{ title: 'Fix it', priority: 'hoch' }],
    }));
    renderWithDepts();
    await waitFor(() => {
        expect(screen.getByTestId('dossier-wall-btn')).toBeInTheDocument();
    });
});
```

Also add these mocks at the top of the test file (alongside the existing `jest.mock(...)` calls):

```tsx
jest.mock('@/lib/hooks/useCreateDossierNode', () => ({
    useCreateDossierNode: jest.fn().mockReturnValue({ nodeId: 'mock-node-99', isCreating: false }),
}));
```

- [ ] **Step 2: Run test to confirm FAIL**

```powershell
npx jest --no-coverage "HomeSurface" 2>&1 | Select-Object -Last 8
```
Expected: FAIL — `dossier-wall-btn` not found.

- [ ] **Step 3: Add hook + button to HomeSurface**

**3a. Add import** — near the top of `components/home/HomeSurface.tsx`, after existing imports:

```tsx
import { useCreateDossierNode } from '@/lib/hooks/useCreateDossierNode';
```

**3b. Add hook call** — find the block of hook calls near the top of the component body (around line 200, where `useSurfaceProfile`, `useNavStore` etc. are called). Add:

```tsx
const { nodeId: dossierNodeId } = useCreateDossierNode(websiteEntryContext);
```

**3c. Add "Auf die Wall" button** — in the website-entry-home-card (around line 991, directly after the "Dossier öffnen" `<button>`):

```tsx
<button
    type="button"
    data-testid="dossier-wall-btn"
    onClick={() => {
        // Phase 2: will save to Wall queue. Stub for now.
        console.log('[Wall] queued dossier node:', dossierNodeId);
    }}
    className="mt-2 rounded-full border border-violet-300/16 bg-violet-400/[0.06] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-violet-100/60 transition-colors hover:border-violet-200/26 hover:bg-violet-400/[0.10]"
>
    Auf die Wall
</button>
```

- [ ] **Step 4: Run HomeSurface tests to confirm PASS**

```powershell
npx jest --no-coverage "HomeSurface" 2>&1 | Select-Object -Last 10
```
Expected: All tests pass (was 28, now 29).

- [ ] **Step 5: Run full suite to check for regressions**

```powershell
npx jest --no-coverage 2>&1 | Select-Object -Last 8
```
Expected: 0 new failures.

- [ ] **Step 6: Commit**

```powershell
git add components/home/HomeSurface.tsx __tests__/components/home/HomeSurface.test.tsx
git commit -m "feat(dossier): HomeSurface — auto-create dossier node + Auf die Wall stub button"
```

---

## Task 5: Push + verify live

- [ ] **Step 1: Push to trigger deploy**

```powershell
Set-Location "E:\saimor\INTERFACE"
git push origin main
```

- [ ] **Step 2: Deploy on server**

```bash
ssh root@49.12.195.166 "cd /root/saimor/ops && bash deploy-ui.sh 2>&1 | tail -10"
```

- [ ] **Step 3: Verify DEPLOYED_REVISIONS.txt has correct SHA**

```bash
ssh root@49.12.195.166 "cat /root/saimor/ops/DEPLOYED_REVISIONS.txt | grep ui_sha"
```
Expected: matches latest commit SHA.

- [ ] **Step 4: Smoke test — open a demo URL in browser**

Navigate to `https://hq.saimor.world` with a website-entry context (use a Security Check URL from saimor.world).
- The website-entry-home-card appears ✅
- "Auf die Wall" button is visible ✅
- In browser DevTools console: `[Wall] queued dossier node: <nodeId>` appears on click ✅

---

## Notes for Executor

- **`createNode` is already tested against real CORE** — no mocking in integration needed, just unit-test the hook with jest mocks.
- **Silent failure is intentional** — if `createNode` fails (e.g. demo tenant not ready yet), the dossier flow still works. The node is just not created.
- **`company_id` vs `folder_id`** — we use `company_id` because demo tenants may not have a pre-existing folder hierarchy. CORE's `POST /v3/nodes` accepts `company_id` directly (added in the `stabilize/beta-1.5` cycle).
- **Do not remove** `VAPI` / phone calls from any nightwatch code (user constraint).
- **Test command**: `npx jest --no-coverage "<pattern>"` from `E:\saimor\INTERFACE`
- **Baseline**: 684 passing before this plan.
