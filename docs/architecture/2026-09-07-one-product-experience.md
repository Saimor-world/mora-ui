# Saimôr OS — one-product experience model

Status: implementation direction for the OS + historical Desk convergence.

## Decision

There is one user-facing product: **Saimôr OS**.

The historical `mora-work` / Desk frontend is not a second destination that must be kept alive beside the OS. It is migration inventory. Useful capability is moved into native Saimôr OS surfaces and apps on the same Engine, identity, authorization and CORE truth.

## User mental model

The product should feel like one place with four layers, not a collection of websites:

1. **Home / Jetzt** — the current situation: what matters today, what changed and what needs attention.
2. **Workspaces** — persistent rooms for Work, Mail, Calendar, Files and later Projects/People.
3. **System layer** — Tasks, Activity/Weave, Nightwatch, Search, Setup and specialist tools.
4. **MÔRA** — intelligence present across all three layers. Conversation is available, but it is not the product surface.

## Architecture boundary

```text
Saimôr
  └─ Engine / World Surface
      ├─ CORE — deterministic truth, permissions, actions
      ├─ MÔRA — context, interpretation, orchestration
      └─ Saimôr OS
          ├─ Home / Today
          ├─ Work
          ├─ Mail
          ├─ Calendar
          ├─ Files
          ├─ Tasks
          ├─ Nightwatch
          └─ Activity / Weave
```

## Experience rules

- One ambient world/background across the OS. Apps should feel like rooms in that world, not separate web products.
- Home is not an app launcher and not a KPI dashboard. It answers: **What is happening, what matters, where do I continue?**
- MÔRA should signal context and attention in-place. Opening chat must be a deliberate action.
- Operational data is rendered only from canonical CORE contracts. Unknown, disconnected and stale data must remain visibly distinct from zero/healthy/empty.
- Desk-era proxy routes (`/api/inbox`, `/api/google`, `/api/larry/*`, `/api/nightwatch`) are not copied into the OS.
- Specialist areas such as Finance, Earth or future products do not dominate Home merely because they exist.
- Mobile/iPad are first-class OS surfaces, not compressed desktop dashboards.

## Desk capability migration

| Historical Desk capability | Canonical destination |
|---|---|
| Lage / Today | OS Home + `GET /v3/today` |
| Inbox | native Mail app + CORE Mail |
| Calendar | native Calendar app + CORE Calendar |
| Missions / Board | native Work + Tasks |
| Drive | native Files/Finder |
| Nightwatch | native Nightwatch |
| Weave stream | Activity / Weave |
| Chat | MÔRA capability available throughout OS |
| Operator/system pages | Nightwatch / system tools, role-gated |
| Separate Desk shell | retired as product boundary |

## Current implementation slice

`HomeSurfaceUnified` replaces the previous portal-heavy Home composition while preserving the existing shell and native pane system.

The first slice intentionally:

- keeps `TodayOverview` as the truthful daily situation surface;
- removes the Finance/XRPL revenue rail from the primary Home hierarchy;
- groups native Work, Mail, Calendar and Files as continuation rooms;
- moves Tasks, Activity, Nightwatch and Search into the system layer;
- reduces MÔRA from a large prompt card to a calm system presence with an explicit conversation action;
- keeps the existing `HomeSurfaceNext` import as a compatibility export so the giant shell does not need a risky rewrite in the same change.

## Next slices

1. Extract and stabilize the shared World Surface composition from PR #51.
2. Reconcile proactive MÔRA presence behavior from PR #50 without auto-opening chat.
3. Salvage Mail triage from PR #54 into the native Mail app.
4. Turn Work from a launcher into the native home for missions/projects/tasks.
5. Move Files and Activity/Weave capability from Desk inventory.
6. Only then retire the old Desk host as an active product surface.
