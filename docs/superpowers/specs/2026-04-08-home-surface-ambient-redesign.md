# HomeSurface Ambient Intelligence Redesign

**Date:** 2026-04-08  
**Branch:** mora-ui-cleanup  
**Status:** Approved for implementation

---

## Problem

The current HomeSurface communicates nothing about the state of the workspace. It shows:
- A static 5-card navigation grid (Finder, Meine Dateien, Notizen, Mora, Erkunden) — duplicating the bottom bar
- A `LOCAL TRUTH` badge and description — only shown on internal instances (`surfaceProfile.isLocalTruthSurface`), but still clutters the home with an internal-facing label
- A `MoraPulsePanel` permanently docked on the right — showing BUILD-SZENE, SCOPE, CLOUD config, org metadata; all noise for a working user
- An empty "Zuletzt aktualisiert" block with no data

Result: the home looks like a generic SaaS dashboard and does not reflect Mora's role as a cognitive workspace.

---

## Goal

The home screen becomes **ambient** — it tells you what's happening in your workspace right now, lets you jump into any department with one click, and shows you what you were last working on. No static navigation, no dev metadata.

---

## Design

### Layout (top → bottom, full width)

```
┌─────────────────────────────────────────────┐
│  ● MORA                        Mi, 08. Apr  │  ← Briefing strip
│  "R&D ist aktiv — 3 neue Dokumente…"        │
├─────────────────────────────────────────────┤
│  [R&D · 3 neu]  [Product]  [Growth]  [...]  │  ← Dept pulse tiles
├─────────────────────────────────────────────┤
│  ZULETZT BERÜHRT                            │
│  📄 Projektplan Q2.md    R&D · vor 2h  →   │
│  📝 Team-Meeting Notes   Product · gestern →│
│  📁 R&D Workspace        R&D · 3 Tage   →  │
├─────────────────────────────────────────────┤
│  [Finder öffnen]  [Mora fragen]  [Upload]   │  ← Quick actions
└─────────────────────────────────────────────┘
```

No right panel. No nav card grid. No status badges.

---

## Sections

### 1. Mora Briefing Strip

**Purpose:** Give the user a single sentence of situational awareness from Mora.

**Rendering:**
- Pulsing emerald dot + `MORA` label (10px, tracking-wide, emerald/50)
- Current date/time right-aligned (same line, white/18)
- 1–2 sentence briefing below (14px, white/72, font-weight 300)

**Briefing logic** (`buildBriefing(departments, treeData)`):

`treeData` root nodes map 1:1 to departments by `id`. Each root node's `children` field has three meaningful states:
- `undefined` — not yet lazy-loaded; **skip this department** (treat as loading, not quiet)
- `[]` — loaded, empty → **quiet**
- `[...n items]` — loaded with content → **active**, count = `children.length`

Build the briefing from this:
1. Active depts (children loaded + non-empty): `"${name} ist aktiv — ${count} Inhalte."`
2. Quiet depts (children loaded + empty): collect names → `"${quietNames} sind ruhig."` (second sentence, white/38)
3. Skip depts with `children === undefined`
4. Fallback when no dept has loaded children yet: `"Bereit wenn du es bist."`

**Data sources:** `departments` + `treeData` from `useMoraStore` — no new API calls.

### 2. Department Pulse Tiles

**Purpose:** Jump to any department's Finder in one click. Communicate which departments are "alive."

**Rendering:**
- Grid: `grid-cols-2` on small, `grid-cols-4` on wide (max 6 tiles, overflow hidden)
- Each tile: department `name` (11px, white/85) + activity label below (10px)
- Active tile (has treeData children): emerald border `border-emerald-500/20`, background `bg-emerald-500/7`, activity label = `"${count} Inhalte"` in emerald
- Quiet tile: `border-white/7`, `bg-white/3`, label = `"ruhig"` in white/30
- Hover: `border-white/15`, slight background lift
- Click: `openPane({ id: 'finder', type: 'finder', title: 'Finder', size: { width: 900, height: 620 }, data: { departmentId: dept.id, departmentName: dept.name } })`

**Data source:** `departments` from `useMoraStore`, cross-referenced against `treeData` children for activity counts.

### 3. Zuletzt berührt (Recent Items)

**Purpose:** Let the user pick up where they left off.

