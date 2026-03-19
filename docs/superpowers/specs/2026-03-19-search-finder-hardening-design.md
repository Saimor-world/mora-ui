# Search / Finder Hardening Pass — Design Spec
**Date:** 2026-03-19
**Status:** Approved
**Baseline:** UI `020ba0e` / Core `a439e05`

---

## Problem

The new backend contract for keyword and semantic search results delivers:
- `scope_path` — canonical scoped location string (primary)
- `path` — legacy alias / compatibility fallback
- `folder_id`, `company_id`, `department_id`, `space_id` — hierarchy IDs (top-level, not only in `metadata`)

The frontend has partially consumed this contract. The remaining gaps are all **upstream normalization gaps** — wrong field priority or missed top-level fields. Everything downstream (DocumentPane display, "Im Zielordner oeffnen" button, navigation outcome recording) already works correctly once upstream data is right.

---

## Design Rule: `scope_path` is primary

Everywhere the frontend picks a display path string:
1. Prefer `scope_path`
2. Fall back to `path`
3. Only then fall back to content preview or generic type labels

This applies in:
- `mapRawSearchResult()` in `searchOpen.ts`
- Semantic result normalization in `searchOpen.ts` (`resolveSearchResults`)
- Inline semantic mapping in `SearchPane.tsx`

---

## Delta Set (5 changes, 3 files)

### Delta 1 — `lib/utils/searchOpen.ts` · `mapRawSearchResult()` · field order

**Current:**
```ts
path: raw?.path || raw?.scope_path || undefined,
subtitle: raw?.path || raw?.scope_path || undefined,
```

**Fix:**
```ts
path: raw?.scope_path || raw?.path || undefined,
subtitle: raw?.scope_path || raw?.path || undefined,
score: raw?.score,   // preserve score so semantic results retain relevance
```

`scope_path` is primary; `path` is compatibility fallback. `score` added so semantic results processed through `mapRawSearchResult` retain their relevance value.

### Delta 2 — `lib/utils/searchOpen.ts` · `resolveSearchResults()` · semantic normalization

**Current:** Hand-builds semantic result objects using only `metadata.folder_id`, `metadata.space_id`, and sets `subtitle` from `result.content?.substring(0, 100)` (content-first).

**Fix:** Extract top-level `scope_path`, `path`, `folder_id`, `company_id`, `department_id`, `space_id` from the semantic result. Prefer `scope_path || path` for both `path` and `subtitle` fields. Content preview is dropped from subtitle — location context is the primary signal.

```ts
const scopePath = (result as any).scope_path || (result as any).path || undefined;
return {
    id: result.node_id,
    type: 'node' as const,
    title: result.metadata?.title || 'Unbenannt',
    path: scopePath,
    subtitle: scopePath,   // location-first; no content preview
    icon: FileText,
    score: result.score,
    nodeId: result.node_id,
    companyId: (result as any).company_id || scope.companyId || undefined,
    folderId: (result as any).folder_id || result.metadata?.folder_id,
    departmentId: (result as any).department_id || undefined,
    spaceId: (result as any).space_id || result.metadata?.space_id,
};
```

### Delta 3 — `components/panes/SearchPane.tsx` · inline semantic mapping

**Current:** Lines 198–210 hand-build semantic results using only `metadata.folder_id`, `metadata.space_id`. Subtitle set from `result.content?.substring(0, 80) || metadata.type` (content-first).

**Fix:** Same normalization as Delta 2 — check top-level fields first. Prefer `scope_path || path` for subtitle. Keep `getSearchResultSubtitle` call for the subtitle display so the shared fallback chain (`path → subtitle → fallback → type label`) is honoured.

```ts
const mapped: SearchResult[] = semanticResults.map((result) => {
    const scopePath = (result as any).scope_path || (result as any).path || undefined;
    // Priority: scope_path > path > content preview (last resort) > type label.
    // Content preview is intentionally retained as last-resort fallback here —
    // SearchPane is UI-facing and showing something is better than showing nothing
    // when scope_path is absent (e.g., older results from pre-contract producers).
    return {
        id: result.node_id,
        type: 'node' as const,
        title: result.metadata?.title || 'Untitled',
        path: scopePath,
        subtitle: getSearchResultSubtitle(
            { path: scopePath, subtitle: undefined, type: 'node' },
            result.content?.substring(0, 80)  // passed as fallbackPreview, only used when scopePath is absent
        ),
        icon: FileText,
        source: 'mora' as const,
        score: result.score,
        companyId: (result as any).company_id || activeCompanyId || undefined,
        nodeId: result.node_id,
        folderId: (result as any).folder_id || result.metadata?.folder_id,
        departmentId: (result as any).department_id || undefined,
        spaceId: (result as any).space_id || result.metadata?.space_id,
    };
});
```

`getSearchResultSubtitle` returns `scopePath` when present (the `result.path` check), then falls back to `content.substring(0,80)` only when `scope_path` is absent. This matches the stated priority: `scope_path > path > preview > type label`. The `resolveSearchResults` equivalent in Delta 2 is intentionally stricter (no content preview) because it feeds a combined result set where type label is an acceptable fallback.

