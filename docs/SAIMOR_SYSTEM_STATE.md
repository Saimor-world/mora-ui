# SAIMÔR SYSTEM STATE

Last verified: 2026-09-07 UTC, post-audit stabilization round.
Verified against: GitHub source, PR heads, workflow jobs/logs and connected deployment metadata where available.
Current mission: **Stand 0 — one canonical OS convergence line.**
Coordination home: `Saimor-world/mora-ui/docs/SAIMOR_SYSTEM_STATE.md` on `coordination/stand-zero` until PR #56 is merged.

> Runtime rule: repository state is not production state. Production remains unchanged in this round. No PR below has been merged or promoted to production merely because CI is green.

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
