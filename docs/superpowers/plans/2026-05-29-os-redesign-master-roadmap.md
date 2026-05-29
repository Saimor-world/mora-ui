# SAIMÔR OS — Redesign Master Roadmap

**Date:** 2026-05-29
**Author:** Opus 4.8 (strategy/planning) — execution delegated to cheaper models per workstream
**Status:** Draft for review
**Scope:** Full visual + conceptual overhaul of the OS surfaces, plus backend wiring for Mail/Integrations. This is a *roadmap of workstreams*, not a single implementation plan. Each workstream marked `NEEDS SPEC` requires its own brainstorm + plan before coding.

---

## How to read this document

- **P0** = security / live exposure — fix immediately
- **P1** = demo-facing — what a Security-Check visitor sees first (revenue surface)
- **P2** = design language — the systemic "much more is possible" work
- **P3** = backend wiring — Mail, Integrations sync (depends on dashboard/SSH server)
- Each workstream lists: **Current state (verified)** · **Target** · **Scope** · **Executor** · **Needs spec?**

The conceptual model (§2) and design principles (§3) are decisions, not suggestions — every workstream inherits them.

---

## 1. P0 — Security (DONE this session)

| Issue | Status |
|---|---|
| Larry Dashboard card exposed to public demo visitors (`isPublicDemoSurface`) → opened `larry.saimor.world` with sensitive infra data | ✅ Fixed `db5a823` — gated to `user.role === 'owner'` |

**Remaining P0 audit task (NEEDS verification, not yet done):**
- Confirm **no other** demo/public surface links to `larry.saimor.world` or `dash.saimor.world`. Grep all of INTERFACE + WORLD for these hosts; ensure every occurrence is owner-gated or removed. The dock already filters `larry` out of `public_playground` (Dock.tsx:778) — but audit Universe, Settings, command palette, and WORLD.
- **Larry dashboard itself** (on SSH server) should enforce auth server-side, not rely on the client hiding the link. Client-side gating is defense-in-depth, not the boundary. → see P3 / server audit.

---

## 2. Conceptual Model — the navigation hierarchy

This is the spine. Everything else hangs off it.

```
┌─────────────────────────────────────────────────────────────┐
│  HOME  — the glanceable overview (phone homescreen / lockscreen)
│         "What's my day, what's open, one tap to anywhere."
│         NOT a workspace. NOT a file tree. A calm launch surface.
└─────────────────────────────────────────────────────────────┘
                          │  (tap into the company)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  UNIVERSE — the company overview (the "planets" view)
│         Layer 0: all departments as planets.
│         → ONLY meaningful for managers/owners who see everything.
│         A team member who only belongs to one department should
│         NOT land here — they should land in their department.
└─────────────────────────────────────────────────────────────┘
                          │  (enter a department)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  DEPARTMENT VIEW — needs its OWN design (does not exist properly)
│         Inside one department: its people, its work, its files,
│         its Mora context. This is where most users actually live.
│         Currently this just reuses the file-tree look → wrong.
└─────────────────────────────────────────────────────────────┘
```

**Decisions locked from this conversation:**
1. **Home ≠ Universe.** Home is the personal launch/overview screen. Universe is the company's structural map.
2. **Universe Layer 0 (planets) is a manager/owner surface.** Role-aware entry: a single-department member bypasses it and lands in their department.
3. **Department view is a distinct surface** that must be designed from scratch — not the current file-browser reuse.
4. **The Playground/Demo is a separate world** rendered *inside* the OS platform but with its own expressive design language. A visitor must never see the internal company file structure (no "Wall & Guestbook" bubble in a Universe file tree).

**Open question for user (blocks Universe + Department workstreams):**
> When a team member enters their department, what are the 3-4 things they need *first*? (e.g. "today's tasks · my team online · recent docs · ask Mora"?) This defines the Department view layout.

---

## 3. Design Language Principles — "much more is possible"

Same DNA (dark, glass, the violet/cyan/amber palette, the typographic caps-label rhythm) — but pushed to Apple-marketing-page expressiveness, not macOS-desktop restraint. The product surfaces (Dossier, Wall, Home) may be *louder* than the work surfaces (Finder, Settings).

Five systemic rules every workstream must apply:

