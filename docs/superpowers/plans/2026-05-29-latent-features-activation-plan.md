# Latent Features Audit + Activation Plan

**Date:** 2026-05-29
**Author:** Opus 4.8 (audit + plan). **Executor:** Sonnet, item by item.
**Purpose:** Surface everything "once conceived but never shipped" (`tunnelCatalog`), plus the per-mode color system, and turn it into discrete, executable tasks. Each task is independently shippable.

**Read first:** `lib/design/tokens.ts` (the design language all of this consumes), the demo-experience-rethink spec, and the master roadmap.

---

## 0. CONFIRMED — the "four focus modes" = Ritual Scenes

The four focus modes are the **Ritual Scenes** in `lib/os/ritualMode.ts`, selectable in the **Command Center** (`DockCommandDeck`), which also lets you pick **audio tracks** (`trackName` / `onNextTrack`):

| Scene | Label | Accent (defined) | Aura | audioGain | Auto-time |
|---|---|---|---|---|---|
| `flow` | Flow | `rgba(16,185,129,0.34)` emerald | cyan | 0.92 | 05–11h |
| `build` | Build | `rgba(56,189,248,0.40)` sky | amber | 1.05 | 11–17h |
| `lounge` | Lounge | `rgba(251,146,60,0.32)` orange | pink | 0.86 | 17–22h |
| `night` | Nacht | `rgba(99,102,241,0.34)` indigo | cyan | 0.76 | 22–05h |

The scenes, colors, audio gain, auto-time switching, persistence, and cycle logic **already exist and work**. The gap the user is pointing at: **the scene colors don't propagate across the whole OS** — they're applied in the Command Center's scene-wash but the rest of the shell (orb, surfaces, ambient, accents) doesn't fully shift with the active scene.

---

## 1. Propagate Ritual Scene colors across the OS

**Current state:** `RITUAL_SCENES[sceneId].accent/aura` defined; consumed mainly in `DockCommandDeck` (scene wash) + audio gain. The shell at large still uses static accents. So switching Flow→Night changes the command deck but not the felt atmosphere of the whole OS.

**Target:** selecting a scene visibly re-tints the entire OS — orb, ambient glow, surface accents, dock active-state — smoothly. The OS *feels* like Flow vs Night.

**Build:**
1. **Bridge ritual scenes → design tokens.** In `lib/design/tokens.ts`, add a `sceneIdentity(sceneId)` that maps each `RitualSceneId` to a token bundle `{ accent, aura, glow }` (reuse the rgba values already in `RITUAL_SCENES`; align with the semantic palette style). Single source so scene colors and design tokens never drift.
2. **A `useActiveScene()` hook** (if not already) returning the *effective* scene (respecting `autoTime`) + its identity bundle, re-rendering on `RITUAL_MODE_UPDATED_EVENT`.
3. **Thread it through the shell:** MoraOrb tint, ambient/aura layer (`forest-canopy`/`starfield` glow color), HomeSurface accent, dock active-state, pane glow accents → read from the active scene identity instead of static values.
4. **Smooth cross-fade** (framer-motion) on scene change — the re-tint should feel like a mood shift, not a hard flip.
5. **Audio tracks:** verify the track selector (`onNextTrack`/`trackName`) is wired to real audio per scene (`AmbientAudioController`). If tracks are placeholder, wire real ambient audio or honest "kein Track".

**Files:** `lib/design/tokens.ts` (+ `sceneIdentity`), `lib/os/ritualMode.ts` (source of truth, mostly read), new/existing `useActiveScene` hook, `components/mora/MoraOrb.tsx`, shell ambient layer, `components/home/HomeSurface.tsx`, `components/os/AmbientAudioController.tsx`. Tests for `sceneIdentity` + the hook.

**NOTE:** This is distinct from the `activeMode` surfaces (real_hq/playground/etc.). Ritual scenes are the user's *focus/mood* choice; activeMode is the *tenant/surface* context. Both can carry color, but the **ritual scene is the primary felt-atmosphere driver** the user is asking about. If both should compose, scene = base atmosphere, mode = a subtle overlay (decide later).

---

## 2. The tunnelCatalog — triage of ~18 latent features

