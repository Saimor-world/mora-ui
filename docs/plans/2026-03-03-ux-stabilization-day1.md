# UX Stabilization Day 1 — Frontend Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stabilize Finder navigation, L2/L3 orbit interaction, Dock states, TeamPane source labeling, and context scope signal — without touching backend routes or Codex-owned services.

**Architecture:** Five micro-releases, each buildable and smoke-testable independently. Tasks are purely frontend (`mora-ui`). No new API endpoints — all work uses v3 APIs already wired in Commit 1+2.

**Tech Stack:** Next.js 15, React, Tailwind v3, Framer Motion, Zustand (useMoraStore / usePaneStore), `lib/api/coreClient.ts`

**Active branch / worktree:** `stabilize/beta-1.5` at `C:/saimor/mora-ui` (worktree `beautiful-hermann`)

---

## Codebase Reality Check (read before starting)

These things **already work** — do not rebuild them:
- `FinderPane.tsx`: Back ✅, Forward ✅, Up ✅, breadcrumb-click ✅, FolderContext breadcrumb bar ✅
- `Dock.tsx`: `MAX_SHIFT = 0`, `MAX_TILT = 0` — magnetic drift already disabled ✅
- `UsersPane.tsx`: role select + active toggle (Commit 2) ✅
- `TeamPane.tsx`: no synthetic members (Commit 2) ✅

These things **need work** (confirmed from code inspection):
- L3 `SpaceLayer`: orbit continues during hover → perceived drift; folder z-index can intercept space click
- L2 `DepartmentLayer`: center dept orb position not verified against container bounds; tooltip overflow
- Finder: sticky server-breadcrumb bar visibility under scroll; view-state (grid/list/graph) lost on folder change
- TeamPane: no "source" label or active/total counters
- No in-UI scope signal ("answering in context of…")

---

## Micro-Release #1 — Finder Stability

**Files:**
- Modify: `components/panes/FinderPane.tsx`

### Task 1.1: Preserve view mode across folder navigation

Current bug: switching to Graph view, then navigating to a sub-folder, resets to Grid.

**Step 1: Locate view state**

In `FinderPane.tsx`, find `useState` for `viewMode` (Grid/List/Graph). Confirm it resets when `navigateToFolder` is called.

**Step 2: Move view state outside navigation reset**

The `navigateToFolder` function likely resets local UI state. Verify it does NOT reset `viewMode`. If it does, extract viewMode to a `useRef` or move it above the reset block.

```typescript
// BEFORE (likely pattern):
const navigateToFolder = (id: string) => {
    setBackStack(prev => [...prev, currentFolderId]);
    setForwardStack([]);
    setCurrentFolderId(id);
    setViewMode('grid'); // ← BUG: resets view
};

// AFTER:
const navigateToFolder = (id: string) => {
    setBackStack(prev => [...prev, currentFolderId]);
    setForwardStack([]);
    setCurrentFolderId(id);
    // viewMode intentionally not reset
};
```

**Step 3: Verify manually**
Switch to List view → navigate into a folder → view stays List.

**Step 4: Commit**
```bash
git -C C:/saimor/mora-ui add components/panes/FinderPane.tsx
git -C C:/saimor/mora-ui commit -m "fix(finder): preserve view mode across folder navigation"
```

---

### Task 1.2: Sticky server-breadcrumb bar always visible

The `folderContext` breadcrumb bar (from `/v3/folders/{id}/context`) was added in Commit 1 but may scroll out of view when the content list is long.

**Step 1: Find the breadcrumb bar JSX**

In `FinderPane.tsx`, find the `folderContext?.path &&` conditional block added in Commit 1. It should be inside the content container.

**Step 2: Ensure it is outside the scrollable content div**

The breadcrumb bar must be a sibling of the scroll container, not inside it:

```tsx
{/* CORRECT: breadcrumb bar outside the scroll region */}
<div className="flex flex-col h-full">
    {folderContext?.path && (
        <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] ... flex-shrink-0">
            {/* breadcrumb segments */}
        </div>
    )}
    <div className="flex-1 overflow-auto"> {/* scrollable content */}
        {/* files and folders */}
    </div>
</div>
```

