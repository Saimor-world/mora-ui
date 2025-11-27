# TODO für Supervisor-Agent

**Stand:** 2025-11-25  
**Zweck:** Zentrale Aufgaben-Liste für zukünftige Agenten-Durchläufe

---

## 📋 Prinzip

Diese Datei sammelt **konkrete TODOs**, die in späteren Durchläufen von spezialisierten Agenten (Core-Agent, UI-Agent, Infra-Agent) umgesetzt werden sollen.

**Format:**
```markdown
## [BEREICH] - [KURZBESCHREIBUNG]
- [ ] Task 1 (Priorität: HIGH/MEDIUM/LOW)
- [ ] Task 2
```

**Status-Tracking:**
- `[ ]` → Offen
- `[→]` → In Progress
- `[✓]` → Erledigt
- `[!]` → Blockiert

---

## 🔧 TODOs für Core-Agent (saimor-core)

### CORE-01: Real-Revenue-Aktivierung
**Priorität:** HIGH  
**Blocker:** PostgreSQL Auth (md5 vs scram-sha-256)

- [ ] PostgreSQL Auth-Methode analysieren (`pg_hba.conf`)
- [ ] Option A testen: Neu aufsetzen mit `POSTGRES_HOST_AUTH_METHOD=md5`
- [ ] Option B testen: Trust-Auth für 127.0.0.1 (nur Dev)
- [ ] Option C testen: scram-sha-256 in psycopg2 korrekt konfigurieren
- [ ] `USE_REAL_REVENUE=true` aktivieren (nach Auth-Fix)
- [ ] Smoke-Tests mit Real-Revenue-Endpoints
- [ ] CORE_MASTER.md updaten (Real-Revenue-Status)

**Erwartetes Ergebnis:**
- `/v1/revenue/monthly` liefert echte Daten aus PostgreSQL
- `/v1/revenue/events` funktioniert
- Mock bleibt als Fallback

---

### CORE-02: Embedding-Harmonisierung
**Priorität:** MEDIUM

- [ ] Gateway Mock-Embeddings (1536-dim Hash) ersetzen
- [ ] Core Embeddings (384-dim sentence-transformers) als Standard
- [ ] Qdrant Collections migrieren (falls nötig)
- [ ] `/v1/system/embedding-info` Endpoint testen

**Erwartetes Ergebnis:**
- Einheitliche Embedding-Dimensionen (384-dim)
- Semantic Search funktioniert plattformübergreifend

---

### CORE-03: CORS-Cleanup
**Priorität:** MEDIUM

- [ ] Hardcoded Cloudflare-Tunnel-URLs aus `core/app.py` entfernen
- [ ] ENV-Variable `ALLOWED_ORIGINS` sauber nutzen
- [ ] Wildcard-Regex `https://*.trycloudflare.com` ausreichend?
- [ ] Dokumentation in `.env.example` ergänzen

**Erwartetes Ergebnis:**
- CORS-Liste in `core/app.py` reduziert auf < 5 Einträge
- Tunnel-Wechsel braucht nur `.env` Update, kein Code-Edit

---

### CORE-04: Node Detail Endpoint (falls UI braucht)
**Priorität:** LOW (UI prüft zuerst ob nötig)

- [ ] Verifizieren: `GET /v1/nodes/{id}` liefert `content`, `metadata`, `url`, `size`
- [ ] Optional: Endpoint `/v1/nodes/{id}/relations` für Related Nodes
- [ ] Smoke-Tests mit Alpha Centauri Nodes

**Erwartetes Ergebnis:**
- UI kann Node-Details vollständig anzeigen
- Markdown-Content korrekt escaped (falls JSON)

---

### CORE-05: Metrics aktivieren (Observability)
**Priorität:** LOW

- [ ] `METRICS_ENABLED=true` in `.env`
- [ ] Prometheus-Endpoint `/metrics` testen
- [ ] Counter validieren: `saimor_upload_*`, `saimor_audit_*`
- [ ] Grafana Setup (Infra-Agent Koordination)

**Erwartetes Ergebnis:**
- `/metrics` liefert Prometheus-Format
- Grafana kann Daten scrapen

---

## 🎨 TODOs für UI-Agent (mora-ui)

### UI-01: Node Detail Panel Integration
**Priorität:** HIGH

- [ ] `moraState.ts`: `selectedNodeId` State hinzufügen
- [ ] `FolderLayer.tsx`: Node Click → State setzen
- [ ] `MoraShell.tsx`: NodeDetailPanel conditional rendern
- [ ] `NodeDetailPanel.tsx`: Props von State laden
- [ ] Markdown-Rendering für `content` Field
- [ ] Tests: Click auf Node → Panel öffnet sich

**Erwartetes Ergebnis:**
- Click auf Node → Detail Panel slide-in von rechts
- Zeigt: Title, Type, Content (Markdown), Metadata, URL
- "Close" Button schließt Panel

