# PROMPT: Infra-Agent für SAIMÔR (Phase G)

**Datum:** 2025-11-25  
**Phase:** G - Demo-Vorbereitung & Stabilität

---

## 🎯 Deine Rolle

Du bist der **Infra-Agent** für SAIMÔR DevOps.

**WICHTIG:** Du arbeitest **NUR** in `c:\saimor\saimor-core\ops\` und `c:\saimor\infranaut\`

---

## 📊 IST-STAND (Phase F Complete)

### Was bereits läuft ✅
- **Core API:** :8081 (healthy)
- **PostgreSQL 16:** :5432
- **Redis 7:** :6379
- **Qdrant 1.7.4:** :6333
- **n8n:** :5678 (lokal), Production @ voice.saimor.world
- **Caddy:** :80/:443 (Production)

### Dokumentation ✅
- `infranaut/INFRA_NOTES.md` → n8n Workflows dokumentiert (18.8 KB)
- `saimor-core/ops/n8n-voice/README.md` → Voice n8n Setup
- Docker-Compose läuft stabil

### Was FEHLT ❌
- **Demo-Testdaten:** Keine strukturierten Demo-Seeds
- **Monitoring:** Grafana/Prometheus nicht eingerichtet
- **CI/CD:** GitHub Actions nicht aktiv
- **Backup-Automation:** Unklar ob Cron läuft

---

## 📋 Deine Phase G Aufgaben

### G-03: Demo-Vorbereitung (KI Garage Heilbronn) 🎯 HIGH PRIORITY

**Ziel:** System für Demo (Januar 2026) vorbereiten

**Hintergrund:**
- UI läuft stabil (localhost:3002)
- Core läuft stabil (localhost:8081)
- Backend hat Mindloop (Intelligence Layer)
- Demo braucht: Präsentierbare Daten, stabiler Flow

**Tasks:**

1. **Demo-Testdaten erstellen**
   - Datei: `saimor-core/scripts/seed_demo_data.py` (NEU)
   - Erstelle:
     - 2-3 Departments ("Operations", "Strategy", "Research")
     - 5-7 Spaces pro Department
     - 10-20 Folders pro Space
     - 50-100 Nodes (verschiedene Typen: document, task, note)
   - Realistische Namen, Inhalte, Tags
   - Mindloop-Events generieren (context_shift, potential_risk)
   
2. **Demo-Flow dokumentieren**
   - Datei: `infranaut/DEMO_FLOW.md` (NEU)
   - Schritt-für-Schritt:
     1. Start Core + UI
     2. Navigate: ROOT → Department → Space → Folder
     3. ChatDock öffnen → AI-Query
     4. Node Detail Panel öffnen
     5. Mindloop Synthesis zeigen
   - Screenshots/Notizen für Präsentation

3. **Smoke-Tests erweitern**
   - Datei: `saimor-core/scripts/smoke_core.sh`
   - Teste alle Critical Endpoints:
     - `/health`
     - `/v1/tree`
     - `/v1/mindloop/synthesis`
     - `/v1/departments`, `/v1/spaces`, `/v1/folders`, `/v1/nodes`
   - Exit 1 wenn Fehler

4. **Pre-Demo Checklist**
   - Datei: `infranaut/PRE_DEMO_CHECKLIST.md` (NEU)
   - Checklist:
     - [ ] Core läuft (:8081)
     - [ ] UI läuft (:3002)
     - [ ] ChatDock funktioniert
     - [ ] Demo-Daten geladen
     - [ ] Mindloop Synthesis zeigt Daten
     - [ ] Keine Fehler in Logs

**Erwartetes Ergebnis:**
- Demo-Seeds funktionieren
- Demo-Flow dokumentiert
- Pre-Demo Checklist ready

---

### G-04: Backup-Automation validieren 💾 MEDIUM PRIORITY

**Ziel:** Backup-System prüfen/dokumentieren

**Tasks:**

1. **Backup-Scripts prüfen**
   - Check: `saimor-core/ops/backup/` existiert?
   - Welche Scripts?
   - PostgreSQL Backup-Skript testen

2. **Cron-Jobs dokumentieren**
   - Läuft Cron? (Check: `crontab -l`)
   - Oder Docker-basiert? (Ofelia, etc.)
   - Schedule dokumentieren

3. **Restore-Test**
   - Manual Restore durchführen
   - Dokumentieren: Restore-Runbook

**Erwartetes Ergebnis:**
- Backup-Automation validiert (oder Plan erstellt)
- Restore-Runbook dokumentiert

---

### G-05: Monitoring (optional) 📊 LOW PRIORITY

**Ziel:** Grafana/Prometheus einrichten (für später)

**Tasks:**

1. **Prometheus + Grafana in docker-compose.yml**
   - Services: `saimor-prometheus`, `saimor-grafana`
   - Ports: Prometheus :9090, Grafana :3000

2. **Core Metrics aktivieren**
   - ENV: `METRICS_ENABLED=true`
   - Endpoint: `/metrics`

3. **Dashboard erstellen**
   - Core API: Requests, Errors, Latency
   - PostgreSQL: Connections, Query Time

**Erwartetes Ergebnis:**
- Monitoring-Stack ready (oder Plan dokumentiert)

---

### G-06: CI/CD (optional) 🔄 LOW PRIORITY

**Ziel:** GitHub Actions einrichten (für später)

**Tasks:**

1. **CI Workflow**
   - Datei: `.github/workflows/ci.yml`
   - Steps: Lint, pytest, smoke-tests

2. **Trigger:** PR, Push to main

**Erwartetes Ergebnis:**
- CI-Pipeline läuft (oder Plan dokumentiert)

---

## 🔧 Development Workflow

### Start
```bash
cd c:\saimor\saimor-core
docker-compose ps  # Check running containers
```

### Test Demo-Seeds
```bash
cd c:\saimor\saimor-core
python scripts/seed_demo_data.py
```

### Smoke-Tests
```bash
cd c:\saimor\saimor-core
bash scripts/smoke_core.sh
```

---

## ✅ Erfolgs-Kriterien

Phase G Infra erfolgreich wenn:
- [ ] Demo-Testdaten funktionieren
- [ ] Demo-Flow dokumentiert
- [ ] Smoke-Tests grün
- [ ] Backup-Automation validiert
- [ ] Monitoring optional ready

---

## 📊 Output

Nach Abschluss:
1. **Files:** `DEMO_FLOW.md`, `PRE_DEMO_CHECKLIST.md`, `seed_demo_data.py`
2. **Docs:** `INFRA_NOTES.md` updated
3. **Test:** Demo-Flow durchlaufen

---

**Phase:** G (Demo-Vorbereitung)  
**Focus:** Stabilität, Testdaten, Demo-Flow  
**Bereit für:** KI Garage Heilbronn (Januar 2026)
