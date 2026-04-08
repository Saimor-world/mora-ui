# HomeSurface Ambient Intelligence Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static nav-card-grid HomeSurface with an ambient intelligence surface: Mora briefing strip, department pulse tiles, recent items list, and quick actions — with the MoraPulsePanel removed from the shell.

**Architecture:** Three focused changes: (1) hide `MoraPulsePanel` in `MoraShell.tsx`, (2) extract a pure `buildBriefing()` utility in `lib/home/briefing.ts`, (3) rewrite `HomeSurface.tsx` in-place, reusing existing fetch/state infrastructure.

**Tech Stack:** React 18, Next.js 15, Zustand, @testing-library/react, jest

---

## Chunk 1: Infrastructure (MoraShell + briefing utility)

### Task 1: Remove MoraPulsePanel from shell

**Files:**
- Modify: `components/os/shell/MoraShell.tsx` ~line 661

- [ ] **Step 1: Confirm the exact line**

```bash
grep -n "MoraPulsePanel" components/os/shell/MoraShell.tsx
```

Expected output: a single line like `661:            {!hasFullscreenPane && <MoraPulsePanel />}`

- [ ] **Step 2: Comment out the mount**

Find:
```tsx
{!hasFullscreenPane && <MoraPulsePanel />}
```

Replace with:
```tsx
{/* MoraPulsePanel hidden — org/scope metadata is not user-facing on Home */}
```

Do NOT delete the import — leave it for now so the change is easy to revert if needed.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd C:/saimor/mora-ui-cleanup && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (unused import is fine; tsc does not error on unused imports in .tsx files by default)

- [ ] **Step 4: Commit**

```bash
git add components/os/shell/MoraShell.tsx
git commit -m "feat(home): hide MoraPulsePanel from shell — org metadata not user-facing"
```

---

### Task 2: Create `buildBriefing` utility + tests

**Files:**
- Create: `lib/home/briefing.ts`
- Create: `__tests__/lib/home/briefing.test.ts`

- [ ] **Step 1: Create the test file first**

Create `__tests__/lib/home/briefing.test.ts`:

```typescript
import { buildBriefing } from '@/lib/home/briefing';
import type { CoreDepartment } from '@/lib/types/core';
import type { CoreTreeNode } from '@/lib/types/core';

const dept = (id: string, name: string): CoreDepartment => ({
    id, name, slug: id, tenant_id: 't1', order: 0,
});

const treeNode = (id: string, children?: CoreTreeNode[]): CoreTreeNode => ({
    id, name: id, type: 'department', children,
} as CoreTreeNode);

describe('buildBriefing', () => {
    it('returns fallback when departments is empty', () => {
        expect(buildBriefing([], [])).toBe('Bereit wenn du es bist.');
    });

    it('returns fallback when treeData is null', () => {
        expect(buildBriefing([dept('d1', 'R&D')], null)).toBe('Bereit wenn du es bist.');
    });

    it('returns fallback when all dept nodes have undefined children (not loaded)', () => {
        const tree = [treeNode('d1')]; // children === undefined
        expect(buildBriefing([dept('d1', 'R&D')], tree)).toBe('Bereit wenn du es bist.');
    });

    it('reports a single active department', () => {
        const children = [treeNode('n1'), treeNode('n2'), treeNode('n3')];
        const tree = [treeNode('d1', children)];
        const result = buildBriefing([dept('d1', 'R&D')], tree);
        expect(result).toContain('R&D ist aktiv');
        expect(result).toContain('3 Inhalte');
    });

    it('uses singular Inhalt for count of 1', () => {
        const tree = [treeNode('d1', [treeNode('n1')])];
        const result = buildBriefing([dept('d1', 'R&D')], tree);
        expect(result).toContain('1 Inhalt');
        expect(result).not.toContain('1 Inhalte');
    });

    it('reports quiet departments with empty children array', () => {
        const tree = [treeNode('d1', [])]; // children loaded, empty
        const result = buildBriefing([dept('d1', 'R&D')], tree);
        expect(result).toContain('R&D');
        expect(result).toContain('ruhig');
    });

    it('separates active and quiet departments in output', () => {
        const tree = [
            treeNode('d1', [treeNode('n1'), treeNode('n2')]),
            treeNode('d2', []),
        ];
        const result = buildBriefing([dept('d1', 'R&D'), dept('d2', 'Product')], tree);
        expect(result).toContain('R&D ist aktiv');
        expect(result).toContain('Product');
        expect(result).toContain('ruhig');
    });

    it('returns fallback when all loaded depts are quiet but none active', () => {
        // Edge case: all depts have empty children but at least one is loaded
        // The fallback only triggers when active+quiet = 0, so this should still say ruhig
        const tree = [treeNode('d1', []), treeNode('d2', [])];
        const result = buildBriefing([dept('d1', 'R&D'), dept('d2', 'Product')], tree);
        expect(result).toContain('ruhig');
        expect(result).not.toBe('Bereit wenn du es bist.');
    });
});
```

