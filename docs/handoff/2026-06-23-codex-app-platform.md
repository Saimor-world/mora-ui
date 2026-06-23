# Codex Desktop Handoff — MÔRA App Platform (2026-06-23)

**Audience:** OpenAI Codex Desktop (parallel agent), **not** the HQ `codex` app pane.

**Repo:** `E:\saimor\INTERFACE` (mora-ui / hq.saimor.world)

**Baseline commits:**
- `008a540` — App-Bibliothek grid layout + filter fix
- **This session** — Codex hidden from launcher (`launcherHidden`), `agents_flows` → **MÔRA & Automatisierung**, codex removed from `appUniverse` catalog

**Architecture context:**
- **hq.saimor.world** = SAIMOR OS (INTERFACE) — primary surface for operators
- **dash.saimor.world** = operator dashboard (DASHBOARD) — mirror read-only data where noted; **do not duplicate full UIs**
- Follow surgical change principles in repo-root `AGENTS.md` — minimal diffs, no speculative refactors
- **Do NOT touch saimor-core / CORE APIs** unless a task explicitly says so

---

## Priority 1 — MÔRA Center tabs: unify Chat + Signale

**Goal:** One coherent MÔRA pane instead of split mental models (Chat app vs Mora Center vs Signale widget).

**Read first:**
| File | Why |
|------|-----|
| `apps/chat/index.tsx` | Main MÔRA conversation surface (~1600 lines); already imports `openMoraCenter` |
| `components/panes/MoraHubPane.tsx` | Mora Center tabs: Überblick / Erinnerungen / **Signale** (`stats` section) |
| `lib/utils/openMoraCenter.ts` | Opens `mora-hub` pane with `activeSection` |
| `components/mora/Spotlight.tsx` | "Mora Center" action (~L284–295) — opens memory section today |
| `components/mora/Dock.tsx` | Dock menu entries calling `openMoraCenter` |
| `components/home/HomeCockpit.tsx` | `signals` widget deep-link → `openMora?.()` |
| `components/widgets/registry.tsx` | `signals` + `mora` widget definitions (~L1742+) |

**Implementation options (pick smallest that meets criteria):**
1. **Extend `apps/chat`** with internal tabs: *Chat* | *Signale* (embed or link to hub stats content)
2. **Extend `MoraHubPane`** with a *Chat* tab that mounts chat sub-surface (reuse chat components, not duplicate stream logic)
3. **Route consolidation:** Spotlight/Dock "Mora Center" opens unified hub defaulting to chat; Signale widget opens hub on `stats` tab

**Success criteria:**
- User can reach **Chat** and **Signale** from one pane without opening two separate apps
- Spotlight "Mora Center" and Home Signale widget land in consistent destination
- `openMoraCenter` sections remain backward-compatible (`overview` \| `memory` \| `stats`)
- No regression in chat streaming, memory save, or perception hooks

**Tests:**
```powershell
cd E:\saimor\INTERFACE
npm test -- __tests__/components/mora/Spotlight.navigation.test.tsx --no-coverage
npm test -- __tests__/components/home/HomeSurface.test.tsx --no-coverage
npm run verify:types
```

**Do NOT:** Build a third parallel chat implementation; do not modify CORE chat endpoints.

---

## Priority 2 — Council Glance widget (read-only mirror)

**Goal:** Home glance showing active council missions from **dash.saimor.world**; tap opens deep link (external or thin pane), **not** a full council UI clone.

**Read first:**
| File | Why |
|------|-----|
| `components/widgets/registry.tsx` | Widget patterns (`GlanceShell`, compact vs full, `isHomeGlance`) |
| `components/home/HomeSurface.tsx` | Home widget grid composition |
| `lib/widgets/types.ts` | `WidgetContext`, registration shape |
| `DASHBOARD/app/council/page.tsx` | Reference for mission/agent model (read-only) |
| `DASHBOARD/app/page.tsx` | Dashboard mission summary cards (~L452, L730+) |

**Implementation sketch:**
- New query hook e.g. `lib/queries/useCouncilGlance.ts` → fetch dash API (proxy route in INTERFACE if CORS/auth requires it)
- Register `council` widget in registry: 2–4 mission rows, agent color dot, status pill
- Deep link: `https://dash.saimor.world/council` (or `?mission=id` if API supports)

**Success criteria:**
- Home glance renders loading / empty / error states without breaking grid
- Data is **read-only**; no mission edit/create in OS
- Widget follows existing glance visual language (left tone bar, compact rows)
- Empty state: "Keine aktiven Missionen" + link to dash

**Tests:**
```powershell
npm test -- __tests__/components/home/HomeSurface.test.tsx --no-coverage
# Add focused test for new hook if created:
npm test -- __tests__/lib/queries/useCouncilGlance.test.tsx --no-coverage
npm run verify:types
```