**Note on Delta 2 vs Delta 3 consistency:** Both honour the `scope_path > path` primary rule. Delta 2 (`resolveSearchResults`) drops content preview entirely since it's used in a merged/ranked result context. Delta 3 (`SearchPane`) retains content as last resort because the UI pane benefits from showing any context over a generic type label. This is a deliberate asymmetry, not an inconsistency.

### Delta 4 — `components/panes/FinderPane.tsx` · `handleOpen()` · folderId + context handoff

**Current:** Opens DocumentPane with `{ nodeId, content, name, type }` only. No `folderId`, no `navigationContext`. DocumentPane shows no location context, "Im Zielordner oeffnen" button is absent.

**Fix:** Pass `folderId: currentFolderIdRef.current ?? undefined`. Forward the FinderPane's existing `navigationContext` **only if it is present** (meaning Finder was opened from a Mora/search/session context with a real explanation). Do not fabricate a `navigationContext` for locally-opened Finders. DocumentPane stays quiet rather than inventing a story.

**Import change required:** Add `DocumentNavigationContext` to the existing import in `FinderPane.tsx`:
```ts
import type { FinderNavigationContext, DocumentNavigationContext } from '@/lib/utils/searchOpen';
```
This is needed for the `satisfies DocumentNavigationContext` expression in the snippet below.

```ts
const handleOpen = () => {
    if (!contextMenu?.item) return;
    if (contextMenu.type === 'folder' || contextMenu.item.type === 'space') {
        navigateToFolder(contextMenu.item.id);
    } else {
        const resolvedFolderId = currentFolderIdRef.current ?? undefined;
        openPane({
            id: `doc-${contextMenu.item.id}`,
            type: 'document',
            title: contextMenu.item.name || 'Document',
            size: { width: 800, height: 600 },
            data: {
                nodeId: contextMenu.item.id,
                content: contextMenu.item.content,
                name: contextMenu.item.name,
                type: contextMenu.item.type,
                folderId: resolvedFolderId,
                // Forward Finder's own navigationContext only if it came from Mora/search/session.
                // If Finder was opened locally, omit navigationContext entirely — DocumentPane stays quiet.
                // Pick only DocumentNavigationContext-compatible fields from FinderNavigationContext.
                // FinderNavigationContext has `targetType` and `query` which do not exist on
                // DocumentNavigationContext — do NOT spread navigationContext directly.
                ...(navigationContext ? {
                    navigationContext: {
                        title: navigationContext.title,
                        message: navigationContext.message,
                        label: navigationContext.label,
                        path: navigationContext.path,
                        source: navigationContext.source,
                        folderId: resolvedFolderId,
                        timestamp: Date.now(),
                    } satisfies DocumentNavigationContext,
                } : {}),
            }
        });
    }
    setContextMenu(null);
};
```

**Key constraint:** Only `navigationContext` from the pane's own `data.navigationContext` is forwarded. No string is invented. If `navigationContext` is `undefined`, DocumentPane receives no context block — which is the correct UX for a locally-navigated document open.

`FinderNavigationContext` and `DocumentNavigationContext` are distinct types — the former has `targetType` and `query` which the latter does not; the latter has `folderId` and `companyId` which the former does not. The code explicitly picks compatible fields (`title`, `message`, `label`, `path`, `source`) and provides `folderId` from `resolvedFolderId`. The spread operator is intentionally avoided to prevent type errors and extra field leakage.

`companyId` is intentionally absent from the forwarded `DocumentNavigationContext` — `FinderNavigationContext` does not carry it, and `DocumentPane` sources the active company from the pane `data.companyId` field (which `openSearchResult()` already sets correctly) or from the active company store. No data loss.

### Delta 5 — `components/mora/SearchPopup.tsx` · dead code removal

Lines 594–603 define `getTypeLabel` outside the component closing brace (`};`). This code never executes. Remove it.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/utils/searchOpen.ts` | Deltas 1 + 2 |
| `components/panes/SearchPane.tsx` | Delta 3 |
| `components/panes/FinderPane.tsx` | Delta 4 |
| `components/mora/SearchPopup.tsx` | Delta 5 |
| `components/panes/DocumentPane.tsx` | **No change** |

---

## What Does Not Change

- `DocumentPane.tsx` — already renders path chip, source label, and "Im Zielordner oeffnen" correctly when data is present
- `getSearchResultSubtitle()` — already chains `path → subtitle → fallbackPreview → type label`; fixing upstream makes it work correctly
- `openNavigationOutcome()` / `surfaceNavigationOutcome()` — already forward all fields
- `companyId` scoping in `openSearchResult()` — already live

---

## Constraints

- No new architecture
- No new store fields
- No banner model changes
- No TeamPane changes
- Blast radius: 4 files, all normalization/display — no new components, no new pane types
- `fetchNodeDetails` fallback in `openSearchResult()` remains as edge-case safety net; it fires only when `folderId` is genuinely absent after contract extraction