`lib/tunnel/tunnelCatalog.ts` is the existing registry of hidden/orphan/gated features. Triaged by recommendation:

### 2a. ACTIVATE / FINISH (real value, was just never polished)
| Feature | Status | Recommendation |
|---|---|---|
| `memory-sidebar` | gated — "ohne fertiges Polishing" | Polish + ship. Memory is core to Mora's value (ties to OpenClaw memory). |
| `mora-insight-popup` | gated — MindLoop insight events | Wire to real MindLoop; proactive insights are a differentiator. |
| `action-tray` | gated — "noch nicht produktreif" | Finish — operative quick-actions belong in the daily OS. |
| `resonance-room` | gated — future-tier dialogue surface | Evaluate against new Chat/Mora rethink; may be superseded. |

### 2b. ATMOSPHERE (the "much more color/life" the user wants)
| Feature | Status | Recommendation |
|---|---|---|
| `liquid-orb`, `plasma-orb` | live variants | Decide canonical orb per mode (ties to §1 — e.g. plasma for playground). |
| `forest-canopy`, `starfield` | atmosphere layers | Use deliberately per mode/surface for emotional depth. |
| `cursor-trail`, `ghost-overlay` | gated — perf/distraction | Keep gated unless a specific surface wants the wow (demo?). |

### 2c. ORPHANS — decide: rewire or delete (dead code)
| Feature | Status | Recommendation |
|---|---|---|
| `neural-grid` | orphan — not wired | Delete unless there's intent. |
| `mycelium-layer` | orphan — uses deprecated `activeNode` | Delete or migrate off `activeNode` (the deprecated slice). |
| `mora-playground` | live — earlier Home variant | Likely superseded by the Home rewrite — archive. |
| `mora-pulse-panel` | gated — "Kontext jetzt in HomeSurface" | Confirm dead → delete. |

### 2d. REVISIT in context
- `focus-mode` (Pomodoro, `FocusMode.tsx`) — fully built, removed from dock. Decide: re-expose in main OS settings, or keep shelved. Real feature, just unsurfaced.

---

## 3. Other "noch nicht eingerichtet" gaps found (honest empty-state or wire)
From the scan (`useCommunicationSurface.ts`, admin views):
- **Mail** — "keine Live-Daten, Verbindung noch nicht eingerichtet" → backend wiring (roadmap 4.7).
- **Calendar** — "OAuth noch nicht eingerichtet" → roadmap 4.8.
- **Google tenant OAuth** — "Owner muss erst freischalten" → owner-setup flow.
- **Admin roster** — "endpoint not yet available" → CORE endpoint or honest empty state.
- **WebsiteLeadLedger** — "offene Previews noch nicht verbunden" → wire.

These are honest-empty-state today (good — no fakes). Each is a backend task, not a UI bug.

---

## 4. Suggested execution order for Sonnet

**Batch 1 — Mode-color system (§1):** highest visible impact, self-contained, builds on design tokens. ⚠️ confirm the "four modes" first.
**Batch 2 — Orphan cleanup (§2c):** delete dead code (neural-grid, mycelium-layer if unmigratable, mora-pulse-panel, mora-playground). Reduces noise before bigger work. Safe, isolated.
**Batch 3 — Activate memory-sidebar + action-tray (§2a):** real features, polish + re-expose.
**Batch 4 — Atmosphere per mode (§2b):** wire orb variants + atmosphere layers to mode identity.
**Batch 5 — mora-insight-popup + MindLoop (§2a):** proactive intelligence (may wait for Mora Hybrid).

Each batch = its own commit(s), tsc clean, tests where logic exists. Orphan deletions need a grep to confirm zero imports before removing.

---

## 5. Guardrails for the executor (Sonnet)
- Subagents have **no write access to `E:\saimor`** — the main-thread agent must do file writes. (Recurring constraint this project.)
- No mock/synthetic data — honest empty states only (user's locked principle).
- Larry/dash links stay owner-gated (already enforced; don't regress).
- Before deleting any orphan: `grep` for imports/usages across `components`, `lib`, `app`. Zero hits → safe to delete. Any hit → rewire or leave.
- Run `npx tsc --noEmit` + relevant jest suite before each commit.
- Each pushed commit auto-deploys (SWC build does NOT typecheck — so tsc locally is the gate).
