# CoreLayer / HomeSurface — Implementation Order

**Date:** 2026-03-27
**Branch:** `stabilize/beta-1.5`
**Prerequisite commits:** f8ce507 (surface registry + Dock + MoraShell gating), 29433ea (coreMode state)

---

## Current State

### What ViewPort.tsx does for `viewLevel='core'`

`components/layout/ViewPort.tsx` lines 42-54: when `effectiveViewLevel === 'core'` it renders a single `<motion.div key="core">` containing `<UniverseView />` directly. There is no branching on `coreMode`. The orbital planet map is always shown — there is no home surface yet.

### What CoreLayer.tsx currently is

`components/layers/CoreLayer.tsx` exists but is **not mounted anywhere in the current routing path**. ViewPort renders `<UniverseView />` directly for `core` level; CoreLayer is orphaned. Its current content is an Inbox-stack widget (folders + nodes lookup) overlaid on the same canvas as UniverseView — it predates the `coreMode` split. It does not know about `coreMode: 'home' | 'explore'`.

### State now available

`lib/store/moraState.ts` lines 81, 186, 256, 330, 389:

```ts
export type CoreMode = 'home' | 'explore';
// In store interface:
coreMode: CoreMode;             // default: 'home' (line 330)
setCoreMode: (mode: CoreMode) => void;  // plain set{} (line 389)
// Company switch also resets coreMode: 'home' (line 480)
```

`Dock.tsx` line 234 already calls both `setViewLevel('core')` and `setCoreMode('home')` for the home dock action.

`MoraShell.tsx` line 463-465: `onGoHome` calls `navigateToCore()` which sets `viewLevel: 'core'` but does **not** call `setCoreMode`. This is a gap that must be fixed in Commit A — `onGoHome` must also call `setCoreMode('home')`.

