# SAIMÔR SYSTEM STATE

Last verified: 2026-09-07 (UTC), convergence audit.
Verified against: GitHub source, PR diffs and workflow logs; Vercel Website deployment metadata.
Current mission: Stand 0 — one canonical OS convergence line.
Status: Review proposal. No production deployment, merge, PR closure or application-code fix was performed in this audit round.
Coordination home: Saimor-world/mora-ui, docs/SAIMOR_SYSTEM_STATE.md. Until merged, read coordination/stand-zero. Update this document through reviewed commits; do not treat a chat handoff as runtime evidence.

## 1. Product Definition

Saimôr is one system. Saimôr OS is its primary interface. CORE owns deterministic operational truth and controlled actions. MÔRA interprets context and uses those capabilities; it must not become an alternative source of truth.

Desk is no longer a separate product target. Preserve useful mora-work capabilities through CORE contracts and native OS surfaces. A quieter workspace may return only on the same Engine, identity and truth.

This is the user-approved product direction, not a claim that convergence is already complete.

## 2. Canonical Architecture

| Layer | Responsibility | Boundary |
|---|---|---|
| OS / native apps | Home, Mail, Calendar, Work, Tasks, Files, Nightwatch | Compose capabilities; no duplicate backend truth |
| Frontend Engine | World Surface, panes, navigation, commands, notifications, session projection, motion | UI state and adapters; never the authority for permissions |
| CORE | Tenant/user/company authorization, operational records, source adapters, controlled actions | Authorize every read/action; preserve source provenance |
| MÔRA | Context, interpretation, orchestration | Read authorized projections; act through controlled capabilities |
| Runtime / OpenClaw | Tool execution | Not another memory, identity or policy authority |

Engine is a logical boundary, not yet a proven shared package. PR #51 extracts OS composition but its layers still depend on OS stores. Do not package tightly coupled components prematurely.

Five principal architecture problems:
1. Scope is not preserved consistently from authenticated user/company to aggregated source queries.
2. Empty, partial, disconnected and healthy are not reliably distinguished throughout source adapters.
3. Shell composition, arrival overlays and shared HTTP behavior are changing in overlapping PRs.
4. Today repeats sequential external reads while the UI polls; context switches can retain stale data.
5. Architecture documentation and deployment evidence lag code; branch intent is easily mistaken for live behavior.

## 3. Canonical Repositories

All names below are under Saimor-world.

| Repository | Role | Verified state |
|---|---|---|
| mora-ui | Canonical OS and current frontend Engine host | main 13c6456e0ac48db2a588ff45efb9d250322182b8 |
| saimor-core | CORE truth/actions/context platform | main 4b0c73a0e65613f6159ff88d14c2c25dcfb404ab |
| mora-work | Historical Desk source; capability migration inventory | main 9765a181ca49bcc491dfce0917b0dca30e0d8e60; not a second forward product |
| saimor-workspace | Cross-repo guidance | PR #1 proposes One OS; reconcile before treating all guidance as canonical |
| saimor-ops | Deployment/runbook ownership | Existing DEPLOYED_STATE.md is historical, not current production proof |
| Website | Public explanation and entry | Independently deployed; not the OS or CORE |
| saimor-earth / other projects | Outside current mission | No Stand-0 expansion or archive decision made |

## 4. Production Reality

Website Vercel lookup of www.saimor.world returned READY production:
- Deployment: dpl_Da7dhnNfD5vFEW9JYthDTS1qXcZ3
- Commit: 2daba2fbbf0836aeca390bdfb233ba525ab06b3f
- Project: prj_VyQHHgQLYVm7NI55MMVRahL28lug
- The earlier 8cc40049 baseline is historical, not the observed live revision.

OS hq.saimor.world and Desk dash.saimor.world: exact deployed revisions NOT VERIFIED. Earlier public entry/login observations do not prove authenticated behavior, isolation or current build identity. CORE/runtime deployed revisions NOT VERIFIED. No private records, signup, billing or destructive operation was exercised.