- [ ] **Step 2: Run tests — expect failure (file doesn't exist yet)**

```bash
cd C:/saimor/mora-ui-cleanup && npx jest --no-coverage --testPathPattern="__tests__/lib/home/briefing" 2>&1 | tail -15
```

Expected: FAIL — "Cannot find module '@/lib/home/briefing'"

- [ ] **Step 3: Create `lib/home/briefing.ts`**

```typescript
import type { CoreDepartment } from '@/lib/types/core';
import type { CoreTreeNode } from '@/lib/types/core';

/**
 * buildBriefing — generates a 1–2 sentence ambient briefing for HomeSurface.
 *
 * treeData children states:
 *   undefined  → not yet lazy-loaded; skip this dept (not quiet, not active)
 *   []         → loaded, empty → quiet
 *   [...items] → loaded with content → active
 */
export function buildBriefing(
    departments: CoreDepartment[],
    treeData: CoreTreeNode[] | null,
): string {
    if (!departments.length || !treeData) return 'Bereit wenn du es bist.';

    const active: Array<{ name: string; count: number }> = [];
    const quiet: string[] = [];

    for (const dept of departments) {
        const node = treeData.find((n) => n.id === dept.id);
        if (!node || node.children === undefined) continue; // not loaded yet — skip
        if (node.children.length === 0) {
            quiet.push(dept.name);
        } else {
            active.push({ name: dept.name, count: node.children.length });
        }
    }

    if (!active.length && !quiet.length) return 'Bereit wenn du es bist.';

    const parts: string[] = [];

    if (active.length === 1) {
        const { name, count } = active[0];
        parts.push(`${name} ist aktiv — ${count} ${count === 1 ? 'Inhalt' : 'Inhalte'}.`);
    } else if (active.length > 1) {
        const names = active.map((a) => a.name).join(', ');
        const total = active.reduce((sum, a) => sum + a.count, 0);
        parts.push(`${names} sind aktiv — ${total} ${total === 1 ? 'Inhalt' : 'Inhalte'} insgesamt.`);
    }

    if (quiet.length === 1) {
        parts.push(`${quiet[0]} ist ruhig.`);
    } else if (quiet.length > 1) {
        parts.push(`${quiet.join(', ')} sind ruhig.`);
    }

    return parts.join(' ') || 'Bereit wenn du es bist.';
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd C:/saimor/mora-ui-cleanup && npx jest --no-coverage --testPathPattern="__tests__/lib/home/briefing" 2>&1 | tail -15
```

Expected: PASS — 7 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/home/briefing.ts __tests__/lib/home/briefing.test.ts
git commit -m "feat(home): buildBriefing utility — generates ambient dept status briefing"
```

---

## Chunk 2: HomeSurface Rewrite

### Task 3: Widen `personalLatestItems` state + test

**Files:**
- Modify: `components/home/HomeSurface.tsx` (personalLatestItem useMemo + openPersonalLatest)
- Modify: `__tests__/components/home/HomeSurface.test.tsx` (add array test)

The existing `personalLatestItem: PersonalLatestItem | null` is a single item. Widen to `personalLatestItems: PersonalLatestItem[]` (top 5).

- [ ] **Step 1: Add a failing test for the array behavior**

In `__tests__/components/home/HomeSurface.test.tsx`, add after existing tests:

```typescript
describe('HomeSurface — recent items list', () => {
    it('shows up to 5 recent items from myContent', async () => {
        mockFetchMyContent.mockResolvedValue({
            documents: [
                { id: 'n1', title: 'Doc 1', updated_at: '2026-04-08T10:00:00Z' },
                { id: 'n2', title: 'Doc 2', updated_at: '2026-04-07T10:00:00Z' },
                { id: 'n3', title: 'Doc 3', updated_at: '2026-04-06T10:00:00Z' },
                { id: 'n4', title: 'Doc 4', updated_at: '2026-04-05T10:00:00Z' },
                { id: 'n5', title: 'Doc 5', updated_at: '2026-04-04T10:00:00Z' },
                { id: 'n6', title: 'Doc 6', updated_at: '2026-04-03T10:00:00Z' }, // 6th — should be hidden
            ],
        } as any);

        render(<HomeSurface />);

        await waitFor(() => {
            expect(screen.getByText('Doc 1')).toBeInTheDocument();
            expect(screen.getByText('Doc 5')).toBeInTheDocument();
            expect(screen.queryByText('Doc 6')).not.toBeInTheDocument();
        });
    });

    it('shows empty state when no recent items', async () => {
        mockFetchMyContent.mockResolvedValue({ documents: [] } as any);
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByText(/Noch keine Inhalte/i)).toBeInTheDocument();
        });
    });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd C:/saimor/mora-ui-cleanup && npx jest --no-coverage --testPathPattern="HomeSurface.test" 2>&1 | tail -20