`navigateToCore()` in moraState (line 1452) also does not set `coreMode`. Any caller using `navigateToCore()` (DepartmentLayer breadcrumb, MoraUpdatesFeed, UniverseView's back-link) gets `viewLevel='core'` but leaves `coreMode` at whatever it was last. Commit C resolves this for the breadcrumb root-click path.

---

## 3-Commit Implementation Plan

### Commit A — CoreLayer Wrapper

**Goal:** Make ViewPort route through CoreLayer, and have CoreLayer branch on `coreMode`. UniverseView (explore) and HomeSurface (placeholder) are both reachable. `onGoHome` sets `coreMode='home'` correctly.

#### File changes

**`components/layout/ViewPort.tsx`**

Replace the `effectiveViewLevel === 'core'` block (lines 42-54). Instead of rendering `<UniverseView />` directly, render `<CoreLayer />`:

```tsx
import { CoreLayer } from '@/components/layers/CoreLayer';
// Remove: import UniverseView from '@/components/home/UniverseView';

{effectiveViewLevel === 'core' && (
    <motion.div
        key="core"
        initial={...}  // same variants as before
        animate={...}
        exit={...}
        transition={...}
        className="absolute inset-0"
    >
        <CoreLayer />
    </motion.div>
)}
```

UniverseView import moves inside CoreLayer; ViewPort no longer imports it directly.

**`components/layers/CoreLayer.tsx`**

Rewrite (replacing the current Inbox-widget implementation) to be a thin router:

```tsx
"use client";
import React from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import UniverseView from '@/components/home/UniverseView';
import { HomeSurface } from '@/components/home/HomeSurface';
import { AnimatePresence, motion } from 'framer-motion';

export const CoreLayer: React.FC = () => {
    const coreMode = useMoraStore((s) => s.coreMode);

    return (
        <div className="relative w-full h-full">
            <AnimatePresence mode="wait" initial={false}>
                {coreMode === 'home' && (
                    <motion.div key="home" ... className="absolute inset-0">
                        <HomeSurface />
                    </motion.div>
                )}
                {coreMode === 'explore' && (
                    <motion.div key="explore" ... className="absolute inset-0">
                        <UniverseView />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
```

Animation for Commit A: simple opacity crossfade (no scale). Commit C adds the production animation.

**`components/home/HomeSurface.tsx`** — new file

Commit A placeholder only:

```tsx
"use client";
import React from 'react';

export const HomeSurface: React.FC = () => (
    <div className="w-full h-full flex items-center justify-center">
        <p className="text-white/40 text-sm tracking-widest uppercase">Home — coming soon</p>
    </div>
);
```

**`components/os/shell/MoraShell.tsx`** — fix `onGoHome` gap

Line 463-465: `onGoHome` currently calls `navigateToCore()` only. Add `setCoreMode('home')`:

```ts
onGoHome: useCallback(() => {
    const store = useMoraStore.getState();
    store.navigateToCore();
    store.setCoreMode('home');
}, []),
```

#### Files touched

- `components/layout/ViewPort.tsx`
- `components/layers/CoreLayer.tsx` (rewrite)
- `components/home/HomeSurface.tsx` (new)
- `components/os/shell/MoraShell.tsx` (onGoHome fix)

#### Tests to write (TDD — write before implementation)

File: `__tests__/components/layers/CoreLayer.test.tsx`

- When `coreMode='home'`: renders HomeSurface, does NOT render UniverseView
- When `coreMode='explore'`: renders UniverseView, does NOT render HomeSurface
- Switching `coreMode` from `'home'` to `'explore'`: unmounts HomeSurface, mounts UniverseView
- CoreLayer reads `coreMode` from `useMoraStore` (mock the store)

File: `__tests__/components/os/shell/MoraShell.goHome.test.tsx`

- `onGoHome` calls `navigateToCore()` AND `setCoreMode('home')` on the store

---

### Commit B — HomeSurface Skeleton

**Goal:** HomeSurface shows real sections with API data: Recent Docs, Activity, Quick Access (My Content card). Each section degrades gracefully to an empty state — no fake data.

#### HomeSurface component structure

```
HomeSurface
├── Header row: "Guten Morgen, {user.name}" + date
├── Section: Recent Docs          ← fetchNodesByCompany (approximation, see API Contract)
├── Section: Activity             ← no dedicated endpoint yet; empty state in Commit B
├── Section: Quick Access         ← My Content card via fetchMyContent()
└── Footer: "Explore →" button    ← calls setCoreMode('explore') (wired in Commit C)
```

HomeSurface manages its own local state (one `useEffect` per section, `isOptional: true` pattern throughout). Do not put section data in moraState — this is view-local.

#### API calls per section

**Recent Docs**

Use `fetchNodesByCompany(activeCompanyId, { limit: 8 })` from `lib/api/coreClient.ts` (line 485). This is an approximation — it returns company nodes sorted by creation time, not by last-viewed-by-user. A dedicated `/v3/users/me/recent` endpoint is needed for the real thing (see API Contract Dependencies). Pattern:

```ts
const [recentNodes, setRecentNodes] = useState<CoreNode[]>([]);
useEffect(() => {
    if (!activeCompanyId) return;
    let cancelled = false;
    fetchNodesByCompany(activeCompanyId, { limit: 8 })
        .then((nodes) => { if (!cancelled) setRecentNodes(nodes ?? []); })
        .catch(() => { if (!cancelled) setRecentNodes([]); });
    return () => { cancelled = true; };
}, [activeCompanyId]);
```

Use the same stale-closure cancellation pattern as `FinderPane.tsx` line 1027-1072.

**Activity**

No endpoint available in Commit B. Render section with empty state only (see below). Do not call any endpoint.

**Quick Access / My Content card**

Use `fetchMyContent()` (`lib/api/coreClient.ts` line 1887). Returns `UserContentResponse | null`. Show:
- Count of user's nodes (`content.counts?.nodes ?? 0`)
- Count of user's files (`content.counts?.files ?? 0`)
- "My Files →" link that opens MeineDateienPane (Commit C wires this; stub the button in Commit B)

```ts
const [myContent, setMyContent] = useState<UserContentResponse | null>(null);
useEffect(() => {
    let cancelled = false;
    fetchMyContent()
        .then((c) => { if (!cancelled) setMyContent(c); })
        .catch(() => { if (!cancelled) setMyContent(null); });
    return () => { cancelled = true; };
}, []);
```

#### Error / empty state handling per section

Every section must render independently. One section failing must not blank the whole surface.

| Section | 404 / null | Empty array |
|---|---|---|
| Recent Docs | Show "Keine aktuellen Dokumente." | Same message |
| Activity | Static "Keine Aktivität." (always in Commit B) | — |
| My Content card | Show "Persönlicher Bereich nicht verfügbar." | Show counts as 0 |

No spinners that block layout. Use a subtle `opacity-50 animate-pulse` skeleton line per section while loading, then replace with real content or empty state.

#### Files touched

- `components/home/HomeSurface.tsx` (real implementation replacing Commit A placeholder)
- `lib/api/coreClient.ts` — no changes needed; `fetchNodesByCompany` and `fetchMyContent` already exist

#### Tests to write

File: `__tests__/components/home/HomeSurface.test.tsx`

- Renders "Guten Morgen" header with user name from store
- Recent Docs: calls `fetchNodesByCompany` with `activeCompanyId` and `{ limit: 8 }`
- Recent Docs: shows node titles when response is non-empty
- Recent Docs: shows empty state message when `fetchNodesByCompany` returns `[]`
- Recent Docs: shows empty state message when `fetchNodesByCompany` returns `null` (isOptional null)
- Recent Docs: cancels in-flight fetch on unmount (cancelled flag)
- My Content: calls `fetchMyContent`
- My Content: shows node/file counts from `UserContentResponse.counts`
- My Content: shows fallback message when `fetchMyContent` returns `null`
- Activity section: renders empty state without making any API call

---

### Commit C — Polish + Navigation Wiring

**Goal:** All navigation paths set `coreMode` correctly. Crossfade animation. Explore entry points wired. My Files button opens MeineDateienPane.

#### Explore button in HomeSurface

Wire the "Explore →" button stub from Commit B:

```tsx
const setCoreMode = useMoraStore((s) => s.setCoreMode);
// In footer:
<button onClick={() => setCoreMode('explore')}>Universum erkunden →</button>
```

No keyboard shortcut for Explore in 1.0 (Mod+H already covers home; explore is intentional navigation, not a reflex shortcut).

#### Breadcrumb root click: `navigateToCore()` must set `coreMode='explore'`

When a user is in department/space/folder and clicks the breadcrumb root (company name), the intent is to return to the universe map — not to HomeSurface. Currently `navigateToCore()` does not set `coreMode` at all, leaving it at whatever it was.

Fix: update `navigateToCore()` in `lib/store/moraState.ts` (line 1452) to set `coreMode: 'explore'`:

```ts
navigateToCore: () => {
    set({
        viewLevel: 'core',
        coreMode: 'explore',   // ← add this
        activeDepartmentId: null,
        activeSpaceId: null,
        activeFolderId: null,
        orbState: 'idle'
    });
},
```

Callers of `navigateToCore()` that should reach Explore: `DepartmentLayer.tsx` line 380, `UniverseView.tsx` line 366, `MoraUpdatesFeed.tsx` line 405, `MoraShell.tsx` line 464 (the keyboard shortcut — but `onGoHome` overrides this to 'home' explicitly, so fix order matters: `onGoHome` must keep its explicit `setCoreMode('home')` call added in Commit A).

After this change, the navigation model is correct:
- Dock "Start" / Mod+H → `viewLevel='core'`, `coreMode='home'` (via Dock line 234 + onGoHome fix from Commit A)
- Breadcrumb root click from any depth → `viewLevel='core'`, `coreMode='explore'` (via updated `navigateToCore`)
- HomeSurface "Explore" button → `coreMode='explore'` (view stays 'core')

#### My Files button

In HomeSurface, wire the "My Files →" stub to open MeineDateienPane:

```tsx
const openPane = usePaneStore((s) => s.openPane);
// In My Content card:
<button onClick={() => openPane({ id: 'meine-dateien-main', type: 'meine-dateien', title: 'Meine Dateien', size: { width: 960, height: 700 } })}>
    Meine Dateien →
</button>
```

#### Animation: crossfade between Home and Explore

Replace Commit A's opacity-only variants in `CoreLayer.tsx` with the production crossfade. Match the viewport scale pattern used by ViewPort for department/space:

```tsx
const homVariants = {
    initial:    { opacity: 0, scale: 0.97 },
    animate:    { opacity: 1, scale: 1 },
    exit:       { opacity: 0, scale: 1.04, transition: { duration: 0.25 } },
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
};
// explore entry mirrors the zoom-in pattern from ViewPort lines 46-53
const exploreVariants = {
    initial:    { opacity: 0, scale: 0.95 },
    animate:    { opacity: 1, scale: 1 },
    exit:       { opacity: 0, scale: 2.85, filter: 'blur(16px)', transition: { duration: 0.35, ease: [0.6, 0.05, 0, 0.9] } },
    transition: { duration: 0.8, ease: [0.6, 0.05, 0, 0.9] },
};
```

Apply `useReducedMotion` guard using the same `rmVariants` pattern as `ViewPort.tsx` lines 29-36.

#### Files touched

- `components/home/HomeSurface.tsx` (Explore button wire, My Files button wire)
- `lib/store/moraState.ts` (`navigateToCore` adds `coreMode: 'explore'`)
- `components/layers/CoreLayer.tsx` (production animation variants replacing Commit A opacity-only)

#### Tests to write

File additions to `__tests__/components/home/HomeSurface.test.tsx`:

- "Explore" button calls `setCoreMode('explore')` on click
- "Meine Dateien" button calls `openPane` with type `'meine-dateien'`

File additions to `__tests__/components/layers/CoreLayer.test.tsx`:

- Renders with `useReducedMotion=true`: uses opacity-only variants (no scale)

File: `__tests__/lib/store/moraState.navigateToCore.test.ts`

- `navigateToCore()` sets `coreMode: 'explore'`
- `navigateToCore()` sets `viewLevel: 'core'`, `activeDepartmentId: null`, `activeSpaceId: null`
- `onGoHome` handler (MoraShell) sets `coreMode: 'home'` even though `navigateToCore()` sets `'explore'` — verify call order

---

## What NOT to build in these 3 commits

| Out of scope | Why |
|---|---|
| Dedicated `fetchTeamActivity` helper or Activity section data | No `/v3/users/me/activity` endpoint in saimor-core. Building a frontend helper for a non-existent endpoint produces dead code. Defer until Core ships the endpoint. |
| MeineDateienPane inline in HomeSurface | MeineDateienPane is a full pane (`core_work` tier per surface spec). Embedding it inline would duplicate the pane UI and break the single-source architecture. Opening it via `openPane` (Commit C) is the correct pattern. |
| Full Personal Area build-out | The personal space system (`fetchMyContent`, `fetchPersonalSpace`) needs backend stabilization. Commit B shows counts only — the full personal area is a separate feature milestone. |
| Dedicated "Recent" endpoint integration | `/v3/users/me/recent` does not exist yet. `fetchNodesByCompany` is the approximation. Replace when Core ships the endpoint. |
| Activity feed real-time updates | WebSocket presence (`usePresence`) is team-scoped; there is no user-activity stream in 1.0. |
| Keyboard shortcut for Explore mode | Explore is spatial navigation, not a daily reflex. Mod+H (home) is sufficient for 1.0. Adding Mod+E would need surfaceRegistry entry and KeyboardShortcutsOverlay update — out of scope. |
| `CoreLayer` animation into sub-views (department zoom) | The zoom-out transition from UniverseView → DepartmentLayer is already handled by ViewPort's `effectiveViewLevel` switch. CoreLayer only needs to handle the home↔explore crossfade. |
| Removing old `CoreLayer` Inbox widget code from git history | The rewrite in Commit A replaces it. No archaeology needed. |

---

## API Contract Dependencies

### Endpoints that must exist for HomeSurface to show real data

| Section | Required endpoint | Status |
|---|---|---|
| Recent Docs (real) | `GET /v3/users/me/recent?limit=N` → `CoreNode[]` | Not yet in saimor-core |
| Activity | `GET /v3/users/me/activity` → activity events list | Not yet in saimor-core |
| My Content card | `GET /v3/users/me/content` → `UserContentResponse` | Exists (live) |

### What can be approximated with existing endpoints

| Section | Approximation | Existing function |
|---|---|---|
| Recent Docs | Company-wide nodes sorted by `created_at` desc, limited to 8 | `fetchNodesByCompany(companyId, { limit: 8 })` — `lib/api/coreClient.ts` line 485 |
| My Content counts | Full content object, show `.counts.*` | `fetchMyContent()` — line 1887, endpoint `/v3/users/me/content` |
| User memberships (for dept context) | Already used by UniverseView | `fetchUserMemberships()` — line 1737, endpoint `/v3/users/me/memberships` |

The approximation for Recent Docs is intentionally disclosed in a code comment — it must be swapped for the real endpoint without changing the section's rendering contract.

### What HomeSurface shows if an endpoint returns 404 / null

All fetch calls in HomeSurface use `isOptional: true` via `coreGet` (the same pattern as `fetchMyContent`, `fetchUserMemberships`, `fetchPersonalSpace`). On null return:

| Section | Display |
|---|---|
| Recent Docs | "Keine aktuellen Dokumente." — quiet, no error icon |
| Activity | "Keine Aktivität." — always in Commit B; same message when endpoint later returns empty |
| My Content card | "Persönlicher Bereich nicht verfügbar." with a small info icon; card still renders at reduced opacity |

No section shows a toast or an error boundary. Failure is silent and local. The surface as a whole is never blank — at minimum the header and the Explore button are always visible.

HomeSurface must never call `setInboxError` or any global state mutation on fetch failure — failures stay in component-local state.
