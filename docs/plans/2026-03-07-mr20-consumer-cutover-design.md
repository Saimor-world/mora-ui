# MR20 Design — Frontend Consumer Cutover + Intelligence UX Completion

> Validated against Codex counter-check (core live: 6b09e84, UI live: ce4311c)
> Design date: 2026-03-07

---

## Baseline (Already Live — Do Not Re-Implement)

These were completed by Codex on main before MR20 starts. Treat as confirmed baseline:

| System | Endpoint | Status |
|---|---|---|
| Health probes | `/v3/health` | ✅ live (ce4311c) |
| Auth session bootstrap | `/v3/auth/session` | ✅ live (ce4311c) |
| Team presence | `/v3/team/presence` | ✅ live |
| Team activity | `/v3/team/activity` | ✅ live |
| Team invites | `/v3/team/invites` | ✅ live |
| User-chat DMs | `/v3/user-chat/*` | ✅ live |
| Memory overview | `/v3/memory/overview` | ✅ live (MR19) |
| Chat provenance fields | `answer_source`, `answer_source_mode`, etc. | ✅ live (MR18/MR19) |
| MemorySidebar API telemetry | polls `getApiVersionPerformance()` | ✅ live (6e22bbc) |

---

## MR20 Scope

Four workstreams, in execution order:

---

### Workstream 1 — SearchPane: v3 Semantic, Local-First UX

**Why:** SearchPane is the only user-facing search surface. It currently does instant local
string-match against Zustand store data. The user explicitly asked for v3 semantic backend
results, but they must feel fast ("es muss schneller werden").

**Architecture:**

```
User types
│
├─ Immediately: show local results (existing Zustand match, instant)
│   Label: "Lokal" — appears in < 1ms
│
└─ 200ms debounce → AbortController-guarded GET /v3/search/semantic
       │
       ├─ On response: replace/supplement local results with semantic results
       │   Label: "Môra" — ranked by relevance score
       │
       └─ On error / timeout: keep local results, subtle error badge
```

**New API function required:**
```typescript
// GET /v3/search/semantic?q={query}&company_id={id}&limit={n}
export async function searchSemantic(
    query: string,
    companyId: string,
    limit = 10,
): Promise<SearchResult[]>
```

**Performance contract:**
- Local results: < 1ms (Zustand, synchronous)
- Semantic results: ~300–600ms (debounce 200ms + network)
- AbortController cancels in-flight on new keystroke — no result flicker
- On empty semantic response: keep local results (never show empty pane)

**Files changed:** `lib/api/coreClient.ts`, `__tests__/lib/api/coreClient.test.ts`,
`components/panes/SearchPane.tsx`

**TDD:** Write `searchSemantic` tests first (3: routing, result shape, error→null).
Then implement. Then update SearchPane.

---

### Workstream 2 — Awareness: v1 → v3 Migration

**Why:** `awarenessClient.ts` still calls `/v1/awareness/state` and `/v1/awareness/pulse`.
Both v3 paths are confirmed live in saimor-core (same response shape, v3 envelope unwrapped
transparently by `coreGet`). These are in the phaseout gate critical route list.

**What changes:**
- `fetchAwarenessState()`: `/v1/awareness/state` → `/v3/awareness/state`
- `fetchAwarenessPulse()`: `/v1/awareness/pulse` → `/v3/awareness/pulse`
- Response shape is identical — v3 wraps in `{ data: ..., meta: { api_version: "v3" } }`
  which `coreGet` already unwraps transparently
- No consumer changes needed (useAwareness, IntelligenceDiagnostics, MoraShell unchanged)

**Audit first:** Before touching code, confirm no other file still calls v1 awareness paths.

**Files changed:** `lib/api/awarenessClient.ts` (URL strings only, 2 lines)

---

### Workstream 3 — MemorySidebar Telemetry: Audit + Polish

**Why:** Already implemented by Codex (6e22bbc). MR20 adopts it as baseline and only
refines if the QA pass reveals presentation issues.

**Actions:**
- Read current DiagnosticsPanel telemetry section
- Verify v3/v1 counts, gate status, and top legacy route render correctly
- Fix any truncation, zero-state, or colour inconsistencies found
- No re-implementation — scope is adjust-only

**Files changed:** `components/os/MemorySidebar.tsx` (if refinements needed, else nothing)

---

### Workstream 4 — Intelligence Consistency QA Pass

**Why:** Core 6b09e84 added deterministic, data-grounded replies for Mora's management
questions. Frontend must render them coherently. MR18/MR19 wired provenance — verify
the full pipeline holds.