1. **Color communicates meaning, not just decoration.** Score, severity, status, freshness carry color. A critical 28/100 should *feel* red. A new Mora-created doc should feel different from an old folder. Stop defaulting everything to `white/40–white/80`.
2. **Typographic moments exist.** There may be a `text-6xl`/`text-7xl` hero number. Right now everything sits in one size corridor → nothing reads as important. Establish a scale: hero (score/greeting) → section → body → meta.
3. **Atmosphere over flatness.** Radial glows, subtle motion, depth. The AuditDossierView + Signal Wall (shipped this session, `b724931` / `f69f225`) are the reference for the *expressive* tier — match that energy elsewhere where appropriate.
4. **One concept per surface.** HomeSurface today is 1472 lines doing Mission Control + Tageslage + Universe-orb + Suggestions + logout simultaneously. Each surface should answer one question.
5. **Role- and mode-aware.** `public_playground` / `personal_demo` / `local_truth` / authenticated-owner are different audiences. Surfaces adapt; they don't show everyone everything.

A **design-tokens pass** (NEEDS SPEC) should formalize the type scale, the per-meaning color map, and reusable glow/elevation utilities *before* the big surface rewrites — otherwise each rewrite reinvents them inconsistently.

---

## 4. Workstreams

### 4.1 — Home (P1/P2) · NEEDS SPEC
- **Current (verified):** `HomeSurface.tsx`, 1472 lines. Mission Control briefing card + Tageslage + Universe orb + Mora suggestions + logout, all at once. Tries to be workspace + launcher + dashboard.
- **Target:** A calm, glanceable overview — the phone-homescreen feeling. Day context at a glance, what's open/recent, one tap to anywhere. Distinct for demo vs authenticated.
- **Scope:** Likely a ground-up rewrite of the surface composition (not the data hooks). Split the monolith into focused sub-components.
- **Executor:** Sonnet, after spec + design-tokens pass.
- **Blocks:** design-tokens pass; Home-vs-Universe model (§2, locked).

### 4.2 — Universe layering (P1/P2) · NEEDS SPEC
- **Current (verified):** Single planet/file-tree view reused at every depth. `UniverseView.tsx` + `HomeSurface` Universe orb.
- **Target:** Layer 0 (planets) = manager/owner map. Role-aware entry that drops single-department users into their department. Distinct **Department view** (new surface).
- **Scope:** Two surfaces (Universe-L0 refinement + new Department view) + role-based routing on entry.
- **Executor:** Sonnet, after the §2 open question is answered.
- **Blocks:** user answer on department-view priorities; design-tokens.

### 4.3 — Chat / Mora (P1) · NEEDS SPEC
- **Current:** Functional but, per user, "kann viel zu wenig", cluttered, not visually appealing, behind our current technical level.
- **Target:** Rethought conversational surface that matches today's capabilities (tool use, streaming, context-awareness, the executeTools path from MR21). Visually first-class.
- **Scope:** Large. This is its own brainstorm — what *should* Mora chat do now? (attachments, tool results inline, context chips, multi-pane awareness). Then design, then build.
- **Executor:** brainstorm with user → spec → Sonnet build.
- **Note:** Highest-leverage surface — Mora is the product's voice. Worth Opus-level brainstorming before any code.

