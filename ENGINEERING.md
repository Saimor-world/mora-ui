# Engineering profile — Saimôr OS

Canonical policy: `Saimor-world/saimor-workspace/docs/ENGINEERING_STANDARD.md`.

## Role
This repository is the primary Saimôr OS surface. It renders and coordinates user interaction; it is not a second CORE.

## Non-negotiable invariants
- Authorization and durable business truth stay in CORE.
- All server data uses the established query/API layers; do not create ad-hoc shadow state.
- New UI state belongs in the narrowest correct store; do not revive deprecated stores.
- Mutations show pending/success/failure and prevent unsafe duplicate actions.
- Permission denied, stale, empty and unavailable states are designed explicitly.
- Accessibility and reduced-motion behavior are release properties.
- Heavy 3D/ambient effects degrade gracefully and must not block core workflows.
- Never show simulated/demo data as live.

## Required verification
`npm ci`
`npm run lint`
`npm run verify:types`
`npm run verify:critical-flow`
`npm run verify:os:smoke`
`npm test -- --runInBand`
`npm run build`

Critical user-flow changes additionally require the relevant Playwright/live smoke where environment access exists.
