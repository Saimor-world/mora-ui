# Finder ↔ Privater Bereich Bridge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unite the Finder and the Privater Bereich into one file browser — the Finder gains a "Mein Bereich" root section (private folders/nodes) alongside Company Spaces, just like Windows Explorer or macOS Finder.

**Architecture:** The backend private API already exists (`GET /private/{userId}/tree`, `POST /private/{userId}/folders`, `POST /private/{userId}/nodes`). This is purely a frontend task. The Finder app receives a new optional `initialScope: 'private' | 'workspace'` data prop, shows a two-section sidebar (Private + Spaces), and the HomeSurface "ÖFFNEN" button passes `{ initialScope: 'private' }` to land directly in the private section.

**Tech Stack:** Next.js 15, TanStack Query v5, Zustand, Tailwind CSS, `apps/finder/index.tsx`, `lib/queries/`, `components/home/HomeSurface.tsx`

---

### Task 1: API client + query hook for private tree

**Files:**
- Create: `lib/api/privateClient.ts`
- Create: `lib/queries/usePrivateTree.ts`
- Modify: `lib/queries/queryKeys.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/queries/usePrivateTree.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../../helpers/queryWrapper';
import { usePrivateTree } from '@/lib/queries/usePrivateTree';

jest.mock('@/lib/api/http', () => ({
  coreGet: jest.fn().mockResolvedValue({
    space_id: 'sp1',
    folders: [{ id: 'f1', name: 'Notizen', nodes: [{ id: 'n1', title: 'Erste Notiz' }] }]
  })
}));

it('returns private tree data', async () => {
  const { result } = renderHook(() => usePrivateTree('user-1'), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.folders[0].name).toBe('Notizen');
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd C:/saimor/INTERFACE && npx jest --no-coverage --testPathPattern="usePrivateTree" 2>&1 | tail -10
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/api/privateClient.ts`**

```typescript
import { coreGet, corePost } from './http';

export interface PrivateNode {
  id: string;
  title: string;
  content?: string;
  updated_at?: string;
}

export interface PrivateFolder {
  id: string;
  name: string;
  nodes: PrivateNode[];
}

export interface PrivateTree {
  space_id: string;
  folders: PrivateFolder[];
}

export async function fetchPrivateTree(userId: string): Promise<PrivateTree | null> {
  // POST /init first to ensure the space exists, then GET tree
  await corePost(`/private/init`, { owner_id: userId });
  return coreGet(`/private/${userId}/tree`, { isOptional: true });
}

export async function createPrivateFolder(userId: string, name: string) {
  return corePost(`/private/${userId}/folders`, { name });
}

export async function createPrivateNode(userId: string, folderId: string, title: string, content = '') {
  return corePost(`/private/${userId}/nodes`, { folder_id: folderId, title, content });
}
```

- [ ] **Step 4: Add queryKey to `lib/queries/queryKeys.ts`**

Find the `queryKeys` object and add:
```typescript
privateTree: (userId: string) => ['private-tree', userId] as const,
```
And add to `STALE_TIMES`:
```typescript
privateTree: 60 * 1000,
```

- [ ] **Step 5: Create `lib/queries/usePrivateTree.ts`**

```typescript
'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchPrivateTree } from '@/lib/api/privateClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

export function usePrivateTree(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.privateTree(userId ?? ''),
    queryFn: () => fetchPrivateTree(userId!),
    enabled: Boolean(userId),
    staleTime: STALE_TIMES.privateTree,
  });
}
```

- [ ] **Step 6: Run test to confirm it passes**

```bash
npx jest --no-coverage --testPathPattern="usePrivateTree" 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/api/privateClient.ts lib/queries/usePrivateTree.ts lib/queries/queryKeys.ts __tests__/lib/queries/usePrivateTree.test.ts
git commit -m "feat(private): add privateClient + usePrivateTree query hook"
```

---

### Task 2: Finder sidebar — "Mein Bereich" root section

**Files:**
- Modify: `apps/finder/index.tsx` (large file — read first, touch only the sidebar section)

The Finder sidebar currently shows Company Spaces in a tree. We need to prepend a "Mein Bereich" section above them.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/apps/finder/PrivateSection.test.tsx
import { render, screen } from '@testing-library/react';

// Minimal smoke test: when initialScope='private', the Finder shows "Mein Bereich"
// This is a render test — mock the query hooks, not the store.
jest.mock('@/lib/queries/usePrivateTree', () => ({
  usePrivateTree: () => ({
    data: { space_id: 'sp1', folders: [{ id: 'f1', name: 'Notizen', nodes: [] }] },
    isSuccess: true,
  }),
}));
jest.mock('@/lib/queries/useTree', () => ({ useTree: () => ({ data: [] }) }));
// ... (add all required mocks matching the Finder's existing mock pattern)

