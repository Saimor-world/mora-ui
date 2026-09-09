# SAIMÔR SYSTEM STATE

Last verified: 2026-09-09 18:45 UTC.
Verified against: GitHub PR heads, exact workflow runs and production deployment logs; public browser checks for Website and the unauthenticated HQ entry.
Current mission: **Stand 0 live validation; Telegram cutover remains gated.**
Coordination home: `Saimor-world/mora-ui/docs/SAIMOR_SYSTEM_STATE.md` on `coordination/stand-zero` until PR #56 is merged.

> Runtime rule: repository state is not production state. The table below records the exact revisions released today. Future claims require the same repo → CI → deployment → runtime evidence chain.

## Production release — 2026-09-09

| Surface | Production revision | Evidence | Result |
|---|---|---|---|
| CORE | `3d9abc0a526678985595d52763710be72fc7b440` | main CI `34389872634`; deploy `34390168156` | CI success; CORE and Kairos healthy |
| Saimôr OS | `64510919834bd1367fec77fbcef5021f108d3b55` | main CI `34390381771`; deploy `34390381770` | CI success; UI healthy |
| Website | existing Vercel production | public `/de` browser check | reachable and rendered; unchanged in this release |
| Telegram / Larry | no cutover | Ops #15 `6d8d39f592c5c2199a63147da166c8cd7250d8b1` | plugin remains disabled and uninstalled |

Release evidence:

- CORE PR #34 and OS PR #58 were the canonical convergence lines. Both were merged only after exact-head checks passed.
- CORE deploy completed with CORE, Kairos, Caddy, Postgres, Redis, Qdrant, UI, Voice, Earth services and the separately isolated MISE OpenClaw reported healthy.
- OS deploy rebuilt and recreated the UI; the same dependency set remained healthy, including isolated MISE OpenClaw.
- Rollback references retained: CORE `6a1029a45417db5542ceafdfa0f9eba2c2f48431`; UI `13c6456e0ac48db2a588ff45efb9d250322182b8`.
- Public HQ browser check reached `https://hq.saimor.world/`, rendered “SAIMÔR OS”, and exposed Login/Password Reset without public self-registration.
- Public Website browser check reached `https://www.saimor.world/de` and rendered the green Saimôr page, Security Check entry and Studio offer.
- Authenticated in-product and physical Safari/iPad QA are not claimed by this browser session. They remain a release-observation task, not grounds to reopen a parallel branch.
- UI production deployment currently starts independently of the main CI result. Gate the workflow on successful CI in a focused follow-up so a future red main commit cannot deploy in parallel.
- Ops #15 contains hardened transport and seven passing unit tests, but still lacks the verified installed manifest/schema, production secret provisioning, load smoke, rollback and real end-to-end evidence. Do not merge, install or enable it until those gates are complete.
- Historical Desk/Larry/Nightwatch services and data were not deleted. MISE remains isolated.

## Day closeout — 2026-09-09

- Independently verified: CORE #34 head 1010546772ffd7003eaed321d586098677d3ecc3 has seven successful check runs, including both truth runs. OS #58 d4b2a678cf03a0e4fd90bdaa9f061a0b5d6ae431 has both Verify runs successful. Blackboard previous head 75641ff69290221cfb6f40bdc1df1f923d8f5fe8 passed Verify.
- Another actor synchronized Ops #15 at afef01ccb8246373fea6bf440b0da5d229804a79. The earlier unsynchronized-branch statement is historical, not current.
- Ops #15 now at 6d8d39f592c5c2199a63147da166c8cd7250d8b1: extracted testable transport, rejected automatic HTTP redirects with channel credentials, removed raw error details from plugin logs, and added seven passing Node regression tests. Tests cover fingerprint allowlist, routing helpers, session isolation, payload identity exclusion, configuration bounds, channel request/redirect behavior and failed/empty responses. Local command: node --test channel.test.js (Node 24.19.0). These are unit tests, not proof that the installed OpenClaw hook works.
- Plugin remains disabled by default. Manifest/schema, actual OpenClaw loading, secret provisioning, backup/rollback verification and authenticated end-to-end cutover remain open. No Telegram turn was sent by this round.
- Website /de was retrieved with the current workspace/entry/studio text. HQ and API /health could not be opened by the web tool (non-retryable access error); do not interpret that as service outage or successful runtime QA.
- No production merge/deployment or legacy deletion performed in this closeout. Current host revisions/backups were not independently reverified. Earlier reviewer-reported runtime evidence remains qualified as such.

