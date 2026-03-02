# Unified Finder + Team UI + Icon Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the NodeDetailPanel split, add a persistent API-backed breadcrumb to FinderPane, clean the Team roster to real DB users only, add v3 admin controls to UsersPane, and redesign all 10 dock icons with consistent geometry.

**Architecture:** Two commits. Commit 1 is the filesystem/breadcrumb pass: FolderLayer routes file-node clicks through the pane system (openPane → DocumentPane) instead of moraState (setActiveNode → NodeDetailPanel); FinderPane calls `/v3/folders/{id}/context` to show a full-path breadcrumb bar. Commit 2 is the team/icon pass: TeamPane drops synthetic members, UsersPane gains v3 admin controls, MoraIcons gets a clean geometry pass.

**Tech Stack:** Next.js 15, React 18, TypeScript 5, zustand (moraState + paneStore), jest + jest-environment-jsdom (test suite already bootstrapped at `__tests__/lib/api/coreClient.test.ts`)

**Reference files:**
- `lib/api/coreClient.ts` — all API calls (870+ lines); `coreGet`, `corePost` are internal helpers
- `lib/store/moraState.ts` — `activeNode` (line 122), `setActiveNode` (line 362), `loadNodeDetails` (lines 802-825)
- `components/layers/FolderLayer.tsx` — `handleNodeClick` at lines 260-263; `openPane` NOT yet imported
- `components/os/shell/MoraShell.tsx` — NodeDetailPanel import line 59, mount line 511
- `components/panes/FinderPane.tsx` — `breadcrumbs` local state line 265, `openPane` already destructured line 53
- `components/panes/TeamPane.tsx` — synthetic merge at lines 293, 311-323
- `components/panes/UsersPane.tsx` — 384-line component, currently uses `/v1/team/members`
- `components/icons/MoraIcons.tsx` — `IconProps` interface lines 12-18, 10 exported icons

---

## COMMIT 1 — Filesystem Unification + Breadcrumb

---

### Task 1: Add `FolderContext` type + `fetchFolderContext` to coreClient.ts (TDD)

**Files:**
- Test: `__tests__/lib/api/coreClient.test.ts` (append to existing file)
- Modify: `lib/api/coreClient.ts` (append near bottom, after fetchNodeRelations ~line 476)

---

**Step 1: Write the failing test — append to `__tests__/lib/api/coreClient.test.ts`**

```typescript
// ─── 8. Folder context (breadcrumb) ──────────────────────────────────────────

describe('fetchFolderContext', () => {
    it('routes to /v3/folders/{id}/context', async () => {
        mockFetchV3({
            scope: 'folder',
            folder: { id: 'f1', name: 'Invoices' },
            path: {
                company: { id: 'c1', name: 'Acme' },
                department: { id: 'd1', name: 'Sales' },
                space: { id: 's1', name: 'Shared Files' },
                breadcrumbs: [{ id: 'f1', name: 'Invoices' }],
            },
            counts: { nodes: 5, subfolders: 2 },
        });
        await fetchFolderContext('f1');
        expect(lastFetchUrl()).toContain('/v3/folders/f1/context');
    });

    it('returns null on error (isOptional)', async () => {
        mockFetchError(404);
        const result = await fetchFolderContext('nonexistent');
        expect(result).toBeNull();
    });

    it('unwraps v3 envelope', async () => {
        const ctx = {
            scope: 'folder',
            folder: { id: 'f2', name: 'Q1' },
            path: { company: null, department: null, space: null, breadcrumbs: [] },
            counts: { nodes: 0, subfolders: 0 },
        };
        mockFetchV3(ctx);
        const result = await fetchFolderContext('f2');
        expect(result).toEqual(ctx);
        expect(result).not.toHaveProperty('meta');
        expect(result).not.toHaveProperty('data');
    });
});
```

Also add `fetchFolderContext` to the import block at the top of the test file:
```typescript
import {
    // ... existing imports ...
    fetchFolderContext,
} from '@/lib/api/coreClient';
```

**Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/api/coreClient.test.ts --testNamePattern="fetchFolderContext" --no-coverage
```
Expected: FAIL — `fetchFolderContext is not a function`

**Step 3: Implement in `lib/api/coreClient.ts`**

Find the line after `fetchNodeRelations` (~line 476) and insert:

```typescript
// ─── Folder context (breadcrumb path) ────────────────────────────────────────