Release requires fresh runtime revision evidence, deployment health and authenticated test-tenant QA. Repository main is not proof of deployment.

## 5. Preview / Work in Progress

| Work | Audited head |
|---|---|
| CORE #29, codex/unified-os-today | 1346c7292083afb92f71401b531f4c0a57a26c37 |
| OS Today, codex/unified-os-today; now draft #55 | 8b8e0d4fefe93c3b05e74c889e2ba04e9684635c |
| OS #50 | 4bba0b4ac4168fb73635b2974f1ea1e11647dbaa |
| OS #51 | 6d06dc6987e42c31b6d4e81ea7ec395fd4377d8f |
| OS #54 | 7e2228aa22c4fd2281c2cae395738f676d835602 |
| OS #48 | c8a3e77775e18cb0a8d0771fff4b29ef3029fb27 |
| OS #45 | f25e9ecf9c00dfb3d5597fe569739d87799a0660 |
| Workspace #1 | f8595cdb906c605bb03aa3efedcba256255b9fa0 |
| Website #23, stacked on #22 | 1bc94bb93eb154b82e57472e27eadf0a5b46a3b1 |

Website #23 preview READY: dpl_G5M46mCyxAoXoNgVaps3gZNDcgYa. Visual work is parked, not a dependency of Today. No Today browser/device QA completed in this round.

## 6. Active Pull Requests

Decisions are proposals, not executed merges or closures. Recheck heads and CI before implementation.

