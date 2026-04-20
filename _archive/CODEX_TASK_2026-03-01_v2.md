# CODEX BACKEND TASK — 2026-03-01 (Revision 2 — Comprehensive)

**From:** Claude (frontend architect)
**To:** Codex (backend)
**Priority:** CRITICAL — blocks all frontend visual work

---

## Context

The frontend has 3 visual layers (L1 Planet view → L2 Department/Moon orbit → L3 Space/Folder cluster).
L2 and L3 are currently broken visually. The root causes are **backend data problems** — missing fields,
broken filters, and no color data. Fix these and the frontend will immediately look alive.

---

## Bug 1: `GET /v1/nodes?folder_id=X` Filter Is Ignored

### Symptom
Returns ALL nodes in the workspace, not just those in folder X.

### Fix
Apply `WHERE parent_id = :folder_id` in the query.

```sql
-- CURRENT (broken):
SELECT * FROM nodes WHERE space_id = :space_id

-- FIXED:
SELECT * FROM nodes WHERE parent_id = :folder_id
```

### Test
```
GET /v1/nodes?folder_id=<real-uuid>
→ must return only nodes where parent_id = that uuid
```

---

## Bug 2: `node_count` Missing from `/v1/folders` Response

### Symptom
`folder.node_count` is `0` or absent. The frontend uses it to size folder orbs and show "FILES: N".

### Fix
```sql
SELECT f.*, COUNT(n.id) AS node_count
FROM folders f
LEFT JOIN nodes n ON n.parent_id = f.id
GROUP BY f.id
```

### Expected response shape
```json
{
  "id": "...",
  "name": "Training",
  "space_id": "...",
  "color": "#22D3EE",
  "node_count": 14
}
```

---

## Bug 3: `color` Field Missing / Always Null for Spaces and Folders

### Symptom
`space.color` and `folder.color` are absent or always `null` in API responses.
The frontend uses these to paint every orbiting object. Without color, everything renders grey.

### Fix
1. Make sure `color` column exists on `spaces` and `folders` tables (TEXT, nullable)
2. Include it in all SELECT queries for those tables
3. Return it in `/v1/spaces`, `/v1/folders`, `/v1/tree`

### Expected response shapes
```json
// Space
{ "id": "...", "name": "Teamraum", "department_id": "...", "color": "#6366F1", "folder_count": 5 }

// Folder
{ "id": "...", "name": "Onboarding", "space_id": "...", "color": "#F59E0B", "node_count": 7 }
```

---

## Bug 4: `folder_count` Missing from `/v1/spaces` Response

### Symptom
`space.folder_count` is 0 or absent. The frontend uses it for the Star orb capacity ring.

### Fix
```sql
SELECT s.*, COUNT(f.id) AS folder_count
FROM spaces s
LEFT JOIN folders f ON f.space_id = s.id
GROUP BY s.id
```

---

## Feature Request: Demo Data Seed — Colors + Realistic Content

The demo tenant currently has blank/null colors everywhere. Please seed the demo data with:

### Departments (already have colors via getDeptStyle, but backend should also have them)
These departments need `color` set in the DB:
- HR & Culture → `#10B981` (emerald)
- Management → `#6366F1` (indigo)
- Tech / Dev → `#3B82F6` (blue)
- Sales → `#F59E0B` (amber)
- Finance → `#EF4444` (red)

### Spaces — each needs a distinct `color`
Use a rotating palette: `#22D3EE`, `#A78BFA`, `#F59E0B`, `#34D399`, `#F43F5E`, `#60A5FA`

### Folders — each needs a distinct `color`
Use a different palette per space: warm tones for some spaces, cool for others.

### Demo Nodes
Add 3-8 nodes per folder so `node_count > 0`. Use realistic names:
- `Meeting Notes 2026-02-15.md`
- `Onboarding Checklist.pdf`
- `Q1 Goals.docx`
- `Team Photo.jpg`
- etc.

---

## API Shape Contract (Frontend Depends on This Exactly)

### `GET /v1/departments` (or equivalent)
```typescript
interface Department {
  id: string;
  name: string;
  color?: string;          // hex e.g. "#10B981"
  description?: string;
}
```

### `GET /v1/spaces?department_id=X`
```typescript
interface Space {
  id: string;
  name: string;
  department_id: string;
  color?: string;          // hex — REQUIRED for colored orbs
  description?: string;
  folder_count: number;    // REQUIRED — 0 is ok if truly empty
}
```

### `GET /v1/folders?space_id=X`
```typescript
interface Folder {
  id: string;
  name: string;
  space_id: string;
  color?: string;          // hex — REQUIRED for colored folder orbs
  description?: string;
  type?: 'folder'|'document'|'image'|'video'|'audio'|'archive';
  node_count: number;      // REQUIRED
}
```

### `GET /v1/nodes?folder_id=X`
```typescript
interface Node {
  id: string;
  name: string;
  parent_id: string;       // = folder_id
  space_id: string;
  type: string;
  content?: string;
  created_at: string;
  updated_at: string;
}
```

---

## Deliverables

1. [ ] `/v1/nodes?folder_id=X` returns filtered results
2. [ ] `folder.node_count` present and correct in all folder responses
3. [ ] `space.folder_count` present and correct in all space responses
4. [ ] `color` field returned for all spaces and folders
5. [ ] Demo data seeded: colors on all spaces/folders + 3+ nodes per folder
6. [ ] Push to main, report commit SHA + what changed

---

## Reply Template

```
Done. Fixed:
- Bug 1: [yes/no] commit SHA ___
- Bug 2: [yes/no] commit SHA ___
- Bug 3: [yes/no] commit SHA ___
- Bug 4: [yes/no] commit SHA ___
- Demo seed: [yes/no] commit SHA ___

API verified:
- GET /v1/spaces?department_id=X → folder_count: [value]
- GET /v1/folders?space_id=X → node_count: [value], color: [value]
- GET /v1/nodes?folder_id=X → returns [N] nodes (filtered)
```
