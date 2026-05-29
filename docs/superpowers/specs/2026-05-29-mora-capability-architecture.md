# Mora Capability Architecture — informed by OpenClaw/Larry audit

**Date:** 2026-05-29
**Author:** Opus 4.8 (synthesis from read-only server audit)
**Status:** ✅ DECIDED 2026-05-29 — **Option C (Hybrid)**. OpenClaw as agent execution engine; CORE owns multi-tenancy boundary, capability gate, and memory partition. A separate isolated gateway for SAIMÔR (never Larry's owner gateway). Next concrete step: the §6 spike.
**Feeds:** Roadmap workstream 4.3 (Chat/Mora rethink), 4.8 (Integrations), Department view (§2)

---

## 1. What the server audit revealed

**OpenClaw** (`larry_v2`, port 18789, now LAN-only) is an **AI agent runtime + WebSocket gateway** (npm `openclaw`, v2026.5.27). The **Larry dashboard** (`larry-ui`, port 3000) is just a Next.js frontend talking to that gateway over `ws://larry_v2:18789` — auth-gated, served via `dash.saimor.world`.

Larry is the working proof of everything we want Mora to be:

| Capability | How Larry does it | Relevance to Mora |
|---|---|---|
| **Tool use** | profiles: `exec`, `web_search`, `web_fetch`, `file_transfer`, `browser`, `document-extract` | Mora's tool layer |
| **Context injection** | `buildContextInjection()` auto-enriches every message with time, inbox, calendar, missions, container status — *no tool call needed* | Mora should adopt this; huge UX win |
| **Memory + dreaming** | `memory-core` plugin, nightly 03:00 consolidation; `active-memory` auto-queries on each msg | Mora persistent memory |
| **Agent delegation** | `sessions_spawn`/`sessions_send` → council (atlas=strategy, forge=code, scout=research, nightwatch=ops) | Mora "deep work" fan-out mode |
| **Canvas** | `POST /api/larry/canvas` → charts, tables, markdown, timelines, alerts to UI | Mora inline visualizations |
| **Missions** | async task tracker (JSON + status) | Mora async tasks w/ progress |
| **Mail** | IMAP (`imapflow`) + SMTP (`nodemailer`), 2 inboxes (business + personal Gmail), draft-via-agent | Mora mail (CORE routes exist) |
| **Calendar** | Google OAuth, events injected into context | Mora calendar |
| **Ops** | `exec` + Hetzner API + Docker status + `/api/larry/deploy` (self-rebuild!) | Owner-only ops mode |
| **62 provider plugins** | OpenAI, Google, Anthropic, Ollama, Mistral, Groq, ElevenLabs, Deepgram, Runway, etc. | Model flexibility |
| **Channels** | Telegram (active, owner-allowlisted) | Future Mora channels |

There is already a **`mora` agent stub** in the council (`tools.json: {"profile":"full"}`).

---

## 2. 🔴 Critical security note

The `mora` agent stub currently has **`profile: full`** — which includes `exec` (shell on the server), Hetzner API, and Docker control. **If a multi-tenant or public Mora ever connects to this gateway with `full`, every demo visitor would get server exec.** This is catastrophic and must be the first constraint of any OpenClaw-based design: **capability profile is derived from the authenticated role/tenant, never static `full` for anyone but the owner.**

Also noted: `larry-ui /api/larry/deploy` can rebuild/restart Docker, and `exec` is live. These are now behind closed ports + app login (fixed earlier today), but they raise the stakes on getting tenant gating right.

---

## 3. Mora capability tiers (audience-mapped)

Whatever the runtime, Mora's capabilities MUST be gated by audience:

| Capability | Demo/Playground visitor | Authenticated team member | Owner |
|---|---|---|---|
| Chat + streaming | ✅ | ✅ | ✅ |
| Web search / fetch | ✅ | ✅ | ✅ |
| Canvas visualizations | ✅ | ✅ | ✅ |
| Read own dossier / docs | ✅ (own only) | ✅ (dept-scoped) | ✅ |
| Memory | session-only | ✅ tenant-scoped | ✅ |
| Mail read + draft | ❌ | ✅ (dept mailbox) | ✅ |
| Calendar | ❌ | ✅ | ✅ |
| Agent delegation (deep work) | ❌ | ✅ (scoped agents) | ✅ |
| Async missions | ❌ | ✅ | ✅ |
| ERP/CRM external data | ❌ | ✅ (dept connections) | ✅ |
| **exec / ops / Hetzner / deploy** | ❌ | ❌ | ✅ owner only |

**Tenant memory isolation is non-negotiable:** company A's memory must never surface for company B. OpenClaw's `memory-core` is single-namespace by default → would need tenant partitioning.

---

## 4. Chat UX rethink (what "much more is possible" means here)

The current Mora chat is a basic message list. Informed by Larry, the new chat should support:
- **Context-injection chips** — show what Mora already knows (today's calendar, unread mail count, recent docs) without the user asking. Adopt Larry's `buildContextInjection` pattern, tenant-aware.
- **Inline canvas** — Mora answers with a chart/table/timeline widget, not just text.
- **Deep-work mode** — a toggle that fans the request to specialist agents and synthesizes; show the sub-agent steps.
- **Async missions** — "do this in the background", with a progress card the user can revisit.
- **Tool-result cards** — mail drafts, search results, doc extracts rendered as rich cards inline (not raw text).
- **Streaming** with visible reasoning/steps.

This is a genuine product surface — worth its own design pass once the runtime fork (§5) is decided.

---

## 5. THE FORK — decision needed

**Should Mora run on OpenClaw (like Larry), or stay native in CORE?**

### Option A — Mora ON OpenClaw (leverage the runtime)
CORE/INTERFACE becomes the multi-tenant frontend (like larry-ui, but for many companies) talking to the gateway. Activate the `mora` agent with role-scoped profiles.
- ✅ Inherits memory+dreaming, delegation, canvas, tool framework, 62 model plugins, proven patterns — months of head start
- ✅ One AI runtime to maintain, not two
- ✅ The `mora` stub already exists
- ❌ OpenClaw is single-tenant-shaped (Larry = one owner). Must build a tenant/role capability-gate + memory partitioning *in front* of it
- ❌ Security stakes high (exec exposure if gating wrong — see §2)
- ❌ Couples SAIMÔR's core product to an npm runtime's release cadence
- ❌ Data-isolation (per-company memory) needs real work

### Option B — Mora native in CORE
Build Mora's agent capabilities directly in CORE (FastAPI), multi-tenant from the ground up.
- ✅ Full control, clean multi-tenancy + data isolation by design
- ✅ No external runtime coupling
- ❌ Reinvent everything OpenClaw already does — slow, expensive
- ❌ Larry's proven patterns become reference-only, not reused

### Option C — Hybrid (likely recommendation)
OpenClaw as the **agent execution engine**, CORE as the **multi-tenant boundary + capability gate + memory partition**. Each Mora session opens against the gateway with a role-scoped, tenant-scoped profile that CORE issues; CORE injects tenant-scoped context (Larry's injection pattern, made tenant-aware). Owner gets Larry-grade power; team scoped; demo sandboxed.
- ✅ Best of both — reuse OpenClaw's engine, keep multi-tenancy/security in CORE where it belongs
- ✅ Incremental: start with low-risk tiers (chat, web, canvas, dossier) on the gateway; add mail/delegation/ops behind role gates
- ❌ Most integration design up front (the gate + context bridge)
- ❌ Still need memory partitioning

---

## 6. Recommended sequencing (if Hybrid)

1. **Spike:** stand up a *second, isolated* OpenClaw gateway (NOT Larry's — separate config, no exec/ops/hetzner plugins loaded) for SAIMÔR multi-tenant Mora. Never reuse Larry's owner gateway for tenant traffic.
2. **Capability gate in CORE:** issue per-session OpenClaw profiles derived from role/tenant. Default-deny; whitelist per tier (§3).
3. **Tenant-aware context injection** in CORE (calendar/mail/docs scoped to tenant+dept).
4. **Chat UX rebuild** (§4) against the gated gateway — start with demo tier (chat + web + canvas + dossier).
5. **Mail:** wire CORE `/v3/mail/*` to real IMAP via existing encrypted `/v3/integrations/mail` config (independent of Larry's mailbox).
6. **Memory partitioning** before any cross-session memory for tenants.
7. **Department view** (4.x) consumes: team presence + recent docs + Mora suggestions + ERP/CRM connections (the connections ride the same gateway tool layer).
8. **Owner mode** last: unlock exec/ops/Hetzner for `role === owner` only.

---

## 7. Mail clarification (independent of fork)
- CORE already has `/v3/mail/{messages,folders,send,commit}` + `/v3/integrations/mail` (encrypted IMAP/SMTP config). `USE_REAL_EMAIL` flag toggles IMAP vs mock; no creds wired yet.
- Larry's mailbox (Marius's business + personal Gmail) stays **separate** — multi-tenant CORE must not share one person's inbox. Each company/department configures its own IMAP via the integrations UI.
- Larry's `/api/larry/email-draft` (prompt agent → poll → draft) is the reusable pattern for "Mora, draft a reply."
