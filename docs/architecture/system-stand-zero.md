# Saimôr System Stand 0 — proposed boundaries

Status: proposal for review, 2026-09-07. No production changes authorized by this PR.

## Evidence snapshot

- Website main 2daba2f: Vercel production READY, alias www.saimor.world verified. Option C PR #17 already merged; #21 is newer. Preserve 8cc40049 as the requested historical rollback reference, not as a claim about current production.
- mora-ui main 1318c6cd: MoraShell is 1,362 lines before this extraction. It composes authentication, navigation, execution feedback, panes, drop handling, ambient layers and audio. Existing stores/hooks already separate some concerns.
- mora-work main 9765a181: Shell renders TopBar, scrollable main and ChatPanel. Cmd/Ctrl+K toggles chat. AppFrame bypasses the shell for login/workspace. This is a distinct route-based application, not an OS shell preset today.
- Desk resolves mora_session through CORE /v3/auth/session. Shared identity is partially implemented, not absent. Browser state and server authorization are distinct.
- Desk app/api/chat/route.ts still owns a direct OpenClaw WebSocket client, context injection, history and agent:mora:main. lib/gateway.ts duplicates the protocol with a different default host. Operator authorization is checked: this is an architecture finding, not evidence of public access to private history.
- CORE accepted ADR 2026-06-29-two-personas-one-platform-adr.md specifies shared memory/provider/cost/governance with separate personas. Implementation remains incomplete while Desk routes chat directly to OpenClaw.
- saimor-ops DEPLOYED_STATE.md still reports March 12. It cannot establish the current Hetzner deployment. Runtime revisions and restore success remain unverified.

## Newer consolidation proposal discovered during review

Workspace draft PR #1 (f8595cdb), OS draft #50 (4bba0b4a) and mora-work draft #10 (135747f0) propose a single OS, Home/Heute and eventual retirement of Desk as a product. These are not merged decisions yet. This review recommends that direction rather than permanently synchronizing two frontends. The old accepted two-persona ADR must be explicitly superseded if the one-personality proposal is accepted; do not silently treat both as current policy.

The proposed workspace architecture says one installation per customer while current CORE/session contracts still use tenant identifiers and public preview scopes. Dedicated infrastructure does not remove the need for tenant/actor authorization. Write down demo/trial provisioning boundaries before simplifying those guards.

## Target responsibilities

| Boundary | Owns | Must not own |
| --- | --- | --- |
| World Surface / frontend engine | backdrop, theme, motion preferences, pane chrome, command registry, UI notifications, accessibility | credentials, tenant authorization, provider routing, durable memory |
| OS adapter | organizational views, capability mapping, navigation targets, scoped CORE query cache | a second shared-platform implementation |
| Desk adapter | personal/operator views, calmer defaults, mail/calendar/files adapters | its own unrestricted memory/provider/cost plane |
| CORE | authoritative identity/tenant policy, entities, memory, provider routing, budgets, governance, action receipts | DOM state, window coordinates, animation timing |
| Execution runtime | approved tool invocation, retries, cancellation, idempotent result delivery | independent authority, canonical memory, competing policy |
| Website | discovery, studio/services, entry and account bridge | OS internal state or a duplicate OS |

One system does not mean one mutable global store. UI layout stays local to each surface; remote records belong in a tenant/user-scoped query cache. Authorization is enforced server-side. Surface switches must never promote scope or reuse another tenant's cache.

## Five priority problems

1. MoraShell combines rendering, interaction orchestration and business context. Extract composition boundaries before packaging shared UI.
2. Desk retains a second cognition path and duplicated gateway implementations. Move governance through CORE incrementally, preserving the two personas.
3. Navigation/events/state have no shared, versioned contract. Browser CustomEvents are local UI signals, not cross-origin infrastructure or permission grants.
4. Identity convergence is partial. Define principal/tenant/scope/capabilities and logout/cache-reset behavior before sharing client state. Never share raw tokens through browser storage or arbitrary postMessage.
5. Release truth is fragmented. Repository history, historical deploy notes and live services need a revision manifest and repeatable smoke/restore evidence.

## Repo roles

Keep both deployments only during verified migration. Target mora-ui as the canonical OS; migrate retained capabilities to Home/Heute and other OS surfaces. Do not build permanent cross-app synchronization or create a speculative engine repo. CORE owns platform contracts. saimor-ops owns deployment/recovery manifests. saimor-workspace indexes those sources and decisions rather than duplicating app code. Website remains public entry. Earth and YORI remain domain-specific applications until a real shared use case justifies integration.

Historical archives, disabled ResonanceRoom/cursor/insight components and old FRNT/CreatorOS naming are not current capabilities. Inventory references before deleting anything; a disabled component is not proof it is obsolete.

## Delivery sequence and acceptance

1. This PR: extract existing OS background composition into OsWorldSurface with explicit props. Preserve DOM order, dynamic imports, density and pause gates. It is still an OS adapter because children read OS stores. No claim that Desk already shares it.
2. Separate stateless background/theme primitives from scene-aware adapters; let Home/Heute use the same shell with calm defaults as former Desk capabilities migrate. Compare normal/reduced-motion/mobile rendering. Avoid copying files into two diverging repos.
3. Define typed local commands, navigation intents and notification envelopes. Separate these from authenticated CORE domain events with event IDs, sequence/cursor and tenant scoping.
4. Align session adapters and cache lifecycle; verify expiry, logout, tenant switch and cross-surface return paths. Explicitly test two independent users.
5. Route retained assistant capabilities through CORE governance, with OpenClaw execution behind a scoped action contract. Resolve the accepted two-persona ADR against the newer one-personality draft explicitly. Test approval, denial, duplicate delivery, cancellation, cost recording and runtime loss.

Stand 0 means one demonstrated end-to-end workflow in both surfaces, consistent identity/context, deterministic files/mail/calendar still usable without an LLM, traceable approved actions, graceful offline/error states and reproducible releases. It does not require every planned module to exist.

## Visual direction

Retain the seal, subdued green/gold atmosphere and sparse orbits. Use shared spacing, typography, surface elevation and focus styles. Desk is calmer by preset, not a separate visual identity. Sound is opt-in. Heavy effects remain deferred and respect reduced motion. Keep a usable static first paint.

The current website desktop inspection shows a long hero sentence breaking across many lines and an unexplained Entry label. Prefer shorter hierarchy and a clear Demo label; preserve the existing visual direction. Genuine product captures should show a verified workflow, not a concept presented as a working screenshot.

## Verification limits

Public browser checks reached the OS entry chooser and Desk login, not authenticated workspaces. Safari on an actual iPhone, tenant isolation end-to-end, current Hetzner revisions and database restore have not been verified in this review. No emails, accounts, scans or external actions were submitted.

## Checks for this extraction

TypeScript verification passed. Seven existing shell/capability tests and three new background-gate tests passed using ts-jest in this environment. The repository-default Next/SWC transformer panicked before running tests; CI with the default runner remains required. No production build or authenticated visual parity claim is made.
