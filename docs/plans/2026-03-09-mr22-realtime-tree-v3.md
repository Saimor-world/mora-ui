# MR22 Implementation Plan — realtimeClient + Tree v3 Cutover

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the two remaining v1 consumers unblocked by core `912a822`: tree API calls in coreClient and the realtimeClient (WebSocket URL + new HTTP endpoints).

**Architecture:** Two independent commits in blast-radius order — tree first (pure URL bumps, no logic change), realtime second (URL bump + new HTTP helpers + `buildWsUrl` extraction for testability). All migrations TDD. No consumer changes needed for either commit — response shapes are unchanged.

**Tech Stack:** Next.js 15, TypeScript, Jest (jsdom), `coreGet`/`corePost` from `lib/api/coreClient.ts`

**Baseline:** 81 tests pass. Target: 87+ after both commits.

---

## Pre-Flight Facts (Verified Against Source)

| Item | Reality |
|---|---|
| `fetchTree` location | `lib/api/coreClient.ts` line 647 — `coreGet('/v1/tree${query}')` |
| `fetchTreeData` location | `lib/api/coreClient.ts` line 656 — `coreGet('/v1/tree${query}')` |
| `fetchNodeChildren` location | `lib/api/coreClient.ts` line 660 — `coreGet('/v1/tree/${nodeId}/children?type=${type}', { isOptional: true })` |
| `fetchTree` consumers | `lib/store/moraState.ts` lines 900, 903 — URL-only change, no consumer fix needed |
| `fetchNodeChildren` consumers | `lib/store/moraState.ts` line 984 (lazy import) — URL-only change, no consumer fix needed |
| WS URL occurrences | `lib/api/realtimeClient.ts` — **3 occurrences** of `/v1/realtime/subscribe` inside `connect()`: CORE_WS_URL branch (line ~83), relative-URL production path (line ~91), localhost fallback (line ~95) |
| RealtimeClient HTTP methods | None exist yet — `fetchRealtimeStats` and `broadcastRealtimeEvent` are **net-new** |
| Existing test helpers | `mockFetchV3(data)`, `mockFetchRaw(body)`, `mockFetchError(status)`, `lastFetchUrl()` in `__tests__/lib/api/coreClient.test.ts` |
| Realtime consumers | `MoraShell.tsx` (connect/disconnect only), `TeamPane.tsx` (on/off for `chat.message`) — neither needs changes |

---

## Commit 1 — `feat(mr22): migrate coreClient tree calls to v3`

**Files:**
- Modify: `lib/api/coreClient.ts` (3 URL changes)
- Modify: `__tests__/lib/api/coreClient.test.ts` (append 3 tests + extend import list)

### Step 1: Write the 3 failing tests

Add `fetchTree`, `fetchTreeData`, `fetchNodeChildren` to the named import block at the top of `__tests__/lib/api/coreClient.test.ts`.

Then append these 3 `describe` blocks **after the last existing `describe` block** in the file:

```typescript
describe('fetchTree', () => {
    it('routes to GET /v3/tree not /v1/', async () => {
        mockFetchV3({ departments: [] });
        await fetchTree();
        expect(lastFetchUrl()).toContain('/v3/tree');
        expect(lastFetchUrl()).not.toContain('/v1/');
    });
});

describe('fetchTreeData', () => {
    it('routes to GET /v3/tree not /v1/', async () => {
        mockFetchV3({ departments: [] });
        await fetchTreeData();
        expect(lastFetchUrl()).toContain('/v3/tree');
        expect(lastFetchUrl()).not.toContain('/v1/');
    });
});

describe('fetchNodeChildren', () => {
    it('routes to GET /v3/tree/{id}/children not /v1/', async () => {
        mockFetchV3({ children: [] });
        await fetchNodeChildren('dept-1', 'department');
        expect(lastFetchUrl()).toContain('/v3/tree/dept-1/children');
        expect(lastFetchUrl()).not.toContain('/v1/');
    });
});
```

### Step 2: Run tests — verify 3 FAIL

