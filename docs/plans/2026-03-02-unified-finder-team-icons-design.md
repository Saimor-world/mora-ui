# Design: Unified Finder + Team UI + Icon Polish
**Date:** 2026-03-02
**Backend SHA:** 3c5c0a3
**Approach:** A — pane-native
**Status:** Approved

---

## Context

mora-ui has a split filesystem UX: file nodes in FolderLayer trigger a global `NodeDetailPanel` overlay (mounted unconditionally in MoraShell, driven by `activeNode` in moraState). All other surfaces open `FinderPane` via the pane system. This creates two code paths for what should be one paradigm. Additionally, the Team roster is contaminated with synthetic entries, and dock icons need a visual polish pass.

---

## Commit 1 — Filesystem Unification + Breadcrumb

### 1a. Remove NodeDetailPanel split

**What changes:**
- `FolderLayer.handleNodeClick` currently calls `setActiveNode(node)` + `loadNodeDetails(node.id)`. Replace both with `openPane({ type: 'document', data: { nodeId: node.id, name: node.name, type: node.type } })`.
- Remove `<NodeDetailPanel />` from `MoraShell` (one line deletion at mount site).
- Remove `activeNode`, `setActiveNode`, `loadNodeDetails`, `nodeDetails` from `moraState` only if no other consumers remain (audit first). If other consumers exist, leave the state slice but stop calling `setActiveNode` from FolderLayer.
- `DocumentPane` already exists, loads node data via `fetchNodeDetails(nodeId)` internally, and renders markdown/text/image/PDF correctly.

**L3 folder click stays in-universe:**
FolderLayer distinguishes file nodes from folder nodes. Folder node clicks already navigate within FinderPane (call `loadNodesForFolder`). Only file node clicks go to DocumentPane. No routing change needed.

### 1b. Breadcrumb in FinderPane

**New API call:** `GET /v3/folders/{folder_id}/context`
**Response shape:**
```json
{
  "scope": "folder",
  "folder": { "id": "...", "name": "..." },
  "path": {
    "company": { "id": "...", "name": "..." },
    "department": { "id": "...", "name": "..." },
    "space": { "id": "...", "name": "..." },
    "breadcrumbs": [{ "id": "...", "name": "..." }]
  },
  "counts": { "nodes": 12, "subfolders": 3 }
}
```

**Rendering:** Sticky `<div>` above the file list in FinderPane:
```
Acme Corp  /  Sales  /  Shared Files  /  Q1 Reports  /  Invoices
```
Each segment is plain text (no links needed in v1 of this feature). Updated on every `loadNodesForFolder` call. Null-safe — if the call fails, no breadcrumb is shown (not critical path).

**New client function** added to `coreClient.ts`:
```typescript
export async function fetchFolderContext(folderId: string): Promise<FolderContext | null>
```
Uses `coreGet('/v3/folders/{folderId}/context', { isOptional: true })`.

### 1c. Upload/navigation stability

The `loadNodesForFolder` cache-guard regression was already fixed in commit 5b20e32. No additional changes needed. The post-upload refresh already fires correctly and shows new files immediately.

---

## Commit 2 — Team UI + Icon Polish

### 2a. TeamPane — roster cleanup

**Remove from `fetchTeamData()`:**
- The hardcoded `moraMember` object (`{ id: "mora", name: "MA'RA", role: "ai" }`)
- The `peerMembers` injection from `usePresence()` WebSocket hook

**Keep:**
- Real member fetch from `/v1/team/members` (existing, unchanged)
- Online presence indicators on real members (if implemented separately from the roster merge — audit which fields drive the green dot)

**Result:** `members` state = real DB users only. No fake entries.

### 2b. UsersPane — admin management UI

**New API surface (v3 admin):**

| Action | Endpoint |
|--------|----------|
| List users (incl. inactive) | `GET /v3/team/admin/users?include_inactive=true` |
| Edit role / active status | `PATCH /v3/team/admin/users/{user_id}` |
| Set default company | `PATCH /v3/team/admin/users/{user_id}/company-binding` |

**UI controls per user row:**
- Role dropdown: `member` / `admin` / `owner`
- Active toggle (checkbox or pill)
- Default company selector (if multi-tenant)

**Visibility:** Controls render only when `currentUser.role === 'owner' || 'admin'`. Read-only view for plain members.

**New client functions** in `coreClient.ts`:
```typescript
fetchAdminUsers(includeInactive?: boolean): Promise<AdminUser[]>
patchAdminUser(userId: string, patch: Partial<AdminUserPatch>): Promise<AdminUser>
patchUserCompanyBinding(userId: string, companyId: string): Promise<void>
```

### 2c. Dock icon redesign — MoraIcons.tsx

**Scope:** All 10 icons redrawn in-place:
`HomeOrbitIcon`, `MoraBrainIcon`, `ChatOrbitIcon`, `SearchScanIcon`, `FolderStarIcon`,
`TeamNetworkIcon`, `NotesRuneIcon`, `SettingsRingIcon`, `TerminalGlyphIcon`, `MemoryCrystalIcon`

**Design constraints:**
- ViewBox stays `0 0 24 24`
- Stroke width: `1.5` uniform (not mixed 1/2/1.5)
- No fill on stroke-based icons; no strokes on fill-based icons (pick one per icon)
- Drop-shadow filter (`glow` prop) preserved
- All paths pixel-aligned on 0.5-unit grid for crispness at 1x

**No prop/interface changes** — existing consumers (Dock, etc.) need zero updates.

---

## What Does Not Change

- All pane entry points already use `type: 'finder'` — no changes needed elsewhere
- Upload chain (`uploadCompanyFile`, `linkExternalFile`) — unchanged
- SSE / WebSocket presence wiring — unchanged
- Auth, JWT, v3 envelope unwrap — unchanged
- `loadSpacesForDepartment`, `loadFoldersForSpace` cache guards — unchanged (safe)
- All 34 existing tests — must still pass after both commits

---

## QA Acceptance Criteria

1. L3 folder click → FinderPane opens in-place; breadcrumb shows `Company / Dept / Space / Folder`
2. File node click → DocumentPane floats open; no NodeDetailPanel overlay
3. Upload → new file appears in current folder immediately (no flicker, no reload)
4. TeamPane roster → real DB users only; no "MA'RA" or peer browser-tab entries
5. UsersPane (owner/admin) → can change role, toggle active, set default company via v3 admin API
6. All 10 dock icons sharp at 1x and 2x; consistent stroke weight
7. All 34 existing tests pass; 0 TypeScript errors; 0 ESLint errors
