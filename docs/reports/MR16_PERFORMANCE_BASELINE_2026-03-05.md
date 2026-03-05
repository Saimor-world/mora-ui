# MR16 Performance Baseline - 2026-03-05

## Scope
- UI branch: `main`
- Focus: Dock + L2/L3 + Finder + Diagnostics

## Baseline Guard Results
- `npm run verify:critical-flow` => PASS
- legacy_v1_critical_calls: `0`
- context_5xx: `0`
- unbounded_unscoped_v3_lists: `0`

## Runtime Telemetry Endpoints
- `/v3/system/performance` => `401` without auth (expected)
- `/v3/system/performance/caches` => `401` without auth (expected)
- `/v3/memory/debug/scope` => `401` without auth (expected)

## Instrumentation Added
- Dev diagnostics panel now includes live UI perf:
  - `FPS avg`
  - `Frame p95 (ms)`
  - `Input p95 (ms)`
  - `LongTasks count / max`

## MR16 Optimizations Implemented
1. Dock memory badge switched from full `useMemory()` to lightweight `useMemoryPendingCount()`.
2. PlasmaOrb render load reduced:
   - frame capped to ~30 FPS
   - canvas DPR capped to 1.5
   - rendering paused when document is hidden
3. Finder dense grid load reduced:
   - removed expensive `layoutId` tracking on file/folder cards and selection ring
4. Perf diagnostics expanded for repeatable before/after checks.

## Targets
- Hover reaction p95 < 100ms
- Frame p95 < 20ms (warning > 28ms)
- No long task > 150ms in normal navigation
- Finder transition without empty flash

## Measurement Procedure
1. Open `/home?diagnostics=1`
2. Run 3 scenes:
   - Home idle + dock skim 10s
   - L2 rapid cross-hover 20x
   - L3 + Finder open, then dense folder navigation
3. Capture perf panel values and compare with previous run.