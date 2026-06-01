# Monolith Refactor — behavior-neutral decomposition

**Date:** 2026-06-01
**Goal:** Shrink the 9 large surfaces (>1100 lines) into focused, tested modules WITHOUT changing behavior, on the way to a clean OS.
**Constraint:** Each surface auto-deploys to `hq.saimor.world` on push to main. Chrome verify is currently offline → rely on characterization tests + `verify:types` + `verify:os:smoke` + `npm run build`.

## The proven pattern (exemplar shipped: `refactor/monolith-extraction`, `70b9eec`)

1. Identify a **pure, self-contained seam** (formatter fns, presentational sub-components, pure useMemo derivations).
2. Write **characterization tests** that pin the CURRENT behavior first (RED — module missing).
3. Extract verbatim into a sibling module (e.g. `homeSurfaceFormat.tsx`). GREEN.
4. Import back; remove now-unused imports from the monolith.
5. Verify: `verify:types` + the surface's existing smoke test still green (proves behavior-neutral).
6. Small commit per extraction. Never mix refactor with behavior change.

**Done:** HomeSurface formatters (`relativeTime`, `normalizePrivateAreaLabel`, `kindIcon`, `kindLabel`, `RecentKind`) → `components/home/homeSurfaceFormat.tsx` + test. 1511 → 1464 lines.

## Per-file targets (priority order)

| File | Lines | First seams to extract |
|---|---|---|
| `apps/finder/index.tsx` | 3242 | `deriveFinderMaps`, `toIntakeChoiceResult`, breadcrumb/tree walkers → `lib/finder/*` (pure); then GraphView, ListView, GridView as sub-components |
| `apps/chat/index.tsx` | 2130 | Follow `2026-06-01-mora-chat-rethink-design.md`: extract ToolTraceCard, ChatScopeBar, MemoryCard; split streaming vs agentic-loop hooks |
| `components/home/UniverseView.tsx` | 1876 | planet layout math (pure) → `lib/universe/layout.ts`; PlanetTile/insight rail components |
| `apps/settings/index.tsx` | 1688 | one component per settings section/tab |
| `components/mora/Dock.tsx` | 1678 | ⚠️ navigation-critical — extract item config/registry first (pure), keep behavior; test nav before/after |
| `components/auth/WelcomeScreen.tsx` | 1576 | step components + form-validation helpers |
| `components/home/HomeSurface.tsx` | 1464 | continue: SuggestionCard, DeptPlanetTile, HomeChip → own files; `moraSuggestions`/`stackBriefings`/`homeSummaryChips` derivations → tested `lib/home/*` |
| `apps/scanner/index.tsx` | 1460 | scan-result parsing (pure) → `lib/scanner/*`; result/list components |
| `components/os/shell/MoraShell.tsx` | 1444 | ⚠️ shell-critical — extract effect hooks (useRealtime wiring, keyboard) into `lib/hooks/*`; keep JSX last |

## Rules
- Pure logic first (zero render risk), components second, critical files (Dock, MoraShell) last and most carefully.
- One seam = one commit. Run smoke after each.
- Stop and ask if a seam can't be extracted without touching behavior.
- Delegatable to Sonnet per-file; Opus reviews each diff.