| PR | Purpose / overlap | Proposal and gate |
|---|---|---|
| [CORE #29](https://github.com/Saimor-world/saimor-core/pull/29) | Today truth; task service, briefing, Engine ADR | KEEP, blocked by CI and source/scope correctness below |
| [OS #55](https://github.com/Saimor-world/mora-ui/pull/55) | Existing Today consumer, HomeSurfaceNext | KEEP as draft; depends on #29 contract; coordinate #54 HTTP changes |
| [OS #51](https://github.com/Saimor-world/mora-ui/pull/51) | World Surface extraction from MoraShell | KEEP behavior-preserving code; supersede obsolete dual-surface assumptions in its architecture document |
| [OS #50](https://github.com/Saimor-world/mora-ui/pull/50) | Home and MÔRA presence | INTEGRATE selected changes with #55 and one arrival policy; stale test below |
| [OS #54](https://github.com/Saimor-world/mora-ui/pull/54) | Mail triage plus shared HTTP auth behavior | INTEGRATE after classifier fix and contract review; not merely isolated Mail UI |
| [OS #48](https://github.com/Saimor-world/mora-ui/pull/48) | Handoff overlay ownership | INTEGRATE selective context cleanup/tour ownership; reject blanket hiding of real connectivity errors |
| [OS #45](https://github.com/Saimor-world/mora-ui/pull/45) | First-arrival auto-open behavior | SUPERSEDE only after useful no-duplicate/no-forced-chat behavior is incorporated and tested with #48/#50 |
| [OS #18](https://github.com/Saimor-world/mora-ui/pull/18) | Broad immersive/panes/search work | DEFER; salvage independently reproduced fixes instead of broad merge |
| [CORE #25](https://github.com/Saimor-world/saimor-core/pull/25) | World model products/servers/agents | DEFER; no established Today dependency |
| [CORE #11](https://github.com/Saimor-world/saimor-core/pull/11) | Larry ingestion | DEFER pending scoped ingestion/action review |
| [CORE #9](https://github.com/Saimor-world/saimor-core/pull/9) | OAuth redirect adjustment | DEFER pending proof it is still required by actual deployed route |
| [mora-work #10](https://github.com/Saimor-world/mora-work/pull/10) | Capability inventory | KEEP as migration inventory, not new Desk runtime |
| [Workspace #1](https://github.com/Saimor-world/saimor-workspace/pull/1) | One OS guidance | INTEGRATE; clarify that dedicated installation does not remove existing tenant/user boundaries |
| Website #22 / #23 | Visual direction and polish | DEFER from Stand 0; retain previews, no production promotion |

### Exact observed CI blockers

CORE #29:
- [Lint/format job](https://github.com/Saimor-world/saimor-core/actions/runs/34124864016/job/101751068477): 45 Ruff violations across today.py, task_service.py, today_service.py, test_today_surface.py. Format stage not reached.
- [CI tests](https://github.com/Saimor-world/saimor-core/actions/runs/34124864016/job/101751068548): 1 failed / 1153 passed. Test tenant tenant-today-test is outside configured allowlist; expected 200 receives 401 before intended fallback path. Fix fixture, not production authorization.
- [Core truth tests](https://github.com/Saimor-world/saimor-core/actions/runs/34124863877/job/101751068446): 2 failed / 965 passed. Same 401 plus route enumeration assumes every route has .path; newer FastAPI exposes _IncludedRouter. Prefer actual HTTP contract assertion. CI environments resolve different framework versions.
- Runtime Smoke, Security Checks and Compose Validation passed in inspected runs.

OS #50:
- [Verify](https://github.com/Saimor-world/mora-ui/actions/runs/34058765131/job/101555390789): 1 failed / 1331 passed; surfaceRegistry.test.ts:129 expects historical Saimôr Desk label instead of Saimôr OS · Home. Confirm navigation contract then update assertion.

OS #54:
- [Verify](https://github.com/Saimor-world/mora-ui/actions/runs/34118982183/job/101732375603): 1 failed / 1342 passed; promotional “20% Rabatt auf deine nächste Bestellung” matches broad transactional bestell expression. Narrow transaction classification without weakening invoice/security protection.
- #50/#54 lint, types, critical flow and OS smoke passed; production build was SKIPPED, not verified.

OS #51 and #48 inspected verify runs passed. Green CI does not resolve the design issues above. #45/#18 verify failed; their exact failing tests were not investigated in this bounded audit.

## 7. System Contracts

Evidence for CORE findings: #29 head above, core/api/v3/today.py, core/services/today_service.py, core/services/task_service.py, core/database.py, core/services/node_service.py, core/api/v1/endpoints/mail.py and calendar.py.
Evidence for UI: #55 head, components/home/TodayOverview.tsx, lib/api/todayClient.ts; main lib/api/http.ts and #54 diff.

| Contract | Current finding / required gate |
|---|---|
| Today | /v3/today aggregates sources sequentially. Preserve unknown != zero and unknown != healthy all the way through source adapters, not just outer exception handlers |
| Identity/company | Company lookup establishes tenant ownership, not user membership. Tasks and Nightwatch do not consistently apply requested company. Define and enforce tenant + user visibility + company semantics |
| Nightwatch | Today calls NodeService.list without caller_user_id or company, limit 100. Visibility filtering is conditional on caller. Count/health from a truncated subset is not an exact scoped aggregate |
| Mail | Up to one Gmail list plus 20 sequential detail requests per snapshot. Missing credentials can return []; failed details are skipped. Empty/local fallback/partial external result need explicit provenance and availability |
| Calendar | External query uses UTC day bounds while Today uses Europe/Berlin; mapping strips offsets. Preserve timezone-aware instants and align day window; pagination/completeness must be explicit |
| Tasks | Shared deterministic service is useful. Reported SQLite row_factory bug NOT CONFIRMED: get_connection sets sqlite3.Row; db_session uses it. Do not add speculative patch |
| Today UI | Old snapshot survives company change; manual refresh has no generation guard. Clear/key data by authenticated scope and prevent stale responses committing |
| Polling | Current 60-second interval plus focus/manual refresh, no visibility gate/backoff. At 21 Gmail calls per snapshot, code-based upper estimate is 1260/hour/client before extra triggers; not measured usage |
| HTTP | GET in-flight dedupe key is not explicitly principal-keyed; main swallows 401/403 to null. Coordinate #54 behavior and session invalidation; avoid auth failure looking like empty Today |
| Types/status | TypeScript cast is not response validation. status ok plus nullish-to-zero counters can present misleading health. Validate contract and distinguish not connected, partial, stale, unavailable, empty |
| Files / Work / Activity | Existing native surfaces are not proof of unified backend contracts. Inventory after Today; do not introduce parallel truth |
| MÔRA context/actions | Must consume same authorized source contracts; provenance and action authorization remain server-owned |

Scope and stale-data findings are release blockers from code review, not a claim of a demonstrated production exploit. Tests with two users/companies are required.

## 8. Historical Decisions / Superseded Architecture

SUPERSEDED as forward product direction: “Two Môra Personas, One Platform” where it implies two independently evolving OS/Desk products. Persona variation remains possible inside one OS.

CORE #29 contains docs/architecture/2026-09-07-one-os-engine-world-adr.md with accepted wording, but the PR is unmerged. Do not equate that wording with deployed convergence.

Workspace #1 and OS #51 documentation must align with this direction. Dedicated customer installation does not authorize removal of existing tenant checks. Main OS already contains a “remove historical Desk boundary” commit; remaining branches must be compared against it, not replayed blindly.

## 9. Current Mission

One mission: make Today/Home the first scope-safe, source-honest vertical slice of the single OS.

Minimal integration order:
1. Agree source availability/provenance and effective scope contracts; retain current production.
2. Stabilize CORE #29: bounded CI fixes, then scope/count/time/error/performance corrections with regression tests.
3. Stabilize #55 against that contract; context-safe loading/refresh, source-aware rendering, shared HTTP coordination with #54.
4. Integrate #51 extraction independently where still behavior-preserving. Reconcile #50/#48/#45 into one arrival policy; no assumed hard dependency requiring a larger Shell rewrite.
5. Integrate Mail triage from #54 after classifier/auth regression checks.
6. Pin CORE/UI candidate SHAs, run complete CI/build, preview and browser QA, record runtime SHAs and rollback. Marius reviews before production.

Definition of Done:
- Single canonical Home/OS route and no second Desk product line.
- Required CI and production builds pass at pinned candidate SHAs.
- Cross-user/company tests; no stale prior-scope data or unauthorized aggregates.
- Source unavailable/partial/empty semantics, bounded external work and calendar boundary tests.
- Authenticated preview end-to-end checks; desktop/mobile, iPhone/iPad Safari validation explicitly recorded.
- Deployment identities and rollback recorded; release approved separately.
- Blackboard updated with evidence and remaining limitations.

## 10. Next Missions

After Stand 0 only: Work/Missions/Tasks capabilities; Files/documents; Activity/Weave; deeper MÔRA orchestration. No Finance/Earth/Messages feature work in this mission.

## 11. Open Questions

- Is Today company-specific for every section, or intentionally mixed with a clearly identified personal scope? Default proposal: explicit effective scope per section, no silent tenant-wide fallback.
- Which existing authority defines company membership and node visibility for every adapter?
- Which source states and freshness budget must CORE expose to avoid masking disconnected integrations?
- Who can provide authoritative OS/CORE/runtime deployment SHA evidence and a safe test tenant for release QA?
- Reviewer: does the proposed Frontend Engine boundary conflict with an existing accepted CORE contract?

## 12. Agent Sync Log

### 2026-09-07 — Astra

Checked:
- Pinned main/PR source and diffs, CORE #29 CI, OS #50/#54 CI with delegated read-only investigation, Website Vercel metadata.
- Task row mapping suspicion refuted against connection implementation.
Changed:
- Opened draft OS #55 for existing codex/unified-os-today branch; no application code changed.
- Created this Blackboard on coordination/stand-zero for review.
Decision:
- One OS direction retained; Today scope/provenance/stale-context correctness precedes release.
- PR classifications above are proposals. No merge, closure, deployment, database mutation or permission weakening.
Needs review from ChatGPT:
- Scope semantics, source-state contract and minimal integration order.
- Reconcile Workspace #1 and old ADRs; do not start another Shell or Desk implementation.
Next:
- Bounded CORE #29 stabilization, then #55 contract consumer. Record actual test runs, not assumed success.

Future agents: append dated factual entries; retain disagreements until resolved. Important decisions are handed over only when recorded here with code/PR evidence.