```bash
cd /c/saimor/mora-ui && npx jest --no-coverage --testPathPattern="coreClient.test"
```
Expected: 3 new FAIL (URLs contain `/v1/`). All pre-existing tests still pass.

### Step 3: Migrate the 3 functions in coreClient.ts

```typescript
// fetchTree — line 647:
// FROM:
const response = await coreGet(`/v1/tree${query}`) as TreeApiResponse;
// TO:
const response = await coreGet(`/v3/tree${query}`) as TreeApiResponse;

// fetchTreeData — line 656:
// FROM:
return coreGet(`/v1/tree${query}`);
// TO:
return coreGet(`/v3/tree${query}`);

// fetchNodeChildren — line 660:
// FROM:
const children = await coreGet(`/v1/tree/${nodeId}/children?type=${type}`, { isOptional: true });
// TO:
const children = await coreGet(`/v3/tree/${nodeId}/children?type=${type}`, { isOptional: true });
```

No interface or response-mapping changes — `mapTreeResponseToNodes` and `CoreTreeNode` shapes are unchanged.

### Step 4: Run tests — verify 3 PASS

```bash
npx jest --no-coverage --testPathPattern="coreClient.test"
```
Expected: all tests pass including the 3 new ones.

### Step 5: Full suite

```bash
npx jest --no-coverage --testPathPattern="__tests__"
```
Expected: **84 PASS** (81 + 3).

### Step 6: Verify TypeScript

```bash
npm run verify:types
```
Expected: 0 errors.

### Step 7: Commit

```bash
cd /c/saimor/mora-ui
git add lib/api/coreClient.ts __tests__/lib/api/coreClient.test.ts
git commit -m "feat(mr22): migrate coreClient tree calls to v3"
```

---

## Commit 2 — `feat(mr22): migrate realtimeClient to v3 (WS + stats + broadcast)`

**Files:**
- Modify: `lib/api/realtimeClient.ts`
- Create: `__tests__/lib/api/realtimeClient.test.ts`

### Background

`realtimeClient.ts` is a class (`RealtimeClient`) that manages a WebSocket connection. The WebSocket URL is built inside `connect()` with 3 hardcoded `/v1/` references. Two new HTTP REST endpoints (`/v3/realtime/stats`, `/v3/realtime/broadcast/{event_type}`) don't exist on the class and need to be added.

**Design approach:**
- Extract URL construction to `export function buildWsUrl(token: string, opts?: BuildWsUrlOptions): string` — makes the URL logic testable without mocking WebSocket itself (jsdom has no real WS engine).
- Add `export async function fetchRealtimeStats()` — uses `coreGet`, testable with jest.mock.
- Add `export async function broadcastRealtimeEvent(eventType: string, data: Record<string, unknown>)` — uses `corePost`, testable with jest.mock.

### Step 1: Write the 4 failing tests

Create `__tests__/lib/api/realtimeClient.test.ts`:

```typescript
/**
 * realtimeClient — v3 migration tests
 */

// Mock coreClient BEFORE importing realtimeClient (Jest hoisting)
jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
}));

import { buildWsUrl, fetchRealtimeStats, broadcastRealtimeEvent } from '@/lib/api/realtimeClient';
import { coreGet, corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('buildWsUrl', () => {
    it('uses /v3/realtime/subscribe not /v1/', () => {
        const url = buildWsUrl('test-token', {
            coreWsUrl: 'wss://api.example.com',
        });
        expect(url).toContain('/v3/realtime/subscribe');
        expect(url).not.toContain('/v1/');
    });

    it('includes token in query string', () => {
        const url = buildWsUrl('mytoken', {
            coreWsUrl: 'wss://api.example.com',
        });
        expect(url).toContain('token=mytoken');
    });
});

describe('fetchRealtimeStats', () => {
    it('routes to GET /v3/realtime/stats', async () => {
        (coreGet as jest.Mock).mockResolvedValue({ connections: 1, uptime: 100 });
        await fetchRealtimeStats();
        expect(coreGet).toHaveBeenCalledWith('/v3/realtime/stats');
    });
});

describe('broadcastRealtimeEvent', () => {
    it('routes to POST /v3/realtime/broadcast/{event_type}', async () => {
        (corePost as jest.Mock).mockResolvedValue({ sent: true });
        await broadcastRealtimeEvent('node.updated', { id: 'nd-1' });
        expect(corePost).toHaveBeenCalledWith(
            '/v3/realtime/broadcast/node.updated',
            { id: 'nd-1' }
        );
    });
});
```

