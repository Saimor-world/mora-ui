# CODEX MASTER PLAN — 2026-03-01
## Backend + Server + Infrastruktur

**Von:** Claude (Frontend-Architekt)
**An:** Codex
**Status:** Startbereit — bitte direkt anfangen
**Frontend-Branch:** `main` auf `mora-ui`
**Koordination:** Ich mache parallel alle Frontend-Aufgaben

---

## Überblick

Mora OS hat 4 visuelle Layer (L1 → L4 = Drill-Down durch die Firma):

```
L1: Universe (Departments als Planeten)
L2: Department Orbit (Spaces als Moons)
L3: Space Cluster (Folders als Orbs)
L4: Folder View (Nodes/Files als Karten)
```

Das Frontend ist fertig architektiert. Die visuellen Komponenten existieren.
**Das Problem:** Backend liefert unvollständige Daten → alles sieht grau/leer aus.

---

## BLOCK A — Server Deployment (Priorität: SOFORT)

Das Frontend hat kritische visuelle Fixes auf `main` gepusht (commits `c4874cc` → `c0e0c20`).
Der Server läuft noch das alte Image. Bitte als erstes deployen:

```bash
# Auf dem Server (SSH):
cd /root/saimor/ops
git pull                     # holt neuen deploy.sh (branch main statt phaseAB)
./deploy.sh --ui             # baut UI neu aus main-Branch
```

Falls GitHub Action bereits fertig:
```bash
DEPLOY_MODE=image ./deploy.sh --ui   # schneller: holt fertiges Docker Image von GHCR
```

**Verifizierung nach Deploy:**
- https://hq.saimor.world → L2 anklicken → Moons müssen farbige Spheres sein
- L3 öffnen → Folder-Orbs müssen grün/blau/violett/amber leuchten
- Center-Orb muss sichtbar sein (nicht nur ein weißer Fleck)

---

## BLOCK B — Backend API Fixes (Priorität: HOCH)

### B1: `/v1/nodes?folder_id=X` filtert nicht

```sql
-- Aktuell (kaputt): gibt ALLE nodes zurück
-- Fix: WHERE parent_id = :folder_id
SELECT * FROM nodes WHERE parent_id = :folder_id
```

**Test:** `GET /v1/nodes?folder_id=<echte-uuid>` → nur Nodes für diesen Folder

---

### B2: `node_count` fehlt in Folder-Objekten

```sql
SELECT f.*, COUNT(n.id) AS node_count
FROM folders f
LEFT JOIN nodes n ON n.parent_id = f.id
GROUP BY f.id
```

Betrifft: `/v1/folders`, `/v1/tree`, jeden Endpoint der Folders zurückgibt.

---

### B3: `folder_count` fehlt in Space-Objekten

```sql
SELECT s.*, COUNT(f.id) AS folder_count
FROM spaces s
LEFT JOIN folders f ON f.space_id = s.id
GROUP BY s.id
```

Betrifft: `/v1/spaces`, `/v1/tree`

---

### B4: `color` fehlt für Spaces und Folders

Das Frontend nutzt `space.color` und `folder.color` um JEDES orbiting Object einzufärben.
Ohne Color → alles grau.

- Sicherstellen dass `color TEXT` Spalte auf `spaces` und `folders` existiert
- In ALLEN SELECT-Queries includen
- In API-Responses mitschicken

**Erwartete Objekt-Shapes:**

```typescript
// Space
interface Space {
  id: string; name: string; department_id: string;
  color: string;        // hex z.B. "#6366F1" — PFLICHT
  description?: string;
  folder_count: number; // PFLICHT
}

// Folder
interface Folder {
  id: string; name: string; space_id: string;
  color: string;        // hex — PFLICHT
  type?: 'folder'|'document'|'image'|'video'|'audio'|'archive';
  node_count: number;   // PFLICHT
}

// Node
interface Node {
  id: string; name: string; parent_id: string;
  space_id: string; type: string;
  content?: string; created_at: string; updated_at: string;
}
```

---

## BLOCK C — Demo-Daten Seed (Priorität: MITTEL)

Demo-Tenant braucht realistische Daten damit das visuelle System funktioniert.

### C1: Department Colors

```sql
UPDATE departments SET color = '#10B981' WHERE name ILIKE '%hr%' OR name ILIKE '%culture%';
UPDATE departments SET color = '#6366F1' WHERE name ILIKE '%management%' OR name ILIKE '%admin%';
UPDATE departments SET color = '#3B82F6' WHERE name ILIKE '%tech%' OR name ILIKE '%dev%';
UPDATE departments SET color = '#F59E0B' WHERE name ILIKE '%sales%' OR name ILIKE '%finance%';
```

### C2: Space Colors (pro Space eine Farbe aus der Palette zuweisen)

Palette: `['#22D3EE', '#A78BFA', '#F59E0B', '#34D399', '#F43F5E', '#60A5FA', '#FB923C', '#E879F9']`