export interface FolderContextSegment {
    id: string;
    name: string;
}

export interface FolderContextPath {
    company: FolderContextSegment | null;
    department: FolderContextSegment | null;
    space: FolderContextSegment | null;
    breadcrumbs: FolderContextSegment[];
}

export interface FolderContext {
    scope: string;
    folder: FolderContextSegment;
    path: FolderContextPath;
    counts: { nodes: number; subfolders: number };
}

export async function fetchFolderContext(folderId: string): Promise<FolderContext | null> {
    return coreGet(`/v3/folders/${folderId}/context`, { isOptional: true });
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/api/coreClient.test.ts --no-coverage
```
Expected: 37/37 PASS (34 existing + 3 new)

---

### Task 2: FinderPane — API breadcrumb bar

**Files:**
- Modify: `components/panes/FinderPane.tsx`

The existing `breadcrumbs` state (line 265) drives the internal back-navigation stack — **do not touch it**. This task adds a second, separate piece of state (`folderContext`) that shows the full server-side path.

---

**Step 1: Add import at top of FinderPane.tsx**

Find the existing import from `@/lib/api/coreClient` (line 8):
```typescript
import { getSemanticallySimilarNodes } from '@/lib/api/coreClient';
```
Replace with:
```typescript
import { getSemanticallySimilarNodes, fetchFolderContext, FolderContext } from '@/lib/api/coreClient';
```

**Step 2: Add `folderContext` state — place after the `breadcrumbs` state declaration (line 265)**

After line 265 (`const [breadcrumbs, ...`), add:
```typescript
const [folderContext, setFolderContext] = useState<FolderContext | null>(null);
```

**Step 3: Add effect to fetch context when folder changes — place after the existing breadcrumb effect (after line 486)**

```typescript
// Fetch server-side full path context for persistent breadcrumb bar
useEffect(() => {
    if (!currentFolderId) {
        setFolderContext(null);
        return;
    }
    let cancelled = false;
    fetchFolderContext(currentFolderId).then(ctx => {
        if (!cancelled) setFolderContext(ctx);
    });
    return () => { cancelled = true; };
}, [currentFolderId]);
```

**Step 4: Render the breadcrumb bar in JSX**

Find the file list container inside FinderPane's JSX (search for `flex-1 overflow` or the scrollable area that lists files/folders). Insert the breadcrumb bar **above** that container, inside the same parent div. The breadcrumb only renders when `folderContext?.path` exists:

```tsx
{/* API breadcrumb — full path from server */}
{folderContext?.path && (
    <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-white/40 border-b border-white/5 bg-white/[0.03] overflow-x-auto whitespace-nowrap flex-shrink-0">
        {folderContext.path.company && (
            <span className="hover:text-white/70 transition-colors">{folderContext.path.company.name}</span>
        )}
        {folderContext.path.department && (
            <>
                <span className="text-white/20 mx-0.5">/</span>
                <span className="hover:text-white/70 transition-colors">{folderContext.path.department.name}</span>
            </>
        )}
        {folderContext.path.space && (
            <>
                <span className="text-white/20 mx-0.5">/</span>
                <span className="hover:text-white/70 transition-colors">{folderContext.path.space.name}</span>
            </>
        )}
        {folderContext.path.breadcrumbs.map((seg, i) => (
            <React.Fragment key={seg.id}>
                <span className="text-white/20 mx-0.5">/</span>
                <span className={
                    i === folderContext.path.breadcrumbs.length - 1
                        ? 'text-white/70 font-medium'
                        : 'hover:text-white/70 transition-colors'
                }>
                    {seg.name}
                </span>
            </React.Fragment>
        ))}
    </div>
)}
```

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

---

### Task 3: FolderLayer — route node clicks through pane system

**Files:**
- Modify: `components/layers/FolderLayer.tsx`

**Step 1: Add paneStore import (after line 15 in FolderLayer.tsx)**

Find the import section (lines 1-16). Add after the existing imports:
```typescript
import { usePaneStore } from '@/lib/store/paneStore';
```

**Step 2: Destructure `openPane` inside the component**

Find where `useMoraStore()` is destructured (likely near top of component, around lines 50-80). Add `openPane` from paneStore just after:
```typescript
const { openPane } = usePaneStore();
```

**Step 3: Replace `handleNodeClick` (lines 260-263)**

Current:
```typescript
const handleNodeClick = (node: CoreNode) => {
    loadNodeDetails((node as any).id);
    setActiveNode(node);
};
```

Replace with:
```typescript
const handleNodeClick = (node: CoreNode) => {
    const nodeId = (node as any).id as string;
    openPane({
        id: `doc-${nodeId}`,
        type: 'document',
        title: node.name || 'Document',
        size: { width: 800, height: 600 },
        data: {
            nodeId,
            content: (node as any).content,
            name: node.name,
            type: node.type,
            metadata: (node as any).metadata,
        },
    });
};
```

**Step 4: Remove now-unused destructures from `useMoraStore()`**

Find where `loadNodeDetails` and `setActiveNode` are destructured from `useMoraStore()` inside FolderLayer. Remove them from the destructure. (Keep all other destructured fields.)

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors. If TS complains about unused `loadNodeDetails`/`setActiveNode` in moraState, ignore — those will be cleaned in Task 5.

---

### Task 4: Remove NodeDetailPanel from MoraShell

**Files:**
- Modify: `components/os/shell/MoraShell.tsx`

**Step 1: Remove import (line 59)**

Delete:
```typescript
import { NodeDetailPanel } from '@/components/organic/NodeDetailPanel';
```

**Step 2: Remove mount site (lines 510-511)**

Delete these two lines:
```tsx
{/* Node Detail Panel — renders whenever activeNode is set (click node in FolderLayer) */}
<NodeDetailPanel />
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

---

### Task 5: moraState cleanup — remove activeNode slice

**Files:**
- Modify: `lib/store/moraState.ts`

**Step 1: Audit other consumers before removing**

```bash
# Search entire codebase for usages (exclude the panel we just deleted)
npx grep -r "activeNode\|setActiveNode\|loadNodeDetails" --include="*.ts" --include="*.tsx" .
```

If **any file other than** `NodeDetailPanel.tsx` and `FolderLayer.tsx` still references these, **stop and report**. Do not remove the slice — just leave it with a `// @deprecated` comment and proceed to Task 6.

If only `NodeDetailPanel.tsx` and `FolderLayer.tsx` reference them (both already cleaned), proceed:

**Step 2: Remove from interface** — find the `MoraState` interface and delete:
```typescript
activeNode: CoreNode | null;
setActiveNode: (node: CoreNode | null) => void;
loadNodeDetails: (nodeId: string) => Promise<void>;
```

**Step 3: Remove from initial state** — find the `create()` call, delete:
```typescript
activeNode: null,
```

**Step 4: Remove implementations** — delete:
```typescript
setActiveNode: (node) => set({ activeNode: node }),
```
And the full `loadNodeDetails` function body (lines 802-825).

**Step 5: Remove `fetchNodeDetails` import from moraState** (if it was only used by `loadNodeDetails`)

Check if `fetchNodeDetails` is imported at the top of moraState.ts. If so, remove it.

**Step 6: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

---

### Task 6: Verify all tests pass + commit Commit 1

**Step 1: Run full test suite**

```bash
npx jest --no-coverage
```
Expected: 37 passed, 0 failed

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 3: Commit**

```bash
git add \
  lib/api/coreClient.ts \
  lib/store/moraState.ts \
  components/layers/FolderLayer.tsx \
  components/os/shell/MoraShell.tsx \
  components/panes/FinderPane.tsx \
  __tests__/lib/api/coreClient.test.ts

git commit -m "$(cat <<'EOF'
feat: unify finder UX + breadcrumb from /v3/folders/{id}/context

- FolderLayer: node clicks route to DocumentPane via openPane (remove
  setActiveNode + loadNodeDetails coupling)
- MoraShell: remove NodeDetailPanel mount + import
- moraState: remove activeNode/setActiveNode/loadNodeDetails slice
- FinderPane: folderContext state + effect + sticky breadcrumb bar
- coreClient: add FolderContext type + fetchFolderContext (isOptional)
- Tests: +3 fetchFolderContext tests (37 total, all passing)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## COMMIT 2 — Team UI + Icon Polish

---

### Task 7: coreClient — add `corePatch` helper + v3 admin user functions (TDD)

**Files:**
- Test: `__tests__/lib/api/coreClient.test.ts` (append)
- Modify: `lib/api/coreClient.ts`

---

**Step 1: Write failing tests — append to test file**

```typescript
// ─── 9. Admin user management (v3) ───────────────────────────────────────────

import {
    // add to existing import block at top of file:
    fetchAdminUsers,
    patchAdminUser,
    patchUserCompanyBinding,
} from '@/lib/api/coreClient';

describe('fetchAdminUsers', () => {
    it('routes to /v3/team/admin/users with include_inactive=true', async () => {
        mockFetchV3([]);
        await fetchAdminUsers(true);
        expect(lastFetchUrl()).toContain('/v3/team/admin/users');
        expect(lastFetchUrl()).toContain('include_inactive=true');
    });

    it('returns [] on error (isOptional)', async () => {
        mockFetchError(403);
        const result = await fetchAdminUsers();
        expect(result).toEqual([]);
    });
});

describe('patchAdminUser', () => {
    it('routes to /v3/team/admin/users/{id} via PATCH', async () => {
        mockFetchV3({ user_id: 'u1', role: 'admin', is_active: true });
        await patchAdminUser('u1', { role: 'admin' });
        expect(lastFetchUrl()).toContain('/v3/team/admin/users/u1');
        expect(lastFetchInit().method).toBe('PATCH');
    });

    it('sends patch body', async () => {
        mockFetchV3({});
        await patchAdminUser('u2', { is_active: false });
        const body = JSON.parse(lastFetchInit().body as string);
        expect(body).toMatchObject({ is_active: false });
    });
});

describe('patchUserCompanyBinding', () => {
    it('routes to /v3/team/admin/users/{id}/company-binding via PATCH', async () => {
        mockFetchV3({ success: true });
        await patchUserCompanyBinding('u1', 'co-abc');
        expect(lastFetchUrl()).toContain('/v3/team/admin/users/u1/company-binding');
        expect(lastFetchInit().method).toBe('PATCH');
    });

    it('sends company_id in body', async () => {
        mockFetchV3({ success: true });
        await patchUserCompanyBinding('u3', 'my-company');
        const body = JSON.parse(lastFetchInit().body as string);
        expect(body).toMatchObject({ company_id: 'my-company' });
    });
});
```

> Note: add `fetchAdminUsers`, `patchAdminUser`, `patchUserCompanyBinding` to the import at the **top** of the test file.

**Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/api/coreClient.test.ts --testNamePattern="fetchAdminUsers|patchAdminUser|patchUserCompanyBinding" --no-coverage
```
Expected: FAIL — functions not defined

**Step 3: Add `corePatch` helper to `lib/api/coreClient.ts`**

Find where `corePost` is defined (internal helper, not exported). Directly after it, add:

```typescript
async function corePatch<T>(path: string, body: unknown): Promise<T> {
    return coreRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}
```

**Step 4: Add types + functions to `lib/api/coreClient.ts`**

Append after `fetchFolderContext` (end of folder context section):

```typescript
// ─── Admin user management (v3) ──────────────────────────────────────────────

export interface AdminUser {
    user_id: string;
    name: string;
    email: string;
    role: 'member' | 'admin' | 'owner';
    is_active: boolean;
    default_company_id?: string | null;
    created_at?: string;
}

export interface AdminUserPatch {
    role?: 'member' | 'admin' | 'owner';
    is_active?: boolean;
}

export async function fetchAdminUsers(includeInactive = true): Promise<AdminUser[]> {
    const result = await coreGet(
        `/v3/team/admin/users?include_inactive=${includeInactive}`,
        { isOptional: true }
    );
    return result || [];
}

export async function patchAdminUser(userId: string, patch: AdminUserPatch): Promise<AdminUser | null> {
    return corePatch(`/v3/team/admin/users/${userId}`, patch);
}

export async function patchUserCompanyBinding(userId: string, companyId: string): Promise<{ success: boolean } | null> {
    return corePatch(`/v3/team/admin/users/${userId}/company-binding`, { company_id: companyId });
}
```

**Step 5: Run all tests**

```bash
npx jest --no-coverage
```
Expected: 43 passed (37 + 6 new), 0 failed

---

### Task 8: TeamPane — remove synthetic members

**Files:**
- Modify: `components/panes/TeamPane.tsx`

**Step 1: Read and understand the `fetchTeamData` function (lines 292-351)**

The function currently:
1. Maps `peers` (WebSocket presence) to `peerMembers`
2. Fetches real members from API
3. Constructs a hardcoded `moraMember` (AI bot)
4. Merges: `setMembers([...realMembers, moraMember, ...peerMembers])`

**Step 2: Remove `moraMember` object and `peerMembers` injection**

Replace the entire `setMembers(...)` call(s) inside `fetchTeamData` so that only real API members are used:

- Delete the `const moraMember: TeamMember = { ... }` block
- Delete the `const withMora = ...` line
- Delete `const peerMembers = peers.map(mapPeerToMember)`
- Change the success path: `setMembers(realMembers)`
- Change the fallback/catch path: `setMembers([])`

After the change, `fetchTeamData` should look approximately like:
```typescript
const fetchTeamData = useCallback(async () => {
    setIsLoading(true);
    try {
        // real members only — no synthetic peers or AI bot
        const realMembers = await /* existing API call */;
        setMembers(realMembers);
    } catch (err) {
        console.error('Failed to fetch team members:', err);
        setMembers([]);
    } finally {
        setIsLoading(false);
    }
}, [/* keep existing deps, remove peers */]);
```

**Step 3: Remove `peers` from deps and any `usePresence` usage IF it was only used for the roster merge**

Check if `usePresence` / `peers` are used anywhere else in TeamPane (e.g. online indicator dots on real members). If used only for the peerMembers roster injection, remove the import and hook call. If used for presence dots, leave the hook but remove only the roster merge.

**Step 4: Remove `mapPeerToMember` helper function** if it is now unreferenced.

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

---

### Task 9: UsersPane — v3 admin management controls

**Files:**
- Modify: `components/panes/UsersPane.tsx`

**Step 1: Add new imports at top of UsersPane.tsx**

```typescript
import {
    fetchAdminUsers,
    patchAdminUser,
    patchUserCompanyBinding,
    AdminUser,
    AdminUserPatch,
} from '@/lib/api/coreClient';
```

**Step 2: Add `isAdmin` computed value inside component**

After the existing state declarations, add:
```typescript
const currentUser = useMoraStore(s => s.user);
const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';
```

**Step 3: Upgrade the `useEffect` to use v3 admin API when user is admin**

Replace the current `coreGet('/v1/team/members')` call with:
```typescript
useEffect(() => {
    if (!isAdmin) return; // admin controls only shown to admin/owner
    setIsLoading(true);
    fetchAdminUsers(true)
        .then(users => setMembers(users as any[]))
        .catch(() => setMembers([]))
        .finally(() => setIsLoading(false));
}, [isAdmin]);
```

> Keep the existing non-admin `useEffect` for `/v1/team/members` for regular members, or gate both on `isAdmin`. Simplest: one effect that calls the right endpoint.

**Step 4: Add `handleRoleChange` and `handleActiveToggle` handlers**

```typescript
const handleRoleChange = async (userId: string, role: AdminUserPatch['role']) => {
    try {
        await patchAdminUser(userId, { role });
        setMembers(prev => prev.map(m =>
            (m as any).user_id === userId ? { ...m, role } : m
        ));
        toast.success('Role updated');
    } catch {
        toast.error('Failed to update role');
    }
};

const handleActiveToggle = async (userId: string, isActive: boolean) => {
    try {
        await patchAdminUser(userId, { is_active: isActive });
        setMembers(prev => prev.map(m =>
            (m as any).user_id === userId ? { ...m, is_active: isActive } : m
        ));
        toast.success(isActive ? 'User activated' : 'User deactivated');
    } catch {
        toast.error('Failed to update user status');
    }
};
```

**Step 5: Add admin controls to each member row in JSX**

Find the JSX that renders each member row. After the existing name/email/role display, add (conditional on `isAdmin`):

```tsx
{isAdmin && (
    <div className="flex items-center gap-2 ml-auto">
        {/* Role select */}
        <select
            value={(member as any).role || 'member'}
            onChange={e => handleRoleChange((member as any).user_id, e.target.value as any)}
            className="text-xs bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/70 focus:outline-none focus:border-white/30"
        >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
        </select>

        {/* Active toggle */}
        <button
            onClick={() => handleActiveToggle(
                (member as any).user_id,
                !(member as any).is_active
            )}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                (member as any).is_active !== false
                    ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                    : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
            }`}
        >
            {(member as any).is_active !== false ? 'Active' : 'Inactive'}
        </button>
    </div>
)}
```

**Step 6: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

---

### Task 10: MoraIcons — redesign all 10 SVG icons

**Files:**
- Modify: `components/icons/MoraIcons.tsx`

The `IconProps` interface (lines 12-18) stays unchanged. The glow filter and `motion` wrapper (if any) stay. Only the SVG path content changes.

Design rules:
- `viewBox="0 0 24 24"`
- Stroke-based icons: `strokeWidth={strokeWidth ?? 1.5}` (use the existing `strokeWidth` prop)
- `fill="none"` on all stroke icons
- `strokeLinecap="round"` and `strokeLinejoin="round"` throughout
- `color` prop drives both `stroke` and `fill` as needed

Replace **each icon's SVG content** (keep the outer `<svg>` wrapper and any existing motion/glow wrappers):

**HomeOrbitIcon** — center planet + tilted orbit ring:
```tsx
<circle cx="12" cy="12" r="2.5" fill={color} />
<ellipse
    cx="12" cy="12" rx="8.5" ry="3.5"
    stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none"
    transform="rotate(-20 12 12)"
