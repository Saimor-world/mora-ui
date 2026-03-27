# SAIMOR 1.0 Surface Hierarchy Spec

**Date:** 2026-03-27
**Status:** Implemented (Commit 1 complete)
**Branch:** `stabilize/beta-1.5`

---

## Governing Principle

SAIMOR is a Company OS. Like any OS, it can have many programs — but Shell, Core Work surfaces, and Apps must not compete on the same visual level. The problem is never "too many programs"; it is "too many equally dominant entry points".

---

## Four Tiers

### Tier 0 — Shell / OS Frame

Not pane types. Permanent. Always present. Not programs.

| Element | Purpose | Where |
|---------|---------|-------|
| Dock | App launcher + minimized pane restore | Bottom bar |
| Breadcrumb | "Where am I?" — scope at all times | Top of shell |
| MoraOrb | Ambient intelligence indicator + trigger | Fixed position |
| Spotlight (Cmd+K) | Global search + `@mora` entry | Global shortcut |
| NotificationCenter | System-wide notifications | Shell frame |
| QuickPreview | Space-bar preview on selected items | Shell overlay |
| SnapPreview | Window snap zones during drag | Shell overlay |

Shell elements are never pane types and are not tracked in `surfaceRegistry.ts`.

### Tier 1 — Core Work (`core_work`)

Daily-driver surfaces for the Beachhead use case (5–50 user knowledge workspace).
Dock-first. Default entry points. 6 items.

| Action | Pane Type | Shortcut | Purpose |
|--------|-----------|---------|---------|
| home | — (CoreLayer) | Mod+H | Arbeitsplatz — recent activity, quick access |
| chat | `chat` | Mod+J | Mora — one conversation, one place |
| finder | `finder` | Mod+F | Content browser — folders, files, open |
| team | `team` | Mod+U | Team roster, presence |
| notes | `notes` | Mod+N | Personal notes |
| settings | `settings` | Mod+, | System settings, profile, admin |

Also `core_work` (opened contextually, not in Dock):
- `document` — opened from Finder via click
- `meine-dateien` — personal file area, opened from Home

### Tier 2 — Apps (`app`)

Legitimate programs. Not in Dock. Reachable via Cmd+K, context menu, or deep link.
Not a problem for 1.0 — apps are fine as long as they are not equally dominant.

| Pane Type | Reach | When |
|-----------|-------|------|
| `scanner` | Context menu on folder/document | Analyse-Tool |
| `users` | Settings → Team management | Admin workflow |
| `company-detail` | Navigation click on Company | Context detail |
| `grid` | Alt view toggle inside Finder | Alternative layout |
| `search` | Cmd+K → dedicated search | Extended search |
| `space` | Navigation click on Space | Space detail |

### Tier 3 — Future (`future`)

Gated in 1.0. Not mounted. Not routed. Not reachable.
Code stays — registration does not.

| Pane Type | Why gated |
|-----------|-----------|
| `mail` | No backend |
| `calendar` | No backend |
| `integrations` | No backend |
| `terminal` | Dev-only, security risk for pilot |
| `mora-hub` | Needs MindLoop maturity (would be empty) |
| `actions` | Action Path not stabilized |
| `work-session` | Agentic execution too early for pilot |
| `apps` (AppLibrary) | Self-referential with <10 deployed apps |

Also gated at Shell level (not pane types):
- `ResonanceRoom` — fragment of Mora; ChatPane is the single conversation place
- `MemorySidebar` — would be empty in pilot
- `CursorAgent`, `AgencyCursor`, `CursorTrailEffect`, `GhostOverlay` — agentic cursor effects

---

## Implementation

### Single Source of Truth: `lib/surface/surfaceRegistry.ts`

- `SURFACE_TIERS` — every pane type mapped to its tier
- `isPaneEnabled(type)` — `PaneManager` gates rendering here
- `getCoreDockItems()` — Dock reads this; no hardcoded arrays in components

### Gating Pattern

Future-tier items are never deleted — they are commented out with `// 1.0 gated`:
- Imports in `PaneManager.tsx`
- Mounts in `MoraShell.tsx`
- Entries in `useKeyboardShortcuts.ts`

This makes 1.0 decisions visible in code and reversible without archaeology.

---

## Navigation Model

```
Login
  └── Home (CoreLayer default)
        ├── Recent documents → DocumentPane
        ├── My files → MeineDateienPane
        ├── [Explore button / Breadcrumb root click] → UniverseView
        │     └── Department → SpaceLayer → Finder → DocumentPane
        └── [Cmd+K anywhere] → Spotlight
              ├── @mora → ChatPane
              └── file/folder result → Finder (at path)
```

**Back always works:** Breadcrumb is globally visible and covers the full path from Document → Space → Department → Home. Personal Area (MeineDateienPane) is reachable from Home without leaving the shell frame.

---

## What is NOT in 1.0

- Mora as multiple places (ResonanceRoom, MoraHub, Memory sidebar) — Mora is one place: ChatPane
- Presence-driven collaborative UI (live cursors, agency overlays)
- Agentic execution surfaces (ActionCenter, WorkSession)
- External integrations (Mail, Calendar, third-party)
- App Library (needs more deployed apps to be useful)

---

## Mora in 1.0

Mora exists at three levels — not as multiple programs:

| Level | Form | Entry |
|-------|------|-------|
| Shell | MoraOrb (ambient indicator) | Always visible |
| Conversation | ChatPane | Dock "Mora" + Mod+J |
| Contextual | Inline hints in Finder, Document | Appears in-context |

Mora is a system service, not an app ecosystem. It surfaces inside every app, but lives in one conversation place.