**Step 3: Verify**
Navigate to a folder with many files → scroll down → breadcrumb bar stays at top.

**Step 4: Commit**
```bash
git -C C:/saimor/mora-ui add components/panes/FinderPane.tsx
git -C C:/saimor/mora-ui commit -m "fix(finder): sticky server breadcrumb bar above scroll region"
```

---

### Task 1.3: Context actions (new folder, refresh) always scoped to current path

**Step 1: Find context action buttons**

In `FinderPane.tsx`, find the toolbar area where "New Folder", "Upload", or "Sort" buttons live (search for `addFolder` or `handleCreateFolder`).

**Step 2: Verify they use `currentFolderId` not `null`**

Every mutation action must guard with:
```typescript
if (!currentFolderId) return; // no action at root
```
And pass `currentFolderId` as `parent_id` or `space_id` to the API call.

**Step 3: Disable (not hide) context actions at root**

At the root view (no `currentFolderId`), context actions should be visually disabled:
```tsx
<button
    disabled={!currentFolderId}
    className={`... ${!currentFolderId ? 'opacity-30 cursor-not-allowed' : ''}`}
    onClick={() => currentFolderId && openCreateModal()}
>
    New Folder
</button>
```

**Step 4: Commit**
```bash
git -C C:/saimor/mora-ui add components/panes/FinderPane.tsx
git -C C:/saimor/mora-ui commit -m "fix(finder): context actions scoped to current folder, disabled at root"
```

---

## Micro-Release #2 — L3 SpaceLayer Orbit + Click Stability

**Files:**
- Modify: `components/layers/SpaceLayer.tsx`

**Background:** `SpaceLayer.tsx` uses module-level constants `RING_RADII_X`, `RING_RADII_Y`, `RING_SPEEDS`. Folder orbs orbit continuously. The issues are: (a) orbit animation continues during hover making click targets moving, (b) folder click z-index overlaps with the center space-click zone.

### Task 2.1: Pause orbit on hover (no persistent drift)

**Step 1: Find `orbitVelocity` state and `hoveredFolderId` state**

Near the top of `SpaceLayer`, find:
```typescript
const [orbitVelocity, setOrbitVelocity] = useState(1.0);
const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
```

**Step 2: Freeze velocity on any folder hover**

```typescript
// Add effect that zeros velocity while any folder is hovered
useEffect(() => {
    setOrbitVelocity(hoveredFolderId ? 0 : 1.0);
}, [hoveredFolderId]);
```

If `orbitVelocity` isn't a separate state and is always `1.0`, add the state and thread it through:
```typescript
const [orbitVelocity, setOrbitVelocity] = useState(1.0);
// in folderOrbitPositions useMemo, it already uses: orbitTime * RING_SPEEDS[ring] * orbitVelocity
```

**Step 3: Wire hover into each folder orb's `onMouseEnter`/`onMouseLeave`**

In the JSX that renders each folder orb (look for `folderOrbitPositions.map`):
```tsx
<motion.div
    key={fp.folder.id}
    onMouseEnter={() => setHoveredFolderId(fp.folder.id)}
    onMouseLeave={() => setHoveredFolderId(null)}
    ...
>
```

**Step 4: Verify**
Hover over a folder orb → orbit freezes → move away → orbit resumes. No position jump on hover-out.

**Step 5: Commit**
```bash
git -C C:/saimor/mora-ui add components/layers/SpaceLayer.tsx
git -C C:/saimor/mora-ui commit -m "fix(L3): freeze orbit on folder hover, resume on leave"
```

---

### Task 2.2: Decouple folder click from center-orb click zone

**Step 1: Find the center orb JSX**

