# MR21 Design: Operational UX + Full v3 Consumer Cutover

**Date:** 2026-03-08
**UI baseline:** `7e32bd1` (live), core `172994f` (live)
**Approach:** C — UX anchors first, client cutover follows in same MR

---

## Context

Backend `172994f` landed the entire previously-blocked v3 cluster: relations/graph, scan/intel,
autonomous/cognition, and mora-tools. All frontend clients that were blocked are now unblocked.

MR21 has two parallel goals:
1. **Operational coherence** — same truth source (hook, component) across Chat, Hub, Sidebar
2. **Full consumer cutover** — migrate 6 client files + 1 hook from v1 to v3

---

## Part 1 — Operational Mora UX

### 1a. MoraContextChip compact variant

**Problem:** ChatPane has a bespoke scope/provenance renderer reading `lastChatScope.resolved_scope`
directly. MoraHubPane uses `MoraContextChip` via `useMoraContext()`. Two renderers, two paths, silent
divergence potential.

**Design:** Add `variant="compact"` to `MoraContextChip`. Identical data source (`useMoraContext()`
snapshot), purely presentational differences:

| Field | `default` | `hub` | `compact` |
|---|---|---|---|
| Source icon | ✅ | ✅ | icon only |
| Mode sub-label (direkt/synthese/hybrid) | ✅ | ✅ | ✅ |
| Scope label | ✅ | ✅ | abbreviated |
| Memory fact count badge | ✅ | ✅ | ❌ |
| Freshness | tooltip | tooltip | tooltip only |

**Rules:**
- No new state in compact. No second store.
- At zero state (no answer yet): chip renders nothing, same as `default`.
- Compact variant is a styling concern only — `MODE_LABELS`, `SOURCE_CONFIG`, `useMoraContext()` are
  unchanged.

### 1b. ChatPane integration

**Replace:**
- `lastChatScope.resolved_scope` display block in the ChatPane header
- `scopeEnforced` warning strip
- `scopeBoundaryLevel` / `droppedScopeFields` inline formatting

**With:**
```tsx
// In ChatPane header row, right of Mora orb, left of connection/fullscreen buttons:
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from '@/components/mora/MoraContextChip';

const ctx = useMoraContext();
// ...
<MoraContextChip variant="compact" snapshot={ctx} />
```

**Delete:** All bespoke scope rendering code from ChatPane. The chip handles it.

### 1c. Chat fullscreen workspace mode

**Root cause discovery:**
MoraShell.tsx already has `{!hasFullscreenPane && <Dock />}` — the dock suppression is implemented.
It listens for `mora-pane-fullscreen-change` custom events. **ChatPane never dispatches this event.**
The `chat-fullscreen` body class is set but nothing acts on it.

**Fix: three-point change**

**Point 1 — ChatPane fires the event:**
```typescript
// In ChatPane's isFullscreen useEffect:
useEffect(() => {
    document.body.classList.toggle('chat-fullscreen', isFullscreen);
    window.dispatchEvent(new CustomEvent('mora-pane-fullscreen-change', {
        detail: { paneId: id, isFullscreen }
    }));
    return () => {
        document.body.classList.remove('chat-fullscreen');
        window.dispatchEvent(new CustomEvent('mora-pane-fullscreen-change', {
            detail: { paneId: id, isFullscreen: false }
        }));
    };
}, [isFullscreen, id]);
```

**Point 2 — MoraShell suppresses MemorySidebar too:**
```tsx
// MoraShell.tsx — mirror the Dock pattern:
{!hasFullscreenPane && <Dock />}
{!hasFullscreenPane && <MemorySidebar />}  // ADD THIS
```