Next bounded release task: verify actual deployment/rollback access and candidate runtime; release CORE then OS with authenticated QA; complete disabled plugin loading before any Telegram cutover. Do not equate green CI with live deployment. Existing user deployment authorization remains valid.

## Earlier checkpoint — 2026-09-09 (superseded where closeout differs)

This checkpoint SUPERSEDES conflicting candidate heads and integration order below. Older sections remain historical evidence.

- CORE #29 is integrated into #34 (merge 349f9794c28ca9e57d2f9d9725661710271dace6). #34 is the sole CORE convergence PR.
- CORE #34 now includes current main 6a1029a45417db5542ceafdfa0f9eba2c2f48431 through merge **1010546772ffd7003eaed321d586098677d3ecc3**. The four main-side file changes do not overlap PR #34's changes; MISE bridge, isolation test, compose cleanup and renamed MISE config are preserved. New-head CI is pending verification.
- Previous CORE head e87ed3755c1638eb6473119f3be957f5826fda06 fixed four import blocks. Its complete CI success was reported by the reviewing agent/user; fresh checks apply to the new merge.
- OS #58 remains the single OS implementation line, last verified head d4b2a678cf03a0e4fd90bdaa9f061a0b5d6ae431; not deployed by this work.
- Ops #15 remains unfinished. Its obsolete #29/#34 divergence claim has been corrected. Current ops main observed: df18e03f3dd3c29453bb2c96148f5df8d17293bc.
- Ops branch synchronization is held for a concrete side effect: incoming Frame/Compagno workflows have push/path triggers without main-only filters. A branch sync could deploy unrelated apps. Resolve trigger behavior before updating #15; do not blindly replay deployments.
- User/reviewer reports current live CORE 6a1029a45417db5542ceafdfa0f9eba2c2f48431, UI 13c6456e0ac48db2a588ff45efb9d250322182b8; this round did not independently access the host.
- User/reviewer reports Website production 61d150dd430b26f38e4a10f247af6af11573843b / dpl_GyLHP9o1L2n5kJ5Rm3MYHjZwWfoj. Preserve newer YORI work; do not promote old design previews.
- Historical DEPLOYED_STATE.md is not authoritative until reconciled against actual deployment evidence.

Next: new CORE CI → resolve Ops synchronization side effects → verify backups/rollback → CORE deploy and runtime QA → OS deploy/device QA → disabled OpenClaw plugin → controlled personal Telegram cutover. Legacy data/services and MISE stay isolated and intact. Production authorization exists from Marius; technical release gates remain.

## 1. Product decision

Saimôr is one system. **Saimôr OS is the primary interface. CORE owns deterministic operational truth and controlled actions. MÔRA interprets authorized context and acts through those capabilities; it must not become an alternative truth store.**

The historical Desk (`mora-work`) is migration inventory, not a second forward product. Useful Desk capabilities are rescued into native OS surfaces and canonical CORE contracts. A quieter Desk/workspace persona may return later only on the same Engine, identity, authorization and truth layer.

## 2. Canonical architecture boundary

| Layer | Responsibility | Must not do |
|---|---|---|
| OS / native apps | Home, Mail, Calendar, Work, Tasks, Files, Nightwatch, Activity | invent duplicate backend truth |
| Frontend Engine | World Surface, panes, navigation, commands, notifications, session projection | become permission authority |
| CORE | tenant/user/company authorization, operational records, source adapters, controlled actions | silently turn unknown into healthy/zero |
| MÔRA | context, interpretation, orchestration | bypass source contracts or action authorization |
| Runtime / OpenClaw | tool execution | become another identity/memory/policy system |

“Engine” remains a logical boundary. PR #51 extracts useful World/OS composition, but that extraction is not by itself the full Saimôr Engine.