it('shows Mein Bereich section', async () => {
  render(<FinderApp initialScope="private" />);
  expect(await screen.findByText('Mein Bereich')).toBeInTheDocument();
  expect(screen.getByText('Notizen')).toBeInTheDocument();
});
```

Note: The Finder has many dependencies. Match the existing mock pattern from `__tests__/apps/finder/` if tests exist there. If not, use a minimal integration mock.

- [ ] **Step 2: Read the Finder sidebar section**

```bash
grep -n "sidebar\|Sidebar\|SpaceList\|space.*list\|tree.*list\|folderTree" apps/finder/index.tsx | head -20
```

Find the JSX block that renders the list of spaces/folders in the sidebar. Note the line numbers.

- [ ] **Step 3: Add `initialScope` prop and private section to Finder**

In `apps/finder/index.tsx`:

Add prop to the component interface:
```typescript
initialScope?: 'private' | 'workspace';
```

Add state for active scope near other state declarations:
```typescript
const [activeScope, setActiveScope] = useState<'private' | 'workspace'>(
  initialScope ?? 'workspace'
);
```

Add the `usePrivateTree` call:
```typescript
const { user } = useSessionStore();
const { data: privateTree } = usePrivateTree(user?.id ?? null);
```

In the sidebar JSX, prepend before the spaces list:
```tsx
{/* ── Mein Bereich ── */}
<div className="mb-2">
  <button
    onClick={() => setActiveScope('private')}
    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
      activeScope === 'private'
        ? 'bg-white/[0.07] text-white/90'
        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
    }`}
  >
    <Lock size={12} className="opacity-60" />
    Mein Bereich
  </button>
  {activeScope === 'private' && privateTree?.folders.map(folder => (
    <button
      key={folder.id}
      onClick={() => {/* select private folder — set selectedFolderId state */}}
      className="ml-4 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-white/60 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
    >
      <FolderOpen size={12} className="opacity-50" />
      {folder.name}
    </button>
  ))}
</div>

{/* ── Workspace ── */}
<div className="mb-1">
  <button
    onClick={() => setActiveScope('workspace')}
    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
      activeScope === 'workspace'
        ? 'bg-white/[0.07] text-white/90'
        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
    }`}
  >
    <Briefcase size={12} className="opacity-60" />
    Workspace
  </button>
</div>
{/* existing spaces list — only render when activeScope === 'workspace' */}
```

Wrap the existing spaces/folders list in `{activeScope === 'workspace' && (...)}`.

When a private folder is selected, the main content pane shows its nodes. Find where `selectedFolderId` controls the right-side content and feed in the private folder's nodes when `activeScope === 'private'`.

- [ ] **Step 4: Run tests**

```bash
npx jest --no-coverage --testPathPattern="finder|Finder" 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add apps/finder/index.tsx __tests__/apps/finder/PrivateSection.test.tsx
git commit -m "feat(finder): add Mein Bereich private section to sidebar"
```

---

### Task 3: Wire HomeSurface "ÖFFNEN" → Finder scoped to private

**Files:**
- Modify: `components/home/HomeSurface.tsx`

The "ÖFFNEN" button for the private area (around line 224) currently opens a `meine-dateien` pane. Change it to open a `finder` pane with `{ initialScope: 'private' }`.

- [ ] **Step 1: Find the current ÖFFNEN handler**

```bash
grep -n "meine-dateien\|ÖFFNEN\|openPrivate\|revealPane.*meine" components/home/HomeSurface.tsx | head -10
```

- [ ] **Step 2: Change the pane type**

Find the `revealPane('meine-dateien', {...})` call (around line 224) and change to:
```typescript
revealPane('private-finder', {
  type: 'finder',
  title: 'Mein Bereich',
  size: { width: 860, height: 620 },
  data: { initialScope: 'private' },
});
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Fix any type errors.

- [ ] **Step 4: Commit**

```bash
git add components/home/HomeSurface.tsx
git commit -m "feat(home): open Finder scoped to private area from ÖFFNEN button"
```

---

### Task 4: Private node content view

**Files:**
- Modify: `apps/finder/index.tsx`

When a private folder is selected in the Finder's sidebar, the main content area should show the folder's nodes just like workspace nodes. Clicking a node opens it in a document pane.

- [ ] **Step 1: Find the existing node rendering**

```bash
grep -n "selectedFolder\|nodeList\|openDocument\|node.*click\|openPane.*document" apps/finder/index.tsx | head -15
```

- [ ] **Step 2: Feed private nodes into the content area**

Add a computed value:
```typescript
const displayedNodes = activeScope === 'private'
  ? (privateTree?.folders.find(f => f.id === selectedPrivateFolderId)?.nodes ?? [])
  : existingWorkspaceNodes; // whatever the current variable is
```

Use `displayedNodes` in the node list rendering instead of the current variable.

- [ ] **Step 3: Opening a private node opens a document pane**

When a private node is clicked:
```typescript
openPane({
  id: `doc-private-${node.id}`,
  type: 'document',
  title: node.title,
  size: { width: 860, height: 640 },
  data: { nodeId: node.id, isPrivate: true },
});
```

The existing DocumentViewer pane handles nodeId — private nodes are stored in the same SQLite DB so the existing fetch will work.

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage --testPathPattern="__tests__" 2>&1 | tail -15
```

Baseline is ~502 passing. Ensure no regressions.

- [ ] **Step 5: Commit**

```bash
git add apps/finder/index.tsx
git commit -m "feat(finder): show private folder nodes in content area"
```

---

## Success Criteria

1. Clicking "ÖFFNEN" in the Privater Bereich sidebar opens the Finder with "Mein Bereich" pre-selected
2. The Finder sidebar shows two root sections: "Mein Bereich" (lock icon) and "Workspace" (briefcase icon)
3. Private folders and their nodes are browsable in the Finder
4. Clicking a private node opens a document pane (same as workspace nodes)
5. Switching between Private ↔ Workspace in sidebar is instant (no reload)
6. TypeScript compiles clean (`npx tsc --noEmit`)
7. No test regressions
