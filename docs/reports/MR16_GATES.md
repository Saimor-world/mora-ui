# MR16 Gates

This project uses fail-fast checks to protect critical Finder/Chat flows during MR16.

## Commands

1. Type safety

```bash
npm run verify:types
```

2. Hermetic critical flow gate (recorded v3 telemetry baseline)

```bash
npm run verify:critical-flow
```

3. Live critical flow API canary

```bash
npm run verify:critical-flow:live
```

4. Hermetic OS smoke gate

```bash
npm run verify:os:smoke
```

5. Combined hermetic MR16 smoke gate

```bash
npm run verify:mr16:smoke
```

6. Combined live MR16 canary

```bash
npm run verify:mr16:smoke:live
```

## What `verify:critical-flow` enforces

- `gate.pass === true`
- `legacy_v1_critical_calls.count === 0`
- `context_routes.status_5xx === 0`
- `v3_list_routes.unbounded_unscoped_count === 0`

If any check fails, process exits with code `1`.

## Local/CI Inputs

`verify:critical-flow` and `verify:os:smoke` are the default CI-safe regression
gates. `verify:critical-flow` reads the recorded MR16 baseline from
`docs/reports/mr16-baseline-2026-03-05.json`; `verify:os:smoke` runs a focused,
fully local Jest subset that covers root session entry, Home surface boot, shell
breadcrumbs, shell snap behavior, Dock navigation, and terminal session truth
without relying on a shared live deployment.

`verify:critical-flow:live` and `verify:mr16:smoke:live` are live-environment
canaries. They are useful for staged validation, but they are not the primary
hermetic CI signal.

Playwright follows the same split:
- `playwright.config.ts` defaults to local UI (`http://127.0.0.1:3000` or `BASE_URL`).
- `playwright.live.config.ts` defaults to the staged/live UI (`https://hq.saimor.world` or `BASE_URL`).

Defaults:
- `SAIMOR_BASE_URL=https://api.saimor.world`
- `SAIMOR_SMOKE_EMAIL=demo@saimor.io`
- `SAIMOR_SMOKE_PASSWORD=demo123`

Override example:

```bash
SAIMOR_BASE_URL=https://api.saimor.world SAIMOR_SMOKE_EMAIL=demo@saimor.io SAIMOR_SMOKE_PASSWORD=demo123 npm run verify:critical-flow:live
```
