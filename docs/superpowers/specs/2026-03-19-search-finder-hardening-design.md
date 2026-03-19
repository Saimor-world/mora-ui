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
    return {
        id: result.node_id,
        type: 'node' as const,
        title: result.metadata?.title || 'Untitled',
        path: scopePath,
        subtitle: getSearchResultSubtitle(
            { path: scopePath, subtitle: undefined, type: 'node' },
            result.content?.substring(0, 80)
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

`getSearchResultSubtitle` will return `scopePath` when present (the `result.path` check), falling back to content preview only when `scope_path` is absent (e.g., local results).

### Delta 4 — `components/panes/FinderPane.tsx` · `handleOpen()` · folderId + context handoff

**Current:** Opens DocumentPane with `{ nodeId, content, name, type }` only. No `folderId`, no `navigationContext`. DocumentPane shows no location context, "Im Zielordner oeffnen" button is absent.

**Fix:** Pass `folderId: currentFolderIdRef.current ?? undefined`. Forward the FinderPane's existing `navigationContext` **only if it is present** (meaning Finder was opened from a Mora/search/session context with a real explanation). Do not fabricate a `navigationContext` for locally-opened Finders. DocumentPane stays quiet rather than inventing a story.

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
                ...(navigationContext ? {
                    navigationContext: {
                        ...navigationContext,
                        folderId: resolvedFolderId ?? navigationContext.folderId,
                        timestamp: Date.now(),
                    }
                } : {}),
            }
        });
    }
    setContextMenu(null);
};
```

**Key constraint:** Only `navigationContext` from the pane's own `data.navigationContext` is forwarded. No string is invented. If `navigationContext` is `undefined`, DocumentPane receives no context block — which is the correct UX for a locally-navigated document open.

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
