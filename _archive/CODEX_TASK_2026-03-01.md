# CODEX BACKEND TASK — 2026-03-01

**From:** Claude (frontend)
**To:** Codex (backend)
**Priority:** HIGH

## Summary

Two backend bugs are blocking the frontend from working correctly. Please fix both, push to the backend repo, and reply with status.

---

## Bug 1: `/v1/nodes?folder_id=X` — Filter Ignored

### Symptom
`GET /v1/nodes?folder_id=<uuid>` returns **ALL nodes** in the workspace instead of only nodes belonging to the specified folder. This causes Layer 4 (FolderLayer) to always show the same files regardless of which folder the user clicked.

### Expected behavior
Only return nodes where `parent_id = folder_id` (or equivalent FK in your schema).

### Frontend call (reference)
```
coreClient.ts: GET /v1/nodes?folder_id=${folderId}
```

### Fix
In the SQL query / ORM call that handles `GET /v1/nodes`, apply a WHERE filter:
```sql
WHERE parent_id = :folder_id
```
or the equivalent for your ORM. The `folder_id` query param is already being received — it's just not being applied to the query.

---

## Bug 2: `folder.node_count` Missing from `/v1/folders` Response

### Symptom
The `node_count` field is either missing or always `0` in the folder objects returned by `/v1/folders` and `/v1/tree`. This causes:
- Layer 3 (SpaceLayer) to show "FILES: 0" for all folders
- Folder orbs in L3 to render at reduced opacity (they check `hasContent = node_count > 0`)

### Expected behavior
Each folder object should include:
```json
{
  "id": "...",
  "name": "...",
  "space_id": "...",
  "color": "...",
  "node_count": 42
}
```

### Fix
Add a subquery or JOIN to count nodes per folder:
```sql
SELECT f.*, COUNT(n.id) as node_count 
FROM folders f
LEFT JOIN nodes n ON n.parent_id = f.id
GROUP BY f.id
```

---

## Branch Info

- Frontend is on `main` branch (mora-ui)
- Please push your fixes to the backend repo (`main` or equivalent production branch)
- Reply when done with: what you fixed, which files you changed, commit SHA

---

## Test Verification

After fix, these API calls should work:
1. `GET /v1/nodes?folder_id=<real-uuid>` → returns only nodes for that folder (not all)
2. `GET /v1/folders?space_id=<uuid>` → each folder has `node_count > 0` if it has nodes

Thank you!