### 4.4 — Team room (P2) · NEEDS SPEC
- **Current (verified, from MEMORY):** `TeamPane`, API-driven roster, AI-bot + peer-WebSocket members already removed (beta-1.5). On the "old" visual stand.
- **Target:** Rethink as the department's social/presence space (ties into §2 Department view). Aura-color-per-user concept from project memory (`project_metaverse_aura_color.md`) lives here.
- **Executor:** Sonnet, after Department-view spec (they're related).

### 4.5 — Notes (P2) · NEEDS SPEC
- **Current:** `apps/notes` — basic.
- **Target:** Rethink. Scope TBD in brainstorm (quick-capture? rich? linked to nodes?).
- **Executor:** Sonnet, after a short spec.

### 4.6 — Ambient Room (P2 / verify) · LIKELY OK
- **Current (verified):** `AmbientRoom.tsx` is functional — speech recognition with mic-permission states, fallback text mode for unsupported browsers, `useAmbientMora` integration, tool execution, error handling. VAPI/phone path must stay untouched (project rule).
- **Action:** Light QA pass + visual polish to match new design language. **Not** a rewrite. Confirm mic flow works in deployed playground.
- **Executor:** Sonnet, low effort.

### 4.7 — Mail (P3) · BACKEND WIRING · NEEDS SPEC
- **Current (verified):** Frontend (`apps/mail`, 540 lines) already calls CORE `/v3/mail/messages` and `/v3/mail/commit`. So the *client* is wired. Integrations panel shows "Lokaler Postfachmodus — keine externe IMAP-Synchronisation."
- **Target:** Connect CORE's `/v3/mail/*` to the **real mailbox that already exists in the dashboard on the SSH server**, possibly reusing **OpenClaw** components.
- **Scope:** Mostly CORE + server. Map dashboard mail store → `/v3/mail/messages`. Decide IMAP vs OpenClaw bridge.
- **Executor:** brainstorm (which source? OpenClaw vs direct) → CORE plan → Sonnet/Opus build. **Requires SSH/server inspection.**
- **Blocks:** server audit (§5).

### 4.8 — Integrations real sync (P3) · BACKEND WIRING · NEEDS SPEC
- **Current (verified):** `apps/integrations` (650 lines) reads a real `overview` capabilities object, but: calendar Google-OAuth "serverseitig noch nicht fertig", mail in local mode, cloud storage connector count may be 0. UI is honest about it but nothing actually syncs.
- **Target:** Real sync backends — at minimum calendar OAuth completion + mail (shares 4.7) + cloud storage. Tie to dashboard where capabilities already live.
- **Executor:** CORE/server work after server audit.
- **Blocks:** server audit.

### 4.9 — Dock & app inventory (P1, quick) · PLANNABLE NOW
- **Current (verified):** Dock = 8 real items (home, chat/Mora, finder, team, notes, ambient/Field, larry, settings) — all functional, larry owner/non-playground gated. Behind the dock, app reality:
  - **Real:** chat, finder, scanner, terminal (631l), team, notes, settings, document, mail-client, integrations-UI, ambient.
  - **Partial/stub:** tasks (256l, "API not yet live" — optimistic only), calendar (110l, UI shell, no real events), canvas (207l, draws but no persistence), timeline (170l, reads API — verify payload).
- **Action:** Decide per app: **promote** (finish it), **demote** (hide from registry until real), or **keep as honest stub**. For the **demo specifically**, decide the minimal dock — a visitor doesn't need terminal/integrations. Likely demo dock = Home · Dossier · Wall · Mora · (Finder?).
- **Executor:** small spec → Sonnet. Registry-driven (`surfaceRegistry.ts`), so demoting = tier change to `future`.

---

## 5. Server / Dashboard audit (P0-security + P3-enabler) · NEEDS SSH SESSION
Several workstreams (Mail, Integrations, Larry hardening) depend on understanding what's on `root@49.12.195.166`:
- Larry/dash auth model — is it server-enforced?
- Dashboard mailbox — format, access path, OpenClaw availability
- What capabilities the Integrations `overview` endpoint actually reflects

**Action:** A dedicated read-only inspection session (can be a subagent with SSH) to document the server state. Output feeds 4.7, 4.8, and §1 hardening. Do this **before** committing to Mail/Integrations plans.

---

## 6. Suggested sequencing

**Phase A — Foundation (do first, unblocks everything visual):**
1. Finish P0 audit: grep all surfaces for larry/dash hosts (§1).
2. **Design-tokens pass** (§3) — type scale, per-meaning color map, glow/elevation utilities. *Small but unblocks all visual workstreams.*
3. Dock/app inventory decisions (4.9) + demo-dock trim.

**Phase B — Demo surface polish (P1, revenue-facing):**
4. Home rewrite (4.1) — demo variant first.
5. Universe + Department model (4.2) — at least the demo-safe version.
6. Chat/Mora brainstorm → spec (4.3). Build after.

**Phase C — Work surfaces (P2):**
7. Team (4.4), Notes (4.5), Ambient polish (4.6).

**Phase D — Backend (P3, parallel-able once server audited):**
8. Server audit (§5) → Mail (4.7) → Integrations (4.8).

**Token strategy:** Opus only for §5 server reasoning, the Chat brainstorm (4.3), and reviewing each spec. Everything else (token-heavy implementation) → Sonnet subagents, one workstream at a time, TDD where logic exists.

---

## 7. Decisions needed from user before Phase B

1. **Department view** (§2): top 3-4 things a team member needs on entry?
2. **Chat/Mora** (4.3): worth a dedicated brainstorm — what should it *do* now? (separate session)
3. **Demo dock** (4.9): confirm minimal set — Home · Dossier · Wall · Mora · Finder?
4. **Mail source** (4.7): OpenClaw bridge vs direct IMAP — needs server audit first.

---

## Out of scope (explicitly deferred)
- Native Windows local account / session model — "Zukunftsmusik" per user. Lockscreen stays as-is for web; revisit when native packaging is real.
- VAPI / phone logic — untouched (project rule).
- Multi-tenancy — single-company-per-deployment stands.
- WORLD website redesign — tracked separately (`project_world_blog_wall_redesign.md`).