---

### UI-02: Chat AI Integration
**Priorität:** HIGH

- [ ] Chat-Provider wählen (Gemini? Claude? Local?)
- [ ] API-Key in `.env.local` (NEXT_PUBLIC_AI_API_KEY)
- [ ] `ChatDock.tsx`: AI-Backend anbinden
- [ ] Context aus `moraState` (aktiver Space, Folder, Node)
- [ ] Streaming-Antworten (SSE oder Polling)
- [ ] Tests: "Zeige alle Nodes im Folder X"

**Erwartetes Ergebnis:**
- Chat-Eingabe → AI antwortet kontextbezogen
- Zeigt aktiven Pfad (Department → Space → Folder)
- Kann Daten aus Core API nutzen

---

### UI-03: Search & Filters
**Priorität:** MEDIUM

- [ ] Global Search Component (Header)
- [ ] Search Endpoint: Core API `/v1/search?q=...` (falls nicht existiert: Core-Agent)
- [ ] Tag-Filter in SpaceLayer / FolderLayer
- [ ] Type-Filter (document, task, note, link)
- [ ] Date Range Filter

**Erwartetes Ergebnis:**
- Header-Search durchsucht alle Nodes
- Filter reduzieren angezeigte Nodes

---

### UI-04: Edit/Delete Operations
**Priorität:** LOW

- [ ] Edit-Modal für Spaces/Folders/Nodes
- [ ] DELETE Endpoints in Core API (Core-Agent)
- [ ] UPDATE Endpoints in Core API (Core-Agent)
- [ ] Confirmation-Dialog vor Delete
- [ ] Optimistic UI Updates (Zustand)

**Erwartetes Ergebnis:**
- Right-Click → Edit/Delete
- Änderungen persistieren in Core API

---

### UI-05: Performance-Optimierung
**Priorität:** LOW

- [ ] OrganicBackground: Breathing Animation nur on-hover (nicht permanent)
- [ ] Virtual Scrolling für große Node-Listen (>100 Items)
- [ ] React.memo für Layer-Components
- [ ] Lazy Loading für NodeDetailPanel

**Erwartetes Ergebnis:**
- UI bleibt flüssig bei 1000+ Nodes

- [ ] `ops/backup/README.md` analysieren
- [ ] Cron-Jobs dokumentieren (falls vorhanden)
- [ ] PostgreSQL Backup-Script testen
- [ ] Restore-Test durchführen (Backup → neue DB)
- [ ] Redis Backup (falls nötig)
- [ ] n8n Workflows Backup (JSON-Export)

**Erwartetes Ergebnis:**
- Tägliche Backups automatisiert
- Restore-Runbook dokumentiert

---

### INFRA-03: CI/CD Pipeline
**Priorität:** MEDIUM

- [ ] GitHub Actions Workflow erstellen
- [ ] Automated Smoke-Tests im CI
- [ ] Docker Build + Push (Docker Hub? GitHub Packages?)
- [ ] Deploy-Script für Hetzner VPS (optional)

**Erwartetes Ergebnis:**
- PR → CI läuft Tests
- Main Branch → Auto-Deploy (optional)

---

### INFRA-04: Grafana Dashboards
**Priorität:** LOW

- [ ] Prometheus aktivieren (Core-Agent: METRICS_ENABLED=true)
- [ ] Grafana Container in docker-compose.yml
- [ ] Dashboard: Core API (Requests, Errors, Latency)
- [ ] Dashboard: PostgreSQL (Connections, Query Time)
- [ ] Dashboard: Upload/Audit (Rate Limits, Storage)

**Erwartetes Ergebnis:**
- Grafana @ :3000
- Dashboards zeigen Metriken in Echtzeit

---

### INFRA-05: Voice-System Harmonisierung
**Priorität:** LOW

- [ ] `voice-realtime/` ENV-Variablen mit Core synchronisieren
- [ ] Shared `.env` Management (dotenv-vault?)
- [ ] Voice-Deployment-Skripte dokumentieren
- [ ] Twilio Stats Monitoring

**Erwartetes Ergebnis:**
- Konsistente Configs zwischen Core + Voice
- Ein zentrales ENV-Management

---

## 🔍 Konsistenz-Checks (Supervisor sollte prüfen)

### CHECK-01: API-Kontrakt Core ↔ UI
**Status:** ✅ Aktuell konsistent (Stand: 2025-11-24)

- [✓] `/v1/departments` → CoreLayer (✅ funktioniert)
- [✓] `/v1/spaces?department_id=...` → DepartmentLayer (✅ funktioniert)
- [✓] `/v1/folders?space_id=...` → SpaceLayer (✅ funktioniert)
- [✓] `/v1/nodes?folder_id=...` → FolderLayer (✅ funktioniert)
- [✓] `/v1/tree` → TreeSidebar (✅ funktioniert)