```

Expected: FAIL — new tests don't pass yet (old HomeSurface renders differently)

- [ ] **Step 3: Widen the useMemo in `HomeSurface.tsx`**

Find the existing `personalLatestItem` useMemo (around line 259). Replace:

```typescript
const personalLatestItem = useMemo<PersonalLatestItem | null>(() => {
    if (!myContent) return null;

    if (Array.isArray(myContent.items) && myContent.items.length > 0) {
        const first = myContent.items[0];
        if (first.kind === 'document' && first.node_id) {
            return {
                kind: 'node',
                id: first.node_id,
                label: first.label,
                timestamp: getComparableTimestamp(first.timestamp),
            };
        }
        if (first.kind === 'file' && first.file_id) {
            return {
                kind: 'file',
                id: first.file_id,
                label: first.label,
                timestamp: getComparableTimestamp(first.timestamp),
                linkedNodeId: null,
            };
        }
    }

    const candidates = [
        ...getDocumentsFromContent(myContent).map((node) => ({
            kind: 'node' as const,
            id: node.id,
            label: node.title || node.name || 'Unbenanntes Dokument',
            timestamp: getComparableTimestamp(node.updated_at || node.created_at),
        })),
        ...(Array.isArray(myContent.files) ? myContent.files.filter((file) => !file.linked_node_id).map((file) => ({
            kind: 'file' as const,
            id: file.id,
            label: file.name || 'Datei',
            timestamp: getComparableTimestamp(file.created_at),
            linkedNodeId: file.linked_node_id || null,
        })) : []),
        ...(Array.isArray(myContent.folders) ? myContent.folders.map((folder) => ({
            kind: 'folder' as const,
            id: folder.id,
            label: folder.name || 'Ordner',
            timestamp: getComparableTimestamp(folder.updated_at || folder.created_at),
        })) : []),
    ];

    return candidates.sort((left, right) => right.timestamp - left.timestamp)[0] ?? null;
}, [myContent]);
```

With:

```typescript
const personalLatestItems = useMemo<PersonalLatestItem[]>(() => {
    if (!myContent) return [];

    const fromItems: PersonalLatestItem[] = [];
    if (Array.isArray(myContent.items)) {
        for (const item of myContent.items) {
            if (item.kind === 'document' && item.node_id) {
                fromItems.push({
                    kind: 'node',
                    id: item.node_id,
                    label: item.label,
                    timestamp: getComparableTimestamp(item.timestamp),
                });
            } else if (item.kind === 'file' && item.file_id) {
                fromItems.push({
                    kind: 'file',
                    id: item.file_id,
                    label: item.label,
                    timestamp: getComparableTimestamp(item.timestamp),
                    linkedNodeId: null,
                });
            }
        }
    }

    const candidates: PersonalLatestItem[] = [
        ...fromItems,
        ...getDocumentsFromContent(myContent).map((node) => ({
            kind: 'node' as const,
            id: node.id,
            label: node.title || node.name || 'Unbenanntes Dokument',
            timestamp: getComparableTimestamp(node.updated_at || node.created_at),
        })),
        ...(Array.isArray(myContent.files)
            ? myContent.files.filter((f) => !f.linked_node_id).map((f) => ({
                  kind: 'file' as const,
                  id: f.id,
                  label: f.name || 'Datei',
                  timestamp: getComparableTimestamp(f.created_at),
                  linkedNodeId: f.linked_node_id || null,
              }))
            : []),
        ...(Array.isArray(myContent.folders)
            ? myContent.folders.map((folder) => ({
                  kind: 'folder' as const,
                  id: folder.id,
                  label: folder.name || 'Ordner',
                  timestamp: getComparableTimestamp(folder.updated_at || folder.created_at),
              }))
            : []),
    ];

    // Deduplicate by id, keep top 5 sorted newest-first
    const seen = new Set<string>();
    return candidates
        .filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
}, [myContent]);
```

Also add a unified item opener (replaces `openPersonalLatest`). Add after the useMemo:

```typescript
const openPersonalItem = useCallback((item: PersonalLatestItem) => {
    if (item.kind === 'node') {
        revealPane(`doc-${item.id}`, {
            type: 'document',
            title: item.label,
            size: { width: 960, height: 720 },
            data: { nodeId: item.id },
        });
        return;
    }
    if (item.kind === 'folder') {
        revealPane(`finder-${item.id}`, {
            type: 'finder',
            title: item.label,
            size: { width: 960, height: 720 },
            data: { folderId: item.id },
        });
        return;
    }
    void openSourceFileLike({
        id: item.id,
        name: item.label,
        linked_node_id: (item as PersonalLatestItem & { linkedNodeId?: string | null }).linkedNodeId,
    }, openPane).catch((err: any) => {
        toast.error(err?.message || 'Datei konnte nicht geoeffnet werden.');
    });
}, [openPane, revealPane]);
```

- [ ] **Step 4: Run tests again — new tests should pass now (or after JSX rewrite in Task 4)**

Note: the new "recent items" tests will only pass fully after the JSX renders the items. Keep them failing for now — they serve as the spec for Task 4.

```bash
cd C:/saimor/mora-ui-cleanup && npx jest --no-coverage --testPathPattern="HomeSurface.test" 2>&1 | tail -20
```

---

### Task 4: Rewrite HomeSurface JSX

**Files:**
- Modify: `components/home/HomeSurface.tsx` — full return() rewrite + new store subscriptions + remove dead state

This is the main rewrite. Replace the entire return block and clean up state no longer needed.

- [ ] **Step 1: Add new store subscriptions and imports at the top of the component**

After the existing `useMoraStore` subscriptions (around line 91), add:

```typescript
const departments = useMoraStore((s) => s.departments);
const treeData = useMoraStore((s) => s.treeData);
```

Add import at top of file:
```typescript
import { buildBriefing } from '@/lib/home/briefing';
```

- [ ] **Step 2: Remove dead state**

Remove these three `useState` declarations and their fetch logic:
- `recentDocs` + `fetchNodesByCompany` call (line ~108 + ~121-135)
- `kairosEvents` + `coreGet` call (line ~110 + ~146-154)

Keep: `myContent` state + `fetchMyContent` call — still used for `personalLatestItems`.

Remove these `useMemo`s no longer needed:
- `contentSummaryBadges`
- `freshKairosEvents`
- `staleKairosCount`

Remove from imports: `Clock`, `StickyNote`, `Eye`, `Compass` (if unused after rewrite). Keep: `FileText`, `FolderOpen`, `FolderHeart`, `LogOut`, `MessageCircle`.

Remove the `openPersonalLatest` callback (replaced by `openPersonalItem`).

- [ ] **Step 3: Add new callbacks**

Add after `openMora`:

```typescript
const openUpload = useCallback(() => {
    revealPane('finder-main', {
        type: 'finder',
        title: 'Finder',
        size: { width: 1280, height: 820 },
        data: { showUpload: true },
    });
}, [revealPane]);