### Step 2: Run tests — verify 4 FAIL

```bash
cd /c/saimor/mora-ui && npx jest --no-coverage --testPathPattern="realtimeClient"
```
Expected: 4 FAIL — `buildWsUrl`, `fetchRealtimeStats`, `broadcastRealtimeEvent` not exported yet.

### Step 3: Implement changes in realtimeClient.ts

**3a. Add imports at the top** (after `"use client"` line):

```typescript
import { coreGet, corePost } from '@/lib/api/coreClient';
```

**3b. Add `BuildWsUrlOptions` interface + `buildWsUrl` function** before the `class RealtimeClient` declaration:

```typescript
export interface BuildWsUrlOptions {
    /** Explicit WS base URL (e.g. wss://api.example.com). Overrides all derivation. */
    coreWsUrl?: string;
    /** HTTP API base URL. Used when coreWsUrl is absent. Defaults to NEXT_PUBLIC_CORE_API_URL. */
    coreApiUrl?: string;
    /** window.location.hostname override for testing. */
    hostname?: string;
    /** window.location.host override for testing. */
    host?: string;
    /** window.location.protocol override for testing. */
    protocol?: string;
}

/**
 * Build the WebSocket URL for /v3/realtime/subscribe.
 * Extracted from connect() to be testable without a live WebSocket engine.
 */
export function buildWsUrl(token: string, opts?: BuildWsUrlOptions): string {
    const coreApiUrl = opts?.coreApiUrl ?? process.env.NEXT_PUBLIC_CORE_API_URL ?? '/api/core';
    const coreWsUrl = opts?.coreWsUrl ?? process.env.NEXT_PUBLIC_CORE_WS_URL;
    const hostname = opts?.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
    const host = opts?.host ?? (typeof window !== 'undefined' ? window.location.host : 'localhost');
    const protocol = opts?.protocol ?? (typeof window !== 'undefined'
        ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
        : 'ws:');

    if (coreWsUrl) {
        return `${coreWsUrl}/v3/realtime/subscribe?token=${token}&event_types=all`;
    }

    if (coreApiUrl.startsWith('/')) {
        const apiHost = host.startsWith('hq.') ? host.replace(/^hq\./, 'api.') : 'api.saimor.world';

        if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
            return `ws://localhost:8081/v3/realtime/subscribe?token=${token}&event_types=all`;
        }
        return `${protocol}//${apiHost}/v3/realtime/subscribe?token=${token}&event_types=all`;
    }

    const wsHost = coreApiUrl.replace(/^http/, 'ws');
    return `${wsHost}/v3/realtime/subscribe?token=${token}&event_types=all`;
}
```

**3c. Replace the URL construction block inside `connect()`** (the block from `let wsUrl = "";` to the closing brace of the if/else chain). Replace it with a single call to `buildWsUrl`:

```typescript
// BEFORE (inside connect(), after `this.isConnecting = true;`):
const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || '/api/core';
const CORE_WS_URL = process.env.NEXT_PUBLIC_CORE_WS_URL;
let wsUrl = "";
if (CORE_WS_URL) {
    wsUrl = `${CORE_WS_URL}/v1/realtime/subscribe?token=${token}&event_types=all`;
} else {
    if (CORE_API_URL.startsWith('/')) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const apiHost = host.startsWith('hq.') ? host.replace(/^hq\./, 'api.') : 'api.saimor.world';
        wsUrl = `${protocol}//${apiHost}/v1/realtime/subscribe?token=${token}&event_types=all`;
        if (['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
            wsUrl = `ws://localhost:8081/v1/realtime/subscribe?token=${token}&event_types=all`;
        }
    } else {
        const wsHost = CORE_API_URL.replace(/^http/, 'ws');
        wsUrl = `${wsHost}/v1/realtime/subscribe?token=${token}&event_types=all`;
    }
}