```sql
-- Beispiel (an euren Schema anpassen):
UPDATE spaces SET color = '#22D3EE' WHERE id = '<uuid1>';
UPDATE spaces SET color = '#A78BFA' WHERE id = '<uuid2>';
-- etc. für alle Spaces im Demo-Tenant
```

### C3: Folder Colors (pro Folder eine Farbe)

Palette: `['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#f43f5e', '#3b82f6']`

```sql
UPDATE folders SET color = '#10b981' WHERE id = '<uuid1>';
-- etc.
```

### C4: Demo Nodes (3-8 pro Folder)

Realistische Dateinamen für jeden existierenden Folder einfügen:

```sql
-- HR Folder "Onboarding":
INSERT INTO nodes (id, name, parent_id, space_id, type, created_at)
VALUES
  (gen_random_uuid(), 'Onboarding Checklist.md', '<onboarding_folder_id>', '<space_id>', 'document', now()),
  (gen_random_uuid(), 'Company Values 2026.pdf', '<onboarding_folder_id>', '<space_id>', 'document', now()),
  (gen_random_uuid(), 'First Week Guide.docx', '<onboarding_folder_id>', '<space_id>', 'document', now());

-- HR Folder "Handbook":
INSERT INTO nodes ...  -- Meeting Notes, Policies, etc.

-- Management Folder: Quarterly Reports, KPIs, etc.
-- Tech Folder: Architecture Docs, README, API Specs, etc.
```

---

## BLOCK D — Neue API Endpoints (Priorität: MITTEL-NIEDRIG)

Für L4 (FolderLayer) und die LLM-Integration:

### D1: `GET /v1/folders/:id` — Single Folder Detail

```json
{
  "id": "...", "name": "...", "color": "...",
  "space_id": "...", "space_name": "...",
  "department_id": "...", "department_name": "...",
  "node_count": 14,
  "nodes": [/* optional, wenn ?include_nodes=true */]
}
```

### D2: `GET /v1/search?q=...&space_id=...` — Volltextsuche

Für die LLM-Integration brauchen wir Suche:
- Nodes nach Name/Content durchsuchen
- Optional: nach space_id, folder_id filtern
- Response: Array von Nodes mit folder/space Kontext

### D3: `POST /v1/nodes/:id/summary` — LLM-Summary anfordern

Für Mora AI: einen Node zusammenfassen lassen.
Frontend sendet den Request, Backend triggert LLM-Call, streamt Antwort zurück.

---

## BLOCK E — Server-Infrastruktur (Priorität: NIEDRIG aber wichtig)

### E1: Auto-Deploy Webhook

Aktuell muss man manuell `./deploy.sh` triggern.
Bitte einen Webhook einrichten:

```
POST /hooks/deploy-ui
Header: X-Deploy-Token: <secret>
→ führt `./deploy.sh --ui` aus
```

Dann kann GitHub Action direkt nach dem Image-Build den Server triggern.

### E2: Health Endpoint erweitern

`GET /health` oder `GET /api/v1/health` sollte zurückgeben:

```json
{
  "status": "ok",
  "version": "...",
  "db": "connected",
  "tenant_count": 3,
  "demo_data": {
    "departments": 5,
    "spaces": 12,
    "folders": 28,
    "nodes": 156
  }
}
```

---

## Koordination mit Claude (Frontend)

Ich arbeite parallel an:
- DepartmentLayer L2: Dept-Farbe für Nebula-Background
- FolderLayer L4: Visuelle Upgrades (Farb-Akzente)
- SpaceLayer L3: ORBIT_PALETTE aus deptStyle.ts verwenden
- Mora AI Panel: Chat-Interface Grundstruktur

**Wichtig für Koordination:**
- Nach B4 (color fix): Ich ändere nichts am Color-System, das kommt von dir
- Nach C4 (seed nodes): FolderLayer zeigt automatisch die Daten an
- Nach D2 (search): Ich baue das Search-UI im Dock auf
- Nach D3 (LLM summary): Ich baue den Mora AI Chat dazu

---

## Deliverables — Bitte nach Fertigstellung melden:

```
Block A (Deploy):     [ ] server live, URL check OK
Block B (API Fixes):  [ ] B1 SHA: ___ / B2 SHA: ___ / B3 SHA: ___ / B4 SHA: ___
Block C (Seed):       [ ] Departments: __ / Spaces: __ / Folders: __ / Nodes: __
Block D (New APIs):   [ ] D1: ___ / D2: ___
Block E (Infra):      [ ] Webhook URL: ___

API Quick-Test:
GET /v1/spaces?department_id=X  → folder_count: [N], color: [#hex]
GET /v1/folders?space_id=X      → node_count: [N], color: [#hex]
GET /v1/nodes?folder_id=X       → returns [N] nodes (filtered, not all)
```

**Du kannst den Plan gerne überarbeiten und verbessern — Hauptsache die Blocks A und B kommen als erstes!**
