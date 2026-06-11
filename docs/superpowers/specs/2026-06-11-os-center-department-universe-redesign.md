# OS Center / Department / Universe Redesign — Design Spec
**Date:** 2026-06-11
**Status:** Draft — decisions locked, implementation pending
**Scope:** INTERFACE layers: HomeSurface center, DepartmentSurface, UniverseView, background stack

---

## Problem Statement

Three surfaces are broken or misleading:

1. **Home center** — shows fake static data ("Hallo Max, 3 offene Aufgaben") when no real data exists. Violates the no-fake-data rule.
2. **Department surface** — used as a full work environment by some team members but only shows an orbit map or a sparse overview. Not enough information density for daily use.
3. **Universe view** — cosmetic metaphor (planets/orbits) with no useful information. Navigation exists but the view itself is empty-feeling.

Additionally: the OS was too dark (fixed as interim in `68cc4b4`), and full-bleed apps (Nightwatch) had no exit path (fixed in `68cc4b4`).

---

## Non-Negotiables

- **No fake data.** Empty states must be honest. "Noch keine Aufgaben verbunden" > "3 offene Aufgaben".
- **No LLM involvement in Truth / Scope / Importance.**
- **Evidence required** — any signal shown to the user must have a traceable source.
- **OS feeling preserved** — immersive desktop, ambient layers, cosmic atmosphere. Not a SaaS dashboard.
- **Scoped-Root Model** — described below — must not break the employee perspective.

---

## Decision 1: Home Center = Hybrid

**Resting state:** centered Orb/logo + greeting ("Guten Morgen, Max."). Calm. No data fabrication.

**Growing state:** live tiles appear only when real data arrives — mail unread count, next calendar event, active team presence. Each tile is sourced from a real endpoint; no tile appears if the endpoint returns empty/error.

**Why this works:**
- Solves the fake-data problem without gutting the surface.
- Scales gracefully: a fresh install looks intentional, not broken.
- MÔRA can highlight the most relevant tile without inventing importance.

**Tile sources (Phase 1 candidates):**
| Tile | Source | Already wired? |
|------|--------|----------------|
| Mail unread | mail API | partial |
| Next event | calendar API | partial |
| Team online | usePresence | yes |
| Incident count | Nightwatch bridge | yes (larry_nightwatch_bridge.py) |

**Phase 2:** tiles for tasks, documents changed today, active flows.

---

## Decision 2: Scoped-Root Model

Everyone gets the same three-layer navigation: **Home → Universe → drill-down**.

The root content differs by permission level:

| Role | Home content | Universe shows | Drill-down |
|------|-------------|----------------|------------|
| Owner | org-wide briefing, cross-dept signals | planet map = org departments | any department surface |
| Employee | personal + dept briefing | their department's internal map (spaces, rooms, content areas) | spaces below their dept |

An Owner who clicks into a department planet sees the exact same surface the employee sees as their home — plus a breadcrumb/back arrow to return to org-level.

**Implication for code:**
- `UniverseView` must know whether it's rendering at org-level or dept-level.
- The navStore needs a `viewScope: 'org' | 'dept'` concept (or infer from `activeCompanyId` vs `activeDepartmentId`).
- The dept-level Universe is a new view — not the current orbit map, which is org-level only.

---

## Decision 3: Department as Full Home

The department surface is not a secondary detail view — for employees it is their primary workspace. It must have enough information density to replace a full workday context.

**Target zones for DepartmentSurface (overview mode):**

```
┌─────────────────────────────────────────────────────┐
│  HEADER: dept name + mode toggle (Karte / Übersicht) │
├──────────────────┬──────────────────────────────────┤
│  TEAM ONLINE     │  RECENT DOCS                     │
│  (presence orbs) │  (last 6 touched in this dept)   │
├──────────────────┴──────────────────────────────────┤
│  SIGNALE / AUFGABEN                                  │
│  (Nightwatch incidents scoped to dept + tasks)       │
├─────────────────────────────────────────────────────┤
│  APPS / QUICK ACTIONS (Karte öffnen, Finder, etc.)   │
└─────────────────────────────────────────────────────┘
```

All zones show honest empty states when data is missing. No placeholder counts.

**Signale zone data sources:**
- Nightwatch incidents already scoped via `filterIncidentsForDepartment` (wired in `DepartmentSurface.tsx`).
- Tasks: `useTasks(departmentId)` — query exists, not yet surfaced here.
- MÔRA suggestions: empty until OpenFlow signals are real (currently `[]`, correct).

---

## Decision 4: Universe Complete Rethink

The current Universe is a cosmetic orbit map. The rethink: **Universe = navigable information space, not decoration**.