const openDepartment = useCallback((dept: CoreDepartment) => {
    revealPane('finder-main', {
        type: 'finder',
        title: `Finder — ${dept.name}`,
        size: { width: 1280, height: 820 },
        data: { departmentId: dept.id, departmentName: dept.name },
    });
}, [revealPane]);
```

Add import: `import type { CoreDepartment } from '@/lib/types/core';`

- [ ] **Step 4: Add `briefingText` memo; replace `todayLabel` declaration**

```typescript
const briefingText = useMemo(
    () => buildBriefing(departments, treeData),
    [departments, treeData],
);
```

**Find and replace** the existing `todayLabel` declaration (currently ~line 257 with `weekday: 'long'`):

```typescript
// BEFORE (existing — uses 'long' weekday)
const todayLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

// AFTER (replace with 'short' for the new compact strip)
const todayLabel = new Date().toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
```

Do NOT add a second `todayLabel` — replace the existing one in-place.

- [ ] **Step 5: Replace the entire `return (...)` block**

Replace from `return (` to the closing `);` with:

```tsx
return (
    <div className="absolute inset-0 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col px-6 pt-8 pb-40">

            {/* ── 1. Mora Briefing Strip ─────────────────────────────── */}
            <div className="mb-7">
                <div className="mb-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                    <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/50">Mora</span>
                    <span className="ml-auto text-[10px] text-white/18">{todayLabel}</span>
                </div>
                <p className="text-[14px] font-light leading-relaxed text-white/72">
                    {briefingText}
                </p>
            </div>

            {/* ── 2. Department Pulse Tiles ──────────────────────────── */}
            {departments.length > 0 && (
                <div className="mb-7 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {departments.slice(0, 6).map((dept) => {
                        const treeNode = treeData?.find((n) => n.id === dept.id);
                        const isActive =
                            treeNode?.children !== undefined &&
                            treeNode.children.length > 0;
                        const count = treeNode?.children?.length ?? 0;
                        return (
                            <button
                                key={dept.id}
                                data-testid={`dept-tile-${dept.id}`}
                                onClick={() => openDepartment(dept)}
                                className={`rounded-[10px] border px-3 py-3 text-left transition-all ${
                                    isActive
                                        ? 'border-emerald-500/20 bg-emerald-500/[0.07] hover:border-emerald-500/30'
                                        : 'border-white/7 bg-white/[0.03] hover:border-white/15'
                                }`}
                            >
                                <div className="text-[11px] font-medium text-white/85">
                                    {dept.name}
                                </div>
                                <div
                                    className={`mt-0.5 text-[10px] ${
                                        isActive ? 'text-emerald-400' : 'text-white/30'
                                    }`}
                                >
                                    {isActive
                                        ? `${count} ${count === 1 ? 'Inhalt' : 'Inhalte'}`
                                        : 'ruhig'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── 3. Zuletzt berührt ────────────────────────────────── */}
            <div className="mb-7">
                <p className="mb-2 text-[9px] uppercase tracking-[0.14em] text-white/20">
                    Zuletzt berührt
                </p>
                {personalLatestItems.length > 0 ? (
                    <div className="flex flex-col gap-1">
                        {personalLatestItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => openPersonalItem(item)}
                                className="group flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.03] px-3 py-2.5 text-left transition-all hover:border-white/10 hover:bg-white/[0.05]"
                            >
                                <div
                                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${
                                        item.kind === 'node'
                                            ? 'bg-emerald-500/[0.08]'
                                            : 'bg-white/[0.04]'
                                    }`}
                                >
                                    {item.kind === 'folder' ? (
                                        <FolderOpen
                                            size={13}
                                            className="text-white/40"
                                        />
                                    ) : (
                                        <FileText
                                            size={13}
                                            className={
                                                item.kind === 'node'
                                                    ? 'text-emerald-400/70'
                                                    : 'text-white/40'
                                            }
                                        />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[12px] text-white/75">
                                        {item.label}
                                    </div>
                                    <div className="text-[10px] text-white/25">
                                        {item.timestamp
                                            ? relativeTime(
                                                  new Date(item.timestamp).toISOString(),
                                              )
                                            : ''}
                                    </div>
                                </div>
                                <span className="flex-shrink-0 text-[10px] text-white/15 opacity-0 transition-opacity group-hover:opacity-100">
                                    öffnen →
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-[12px] text-white/30">
                        Noch keine Inhalte. Starte im Finder.
                    </p>
                )}
            </div>

            {/* ── 4. Quick Actions ──────────────────────────────────── */}
            <div className="flex flex-wrap gap-2">
                <button
                    data-testid="qa-finder"
                    onClick={openFinder}
                    className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.08] px-3.5 py-1.5 text-[11px] text-emerald-300/70 transition-all hover:border-emerald-500/25 hover:text-emerald-300/90"
                >
                    Finder öffnen
                </button>
                <button
                    onClick={openMora}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-white/40 transition-all hover:border-white/14 hover:text-white/65"
                >
                    Mora fragen
                </button>
                <button
                    onClick={openUpload}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-white/40 transition-all hover:border-white/14 hover:text-white/65"
                >
                    Datei hochladen
                </button>
            </div>

            {/* ── Logout ────────────────────────────────────────────── */}
            <div className="mt-8 flex justify-end">
                <button
                    type="button"
                    data-testid="home-logout"
                    onClick={() => void handleLogout()}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/30 transition-all hover:text-white/55"
                >
                    <LogOut size={14} />
                    Abmelden
                </button>
            </div>

        </div>
    </div>
);
```

- [ ] **Step 6: Type-check**

```bash
cd C:/saimor/mora-ui-cleanup && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. Fix any unused-variable errors (remove from destructuring if needed).

- [ ] **Step 7: Commit**

```bash
git add components/home/HomeSurface.tsx lib/home/briefing.ts
git commit -m "feat(home): ambient intelligence redesign — pulse tiles, briefing strip, recent items"
```

---

## Chunk 3: Test Fixes

### Task 5: Update HomeSurface.test.tsx

**Files:**
- Modify: `__tests__/components/home/HomeSurface.test.tsx`

The existing tests check for elements that no longer exist (nav card grid, greeting h1, etc). Update them to reflect the new surface.

- [ ] **Step 1: Run existing tests to see what's failing**

```bash
cd C:/saimor/mora-ui-cleanup && npx jest --no-coverage --testPathPattern="HomeSurface.test" 2>&1 | grep -E "PASS|FAIL|✓|✗|×|●" | head -30
```

- [ ] **Step 2: Update the test mocks at the top of the file**

The new HomeSurface uses `departments` and `treeData` from the store. Update `beforeEach`:

```typescript
beforeEach(() => {
    jest.clearAllMocks();

    mockFetchNodes.mockResolvedValue([]);
    mockFetchMyContent.mockResolvedValue(null);
    mockAuthLogout.mockResolvedValue({ success: true } as any);
    (coreClient.coreGet as jest.Mock).mockResolvedValue({ events: [] });

    usePaneStore.setState({ openPane } as any);
    useAccountStore.setState({ logout: accountLogout } as any);

    setStore({
        activeCompanyId: 'co-1',
        coreMode: 'home',
        user: { id: 'u-1', name: 'Anna Mueller', role: 'member' },
        isStandardMode: false,
        resetStore,
        setUser,
        departments: [
            { id: 'd-rnd', name: 'R&D', slug: 'rnd', tenant_id: 't1', order: 0 },
            { id: 'd-product', name: 'Product', slug: 'product', tenant_id: 't1', order: 1 },
        ],
        treeData: [
            { id: 'd-rnd', name: 'R&D', type: 'department', children: [] },
            { id: 'd-product', name: 'Product', type: 'department', children: undefined },
        ],
    } as any);
});
```

- [ ] **Step 3: Replace the entire test body**

**Delete all existing `describe` blocks** in the file — the following blocks become stale after the rewrite and will produce ~20 failures if left in:
- `describe('HomeSurface - rendering', ...)` — greeting `h1` and `Arbeitsplatz` heading are gone
- `describe('HomeSurface - Recent Docs', ...)` — `recent-docs-section`, `recent-doc-item`, `recent-docs-empty` testids removed
- `describe('HomeSurface - Quick Access', ...)` — `qa-meine-dateien`, `qa-notes`, `qa-mora`, `qa-explore` buttons removed
- `describe('HomeSurface - Personal Area', ...)` — `personal-area-section`, `my-content-card` testids removed
- `describe('HomeSurface — recent items list', ...)` — added in Task 3 Step 1, keep this one

Keep only the `import` block, `jest.mock(...)` calls, mock variable declarations, and the `beforeEach` updated in Step 2. Then append the following new describes:

```typescript
describe('HomeSurface — briefing strip', () => {
    it('renders the Mora label', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByText('Mora')).toBeInTheDocument();
        });
    });

    it('renders a briefing message', async () => {
        // R&D has children:[], Product has children:undefined
        // buildBriefing: R&D is quiet (loaded, empty), Product is skipped (undefined)
        // Result: "R&D ist ruhig."
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByText(/R&D/i)).toBeInTheDocument();
        });
    });
});