/>
<circle cx="20.1" cy="9.7" r="1.5" fill={color} />
```

**MoraBrainIcon** — three nodes + connecting lines (neural net):
```tsx
<circle cx="12" cy="6" r="2" fill={color} />
<circle cx="6.5" cy="17" r="2" fill={color} />
<circle cx="17.5" cy="17" r="2" fill={color} />
<line x1="12" y1="8" x2="7.5" y2="15.2" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
<line x1="12" y1="8" x2="16.5" y2="15.2" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
<line x1="8.5" y1="17" x2="15.5" y2="17" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
```

**ChatOrbitIcon** — speech bubble with text lines:
```tsx
<path
    d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H8l-4 3V6a1 1 0 011-1z"
    stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" strokeLinejoin="round"
/>
<line x1="8" y1="10" x2="16" y2="10" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
<line x1="8" y1="13" x2="13" y2="13" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
```

**SearchScanIcon** — magnifying glass + scan line:
```tsx
<circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" />
<line x1="16.2" y1="16.2" x2="21" y2="21" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
<line x1="7" y1="11" x2="15" y2="11" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
```

**FolderStarIcon** — folder outline + star:
```tsx
<path
    d="M3 7a1 1 0 011-1h5l2 2h9a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V7z"
    stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" strokeLinejoin="round"