// AFTER (replace the entire block above with):
const wsUrl = buildWsUrl(token);
```

Note: `token` is already declared above this block (from `const token = this.getToken()`). The `buildWsUrl()` call without opts reads from `process.env` and `window` directly — identical to the original behavior but now on v3.

**3d. Add HTTP helpers** at the bottom of the file (before `export const realtime = new RealtimeClient();`):

```typescript
// ─── HTTP helpers (v3) ────────────────────────────────────────────────────────

export interface RealtimeStats {
    connections: number;
    uptime: number;
    [key: string]: unknown;
}

/**
 * GET /v3/realtime/stats
 * Returns current WebSocket server statistics.
 */
export async function fetchRealtimeStats(): Promise<RealtimeStats> {
    return coreGet('/v3/realtime/stats') as Promise<RealtimeStats>;
}

/**
 * POST /v3/realtime/broadcast/{event_type}
 * Broadcasts a custom event to all connected clients.
 */
export async function broadcastRealtimeEvent(
    eventType: string,
    data: Record<string, unknown>
): Promise<{ sent: boolean }> {
    return corePost(`/v3/realtime/broadcast/${eventType}`, data) as Promise<{ sent: boolean }>;
}
```

### Step 4: Run tests — verify 4 PASS

```bash
npx jest --no-coverage --testPathPattern="realtimeClient"
```
Expected: 4 PASS.

### Step 5: Full suite

```bash
npx jest --no-coverage --testPathPattern="__tests__"
```
Expected: **88 PASS** (84 + 4).

### Step 6: Verify TypeScript

```bash
npm run verify:types
```
Expected: 0 errors. The `"use client"` directive at the top of `realtimeClient.ts` plus `coreGet`/`corePost` imports from a non-`"use client"` module should work — coreClient is already used from server-adjacent code elsewhere. If TypeScript flags a Next.js boundary violation, move the import to a dynamic import inside each function body.

### Step 7: Commit

```bash
cd /c/saimor/mora-ui
git add lib/api/realtimeClient.ts __tests__/lib/api/realtimeClient.test.ts
git commit -m "feat(mr22): migrate realtimeClient to v3 (WS + stats + broadcast)"
```

---

## Final Verification

```bash
cd /c/saimor/mora-ui
npx jest --no-coverage --testPathPattern="__tests__"
npm run verify:types
```

Expected:
- **88 PASS** (started at 81, added 3 tree + 4 realtime = +7)
- 0 TypeScript errors

---

## Acceptance Criteria

- [ ] `fetchTree`, `fetchTreeData`, `fetchNodeChildren` all route to `/v3/tree*`
- [ ] No `/v1/tree` references remain in coreClient.ts
- [ ] `realtime.connect()` opens WS to `/v3/realtime/subscribe`
- [ ] `fetchRealtimeStats()` exported and routes to `GET /v3/realtime/stats`
- [ ] `broadcastRealtimeEvent()` exported and routes to `POST /v3/realtime/broadcast/{type}`
- [ ] `buildWsUrl()` exported and testable (pure function with options injection)
- [ ] 88 tests pass, 0 TypeScript errors
- [ ] No consumer files (moraState, MoraShell, TeamPane) required changes

## Files NOT Changing

| File | Reason |
|---|---|
| `lib/store/moraState.ts` | Consumes `fetchTree`/`fetchNodeChildren` — URL-only change, no response shape change |
| `components/os/shell/MoraShell.tsx` | Uses `realtime.connect()`/`disconnect()` only — API unchanged |
| `components/panes/TeamPane.tsx` | Uses `realtime.on()`/`off()` only — API unchanged |
| `lib/api/devToken.ts` | Dev-only, intentional |