### Org-level Universe (Owner root)

Each department is a **planet** — but the planet surface should carry meaning:

- **Size** → relative team size or activity volume (real data, not hardcoded).
- **Color/glow** → health signal: emerald = all clear, amber = has open tasks/incidents, rose = active incident.
- **Label** → department name + live member count online.
- **Hover state** → mini-preview: 3 most recent signals from that department.

This turns the orbit map from decoration into a real-time org health display.

### Dept-level Universe (Employee root / Owner drill-in)

Below a department: **spaces** and **content areas** as rooms/zones. Think building floor plan, not cosmos. Each room = a Space node from the tree.

- Room size = recent activity.
- Room glow = has unread items.
- Click = enter that space (opens Finder scoped to it, or Space surface).

### Implementation path

1. Extend `DepartmentLayer` / `UniverseView` to accept a `scope` prop.
2. Wire dept health data (incident panels already exist; add task count + presence count).
3. Planet health = derived, not LLM-scored. Method = rule: `incidents.length > 0 ? 'critical' : tasks_overdue > 0 ? 'warning' : 'ok'`.
4. Dept-level floor-plan view is a new component: `DeptSpaceMap`.

---

## Decision 5: Data Strategy

**Phase 1 — Design with real data where it exists:**
- Nightwatch incidents: bridge already running on server, `fetchNightwatchIncidents()` wired.
- Presence: `usePresence()` wired.
- Tree/documents: `useTree()` wired.

**Phase 2 — Wire remaining sources:**
- Mail unread count (API endpoint needed).
- Calendar next event (API endpoint needed).
- Task counts by department (query exists, surface not connected).

**No mock data in UI.** Empty states must be informative: "Keine Vorfälle — alles ruhig." not silence or fake numbers.

**Larry bridge:** `larry_nightwatch_bridge.py` on saimor-server already pushes SSL/uptime incidents into CORE Memory Graph. Same truth seen by MÔRA's Nightwatch panel and Home incident tile. No duplication needed — just consume what's already flowing.

---

## Decision 6: Background Layer Consolidation

Current state (post `68cc4b4` interim fixes):
- `MoraShell`: luminous twilight radial + warm dawn glow at z-[-10] / z-[-9]
- `MoraLivingBackground`: #243a55 base, nebula blobs, aurora at z-0
- `CoreLayer`: 4 softened vignettes
- `GlassPanel` / pane chrome: z-500
- `PaneManager`: z-[100]
- Dock: z-740
- Overlays: z-928+

**Next pass (Phase 2):** document this stack in a comment block at the top of `MoraShell.tsx`; consider consolidating CoreLayer vignettes into a single composited SVG filter instead of 4 separate divs.

---

## Decision 7: Scenes (flow / lounge / night)

Scenes are reportedly non-functional. Before fixing: audit what `setScene` actually changes vs. what's expected.

Hypothesis: scene state updates in the store but the background painter (`MoraLivingBackground`) doesn't subscribe to it, so nothing visually changes.

Fix path: wire `useSceneStore` (or equivalent) into `MoraLivingBackground` so each scene variant swaps the base gradient + nebula palette.

---

## Implementation Phases

### Phase 1 (next sprint)
1. Home center hybrid: resting Orb + conditional live tiles (mail, calendar, presence, incidents).
2. Universe planet health: connect dept incident panels + task counts to planet color/glow.
3. DepartmentSurface Signale zone: surface task counts from `useTasks(departmentId)`.

### Phase 2
1. Dept-level Universe (`DeptSpaceMap`) — new component.
2. Scoped-Root model in navStore + UniverseView scope prop.
3. Scenes fix.
4. Background layer consolidation.

### Phase 3 (CORE backend)
1. 20-day visitor accounts + AGB/email confirmation.
2. Mail unread count API endpoint.
3. Calendar next-event API endpoint.

---

## Files to Touch (Phase 1)

| File | Change |
|------|--------|
| `components/home/HomeSurface.tsx` | Replace fake tiles with conditional real-data tiles |
| `components/home/UniverseView.tsx` or `components/layers/DepartmentLayer.tsx` | Wire dept health (incidents + tasks) to planet appearance |
| `components/layers/DepartmentSurface.tsx` | Add tasks zone to overview mode |
| `lib/queries/useTasks.ts` | Verify dept-scoped query exists |

---

## Open Questions (need answer before Phase 1 code)

1. **Mail unread count** — is there an API endpoint, or does it need to be built in CORE first?
2. **Calendar next-event** — same question.
3. **Task query dept-scope** — does `useTasks(departmentId)` exist? If not, is it a quick CORE add or a sprint?