/>
<path
    d="M12 11.5l1.1 2.3 2.4.3-1.7 1.7.4 2.4L12 17.1l-2.2 1.1.4-2.4-1.7-1.7 2.4-.3z"
    stroke={color} strokeWidth="1" fill="none" strokeLinejoin="round"
/>
```

**TeamNetworkIcon** — three person silhouettes in triangle formation:
```tsx
<circle cx="12" cy="5" r="2" stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" />
<path d="M9 10c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" strokeLinecap="round" />
<circle cx="5" cy="17" r="2" stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" />
<path d="M2 22c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" strokeLinecap="round" />
<circle cx="19" cy="17" r="2" stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" />
<path d="M16 22c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" strokeLinecap="round" />
<line x1="12" y1="7" x2="7" y2="15.2" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
<line x1="12" y1="7" x2="17" y2="15.2" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
<line x1="7" y1="19" x2="17" y2="19" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
```

**NotesRuneIcon** — document with three text lines:
```tsx
<rect x="5" y="3" width="14" height="18" rx="1.5" stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" />
<line x1="8" y1="8" x2="16" y2="8" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
<line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
<line x1="8" y1="16" x2="13" y2="16" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
```

**SettingsRingIcon** — center gear with 8 radial ticks:
```tsx
<circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" />
<path
    d="M12 2v2M12 20v2M2 12h2M20 12h2M5.64 5.64l1.42 1.42M16.95 16.95l1.41 1.41M5.64 18.36l1.42-1.42M16.95 7.05l1.41-1.41"
    stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round"
