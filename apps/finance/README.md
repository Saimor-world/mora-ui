# SAIMÔR Finance — native product surface

This directory is the native SAIMÔR Finance surface.

## Product boundary

Finance is the financial operating environment for SAIMÔR itself first. The first accepted product slice is **State + Flow**, backed by canonical CORE company truth from `saimor-core` FIN-01.

The existing XRPL treasury experience is valuable but is not the Finance home. It is being migrated beneath:

`Finance → Capital → XRPL Lab`

## Truth rules

- Never render fabricated balances, revenue, runway or returns as real.
- Company assets and founder/personal assets are distinct scopes.
- Founder funding is not revenue.
- Customer receipts are not recognized revenue until separately classified with evidence.
- Unknown/missing financial history is visibly incomplete, never coerced to zero.
- Every financial number must retain provenance/evidence where the CORE contract provides it.
- UI actions in the first slice record reviewed facts only; they do not move bank or ledger funds.

## First composition

Primary destinations:

1. **State** — current company financial state and observation coverage.
2. **Flow** — immutable capital records with provenance and correction trace.
3. **Treasury** — follows after the State/Flow truth contract is accepted.
4. **Capital** — allocations/investments; XRPL Lab lives here.

The visual direction is calm, editorial and institutional. Prefer one strong capital-state/flow composition to a grid of KPI cards. Mobile and desktop must both be first-class.

## Integration status

FIN-02 is intentionally scaffolded before the CORE contract is accepted. Do not wire production UI to fixture data. Final implementation must consume the reviewed FIN-01 endpoints and include empty/manual/detail/error states plus evidence drilldown.
