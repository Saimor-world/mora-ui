# MR19: Memory Overview + Answer Source Mode Design

**Date:** 2026-03-06  
**Sprint:** MR19 — backend sync, provenance completion  
**Author:** Frontend Track (Claude Code)  
**Backend SHA:** 5505b6f  

---

## Context

MR18 wired the basic provenance pipeline (`answer_source`, `answer_scope_label`) from
the SSE preamble into the store and `MoraContextChip`. Two gaps remain:

1. **`memoryFactCount: 0` is hardcoded** — `/v3/memory/overview` is live but has no
   frontend consumer. `overview.metrics.structured_facts` is the correct field.

2. **`answerSourceMode` is a silent gap** — backend sends `answerSourceMode` (stream)
   and `answer_source_mode` (non-stream) in all provenance payloads. Frontend ignores it.
   This field carries the *how*: `"retrieval"`, `"synthesis"`, `"hybrid"`. Surfacing it
   gives users epistemic transparency — not just what source Mora used, but how it used it.

---

## Design

### A. Memory Overview → `memoryFactCount`

**API layer** (`lib/api/coreClient.ts`):
```typescript
export interface MemoryOverviewMetrics {
    structured_facts: number;
    pending_reviews: number;
    episodic_total: number;
    episodic_memories?: Record<string, number>;
}
export interface MemoryOverview {
    metrics: MemoryOverviewMetrics;
}
export async function getMemoryOverview(companyId: string): Promise<MemoryOverview | null>
// GET /v3/memory/overview?company_id=...
```

**Hook** (`lib/hooks/useMemoryOverview.ts`):
- Mirrors `useMemoryPendingCount` shape (same company-id resolution, 60s poll)
- Returns `{ structuredFacts: number, pendingReviews: number, episodicTotal: number }`
- Best-effort: returns zeroes on error, never throws

**`useMoraContext`**:
- Calls `useMemoryOverview()` alongside `useMemoryPendingCount()`
- Replaces `memoryFactCount: 0` with `overview.structuredFacts`
- `memoryPendingCount` source remains `useMemoryPendingCount` (keeps existing callers intact)

---

### B. Answer Source Mode — full wiring + chip display

**`StreamFrame`** (`lib/hooks/useMoraStream.ts`):
```typescript
answerSourceMode?: string;
answer_source_mode?: string;
```

**Store** (`lib/store/moraState.ts`):
```typescript
// State
lastAnswerSourceMode: string | null;
// Action (signature extension)
setAnswerProvenance: (
    source: 'memory' | 'context' | 'inference' | null,
    mode: string | null,
    label: string | null
) => void;
```

**`MoraContextSnapshot`** (`lib/mora/useMoraContext.ts`):
```typescript
lastAnswerSourceMode: string | null;
```

**`MoraContextChip`** — the cool part:  
The source pill gains a mode sub-label rendered in a smaller, dimmer weight:
```
[ 🧠 Gedächtnis · direkt ]
[ ⚡ Kontext · synthese   ]
[ 🌐 Schlussfolgerung    ]  ← no mode = no sub-label
```
Mode strings are normalized to German display labels via a `MODE_LABELS` map:
- `"retrieval"` → `"direkt"`
- `"synthesis"` → `"synthese"`
- `"hybrid"` → `"hybrid"`
- unknown → omitted (graceful degradation)

This is a visual-only change inside the existing pill span — no new DOM structure needed.

---

## Files Touched

| File | Change |
|---|---|
| `lib/api/coreClient.ts` | Add `MemoryOverview` interface + `getMemoryOverview()` |
| `lib/hooks/useMemoryOverview.ts` | NEW — 60s poll hook |
| `lib/hooks/useMoraStream.ts` | Add `answerSourceMode`/`answer_source_mode` to `StreamFrame`; extend extraction |
| `lib/store/moraState.ts` | Add `lastAnswerSourceMode`; extend `setAnswerProvenance` signature |
| `lib/mora/useMoraContext.ts` | Add `useMemoryOverview` call; wire `memoryFactCount` + `lastAnswerSourceMode` |
| `components/mora/MoraContextChip.tsx` | Mode sub-label in source pill |

---

## Normalization Mismatch Inventory

| Backend field | Frontend equivalent | Status |
|---|---|---|
| `answer_source` / `answerSource` | `lastAnswerSource` | ✅ wired (MR18) |
| `answer_source_mode` / `answerSourceMode` | `lastAnswerSourceMode` | ❌ gap → MR19 fixes |
| `answer_scope_label` / `answerScopeLabel` | `lastAnswerScopeLabel` | ✅ wired (MR18) |
| `scope_reason` in `scope_contract` | `scopeReason` | ✅ wired (MR18) |
| `overview.metrics.structured_facts` | `memoryFactCount` | ❌ gap → MR19 fixes |
| `overview.metrics.pending_reviews` | *(not consumed, pending from list API)* | P2 |
| `dropped_fields` in `scope_contract` | `scopeDroppedFields` | ✅ wired, not rendered |

---

## Constraints

- `useMoraContext` stays fetch-free — new fetches live in `useMemoryOverview`
- `useMemoryPendingCount` callers are not touched
- `setAnswerProvenance` signature change is breaking — all 1 call site in `useMoraStream` updated
- No Framer Motion in chip (CSS only, established in MR18)
- Chip mode sub-label: max 8 chars, `text-[9px]` weight, `opacity-60`, separator `·`
- Polling interval: 60s (matches `useMemoryPendingCount`)
- Error handling: `isOptional: true` on `coreGet` — zeroes on failure, no error propagation

