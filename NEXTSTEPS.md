# NEXT STEPS — Updated 2025-11-19

Gemini (UI) focuses on visual/interaction work. Codex (this agent) owns systems integration, data flow, and coordination. This tracker keeps both sides aligned without digging through multiple handoff docs.

## Ownership Snapshot

| Stream | Owner | Status | Notes |
| --- | --- | --- | --- |
| Core API access | Codex | 🔴 Blocked | `/v1/snapshots` & `/v1/mindloop` 403 |
| Mycelium UX polish | Gemini | 🟡 In progress | Waiting on interactive data |
| Loading/Error UX | Gemini | 🟡 Planned | Needs accurate loading hooks |
| Home onboarding | Gemini | 🟡 Planned | Requires connector state logic |
| Space/system plumbing | Codex | 🟡 In progress | `useSpaces`, Core wiring |

## P0 Blockers (Must Clear Before UI Polish)

1. **Core API 403 Forbidden**
   - *Owner:* Codex (coord. with Core team)
   - *Where:* `lib/api.ts`, `.env.local`, Core route guards
   - *Actions:*
     - [x] Reproduce via `curl` and `authFetch` logs - `/v1/snapshots` now returns 200 locally and `/v1/mindloop` responds 404 (route missing?); still need Core log context.
     - [ ] Validate token claims (tenant, role, expiry) against backend expectations.
     - [ ] Issue/ingest new JWT or relax guard while building.
     - [ ] Smoke-test `/v1/snapshots`, `/v1/mindloop`, `/v1/semantic/*`.
   - *Dependencies:* Core backend support.

2. **Graph Interactivity Disabled**
   - *Owner:* Gemini (requires Codex data events)
   - *Where:* `components/canvas/FieldMode/MyceliumGraph2D.tsx`, `components/organic/NodeDetailsPanel.tsx`
   - *Codex Support:*
     - [x] Ensure `onNodeClick` delivers real node payloads.
     - [ ] Expose selected node state via Zustand/shared context for Gemini.

3. **Loading / Error Blind Spots**
   - *Owner:* Gemini
   - *Status:* ✅ Resolved (OrganicStatePanel implemented)

## P1 Workstreams (This Week)

- **Orb Detail Panel (Gemini)**
  - *Status:* 🟢 Implemented (Tabs, Tilt, Focus Mode)
  - *Next:* Connect "Files" tab to real file queries.
- **Organic Home / Onboarding (Gemini)**
  - Needs connector persistence API or mock store. Codex to expose `localStorage` helper + stub endpoints if required.
- **Global Command Bar (Gemini)**
  - *Next Priority:* Implement `Cmd+K` interface.
- **Filesystem Sync → Core (Codex)**
  - Implement request builder to Core `POST /v1/objects/batch/from-filesystem` once backend is ready; currently blocked on Core spec.
- **Semantic Search MVP (Shared)**
  - Backend requires embedding + vector store; front-end waits on API contract.
- **Bottom Chat Bar & Mention System (Gemini)**
  - Ensure chat API surface (`/v1/chat/completion`) defined before UI wiring.

## Immediate Actions — Codex Queue

- [x] Run authenticated `curl` + Core log tail to pinpoint 403 cause.
- [x] Update `lib/api.ts` logging to include header name + truncated token hash for easier comparison (without leaking secret).
- [x] Expose node-selection + hover events via lightweight event bus so Gemini can open `NodeDetailsPanel` without re-render storms (`lib/events/nodeInteractions.ts`, `lib/hooks/useNodeInteractions.ts`).
- [x] Create shared loading/error component for Organic views to guarantee consistency (Gemini can style) — `components/organic/OrganicStatePanel.tsx` wired into FieldMode + OrganicField.
- [x] Wire sidebar nav (Mycelium, Spaces, Add Files, Live Events, Settings, User) to active panels: Space filters `useSpaces`, Add Files opens `FileUploadZone`, Live Events consumes `useRealtime`, Settings/User expose session + role switches.
- [x] Lock Field view per role (members see Café hub only, owners/admins switch spaces) and add interactive overlays for member/owner dashboards.
- [ ] Keep this tracker updated + surface new dependencies as they appear.

## Reference Docs

- `GEMINI3_COMPLETE_ROADMAP.md` — full roadmap & priorities.
- `GEMINI_HANDOFF.md` — UI component inventory.
- `HANDOFF_TO_CODEX.md` — homepage & onboarding spec.
- `.env.local` — current JWT + API endpoints.

> **Reminder:** Update this file whenever a blocker status changes or a new dependency appears. Lightweight notes here prevent re-reading 300+ line roadmaps each session.