**Bei Änderungen:**
- [ ] Core-Agent: API-Change → Update CORE_MASTER.md
- [ ] UI-Agent: Types aktualisieren (`lib/types/core.ts`)
- [ ] Supervisor: Beide Agents koordinieren

---

### CHECK-02: Auth & JWT
**Status:** ✅ Konsistent

- [✓] Core: `MORA_JWT_SECRET` in `.env`
- [✓] UI: `NEXT_PUBLIC_SAIMOR_CORE_JWT` in `.env.local`
- [✓] Token-Format: HS256, Claims (sub, role, tenant)

**Bei Änderungen:**
- [ ] Neue Claims → Core + UI synchronisieren
- [ ] Secret-Rotation → Beide `.env` Files updaten

---

### CHECK-03: CORS Origins
**Status:** ⚠️ Leichte Inkonsistenz

**Core erlaubt (app.py):**
- `http://localhost:3002` (mora-ui OLD PORT)
- `http://localhost:3005` (mora-ui NEW PORT)
- `https://*.trycloudflare.com` (Tunnels)

**UI läuft auf:**
- `http://localhost:3002` (npm run dev)

**TODO:**
- [ ] UI-Port standardisieren (:3002 oder :3005?)
- [ ] Core CORS-Liste cleanup (siehe CORE-03)

---

## 🚨 Offene Fragen / Blockers

### BLOCKER-01: Real-Revenue Auth
**Status:** BLOCKED  
**Owner:** Infra-Agent (+ Core-Agent)

**Problem:**
- PostgreSQL Auth verhindert externe Verbindungen
- `USE_REAL_REVENUE=false` bleibt Default

**Resolution Needed:**
- Infra-Agent: Auth-Methode klären
- Core-Agent: Real-Adapter aktivieren
- Supervisor: Status tracken

---

### QUESTION-01: Chat AI Provider
**Status:** OPEN  
**Owner:** UI-Agent (+ User-Entscheidung)

**Frage:**
- Welcher Provider? (Gemini, Claude, Ollama, Mistral)
- API-Key Management? (Env-Var vs. User-Input)
- Kosten-Limit? (Rate Limiting)

**Resolution Needed:**
- User: Provider wählen
- UI-Agent: Integration implementieren

---

### QUESTION-02: n8n Waitlist Workflow
**Status:** OPEN  
**Owner:** Infra-Agent

**Frage:**
- Existiert `https://n8n.voice.saimor.world/webhook/waitlist`?
- Oder muss Workflow erst erstellt werden?

**Resolution Needed:**
- Infra-Agent: n8n prüfen + dokumentieren

---

## 🎯 Empfohlene Reihenfolge

### Phase A: Core-Agent-Durchlauf (1 Tag)
1. CORE-01: Real-Revenue-Aktivierung (BLOCKED → lösen)
2. CORE-03: CORS-Cleanup
3. CORE-04: Node Detail Endpoint verifizieren
4. CORE-02: Embedding-Harmonisierung (falls Zeit)

### Phase B: UI-Agent-Durchlauf (1-2 Tage)
1. UI-01: Node Detail Panel Integration
2. UI-02: Chat AI Integration (Provider nötig)
3. UI-03: Search & Filters (falls Core Search-Endpoint existiert)
4. UI-05: Performance-Optimierung

### Phase C: Infra-Agent-Durchlauf (2-3 Tage)
1. INFRA-01: n8n Workflows dokumentieren
2. INFRA-02: Backup-Automation
3. INFRA-03: CI/CD Pipeline
4. INFRA-04: Grafana Dashboards (Koordination mit Core)

---

## ✅ Abnahme-Kriterien

### Core-Durchlauf erfolgreich wenn:
- [ ] Real-Revenue funktioniert (oder klar dokumentiert warum nicht)
- [ ] CORS-Liste < 5 Einträge
- [ ] Node Detail Endpoint getestet
- [ ] CORE_MASTER.md aktualisiert

### UI-Durchlauf erfolgreich wenn:
- [ ] Node Detail Panel integriert + funktioniert
- [ ] Chat AI antwortet (auch wenn nur Mock)
- [ ] Search funktioniert (oder als TODO für Core markiert)
- [ ] INTEGRATION_STATUS.md aktualisiert

### Infra-Durchlauf erfolgreich wenn:
- [ ] n8n Workflows dokumentiert (mind. 3 Flows)
- [ ] Backup-Automation validiert
- [ ] CI/CD läuft (oder Rollout-Plan dokumentiert)
- [ ] INFRA_NOTES.md vollständig

---

**Last Updated:** 2025-11-25  
**Next Review:** Nach jedem Agenten-Durchlauf  
**Owner:** Supervisor-Agent
