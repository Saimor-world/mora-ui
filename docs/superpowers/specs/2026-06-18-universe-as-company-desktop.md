# Universe as Company Desktop — Vision & Roadmap
**Date:** 2026-06-18  
**Status:** Vision locked · Phase 1 hover shipped  
**Scope:** INTERFACE — MoraShell, UniverseView, panes, widgets

---

## North Star

The **Universe is the OS**, not a view among views. Starfield + planets + company topology form a **living ambient desktop background**. Widgets and apps are layers that float *in* that space — never replacing it.

---

## Current Architecture (Today)

```
MoraShell (components/os/shell/MoraShell.tsx)
├── z-0..4   Living background stack (StarField, MoraLivingBackground, TemporalAtmosphere)
├── z-30     ViewPort — navStore.viewLevel router
│   ├── core      → CoreLayer
│   │   ├── home    → HomeSurface (+ blurred universe preview)
│   │   └── explore → UniverseView (full planet map)
│   ├── department → DepartmentSurface → DepartmentLayer (space orbit)
│   ├── space      → SpaceLayer
│   └── ambient    → AmbientRoom
├── z-100    PaneManager — floating windows (paneStore)
└── z-740+   Dock, Orb, overlays
```

| System | Store / Module | Role |
|--------|----------------|------|
| Navigation | `navStore` — `viewLevel`, `coreMode`, `activeDepartmentId` | Hierarchy: core → dept → space → folder |
| Panes (apps) | `paneStore` + `surfaceRegistry` | Finder, mail, team, settings, nightwatch… as draggable glass windows |
| Widgets | `widgetStore` + `WidgetGrid` | Peripheral glance panels; universe surface capped to cols 0–3 and 9–12 |
| Universe layout | `lib/universe/layout.ts` | Organic planet placement, semantic route curves |
| Stats | `fetchDepartmentStats` API | Real health, docs, spaces — no fake data |

**Finder today:** Opens via `openPane({ type: 'finder' })` from Dock, widgets, or search. Does **not** replace the universe — it stacks as a pane at z-100 with glass blur. Department click navigates `viewLevel='department'` without auto-opening Finder (fixed 2026-06).

**Apps today:** Registered in `surfaceRegistry` as `core_work` (finder, settings, chat) or `app` (mail, calendar, nightwatch, tasks…). Each is a pane type rendered by PaneManager — not yet “orbital tools” but functionally dock-launched sheets.

---

## Target Layer Model

| Layer | z-index band | Behavior |
|-------|--------------|----------|
| **1 · Living ambient** | 0–8 | Starfield, nebula, parallax, planet orbit, real-time stats pulse on planets |
| **2 · Widget glance** | 10 | Max ~20% screen edge (cols 0–3, 9–12); fades to 0.25 opacity on planet focus |
| **3 · App / pane sheets** | 100 | Max ~70% viewport; glass blur shows universe behind; iOS sheet physics |

---

## iOS Hover Spec (Planets)

| State | Visual |
|-------|--------|
| Rest | Gentle float, soft glow, 100% opacity |
| Pointer over (pre-dwell) | Name whisper at 65% opacity, scale 1.03 |
| Dwell (520ms) | Scale **1.08**, glow ring expands, orbital stat labels bloom (health, docs, bereiche) |
| Focus | Non-focused planets dim to **0.6** opacity; widgets fade to **0.25** |
| Animation | Spring `{ stiffness: 380, damping: 28 }` — no box cards on hover |

**Shipped 2026-06-18:** Planet.tsx ambient labels, UniverseView dim/fade, layout.ts 1080p bounds.

---

## 1920×1080 Layout Rules

- `UNIVERSE_SAFE_BOUNDS`: Y 12–78% (was 14–72) — planets use full viewport height minus Dock
- `UNIVERSE_CORE_POINT`: (50, 46) — company logo centered in orbit field
- Widget band: cols 0–3 left, 9–12 right (`universeGlance.ts`)
- Pane max: ~70% workspace; `getCenteredPosition` in paneStore reserves Dock + breadcrumb insets
- Home preview uses `sm` planets; explore uses `lg`

---

## Phased Roadmap

### Sprint 1 — Ambient Desktop Feel ✅ (partial)
- [x] iOS planet hover micro-interactions
- [x] Widget recede on focus (0.25 opacity)
- [x] 1080p orbit bounds expansion
- [ ] Planet stats pulse tied to live API refresh interval
- [ ] Parallax dampening when pane open

### Sprint 2 — Universe-Native Finder
- Finder opens as bottom/side **sheet** (not centered modal); universe stays visible + interactive behind blur
- Breadcrumb becomes cosmic context: `Company › Engineering › Finder`
- `paneStore` sheet mode: `presentation: 'sheet' | 'window'`

### Sprint 3 — Orbital Apps
- Dock apps launch as sheets anchored to screen edge (mail = left sheet, team = right)
- AppLibrary becomes “constellation picker” — apps as small moons near core
- Migrate mail/team/settings to sheet presentation first

### Sprint 4 — Department = In-Universe Drill
- DepartmentSurface transitions: planet zooms forward, spaces appear as moons (no hard cut)
- Employee scoped-root: dept-level universe map (spaces as inner orbit)
- Breadcrumb back = zoom out to org universe

### Sprint 5 — Living Background Engine
- Real-time stats drive nebula intensity (activity heat)
- Nightwatch incidents → planet alert pulses (partial today)
- Time-of-day + ritual scene already wired via `RitualSceneStyler`

---

## Non-Negotiables

- No fake data on hover or widgets
- Navigation must not break (dept click → DepartmentLayer, not Finder overlay)
- Widget sync and pane z-order preserved
- Calm, iOS-quality motion — no dashboard boxes in the universe field
