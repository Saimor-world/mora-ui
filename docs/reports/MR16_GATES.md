# MR16 Gates

This project uses fail-fast checks to protect critical Finder/Chat flows during MR16.

## Commands

1. Type safety

```bash
npm run verify:types
```

2. Critical flow API gate (v3 telemetry-backed)

```bash
npm run verify:critical-flow
```

3. Combined smoke gate

```bash
npm run verify:mr16:smoke
```

## What `verify:critical-flow` enforces

- `gate.pass === true`
- `legacy_v1_critical_calls.count === 0`
- `context_routes.status_5xx === 0`
- `v3_list_routes.unbounded_unscoped_count === 0`

If any check fails, process exits with code `1`.

## Local/CI Inputs

Defaults:
- `SAIMOR_BASE_URL=https://api.saimor.world`
- `SAIMOR_SMOKE_EMAIL=demo@saimor.io`
- `SAIMOR_SMOKE_PASSWORD=demo123`

Override example:

```bash
SAIMOR_BASE_URL=https://api.saimor.world SAIMOR_SMOKE_EMAIL=demo@saimor.io SAIMOR_SMOKE_PASSWORD=demo123 npm run verify:critical-flow
```