**Do NOT:** Port full council kanban UI into INTERFACE. **Do NOT** modify DASHBOARD unless adding a minimal JSON glance endpoint is agreed with Cursor/composer.

**Blocker for Cursor/composer:** Confirm dash API route for council summary (may need new `/api/missions` or similar proxy).

---

## Priority 3 — Larry Artifacts glance → document pane

**Goal:** Expand home Larry/Workspace widget so clicking an artifact opens the **document pane** with that artifact (not only Larry dashboard fallback).

**Read first:**
| File | Why |
|------|-----|
| `lib/queries/useLarryArtifacts.ts` | TanStack query for artifacts list |
| `lib/api/larryClient.ts` | `fetchLarryArtifacts`, `LarryArtifact` type |
| `components/widgets/registry.tsx` | `LarryWorkWidget` (~L1054+), `openLarryNode` / `openDashboard` on context |
| `apps/document/index.tsx` | Document pane entry |
| `components/mora/PaneManager.tsx` | `document` case routing |

**Current behavior:** `openArtifact` calls `context.openLarryNode(id, title)` or falls back to `context.openDashboard?.()`.

**Success criteria:**
- Home glance row click opens document pane with correct artifact id/title
- Compact glance still shows top N rows; dashboard link remains for empty/full view
- No duplicate fetch storms (reuse query cache key from `useLarryArtifacts`)

**Tests:**
```powershell
npm test -- __tests__/lib/queries/useLarryArtifacts.test.tsx --no-coverage
npm run verify:types
```

**Do NOT:** Change Larry CORE ingestion; INTERFACE routing only.

---

## Priority 4 — Engineering mode in MÔRA chat (not separate app)

**Goal:** Replace standalone Codex app UX with a **chat persona/mode flag** inside `apps/chat` — the `codex` app is now `launcherHidden: true` in `lib/apps/appRegistry.ts`.

**Read first:**
| File | Why |
|------|-----|
| `apps/codex/index.tsx` | Current engineering agent UI (reference for behavior to migrate) |
| `apps/chat/index.tsx` | Target surface for mode toggle |
| `lib/hooks/useMoraStream.ts` | Streaming; codex uses `agent: 'codex'` in buildChatContext |
| `lib/api/moraAgentClient.ts` | `buildChatContext` agent parameter |
| `lib/apps/appRegistry.ts` | `codex` manifest with `launcherHidden: true` |
| `lib/apps/types.ts` | `launcherHidden?: boolean` |

**Implementation sketch:**
- Add `engineeringMode` (or `agentMode: 'mora' | 'codex'`) in chat UI — toggle or segmented control
- When engineering: pass `agent: 'codex'` to stream/context (mirror `apps/codex/index.tsx` L96)
- Optional: migrate session persistence key pattern from codex app
- Spotlight keyword "engineering" / "codex" should open **chat** with mode preset (not codex pane)

**Success criteria:**
- Engineering conversations work from chat with same backend agent as old codex app
- Codex app tile stays hidden in App Library
- Mode visible in chat chrome (badge or toggle)
- Existing codex pane still loads if legacy session has it open (no breaking PaneManager case yet)

**Tests:**
```powershell
npm test -- __tests__/lib/apps/appRegistry.test.ts __tests__/apps/apps/AppLibraryApp.test.tsx --no-coverage
npm run verify:types
```

**Do NOT:** Re-add codex to launcher or `appUniverse` catalog.

---

## Priority 5 (Phase 2, optional) — Remove dead codex app code

**Only after Priority 4 is verified in production.**

**Remove:**
| File / location | Action |
|-----------------|--------|
| `apps/codex/index.tsx` | Delete module |
| `lib/apps/AppLoader.tsx` | Remove `codex` from `APP_MAP` |
| `components/mora/PaneManager.tsx` | Remove `case 'codex'` |
| `lib/apps/appRegistry.ts` | Remove codex manifest entirely (or keep stub for migration window) |
| Tests referencing codex loader | Update `registry-consistency.test.ts`, `AppLoader.test.tsx` |

**Success criteria:**
- `npm run verify:types` clean
- `npm test -- __tests__/lib/apps/ --no-coverage` pass
- No runtime import of `@/apps/codex`

---

## Verification commands (full smoke)

```powershell
cd E:\saimor\INTERFACE
npm run verify:types
npm test -- __tests__/apps/apps/AppLibraryApp.test.tsx __tests__/lib/openflow/appUniverse.test.ts --no-coverage
npm run verify:os:smoke
```

---

## Deploy (manual — Hetzner)

SSH was **not** available from the Cursor agent environment. After merge to `main`:

```bash
bash /root/saimor/ops/deploy-ui.sh
```

Deploy includes grid fix (`008a540`) plus codex launcher hide from this handoff baseline.

---

## Out of scope for Codex

- CORE / saimor-core API changes
- DASHBOARD full council UI port
- Removing `apps/codex` until engineering mode in chat is proven
- Git push / deploy (Cursor/composer or Marius)