In `SpaceLayer.tsx`, find the `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` div that renders the center orb. It should have `pointer-events-none` (it's decorative) or a click handler for "open Finder".

**Step 2: Set explicit z-index layering**

```tsx
{/* Center orb — z-10, pointer-events only on click target, not the aura */}
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
    {/* auras: pointer-events-none */}
    <div className="... pointer-events-none" /> {/* outer aura */}
    <div className="... pointer-events-none" /> {/* mid aura */}
    {/* core orb: pointer-events-auto only here */}
    <div
        className="relative w-36 h-36 rounded-full ... pointer-events-auto cursor-pointer"
        onClick={handleOpenFinderPane}
    >
        ...
    </div>
</div>

{/* Folder orbs — z-20, above center-orb click area */}
{folderOrbitPositions.map(fp => (
    <div key={fp.folder.id} className="absolute z-20 ..." style={{ ... }}>
        ...
    </div>
))}
```

**Step 3: Verify**
Click directly on center orb → opens Finder pane. Click on a folder orb → opens folder, NOT Finder. No accidental cross-triggers.

**Step 4: Commit**
```bash
git -C C:/saimor/mora-ui add components/layers/SpaceLayer.tsx
git -C C:/saimor/mora-ui commit -m "fix(L3): decouple folder z-index from center-orb click zone"
```

---

## Micro-Release #3 — L2 DepartmentLayer Polish

**Files:**
- Modify: `components/layers/DepartmentLayer.tsx`

### Task 3.1: Verify center dept orb is viewport-centered

**Step 1: Find where the central dept orb is rendered**

Search `DepartmentLayer.tsx` for `top-1/2 left-1/2` or for the golden sun / central orb element. It likely uses absolute positioning relative to the container.

**Step 2: Ensure the orb container uses `relative` and the orb uses transform-center**

```tsx
{/* Container must be position:relative, full-size */}
<div className="relative w-full h-full overflow-hidden">
    {/* Central dept orb: centered via CSS transform */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        {/* dept orb content */}
    </div>

    {/* Moon orbs: offset from center via transform */}
    {moonPositions.map(moon => (
        <div
            key={moon.id}
            className="absolute top-1/2 left-1/2 z-20"
            style={{ transform: `translate(calc(-50% + ${moon.x}px), calc(-50% + ${moon.y}px))` }}
        >
            {/* space moon */}
        </div>
    ))}
</div>
```

The moon positions are already calculated as `x = cos(angle) * rx`, `y = sin(angle) * ry` relative to center origin — they just need `translate(calc(-50% + Xpx), calc(-50% + Ypx))` to stay center-anchored.

**Step 3: Commit**
```bash
git -C C:/saimor/mora-ui add components/layers/DepartmentLayer.tsx
git -C C:/saimor/mora-ui commit -m "fix(L2): center dept orb via CSS transform, moon offsets from center"
```

---

### Task 3.2: Tooltip overflow prevention

**Step 1: Find space moon labels/tooltips in DepartmentLayer**

Search for the label rendering inside `moonPositions.map`. Labels likely use absolute positioning that can overflow at viewport edges.

**Step 2: Clamp label position**

For moons in the left half of the viewport, render label to the right; for right half, render to the left:

```tsx
const labelSide = moon.x < 0 ? 'left-full ml-2' : 'right-full mr-2';

<div className={`absolute top-1/2 -translate-y-1/2 ${labelSide} whitespace-nowrap pointer-events-none`}>
    {moon.name}
</div>
```

**Step 3: Commit**
```bash
git -C C:/saimor/mora-ui add components/layers/DepartmentLayer.tsx
git -C C:/saimor/mora-ui commit -m "fix(L2): tooltip overflow prevention based on moon x-position"
```

---

## Micro-Release #4 — TeamPane Source Label + Counters

**Files:**
- Modify: `components/panes/TeamPane.tsx`

### Task 4.1: Add "Real accounts" source label and counters

**Step 1: Find the TeamPane header area**

In `TeamPane.tsx`, find the `<h2>` or header section that shows "Team".

**Step 2: Add source badge and counters**

After Commit 2, `members` is strictly API-driven. Add explicit labeling:

```tsx
{/* In the header, below the title */}
<div className="flex items-center gap-2 mt-1">
    <span className="text-[10px] text-emerald-400/60 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full tracking-widest uppercase">
        Live · Echtdaten
    </span>
    <span className="text-xs text-white/30">
        {members.filter(m => m.status === 'active').length} aktiv
        {' · '}
        {members.length} gesamt
    </span>
</div>
```

**Step 3: Verify**
Open TeamPane → see "Live · Echtdaten" badge + "X aktiv · Y gesamt" count. Counts match API data.

**Step 4: Commit**
```bash
git -C C:/saimor/mora-ui add components/panes/TeamPane.tsx
git -C C:/saimor/mora-ui commit -m "feat(team): add live source badge and active/total member counters"
```

---

## Micro-Release #5 — Context Scope Signal

**Files:**
- Modify: `components/layers/IntelligenceContextBar.tsx` OR `components/os/shell/MoraShell.tsx`
- Read: `lib/store/moraState.ts` (for `activeCompanyId`, `activeDepartmentId`, `activeSpaceId`, `activeNode`)

**Background:** Plan item 49 requests a UI signal "Du fragst gerade im Scope: …" so users know which context their chat queries are scoped to.

### Task 5.1: Read current context from moraState

**Step 1: Check IntelligenceContextBar.tsx**

Open `components/layers/IntelligenceContextBar.tsx`. Understand what it currently shows and where it is positioned in the shell.

**Step 2: Add scope breadcrumb line**

In `IntelligenceContextBar.tsx` (or the appropriate context bar component), add a scope display line that reads from moraStore:

```tsx
const { activeCompanyId, activeDepartmentId, activeSpaceId, companies, departments, spacesByDepartment } = useMoraStore();

const company   = companies.find(c => c.id === activeCompanyId);
const dept      = departments.find(d => d.id === activeDepartmentId);
const allSpaces = Object.values(spacesByDepartment).flat();
const space     = allSpaces.find(s => s.id === activeSpaceId);

const scopeParts = [company?.name, dept?.name, space?.name].filter(Boolean);
const scopeLabel = scopeParts.length > 0 ? scopeParts.join(' › ') : 'Gesamter Workspace';
```

**Step 3: Render the scope signal**

```tsx
{/* Scope signal — only show when a context is active */}
{activeDepartmentId && (
    <div className="flex items-center gap-1.5 text-[10px] text-white/30 px-3 py-1 border-b border-white/5">
        <span className="text-white/20">Kontext:</span>
        <span className="text-white/50 font-medium">{scopeLabel}</span>
    </div>
)}
```

**Step 4: Verify**
Navigate into a department → context bar shows "Kontext: Nextchapter Germany › HR". Navigate to a space → shows "… › HR › Onboarding". Return to root → signal disappears.

**Step 5: Commit**
```bash
git -C C:/saimor/mora-ui add components/layers/IntelligenceContextBar.tsx
git -C C:/saimor/mora-ui commit -m "feat(context): scope signal shows active company/dept/space context"
```

---

## Skipped (already done or Codex-owned)

| Item | Reason |
|---|---|
| Finder Back/Forward/Up buttons | Already exist (lines 1013-1036 FinderPane.tsx) |
| Breadcrumb click navigation | Already implemented (navigateToFolder on each segment) |
| Dock elliptical drift | Already fixed: `MAX_SHIFT = 0`, `MAX_TILT = 0` (Dock.tsx line 61-62) |
| UsersPane admin controls | Done in Commit 2 (`9f51c19`) |
| TeamPane synthetic cleanup | Done in Commit 2 |
| All Codex items | Backend, API health, LLM context, integrations plan |

---

## Test Checklist Before Each Micro-Release

Run after each release:
```bash
npx tsc --noEmit                                         # 0 errors
npx jest --no-coverage --testPathPattern="__tests__/lib" # 43 passed
```

Then manual smoke:
1. Open Finder → switch to List view → navigate 3 folders deep → view stays List
2. Hover a folder orb in L3 → orbit freezes → move away → orbit resumes
3. Open TeamPane → see "Live · Echtdaten" badge + counts
4. Navigate into a Department → see "Kontext: …" signal in context bar