describe('HomeSurface — dept tiles', () => {
    it('renders a tile per department', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByTestId('dept-tile-d-rnd')).toBeInTheDocument();
            expect(screen.getByTestId('dept-tile-d-product')).toBeInTheDocument();
        });
    });

    it('clicking a dept tile calls openPane with departmentId', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('dept-tile-d-rnd'));
        fireEvent.click(screen.getByTestId('dept-tile-d-rnd'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ departmentId: 'd-rnd' }) })
        );
    });
});

describe('HomeSurface — logout', () => {
    it('renders a visible logout button', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByTestId('home-logout')).toBeInTheDocument();
        });
    });

    it('calls auth logout on click', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('home-logout'));
        fireEvent.click(screen.getByTestId('home-logout'));
        await waitFor(() => {
            expect(mockAuthLogout).toHaveBeenCalled();
        });
    });
});

describe('HomeSurface — quick actions', () => {
    it('renders Finder öffnen button', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByTestId('qa-finder')).toBeInTheDocument();
        });
    });

    it('clicking Finder öffnen opens finder pane', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('qa-finder'));
        fireEvent.click(screen.getByTestId('qa-finder'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'finder' })
        );
    });
});
```

- [ ] **Step 4: Run the full HomeSurface test suite**

```bash
cd C:/saimor/mora-ui-cleanup && npx jest --no-coverage --testPathPattern="HomeSurface.test" 2>&1 | tail -25
```

Expected: all tests passing (green)

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
cd C:/saimor/mora-ui-cleanup && npx jest --no-coverage --testPathPattern="__tests__" 2>&1 | tail -20
```

Expected: same number of passing tests as before (81), no new failures

- [ ] **Step 6: Commit**

```bash
git add __tests__/components/home/HomeSurface.test.tsx
git commit -m "test(home): update HomeSurface tests for ambient redesign"
```

---

## Verification

After all tasks are complete, verify in the browser:

```bash
# Dev server should already be running on port 3003
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003
```

Navigate to home, check:
- [ ] No right panel visible (MoraPulsePanel gone)
- [ ] Mora briefing strip appears at top with pulsing dot
- [ ] Department tiles render (R&D, Product, Growth, Intelligence)
- [ ] Clicking a dept tile opens Finder scoped to that department
- [ ] "Zuletzt berührt" shows recent items (or empty state if none)
- [ ] Quick actions visible: Finder öffnen / Mora fragen / Datei hochladen
- [ ] Abmelden button present (bottom right)