**QA checklist:**

1. **"was weißt du gerade?"** — Does the reply feel operational (scoped, factual) or
   generic (LLM hallucination)? Check: readability, truncation, structured rendering.

2. **"was kannst du mir vorschlagen?"** — Does it propose based on real context or return
   boilerplate? Check: coherence with visible scope in MoraContextChip.

3. **MoraContextChip coherence** — Does `lastAnswerSource` + `lastAnswerSourceMode` +
   `lastAnswerScopeLabel` populate correctly after a chat turn? Does the mode sub-label
   appear (`direkt` / `synthese` / `hybrid`)?

4. **`memoryFactCount`** — Is it non-zero for a company with memory? (Live from
   `/v3/memory/overview` since MR19.)

5. **Startup connection flash** — On `ce4311c`, health probes are v3. Does the connection
   indicator still flash on cold start? If yes, diagnose root cause (timing vs. endpoint).

6. **Empty/placeholder states** — Any hardcoded "0", "coming soon", or placeholder
   contradicting live data?

**Files changed:** Whatever normalization gaps are found. May be zero files if pipeline
is clean. Commit only if actual fixes are required.

---

### Workstream 5 — semanticClient.ts Cleanup (Optional)

**Why:** `semanticClient.ts` defines `/v1/semantic/search` but has **no active UI consumer**.
SearchPane never calls it. After Workstream 1, coreClient has `searchSemantic` via v3.
The v1 semantic client is dead code.

**Action:** Delete `lib/api/semanticClient.ts` and `lib/hooks/useSemanticConstellation.ts`
(which calls `/v1/relations/preview` — also unwired). Confirm no imports before deleting.

**Files changed:** Delete 2 files.

---

## Commit Structure

| # | Commit | Files |
|---|---|---|
| 1 | `feat(mr20): add searchSemantic API function + tests` | `coreClient.ts`, `coreClient.test.ts` |
| 2 | `feat(mr20): wire SearchPane to v3 semantic — local-first, debounced, AbortController` | `SearchPane.tsx` |
| 3 | `feat(mr20): migrate awarenessClient to v3 (state + pulse)` | `awarenessClient.ts` |
| 4 | `feat(mr20): intelligence QA pass — normalization fixes` | TBD (zero if clean) |
| 5 | `chore(mr20): remove dead semanticClient + useSemanticConstellation` | delete 2 files |

---

## Remaining v1 Consumers After MR20

### Blocked by backend (no v3 path confirmed)

| Consumer | Endpoint | Notes |
|---|---|---|
| `authRegister`, `authLogin`, `fetchUserProfile` | `/v1/auth/*` | Auth migration is a separate workstream |
| `fetchTree`, `fetchTreeData`, `fetchNodeChildren` | `/v1/tree/*` | No v3 tree endpoint |
| `fetchNodeRelations`, `getSemanticallySimilarNodes` | `/v1/nodes/*` | No v3 node endpoints |
| `relationsClient.ts` (4 fns) | `/v1/relations/*` | No v3 relations endpoints |
| `cognitionClient.ts` (6 fns) | `/v1/autonomous/*`, `/v1/cognition/agent` | No v3 cognition endpoints |
| `realtimeClient.ts` WebSocket | `/v1/realtime/subscribe` | WebSocket, separate protocol migration |

### Intentionally deferred (non-critical path)

| Consumer | Endpoint | Reason |
|---|---|---|
| `forceResetDemo`, `fetchDemoInstance`, `connectDemoSource` | `/v1/demo/*` | Dev/demo infrastructure |
| `createSimpleDepartment` | `/v1/departments/create-simple` | Low-traffic admin flow |
| `analyzeFolder`, `intelScan` | `/v1/scan/*`, `/v1/intel/scan` | Specialized, not in core flow |

### Removed in MR20 (dead code)

| File | Endpoint | Reason |
|---|---|---|
| `semanticClient.ts` | `/v1/semantic/search` | No active consumer, replaced by coreClient v3 |
| `useSemanticConstellation.ts` | `/v1/relations/preview` | No active UI consumer |

---

## Acceptance Criteria

- 53+ unit tests pass (+ 3 new for `searchSemantic`)
- 0 TypeScript errors (`npm run verify:types`)
- `verify:critical-flow` gate passes
- Phaseout gate shows reduced v1 count after awareness migration
- SearchPane shows local results instantly + semantic results within ~500ms
- Startup connection flash reproduced and root-caused (or confirmed resolved)
- Grounded Mora replies ("was weißt du gerade?") feel operational in QA
