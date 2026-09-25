## Problem

<!-- What problem does this change solve? -->

## Intended behavior / invariants

<!-- State the behavior that must be true and what must remain unchanged. -->

## Architecture and contracts

- [ ] No architecture/source-of-truth boundary changed, or the canonical spec/ADR is updated
- [ ] No duplicate/parallel model of an existing concept was introduced
- [ ] API/event/schema changes have compatibility/migration semantics

## Security / privacy / isolation

- [ ] Authorization and least-privilege impact reviewed
- [ ] Session/customer/server isolation impact reviewed
- [ ] Sensitive data, logs and model/provider routing impact reviewed
- [ ] No secrets or production data added to source/tests

## Verification evidence

<!-- List exact commands/checks and outcomes. -->

- [ ] Focused tests
- [ ] Type/static checks
- [ ] Lint/format checks
- [ ] Production build/config validation
- [ ] Relevant integration/E2E/smoke checks
- [ ] Relevant negative/failure-path checks

## Product truth / UX

- [ ] Verified, inferred, simulated, stale and unavailable states remain distinguishable
- [ ] Loading/empty/error/degraded states considered
- [ ] Mobile/accessibility impact checked where relevant

## Deployment / recovery

- [ ] Deploy impact documented
- [ ] Config/migration changes documented
- [ ] Rollback or forward-recovery understood for production-impacting changes
- [ ] Live verification plan stated when deployment is involved

## Final diff

- [ ] No unresolved merge markers
- [ ] No debug residue or accidental scope
- [ ] No obsolete/dead naming introduced
- [ ] Canonical docs updated when behavior/architecture changed

**Completion:** VERIFIED_COMPLETE / PARTIAL / BLOCKED
