# MÔRA Alive v02 — implementation and truth contract

## Goal and acceptance
MÔRA gets a real mesh-based body inside the existing OS, without another agent, socket, data store or execution path. A user can open MÔRA Center → **Alive · Vorschau**, interact using mouse/touch/keyboard, pause movement, and distinguish CORE-derived activity from explicit character previews. The existing Universe, dock stone and chat behavior remain intact until a separately approved replacement.

## Sources inspected
- OS base: `57ffba9e444a97910ebc27e90bdef6a65aeb5401` (main, 2026-10-25).
- `components/universe/{OrganizationField,MoraCore}.tsx`, existing `MoraOrb`, `MoraFace`, `MoraHubPane`, `MoraPlayground`.
- `lib/universe/moraPresence.ts`, `lib/store/orbStore.ts`, `lib/hooks/{useMoraExecutions,useActionEvents}.ts`, `lib/hooks/shell/useRealtime.ts`, shared `lib/api/realtimeClient.ts`.
- CORE `core/services/tool_dispatcher.py`: confirmed tenant broadcast of `mora.execution.started/progress/done/failed`; done includes `ok: true`, failed includes `ok: false`.
- Website `components/{BrandSigil,MoraCharacter,MoraOsFace}.tsx`: approved master is `public/brand/saimor-sigil-restored-v1.webp`, copied byte-for-byte here; the header uses a 256px PNG derived from the approved PNG master to work with existing static-path handling. Existing OS `/images/saimor_logo.png` is older cyan artwork and is not used for Alive.
- V02 follows the character turnaround sheet supplied by Marius in this conversation (2026-10-25): continuous curved flame head, small translucent leaf torso, closed smiling idle eyes, tiny mouth, fine gold orbital filaments, separate veined jade. The rejected V01 metallic tube/egg silhouette is removed. The reference itself is not redistributed in the repository.

## Implementation
Three.js 0.181 and React Three Fiber 8.18 were already installed. The first remote browser check exposed R3F 8 / Next 15 React-runtime incompatibility (`ReactCurrentBatchConfig`). Alive now uses native Three.js with a React lifecycle wrapper; no React/R3F upgrade, dependency or lockfile change.
- `characterForm.ts`: continuous cross-section lofts for the flame head and tapered leaf torso, plus fine three-dimensional filament curves. `characterMaterials.ts`: translucent cream/gold light shader, procedural jade veins and soft additive halos. `CharacterScene.tsx`: expressive curved idle eyes and mouth, open eyes with highlights for attention, separate jade satellite, soft landing light. No remote textures, HDRI or model downloads. `characterGlow.ts` adds two half-resolution blur passes with transparent compositing for actual light bloom.
- Crest and leaf motion happen in the vertex shader; no geometry allocation or normal recomputation inside the frame loop. Delta-clamped exponential damping supports different refresh rates. Discrete moods change gaze, eye aperture, orbit velocity, brightness and drift.
- `engine.ts`: pure bounded reducer and precedence resolver; no backend writes or tool calls.
- `useCharacter.ts`: read-only adapter on existing realtime singleton; no new `connect()` call. Existing UI presence contributes only listening/thinking, never inferred success.
- `MoraAlive.tsx`: thin OS adapter. `MoraAliveView.tsx`: shared presentation with lazy native canvas, visible source labels, preview expression selector, pause, keyboard-invitation equivalent, semantic status, WebGL/context-loss fallback, system reduced-motion preference and offscreen/background suspension.

## Signal mapping
| Input | Character state | Provenance |
| --- | --- | --- |
| Existing transport disconnected / absent | offline | connection |
| `mora.execution.started/progress` with journal ID | working | CORE |
| `mora.execution.done` with journal ID and `ok === true` | done | CORE |
| `mora.execution.failed` with journal ID and `ok === false` | error | CORE |
| `action_status`: proposed/pending_confirmation | approval | CORE |
| `action_status`: running/done/failed/rejected/expired | working/done/error | CORE |
| Existing presence listening/thinking | listening/thinking | OS interaction |
| No active job, connected, local hour 23–06 | night-rest | local presentation |
| User selects an expression | selected state | explicitly PREVIEW |

Approval takes precedence over work; another job completing never dismisses active work. Invalid IDs, invalid timestamps, stale/future actions, and late progress after a terminal event are ignored. Jobs expire visually after 120 seconds without evidence; this is not completion. Terminal expressions last four seconds. Disconnect clears retained activity. No raw tool payloads, IDs or private data are rendered in the canvas/UI.

Lifecycle cleanup cancels animation frames, removes the canvas and context listener, disconnects ResizeObserver, and disposes unique geometry/material resources and the renderer.

## Preview entry points
- Existing OS: MÔRA Center → Alive · Vorschau (uses current authenticated OS connection).
- Existing dev museum: `/tunnel?mora=alive` (body-only preview; never subscribes to CORE). `/tunnel` remains the current catalog. No middleware/auth bypass added.

## Reuse and asset preparation
`node scripts/export-mora-alive.mjs <Website-checkout> <immutable-source-sha>` copies the canonical View, renderer, engine, CSS and derived sigil. It reads only `git show` at the supplied SHA and records SHA-256 hashes in `docs/mora-alive/SOURCE.json`. Mirrored files must not be edited independently. OS-only `useCharacter` and realtime/auth code are deliberately excluded.

`CharacterScene` takes only `state`, `still`, `active`, normalized pointer ref, and context-failure callback. Its only engine import is a TypeScript type. Reuse this renderer and the pure engine on the Website; supply a Website-specific read-only event adapter, never reuse OS authentication or invent agent events. Keep the source in this repository as canonical and pin the source commit for downstream use. Website preview integration is prepared in Saimor-world/Website#122; production rollout is pending visual acceptance and explicit release approval.

The paused scene provides a stable pose for later screenshots/video. A production marketing exporter, rigged GLB, captured video and physical jade material scan are not yet implemented. The body is procedural, so there is no static bitmap character standing in for 3D. CI captures provide the first reusable raster views from the real renderer; they are not generated illustrations.

## Limits and follow-up
- This is a first interactive body prototype, not a completed autonomous personality or a new AI model.
- Exploration is bounded procedural drift and pointer/tap invitation. Landing/rest is a lowered pose; contact-aware locomotion and obstacle navigation are future work.
- No authenticated live CORE transaction was initiated during validation; event mapping is source-checked and tested with isolated fixtures.
- Device emulation is not a physical iPhone GPU/thermal/FPS test. 60/120 FPS is a target, not a claimed measured guarantee.
- No globally roaming replacement of the dock/Universe character yet; prevents duplication and navigation interference.

## Release / rollback
Risk A: optional presentation, read-only existing event subscription; no auth/data/finance behavior changed. Draft PR only. No merge, production workflow dispatch, domain change or production deployment authorized. Rollback: revert this feature commit (including optional hub tab, tunnel query branch and read-only transport getter).

Status and exact check results are recorded in `VALIDATION.md`.
