# Personal source boundaries: deeper review, 04.11.2026

Status: defensive frontend changes prepared in PR #213. This document records code and automated-test evidence, not authenticated browser acceptance or server isolation.

## Confirmed paths and changes

| Path | Failure found in code | Defensive behavior |
|---|---|---|
| useHorizonSources | `enabled:false` still returned cached personal mail, feed and connection data | Mask disabled/demo output; partition caches by principal, session generation and demo-scope generation |
| useCommunicationLiveData | Demo blocked mail/calendar only; feeds and personal cloud metadata still loaded | Block the whole personal-source batch in demo, including manual refresh and queued callbacks |
| Communication cloud follow-up | An old first response could trigger a personal cloud read after switching scope | Check the captured scope before processing the first reply and before publishing cloud results |
| Communication state | Demo changes did not invalidate state if activeCompanyId stayed unchanged | Subscribe to demo/session changes; mask old state immediately; prevent old requests from clearing newer request ownership |
| Briefing, connections, mail summary | Shared cache keys could reuse another principal's data; disabled queries could be manually refetched | Identity/scope cache keys, output masks and request-time checks, including stale query functions |
| Post inbox/calendar | Cache partition used tenant only, not the user/session within that tenant | Add principal/session/demo generation and reject replies/refetches from an obsolete scope |
| Nightwatch Owl | The internal card includes private invoices/mail highlights and was live in demo scope | Hide/unmount the personal card, stop querying and reject obsolete replies/refetches |
| AgentFeed | The endpoint reads the presenter's cognition log rather than the selected demo company | Hide the personal feed in demo scope and partition its cache by identity/scope |

`scopeGeneration` in demoStore is only an ephemeral UI cache epoch. It grants no permissions and changes no CORE session, role or tenant. It detects even a batched own → demo → own transition. `sessionGeneration` remains the existing session-store epoch.

## Test cases

- Cold and warm demo entry; personal queries remain blocked even when a parent passes `live=true`.
- Mail, calendar, feed and cloud previews disappear from the communication/MÔRA context.
- Late first replies cannot start a cloud follow-up; a queued request checks scope before its first network call.
- Rapid own → demo → own, old query refetch, and account changes with the same company or tenant ID.
- Native Post reading state remounts on identity/scope changes.
- Existing live source-connection and calendar-continuity behavior remains covered by targeted regressions.

## Explicit limits and next review

Already-started HTTP requests are not cancelled by this patch. Obsolete results are rejected or isolated from the new UI scope; this is not a memory-erasure guarantee. CORE must still enforce every authorization decision.

Authenticated desktop/iPhone testing with isolated test accounts is outstanding. A full review of company-scoped Universe/Knowledge caches, all legacy panes and MÔRA context consumers is separate work. The demo session/tenant design remains a proposal in PR #214; it has not been implemented here.

PR #215 separately improves exact mail-ID handoff. Exact task/event navigation and a shared CORE demo-object set across all apps remain outstanding; generic navigation is not acceptance of those flows.