## 3. Canonical repositories

All repositories below are under `Saimor-world`.

| Repository | Role | Current Stand-0 use |
|---|---|---|
| `mora-ui` | canonical OS / HQ frontend | active |
| `saimor-core` | canonical truth/actions/context backend | active |
| `mora-work` | historical Desk | migration inventory only |
| `saimor-workspace` | cross-repo guidance | reconcile with One-OS direction |
| `saimor-ops` / deployment material | runtime/deploy ownership | deployment evidence still required |
| Website | public explanation/entry | outside Today integration block |
| Earth / other projects | separate products/capabilities | no Stand-0 expansion |

## 4. Stand-0 candidate heads

| Work | Verified head | Status |
|---|---:|---|
| CORE PR #29 `codex/unified-os-today` | `23e9bc031c9eff93e9451fc7b2e250516a8a0747` | both CORE workflows green |
| OS PR #55 `codex/unified-os-today` | `585413101f8f9468beee8c8133fc9838047e6bf5` | full UI verify workflow green |
| Blackboard PR #56 `coordination/stand-zero` | this document | coordination only |

Other overlapping OS PRs (#51, #50, #54, #48, #45) remain separate convergence work. Do not stack them onto Today merely to make one large merge.

## 5. CORE PR #29 — verified current contract

`GET /v3/today` is the deterministic daily truth surface for Home, MÔRA context and any later Desk persona.

Each source exposes an explicit state:

- `ok`
- `empty`
- `disconnected`
- `partial`
- `unavailable`
- `stale`

Each source also reports:

- `source`
- `scope { level: tenant|user|company, tenant_id, user_id?, company_id? }`
- `connection`
- `complete`
- `as_of`
- `stale_after_seconds`

The snapshot reports `requested_scope { tenant_id, user_id, company_id }`.

**Truth invariant:** missing/failed/incomplete data is never rewritten as `0`, `100% healthy`, “empty” or “Normalbetrieb”.

### Mail

- Today sample is bounded to **5** messages instead of up to 20 Gmail detail reads per refresh.
- Gmail, IMAP, demo and local/fallback provenance are distinguishable.
- Missing expected external connectivity becomes disconnected/partial rather than fake empty.
- `inbox_loaded` is a bounded loaded sample, not total inbox truth.

### Calendar

- Today uses Europe/Berlin local day semantics.
- Google query bounds are converted correctly to UTC.
- Google event mapping preserves timezone-aware meaning.
- Pagination is supported rather than silently treating one page as complete.
- Effective user/company/tenant scope is exposed.

### Tasks

- Tasks API and Today share `core/services/task_service.py`.
- Current task persistence remains tenant-scoped; Today reports that honestly instead of pretending company scoping exists.
- Earlier `sqlite row_factory` suspicion was refuted; no speculative repair was added.

### Nightwatch

- Authorized reads pass `caller_user_id`.
- Requested company is applied where present.
- Health/open count is calculated from the full authorized incident set, not a `limit=100` display page.
- Only the returned preview list is sliced.

### Briefing

- Failure fallback remains degraded with unknown/null metrics.
- A failed briefing must not claim `100%`, zero incidents or normal operation.

### Company access

The original audit blocker is now implemented against the **existing membership authority**, not a new parallel policy:

- company must belong to the authenticated tenant;
- owner/admin/system-owner remain unrestricted according to existing membership semantics;
- users without explicit department assignments retain the existing legacy tenant-wide behavior;
- a department-scoped member may request a company only when at least one active assigned department belongs to that company;
- an explicitly scoped member assigned only to company A receives `403` for company B.

Regression coverage creates two companies and proves the cross-company denial.

## 6. CORE CI evidence

Verified head: `23e9bc031c9eff93e9451fc7b2e250516a8a0747`.

### Primary CI — run 273

**SUCCESS**

- Lint & Format ✅
- Tests ✅ — **1160 passed**, 31 warnings
- Runtime Smoke ✅
- Compose Config Validation ✅
- Security Checks ✅

Today-specific tests in the successful full suite include:

- public authenticated `/v3/today` HTTP contract
- source-state distinctions
- department-derived cross-company isolation
- unavailable != zero/healthy
- Nightwatch user/company scope
- briefing failure != false healthy
- calendar Berlin-day boundaries and Google pagination

### Core truth tests — run 128

**SUCCESS**

The earlier brittle assertion inspected FastAPI internal router representation. It has been replaced by an authenticated HTTP contract test. The truth workflow was also aligned to the project-supported Python 3.13 runtime (`pyproject.toml` requires Python >=3.13).

## 7. OS PR #55 — verified consumer behavior

The Today/Home consumer now treats scope changes as a hard data boundary.

### Scope safety

- current session user and active company form the Today context key;
- old snapshot is discarded immediately when that context changes;
- request-generation guard prevents a late response from the prior company/user from committing;
- manual refresh is guarded by the same generation logic;
- returned snapshot must match requested company and, when known, current user.

### Runtime contract validation

The client no longer blindly casts Today JSON.

- source states and scope metadata are validated;
- `ok`/`empty` sources cannot contain unknown/null counts and still render as zero;
- `empty` must actually be mathematically empty;
- malformed/contradictory snapshot returns `null` rather than a reassuring UI.

### Refresh cost / freshness

- background interval reduced from 60 seconds to **5 minutes**;
- focus/visibility refresh is gated by visible-tab state and minimum age;
- manual refresh remains available;
- UI describes Mail as a bounded Today sample.

### Rendering

Home distinguishes:

- empty
- disconnected
- partial
- unavailable
- stale
- ok

The cards still open the **existing native** Calendar, Mail, Tasks and Nightwatch panes. No Desk proxy or duplicate app was added.

### UI regression evidence

- contract parser tests cover valid and contradictory source states;
- old-company and old-principal snapshots are rejected;
- React race test proves a late response from company A is never rendered after switching to company B.

### UI CI

Verified head: `585413101f8f9468beee8c8133fc9838047e6bf5`.

Full verify workflow is green:

- Lint ✅
- Typecheck ✅
- Critical flow gate ✅
- OS smoke ✅
- Unit tests ✅
- Production build ✅

## 8. What the first audit found, and disposition

| Audit finding | Current disposition |
|---|---|
| CORE lint/test failures | fixed; both workflows green |
| unknown vs empty/healthy ambiguity | explicit source-state contract implemented |
| Today company lookup only proved tenant ownership | fixed using existing department-membership authority |
| Nightwatch `limit=100` could corrupt health | fixed |
| Nightwatch lacked caller/company scope | fixed for Today |
| Mail polling could create many Gmail detail calls | sample bounded to 5; UI refresh reduced/gated |
| Calendar UTC day window conflicted with Berlin day | fixed + tested |
| UI could show old company after switch | fixed + race-tested |
| UI blind-cast response / null-to-zero risk | runtime validation added |
| `row_factory` suspected bug | refuted; no unnecessary refactor |
| shared HTTP swallows 401/403 | still open; converge with PR #54 rather than duplicate |
| deployed OS/CORE revision unknown | still open |
| authenticated Safari/device QA | still open |

## 9. Remaining Stand-0 blockers

CI-green is **not** release approval. The following remain:

1. **Shared HTTP/Auth convergence**
   - Today reads still use the tolerant shared GET behavior where top-level `401/403` can collapse to `null`.
   - This is fail-safe for leakage but semantically imprecise (“not connected” can hide auth/session failure).
   - PR #54 already introduces an opt-in auth-error path for explicit operations. Reconcile with that shared client instead of creating a second auth model.

2. **Deployment/preview identity**
   - Exact deployed revisions for `hq.saimor.world`, CORE/runtime and a Today-capable preview have not been verified.
   - Connected Vercel project listing did not expose `mora-ui` as an obvious standalone project.
   - `mora-ui` repository documentation describes it as part of the wider CORE/BRIDGE/OPERATIONS workspace, so no new Vercel deployment should be invented merely for this test.

3. **Authenticated runtime QA**
   - Need a safe authenticated candidate environment.
   - Verify Home → Today → Mail/Calendar/Tasks/Nightwatch with real session context.
   - Verify company switch and stale-response behavior in browser.
   - Explicit Safari/mobile/iPhone/iPad pass remains required.

4. **Production authorization**
   - Production stays unchanged until candidate SHAs, runtime evidence, rollback and Marius approval are recorded.

## 10. Integration order from here

Do not expand the mission until Stand 0 is proven end to end.

1. ✅ Stabilize CORE #29 contract, scope and CI.
2. ✅ Stabilize OS #55 consumer, stale-scope handling and CI.
3. **Next:** converge shared HTTP/Auth behavior with #54 without pulling unrelated Mail UI changes into Today accidentally.
4. Determine the authoritative preview/deployment path for `mora-ui` + matching CORE candidate.
5. Run authenticated desktop/mobile/Safari QA and record candidate SHAs/runtime identities.
6. Then reconcile #51 World Surface and #50/#48/#45 into one arrival/composition policy.
7. Then integrate Mail triage from #54 if its classifier/auth tests are green.
8. Only after Stand 0: migrate old Desk Work/Missions capabilities into native Work/Tasks, then Files and Activity/Weave.

No Finance/Earth/Messages expansion in this mission.

## 11. Pull-request disposition

| PR | Current recommendation |
|---|---|
| CORE #29 | KEEP Draft; code/CI gate passed, runtime QA/deployment evidence still open |
| OS #55 | KEEP Draft; code/CI gate passed, depends on #29 runtime candidate |
| OS #54 | REVIEW NEXT for shared HTTP/Auth convergence; do not merge wholesale solely for Today |
| OS #51 | KEEP behavior-preserving World Surface extraction; integrate after Stand-0 runtime proof |
| OS #50/#48/#45 | reconcile into one arrival policy later; no parallel Shell direction |
| mora-work #10 | keep as capability migration inventory only |

## 12. Agent sync log

### 2026-09-07 — Astra, audit round 1

- Established this Blackboard and Draft PR #56.
- Verified repository/PR state and initial CI blockers.
- Correctly refuted the speculative SQLite `row_factory` repair.
- Identified Today scope/provenance, Gmail cost, stale-company UI, contract validation and deployment evidence as blockers.
- Production unchanged.

### 2026-09-07 — ChatGPT, stabilization round

Implemented and verified after Astra Work quota paused:

- hardened CORE Today source-state/provenance/scope contract;
- bounded Mail sample to 5;
- corrected Calendar Berlin boundaries + Google pagination;
- removed Nightwatch `limit=100` health distortion and applied caller/company scope;
- enforced company access through existing department-membership semantics;
- converted route verification to authenticated HTTP contract;
- aligned truth workflow to supported Python 3.13;
- achieved **Core truth SUCCESS** and **primary CI SUCCESS, 1160 tests passed**;
- hardened OS Today consumer against company/user races;
- added runtime contract validation and reduced/gated polling;
- added parser/scope/race regression tests;
- achieved full green OS verify including production build;
- production not changed and no PR merged.

### Next agent instruction

Do **not** restart the original audit or rebuild Today. Read this document and current PR heads first.

Next bounded review target: **shared HTTP/Auth convergence around OS PR #54**, followed by authoritative preview/runtime identity and authenticated QA. If a new finding contradicts this document, update the Blackboard with source/CI evidence rather than creating a parallel architecture branch.


## Binding convergence decisions — 2026-09-08

This section supersedes conflicting earlier proposals in this document.
OS implementation stays in #58 (audited 5d6475b7769b07498575c82d252b685ef2f5ee03);
CORE implementation stays in #29. No new integration branch.
#55/#57 are ancestors of #58. #54 is substantially integrated; review residual panel/test differences before closing.
#50/#45/#48 require selective behavior reconciliation, not blanket merge. #51 is deferred structural cleanup.
PR #56 remains the documentation-only coordination PR. No PRs were closed or production changed in this round.

### Decision 1 — Task scope for Stand 0

Retain the existing tenant-wide task contract for Stand 0, explicitly presented as
"Gemeinsame Aufgaben dieser Organisation". Do not claim personal/private/company ownership.
Changing the company picker does not filter or assign these records.
Do not infer ownership from folder_id, title or current navigation.
This is a limited product decision, not a new authorization grant: existing server authorization remains authoritative.
If company-private work is required, these tasks cannot be offered as that feature.

Files for mechanical implementation in #58:
- apps/work/index.tsx, apps/tasks/index.tsx, components/home/TodayOverview.tsx:
  render effective section scope; task creation clearly enters the shared organization pool.
- Reuse a single Today loader with identity/company generation guards, not copied fetch effects.
- Reset snapshot, pending actions and work-session selection on principal/tenant change;
  revalidate after company change. Ignore responses from an obsolete generation.
- Tasks mutation refresh must invalidate both Work and Home. Never fabricate a frontend company filter.

Future company-task migration must cover schema/backfill, create/read/update/delete authorization,
legacy unassigned records and Today together. It is deliberately not smuggled into this release.

### Decision 2 — One MÔRA opening and context contract

One command: lib/os/openMoraWorkspace.ts -> existing chat-main pane.
Home, Work, Dossier, Shell and other callers use it; no separate direct chat-main opening.
Opening is navigation, never automatic execution or automatic message submission.

Define a versioned transient intent:
- version: 1; requestId; source (home/work/mail/calendar/files/tasks/nightwatch/dossier/system);
- sourcePaneId where applicable;
- captured identity key (tenant + user + session generation), requested company;
- references: typed task/node/mail/event/plan IDs with each reference's effective scope;
- optional display label and draft question.
Labels/draft text are untrusted UI input, not system instructions or source truth.
No access tokens, copied documents/mail bodies, or permission claims.

The pane carries this transient intent as osContext. It is the only launch-intent location,
not a second durable context store. lib/store/paneStore.ts must omit osContext and draft input
from persisted geometry. Replace intent on each explicit launch, preserve valid user geometry;
repair undersized/offscreen panes using viewport bounds. Clear intent on identity/scope change.

Consumer:
- apps/chat/index.tsx validates the intent against the active identity/scope, shows the selected
  references, and consumes it for the user's next message. A later context change invalidates it.
- lib/api/moraAgentClient.ts maps validated references into the EXISTING ChatContext.workspace
  contract (optional operational references), shared by stream and non-stream requests.
- CORE must explicitly accept and resolve reference types under authenticated identity.
  Client company/reference IDs are selectors only. Reject inaccessible references; never switch
  tenant or infer authorization from osContext. Unsupported reference types remain visibly
  unavailable, not silently advertised as understood.
- Draft question may prefill input once per requestId; user sends it. Launch/re-render never executes.
- Reuse existing work-session plan_id/session_id; do not invent another conversation or mission store.

Acceptance tests: Home -> Work changes context on the same pane; referenced task reaches the actual
request payload; server denies cross-scope reference; logout/company switch removes old intent;
persisted tiny pane recovers; reopening does not replay a prompt; mobile bounds stay usable.
Files: openMoraWorkspace.ts, paneStore.ts, apps/chat/index.tsx, moraAgentClient.ts,
MoraShell.tsx, useAutoOpenDossier.ts and existing Home/Work callers.
CORE request schema/resolver must be located and extended within #29 if necessary;
do not merely add an ignored JSON field and call the integration complete.

### Decision 3 — Source truth correction implemented in CORE #29

Code commit: 80e5e5095835c5a37fac9c9826c8ea63e6564b95.
Final lint correction head: 73667207344814fb703685f39ad688e5173d3e87.
Files:
- core/services/today_service.py: mail/calendar discovery now runs INSIDE its source boundary;
  discovery failure returns unavailable, complete=false and null count, while other sources can continue.
- core/api/v1/endpoints/mail.py: absent credentials/token raise 401, invalid references or failed
  detail responses raise 502 instead of returning an apparently complete shortened list.
- tests/test_today_surface.py: eight new parameterized cases cover both discovery failures,
  missing credentials and detail HTTP 403/404/429/500 through the Today adapter.

Deliberate conservative behavior: current list-only Mail API cannot communicate partial payload metadata,
so a failed sample is unavailable as a whole. No second Mail adapter/API was introduced.
This also changes normal Gmail list calls: a detail failure now fails that read instead of silently dropping mail.
Future partial-result support must change the shared typed adapter contract, not use hidden side channels.

complete means successful retrieval of the requested sample, not the entire mailbox.
inbox_loaded is the sample size; sample_limit=5 remains explicit. No total inbox count is promised.
stale_after_seconds is a freshness budget, not proof of an implemented stale cache.
A real stale result must carry original as_of and scope; failure cannot relabel old data as fresh.
Local compile and focused lint checks passed. Full CI passed on final head 73667207344814fb703685f39ad688e5173d3e87; see sync log below.

### Decision 4 — Work/Missions capability boundary

Evidence: mora-work main app/board/page.tsx; mora-ui #58 apps/work/index.tsx,
lib/api/workSessionClient.ts, lib/store/workSessionStore.ts.

Historical Desk provides title + instruction, role filters (assistant/strategy/implementation/research),
draft/queued/running/done, dispatch and output with timestamps.
But dispatch catches request errors and still moves to queued; manual status change is not execution proof.

#58 Work supplies task focus, shared CORE task creation, a Today sample and continuation of one activePlanId.
It does not yet provide a durable mission inventory or complete agent execution lifecycle.
The existing work-session client ALREADY has plan/step state, execution focus, confirmation,
continuation, ownership, stats and segmented results. Use these contracts first.

Capability mapping:
| Wanted behavior | Canonical owner / release treatment |
|---|---|
| Human task backlog and progress | Existing CORE tasks; shared organization scope for Stand 0 |
| Instruction -> executable plan | Existing /v3/work-session/plan and MÔRA planning; not Larry JSON |
| Current step, waiting/failed/completed, continuation | Existing WorkSessionPlan.execution / steps / pending_confirmations |
| Results and provenance | Existing step result/artifact references; link from Work, do not copy into task truth |
| Role/capability choice | MÔRA/CORE routing intent; old agent names are not new identities or separate brains |
| Persistent multi-mission list, assignment, task-plan relation | Still missing from Work; deferred follow-up on existing CORE plan storage |
| Cancel/retry guarantees and durable dispatch acknowledgement | Must be proven on runtime contract before offering corresponding controls |

Stand 0 completion does NOT claim full Desk mission migration. Retain migration inventory.
Never mark queued/running/done based on a clicked button or successful chat submission.
Task completion and execution completion are different facts.
Scope-key workSessionStore references and re-authorize a resumed plan before rendering it.
No /api/larry/*, /api/chat proxy, second mission database or new integration branch.

### Mechanical implementation order for ChatGPT/Codex

1. Finish #29 source CI; preserve the explicit shared-task decision above.
2. In #58 share Today loading/invalidation; apply scope labels and race guards to Work/Home.
3. Centralize all MÔRA callers and implement actual intent consumption + server reference resolution.
4. Reconcile first-arrival behavior from #45/#48; replace historical tests with canonical behavior tests.
5. Verify one pinned UI/CORE candidate, then close superseded PRs after overlap evidence.
6. Authenticated desktop/mobile/Safari QA and runtime revision proof precede production.
7. Only after Stand 0: persistently surfaced mission inventory on existing work-session capabilities.

### 2026-09-08 — Astra, bounded architecture/source round

Decided: shared organization tasks for Stand 0; one transient MÔRA intent consumed through existing
ChatContext; shared Mail adapter fails honestly; Missions extend existing WorkSessionPlan.
Changed: CORE #29 source boundary fix and regression tests; this Blackboard.
Not changed: OS #58 code, task schema, production, PR closure state.
Validation: Python compilation + focused lint locally. At head 73667207344814fb703685f39ad688e5173d3e87, GitHub Lint/Format, Security, Compose, Runtime Smoke, primary Tests and both truth jobs all passed. Truth suite: 981 passed. Evidence: https://github.com/Saimor-world/saimor-core/actions/runs/34194376666 and https://github.com/Saimor-world/saimor-core/actions/runs/34194376610 . No authenticated production/Safari QA claimed.
A no-op intermediate commit 2628423 preceded the actual literal-kwargs lint correction 7366720.
Next reviewer: implement the bounded #58 contracts above; do not re-open product architecture.