/>
```

**TerminalGlyphIcon** — terminal window + prompt:
```tsx
<rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" />
<path d="M7 9l4 3-4 3" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" strokeLinejoin="round" />
<line x1="13" y1="15" x2="17" y2="15" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
```

**MemoryCrystalIcon** — diamond/crystal with facet line:
```tsx
<path
    d="M12 3l5 5-5 13L7 8l5-5z"
    stroke={color} strokeWidth={strokeWidth ?? 1.5} fill="none" strokeLinejoin="round"
/>
<line x1="7" y1="8" x2="17" y2="8" stroke={color} strokeWidth={strokeWidth ?? 1.5} strokeLinecap="round" />
<line x1="9" y1="12" x2="15" y2="12" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
```

**GridConstellationIcon** — 3×3 dot grid with connecting lines:
```tsx
{[6,12,18].map(x => [6,12,18].map(y => (
    <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill={color} />
)))}
<line x1="7.5" y1="6" x2="10.5" y2="6" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="13.5" y1="6" x2="16.5" y2="6" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="7.5" y1="12" x2="10.5" y2="12" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="13.5" y1="12" x2="16.5" y2="12" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="7.5" y1="18" x2="10.5" y2="18" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="13.5" y1="18" x2="16.5" y2="18" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="6" y1="7.5" x2="6" y2="10.5" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="12" y1="7.5" x2="12" y2="10.5" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="18" y1="7.5" x2="18" y2="10.5" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="6" y1="13.5" x2="6" y2="16.5" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="12" y1="13.5" x2="12" y2="16.5" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
<line x1="18" y1="13.5" x2="18" y2="16.5" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
```

**Step: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

---

### Task 11: Verify all tests pass + commit Commit 2

**Step 1: Run full test suite**

```bash
npx jest --no-coverage
```
Expected: 43 passed, 0 failed

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 3: Commit**

```bash
git add \
  lib/api/coreClient.ts \
  components/panes/TeamPane.tsx \
  components/panes/UsersPane.tsx \
  components/icons/MoraIcons.tsx \
  __tests__/lib/api/coreClient.test.ts