**Point 3 — ChatPane in fullscreen owns the viewport:**
```tsx
// GlassPanel / ChatPane wrapper in fullscreen:
className={isFullscreen
    ? 'fixed inset-0 z-[9000] rounded-none'
    : /* existing pane sizing */ }
```
Background panes remain mounted but are behind z-[9000] and pointer-events-free in the shell
(PaneManager doesn't need changes — z-stacking handles it).

**Result:** fullscreen chat = dock gone, sidebar gone, background panes visually behind and
non-interactive. ESC exits (already wired).

### 1d. Default chat pane size

**Current:** `size: { width: 1280, height: 820 }` — immediately oversized on 1440-class screens.

**New:** `size: { width: 860, height: 680 }` — comfortable mid-size workspace. On 1440px, this leaves
~290px breathing room on each side before any dock/sidebar chrome begins.

Position: centered or slightly left-of-center. If the pane store doesn't auto-center, default position
should be computed to avoid immediate right-sidebar collision.

---

## Part 2 — v3 Consumer Cutover

All clients use `coreGet`/`corePost`/`corePatch` — v3 envelope unwrap is automatic.
TDD: each file gets failing tests first, then URL change, then tests pass.

### Priority order

1. `useSemanticConstellation` + `relationsClient` (visual, observable immediately)
2. `coreClient` node relation calls (2 calls)
3. `scanClient` + `intelClient` (scan/intel shapes normalized in `172994f`)
4. `cognitionClient` (proactive intelligence)
5. `moraAgentClient` tools endpoints (tools list + execute only)

### 2a. useSemanticConstellation.ts

```typescript
// FROM:
const data = await corePost(`/v1/relations/preview`, { node_id: nodeId, ... });
// TO:
const data = await coreGet(`/v3/relations/preview?node_id=${nodeId}&...`, { isOptional: true });
```
Note: endpoint method changes from POST to GET. URL params replace request body.
No interface changes expected — response shape is equivalent.

### 2b. relationsClient.ts

| Function | From | To |
|---|---|---|
| `fetchRelationsForSpace(spaceId)` | `GET /v1/relations/space/{id}` | `GET /v3/relations/space/{id}` |
| `fetchRelationsForNode(nodeId)` | `GET /v1/relations/node/{id}` | `GET /v3/relations/node/{id}` |
| `createRelation(payload)` | `POST /v1/relations` | `POST /v3/relations` |
| `deleteRelation(relationId)` | `DELETE /v1/relations/{id}` | `DELETE /v3/relations/{id}` |

All via `coreGet`/`corePost`/`coreDelete`. Interface shapes unchanged.

### 2c. coreClient.ts — two node calls

```typescript
// fetchNodeRelations: /v1/nodes/{nodeId}/relations → /v3/nodes/{nodeId}/relations
// fetchSimilarNodes:  /v1/nodes/{nodeId}/similar   → /v3/nodes/{nodeId}/similar
```

### 2d. scanClient.ts

```typescript
// FROM: corePost(`/v1/scan/analyze/${folderId}`, payload)
// TO:   corePost(`/v3/scan/analyze/${folderId}`, payload)
// Response shape (normalized in 172994f): { report_id, report_node_id, summary, stats, folder_id }
```

### 2e. intelClient.ts

```typescript
// FROM: corePost('/v1/intel/scan', payload)
// TO:   corePost('/v3/intel/scan', payload)
// Response shape matches scan: { report_id, report_node_id, summary, stats, folder_id }
```

### 2f. cognitionClient.ts

Full path migration `/v1/autonomous/` → `/v3/autonomous/`, `/v1/cognition/` → `/v3/cognition/`:

| Old | New |
|---|---|
| `GET /v1/autonomous/suggestions` | `GET /v3/autonomous/suggestions` |
| `POST /v1/autonomous/analyze` | `POST /v3/autonomous/analyze` |
| `POST /v1/autonomous/enrich` | `POST /v3/autonomous/enrich` |
| `POST /v1/autonomous/synthesize` | `POST /v3/autonomous/synthesize` |
| `GET /v1/autonomous/status` | `GET /v3/autonomous/status` |
| `POST /v1/cognition/agent` | `POST /v3/cognition/agent` |

### 2g. moraAgentClient.ts (tools only)

```typescript
// FROM: coreGet('/v1/mora/tools')           → TO: coreGet('/v3/mora/tools')
// FROM: coreGet(`/v1/mora/tools/task/${id}`) → SKIP (getTaskStatus() unused in frontend)
// New:  corePost('/v3/mora/tools/execute', payload)  ← replaces task-based invocation
```

`getTaskStatus()` function can be deprecated with a `// @deprecated — no active consumer` comment.
Do not delete until confirmed dead across all panes.

---

## Part 3 — Nexus/Memory Polish

`MoraPlayground` (in MoraHubPane overview) wraps `MoraUpdatesFeed` + `MoraMemory`.
When data is absent, both can render nothing — the overview looks like a floating orb.

**Fix: explicit zero-states**

- `MoraUpdatesFeed` zero-state: `"Keine aktuellen Aktivitäten"` with a faint icon (no data invented)
- `MoraMemory compact` zero-state: `"Noch keine Erkenntnisse gespeichert"` with a faint icon

When data *does* exist, the components already render it. No layout restructuring needed — just
replace empty render paths with a named zero-state block.

---

## Commit Sequence

| # | Commit | Scope |
|---|---|---|
| 1 | `feat: add compact variant to MoraContextChip` | `MoraContextChip.tsx` |
| 2 | `feat: use MoraContextChip in ChatPane header (delete scope renderer)` | `ChatPane.tsx` |
| 3 | `fix: chat fullscreen connects to mora-pane-fullscreen-change event bus` | `ChatPane.tsx` |
| 4 | `fix: suppress MemorySidebar in fullscreen mode` | `MoraShell.tsx` |
| 5 | `fix: chat default pane size sane on 1440 screens` | `ChatPane.tsx` |
| 6 | `feat(mr21): migrate useSemanticConstellation to v3 (GET /v3/relations/preview)` | `useSemanticConstellation.ts` + tests |
| 7 | `feat(mr21): migrate relationsClient to v3` | `relationsClient.ts` + tests |
| 8 | `feat(mr21): migrate coreClient node relation calls to v3` | `coreClient.ts` + tests |
| 9 | `feat(mr21): migrate scanClient + intelClient to v3` | `scanClient.ts`, `intelClient.ts` + tests |
| 10 | `feat(mr21): migrate cognitionClient to v3` | `cognitionClient.ts` + tests |
| 11 | `feat(mr21): migrate moraAgentClient tools to v3 (list + execute)` | `moraAgentClient.ts` + tests |
| 12 | `fix: Nexus zero-states when data is absent` | `MoraPlayground.tsx` or `MoraUpdatesFeed.tsx`, `MoraMemory.tsx` |

---

## Acceptance Criteria

- [ ] `useMoraContext()` is the single data source for provenance in Chat, Hub, and Sidebar
- [ ] No bespoke scope renderer remains in ChatPane
- [ ] Maximized chat: dock and MemorySidebar unmount, background panes are behind z-[9000]
- [ ] Normal chat: default size ~860×680, no immediate chrome collision
- [ ] ESC exits fullscreen (already wired, regression test)
- [ ] All 6 clients + 1 hook migrated to v3 paths
- [ ] `useSemanticConstellation` uses GET not POST
- [ ] `getTaskStatus()` marked deprecated, not deleted
- [ ] Zero-states present in Nexus when data is absent
- [ ] 57+ tests pass, 0 TypeScript errors
- [ ] phaseout gate moves toward pass (cognition + relations + scan/intel cut over)

---

## Files NOT Changing

| File | Reason |
|---|---|
| `lib/auth.ts` | NextAuth login — requires auth refactor |
| `lib/api/coreClient.ts` tree calls (`/v1/tree`) | No v3 tree endpoint |
| `lib/api/devToken.ts` | Dev-only, intentional |
| Demo endpoints | Non-critical, intentional |
