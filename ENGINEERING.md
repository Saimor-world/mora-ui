# Engineering Contract — Saimôr OS

This repository follows the canonical **SAIMÔR Engineering Constitution** in `Saimor-world/saimor-workspace/ENGINEERING.md`.

## Risk class

**Tier 1 — production product surface.**

## Product boundary

- CORE is truth for data, identity, permissions, policy and model routing.
- The UI never grants authority because a control is visible or hidden.
- Do not create a second state/architecture model when an existing store/query/contract owns the concept.
- Server data belongs in the established query/data layer; local UI state stays local.
- Failed/unavailable data is not replaced by unlabeled simulated or stale content.
- Loading, empty, error and degraded states are product states.

## Required verification

For relevant changes:

- TypeScript verification;
- lint/static checks;
- focused Jest tests and regression tests;
- production Next.js build;
- Playwright/E2E or smoke coverage for critical user journeys;
- browser verification for visual/interaction changes;
- keyboard/focus, mobile/responsive and reduced-motion checks where affected;
- explicit auth/permission negative-path checks when access behavior changes.

No UI change is complete if desktop looks correct but the affected mobile or error state was not considered.

Completion status is one of: **VERIFIED_COMPLETE**, **PARTIAL**, **BLOCKED**.
