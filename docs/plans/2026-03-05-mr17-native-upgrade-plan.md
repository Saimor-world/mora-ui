# MR17 Plan (2026-03-05) - Native OS Level Upgrade

Status baseline:
- Live UI: `78c0675`
- Live Core: `9274789`

## Goals
- Remove remaining legacy navigation behavior.
- Unify Memory truth between sidebar, Mora Nexus and chat answers.
- Push interaction latency to native-feel behavior.
- Upgrade window ergonomics for long work sessions.

## Workstream A - Universe/Finder correctness
1. Keep `Im Universe öffnen` in L2/L3 paradigm only (never `viewLevel=folder`).
2. Resolve missing IDs via `/v3/{entity_id}/context`.
3. Open/focus Finder in resolved folder context after universe jump.
4. Keep context failures as non-blocking hints (no hard errors).
5. Verify with manual flow from graph/list/grid context menus.

## Workstream B - Memory coherence
6. Feed chat prompt with memory overview (episodic/facts/pending/recent).
7. Feed chat prompt with scoped memory evidence lines.
8. Keep memory source aligned with `/v3/memory/*` surfaces.
9. Add tests for memory prompt contract.
10. Validate answer quality for "what are your memories?"-type questions.

## Workstream C - Window manager v2
11. Add native maximize toggles via title-bar double click.
12. Add keyboard maximize shortcuts (`F11`, `Ctrl/Cmd+ArrowUp`) for active pane.
13. Preserve minimize/restore behavior.
14. Keep fullscreen state signal for dock visibility contract.
15. Validate no regression on draggable/resizable panes.

## Workstream D - Perf guardrails
16. Keep fail-fast critical flow gate (`/v3/system/performance/critical-flows`) in verify scripts.
17. Keep no critical `/v1` leaks in Finder/Chat flow.
18. Keep deterministic smoke for single finder nav group.
19. Track cache and memory-debug baseline snapshots.
20. Promote only green builds to live.

## Immediate next batch
21. Add explicit pane-level max-width presets for Chat and Finder readability.
22. Add compact/comfortable density toggle in Finder list mode.
23. Add "Open in Universe" visual confirmation chip with resolved scope labels.
24. Add browser trace collection script for FPS/input-delay evidence.
25. Add top-level `verify:release` script combining all MR16/MR17 gates.