**Data source:** `fetchMyContent()` — already called in the existing `HomeSurface`. Returns `UserContentResponse` which contains `documents` / `nodes`.

**State change required:** The existing `personalLatestItem: PersonalLatestItem | null` (single item) must be widened to `personalLatestItems: PersonalLatestItem[]`. Update the `useMemo` that currently takes `[0]` to instead take the top 5 candidates (already sorted by timestamp — just don't slice to `[0]`).

**Rendering:**
- Section label: `ZULETZT BERÜHRT` (9px, tracking-[0.14em], white/20)
- Max 5 rows, each from `personalLatestItems[0..4]`
- Each row:
  - 28×28px icon tile (node type icon, emerald tint for `kind: 'node'`, white/4 otherwise)
  - Title (12px, white/75, truncated) + path+time below (10px, white/25)
  - `"öffnen →"` appears on hover (10px, white/15)
  - Click: reuse existing `openMeineDateien` / `openNodeLike` logic (same handler, just called per-item)
- Empty state (no items): `"Noch keine Inhalte. Starte im Finder."` (white/30)

### 4. Quick Actions

**Purpose:** The three most common entry points, always reachable.

**Three buttons** (ghost style, horizontal strip):
1. **Finder öffnen** — `openPane({ type: 'finder', ... })` — emerald ghost
2. **Mora fragen** — `openPane({ type: 'chat', ... })` — neutral ghost
3. **Datei hochladen** — `openPane({ type: 'finder', data: { showUpload: true }, ... })` — neutral ghost

---

## Removals

### `MoraPulsePanel` — hidden from shell

In `MoraShell.tsx` line 661:
```tsx
// BEFORE
{!hasFullscreenPane && <MoraPulsePanel />}

// AFTER
{/* MoraPulsePanel removed — org/scope info is dev-only context, not user-facing */}
```

The component is **not deleted** — it may be needed in a dev/admin surface later.

### HomeSurface internals removed

- The 5-card navigation grid (`Finder`, `Meine Dateien`, `Notizen`, `Mora`, `Erkunden` cards)
- `LOCAL TRUTH` section with badge and description
- "Instanz-Finder / Mora Center / Privaten Bereich öffnen" button row
- The `ZULETZT AKTUALISIERT` section header + its description copy
- The `KairosEvent` display block (moves to a future dedicated notification surface)

### HomeSurface internals kept

- `fetchMyContent()` call — reused; `personalLatestItem` state widened to `personalLatestItems[]` (top 5)
- `relativeTime()` utility — reused
- `openPane` wiring — reused and extended
- Auth/logout logic — untouched

---

## Component structure

No new components needed. `HomeSurface.tsx` is rewritten in-place:

```
HomeSurface
├── MoraBriefingStrip        (inline, ~30 lines JSX)
├── DepartmentPulseTiles     (inline, ~40 lines JSX)  
├── RecentItemsList          (inline, uses existing personalLatestItem)
└── QuickActions             (inline, ~20 lines JSX)
```

Keeping it all in `HomeSurface.tsx` avoids over-engineering for a single-use surface. If it grows beyond ~300 lines, split into subcomponents.

---

## Data flow

```
useMoraStore
  └── departments[]          → DepartmentPulseTiles + MoraBriefingStrip
  └── treeData               → activity counts (children count per dept)

fetchMyContent()             → personalLatestItems[] (top 5) → RecentItemsList
  (already called; state type widened from single item to array)

usePaneStore
  └── openPane()             → DepartmentPulseTiles click + QuickActions
```

No new API endpoints. No new store slices.

---

## Visual language

Matches current `mora-ui-cleanup` dark theme:

- Background: `#07130e` / transparent (inherits shell bg)
- Active accent: `emerald-500` at low opacity (7–18%)
- Text hierarchy: white/85 → white/72 → white/38 → white/20
- Borders: `white/7` quiet, `emerald-500/18` active
- Border radius: 10px tiles, 8px rows, 8px action buttons
- No uppercase section labels except `MORA` and `ZULETZT BERÜHRT`

---

## Out of scope

- `MoraPulsePanel` redesign — separate task if needed
- Kairos event feed / notification surface — future work
- Private space ("Meine Dateien") section — stays accessible via bottom nav
- Real-time activity tracking (WebSocket dept pulse) — Phase 2
