# Concrete object navigation — 04.11.2026

Prepared in PR #215, built on the privacy fixes in #213. No main merge or production rollout.

## Route and source contract

| Origin | Canonical ID | Destination | Detail source |
|---|---|---|---|
| Home task/event attention | Today task/event ID | Heute | Current scoped Today tasks or verified calendar read model |
| Heute overdue attention | Original task ID, separate from display key | Heute | Current scoped Today task arrays |
| Heute calendar row | Event ID | Heute | The same verified calendar model used by Heute; explicit demo uses its scoped Today events |
| Command palette task/event | Search row's actual object ID | Heute | Current scoped data, never the search label as an object payload |
| Bridge day mark | Day mark's event ID | Heute | Current calendar data |
| Department day moon | Separate objectId, not the prefixed visual key | Heute / Post | Tasks/events use the object detail; mail uses the existing scoped mail handoff |
| Post calendar row | Original Post calendar ID | Post | The same calendar query that rendered the row |

The ephemeral shell command stores only kind, ID, destination and origin scope. No task/event payload or permissions are copied into the shell store. The consumer resolves the ID from its current source. Missing, unreadable, loading and stale sources remain distinct; no first-item substitution. Task details additionally require the snapshot's requested tenant/user/company to match the active context.

## Observable behavior

- Commands are published before feature navigation and handled even when the destination is already mounted.
- Old-account and old-company callbacks are rejected; identically named IDs do not bypass the origin scope.
- Opening details is read-only. Existing task completion remains a separate action.
- Details receive keyboard focus, scroll without animation and can be closed. Existing Surface layout is reused.
- Demo events use their scoped fictional data; they do not fall back to the presenter's personal calendar.
- Day moons with a generated visual key but no CORE object ID do not offer an object-opening action.

## Acceptance evidence and remaining limits

Targeted regression tests cover exact IDs, missing objects, delayed data, repeated selection, source errors, stale display, principal/company changes, command-palette routing, day-moon identity and opening without completion. Typecheck and normal CI outcomes are recorded in the PR.

These are in-app object commands, not shareable URL permalinks. An ID outside the current read window is reported as unavailable. All legacy apps, authenticated desktop/iPhone layout and backend cross-tenant isolation are not certified by this change. No new API, server session, role or write operation is introduced.