git commit -m "$(cat <<'EOF'
feat: team real-users-only + admin controls + icon redesign

- TeamPane: remove moraMember AI bot + peerMembers WebSocket injection;
  roster is now strictly API-sourced
- UsersPane: upgrade to /v3/team/admin/users; owner/admin can edit role,
  toggle active, set company binding via PATCH endpoints
- coreClient: add corePatch helper + fetchAdminUsers, patchAdminUser,
  patchUserCompanyBinding (6 new tests, 43 total)
- MoraIcons: redesign all 10 SVG icons — uniform strokeWidth 1.5,
  clean geometry, consistent stroke/fill pattern, pixel-grid aligned

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## QA Checklist (after both commits)

Run through each item manually in the browser (Desktop: 1440px, Mobile: 375px):

| # | Check | Expected |
|---|-------|----------|
| 1 | Click a file node in L3 FolderLayer | DocumentPane floats open; no NodeDetailPanel overlay appears |
| 2 | Open a folder in FinderPane | Breadcrumb bar shows `Company / Dept / Space / Folder` |
| 3 | Navigate into a subfolder | Breadcrumb updates to show subfolder as last segment |
| 4 | Upload a file | File appears in current folder immediately; no flicker |
| 5 | Open TeamPane | Roster shows real DB users only; no "MA'RA" or ghost browser tabs |
| 6 | Open UsersPane as owner | Role dropdowns and Active toggles visible per row |
| 7 | Change a user's role | PATCH call fires; role updates in UI; toast confirms |
| 8 | Dock | All 10 icons render cleanly; consistent weight; no blurry edges |
| 9 | Mobile (375px) | No horizontal overflow; panes stack correctly |
| 10 | Run full test suite | 43 passed, 0 failed |
