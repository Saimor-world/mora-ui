# Pre-Demo Checklist - KI Garage Heilbronn (Januar 2026)

**Letzte Aktualisierung:** 2025-11-25
**Ziel:** Sicherstellen, dass SAIMÔR Demo-Ready ist

---

## ✅ Pre-Demo Checklist (15 Min vor Demo)

### 🔧 1. System Setup

#### Core API (Port 8081)

- [ ] **Core läuft**
  ```bash
  cd c:\saimor\saimor-core
  python core/app.py
  ```
  - Erwartung: Server startet ohne Fehler
  - Port 8081 ist frei

- [ ] **Health Check bestanden**
  ```bash
  curl http://localhost:8081/health
  ```
  - Erwartung: `{"status": "healthy", ...}`

- [ ] **Core Logs sauber**
  ```bash
  tail -n 20 c:\saimor\saimor-core\core\core.log
  ```
  - Keine kritischen Errors
  - Keine Connection-Probleme

#### UI (Port 3002)

- [ ] **UI läuft**
  ```bash
  cd c:\saimor\mora-ui
  npm run dev
  ```
  - Erwartung: Dev Server startet ohne Fehler
  - Port 3002 ist frei

- [ ] **UI erreichbar**
  - Browser öffnen: `http://localhost:3002`
  - Seite lädt ohne Errors
  - TreeDock ist sichtbar

- [ ] **Browser Console sauber**
  - F12 öffnen → Console Tab
  - Keine kritischen Errors (404, 500, CORS)
  - Warnings sind OK

---

### 📊 2. Demo-Daten geladen

#### Daten seeden

- [ ] **Demo-Daten-Script ausgeführt**
  ```bash
  cd c:\saimor\saimor-core
  python scripts/seed_demo_data.py
  ```
  - Erwartung: "✅ DEMO DATA SEEDING COMPLETE!"

- [ ] **Daten in DB vorhanden**
  ```bash
  curl -s http://localhost:8081/v1/departments | python -m json.tool
  ```
  - Erwartung: 3 Departments (Operations, Strategy, Research)

- [ ] **Spaces geladen**
  ```bash
  curl -s http://localhost:8081/v1/spaces | python -c "import sys,json; print('Spaces:', len(json.load(sys.stdin)['data']))"
  ```
  - Erwartung: ~16 Spaces

- [ ] **Folders geladen**
  ```bash
  curl -s http://localhost:8081/v1/folders | python -c "import sys,json; print('Folders:', len(json.load(sys.stdin)['data']))"
  ```
  - Erwartung: ~80 Folders

- [ ] **Nodes geladen**
  ```bash
  curl -s http://localhost:8081/v1/nodes?limit=100 | python -c "import sys,json; print('Nodes:', len(json.load(sys.stdin)['data']))"
  ```
  - Erwartung: ~80 Nodes

---

### 🧠 3. Mindloop Synthesis funktioniert

- [ ] **Mindloop Events vorhanden**
  ```bash
  curl -s http://localhost:8081/v1/mindloop/events | python -c "import sys,json; print('Events:', len(json.load(sys.stdin)['events']))"
  ```
  - Erwartung: ~20 Events

- [ ] **Synthesis Endpoint erreichbar**
  ```bash
  curl -s http://localhost:8081/v1/mindloop/synthesis | python -m json.tool | head -20
  ```
  - Erwartung: Synthesis Items (context_shift, potential_risk, etc.)

---

### 🌐 4. UI Funktionalität

#### TreeDock

- [ ] **TreeDock zeigt Departments**
  - Browser: `http://localhost:3002`
  - TreeDock (linke Sidebar) zeigt:
    - 🔧 Operations
    - 🎯 Strategy
    - 🔬 Research

- [ ] **Department expandierbar**
  - Click auf "Operations"
  - Spaces erscheinen (Infrastructure, Customer Support, etc.)

- [ ] **Space expandierbar**
  - Click auf "Infrastructure"
  - Folders erscheinen (Docker Configs, Kubernetes, etc.)

- [ ] **Folder clickable**
  - Click auf "Docker Configs"
  - DetailDock (rechts) zeigt Folder-Details

#### ChatDock

- [ ] **ChatDock öffnet**
  - Button "ChatDock" oder Sidebar-Toggle
  - ChatDock Panel erscheint

- [ ] **ChatDock Query funktioniert**
  - Eingabe: "Show me all documents"
  - Erwartung: Ergebnisliste erscheint

#### DetailDock

- [ ] **DetailDock zeigt Node-Details**
  - Click auf einen Node im Tree
  - DetailDock zeigt:
    - Node Name
    - Type (document/task/note/link)
    - Metadata

#### Mindloop Panel

- [ ] **Mindloop Panel öffnet**
  - Navigation: "Mindloop" Tab
  - Panel zeigt Event-Timeline

- [ ] **Events sichtbar**
  - Events vom Typ:
    - Context Shift
    - Potential Risk
    - Related Objects Cluster
    - Awareness

---

### 🧪 5. Smoke-Tests bestanden

- [ ] **Alle Critical Endpoints OK**
  ```bash
  cd c:\saimor\saimor-core
  export SMOKE_JWT=$(python scripts/get_dev_jwt.py)
  ./scripts/smoke_core.sh
  ```
  - Erwartung:
    - `[smoke][OK]` für alle Endpoints
    - Keine `[smoke][WARN]` für Critical Endpoints:
      - `/health`
      - `/v1/tree`
      - `/v1/departments`
      - `/v1/spaces`
      - `/v1/folders`
      - `/v1/nodes`
      - `/v1/mindloop/synthesis`

- [ ] **Summary: OK Count**
  - Mindestens 20+ OK-Checks
  - 0-2 WARN-Checks akzeptabel (non-critical)

---

### 🖥️ 6. Präsentation vorbereitet

#### Browser Setup

- [ ] **Chrome/Edge geöffnet**
  - URL: `http://localhost:3002`
  - Fullscreen-Mode (F11) für cleane Ansicht

- [ ] **DevTools geschlossen**
  - F12 drücken um sicherzustellen, dass DevTools zu ist

- [ ] **Zoom auf 100%**
  - Ctrl+0 drücken

#### Backup Browser Tab

- [ ] **Zweiter Tab: Core Health**
  - URL: `http://localhost:8081/health`
  - Falls UI Probleme hat, kann Core direkt gezeigt werden

#### Demo-Flow Dokument griffbereit

- [ ] **DEMO_FLOW.md geöffnet**
  - Path: `c:\saimor\infranaut\DEMO_FLOW.md`
  - Als Referenz während Demo

---

### 📱 7. Kommunikation & Backup

- [ ] **Internet-Verbindung stabil**
  - Falls externe APIs genutzt werden (n8n, Qdrant)

- [ ] **Laptop Akku geladen**
  - Mindestens 80% Akku

- [ ] **Backup-Plan bereit**
  - Falls Core crasht: Restart-Script bereit
    ```bash
    cd c:\saimor\saimor-core && python core/app.py
    ```
  - Falls UI crasht: Restart-Script bereit
    ```bash
    cd c:\saimor\mora-ui && npm run dev
    ```

- [ ] **Screenshots vorhanden (optional)**
  - Falls Live-Demo fehlschlägt, Screenshots als Fallback
  - Speicherort: `c:\saimor\infranaut\demo-screenshots\`

---

## 🚨 Quick Troubleshooting

### Problem: Core antwortet nicht

**Lösung:**
```bash
# Check Port
netstat -ano | findstr :8081

# Logs prüfen
tail -n 50 c:\saimor\saimor-core\core\core.log

# Neu starten
cd c:\saimor\saimor-core
python core/app.py
```

### Problem: UI lädt nicht

**Lösung:**
```bash
# Check Port
netstat -ano | findstr :3002

# Neu starten
cd c:\saimor\mora-ui
npm run dev
```

### Problem: Keine Daten sichtbar

**Lösung:**
```bash
# Daten neu seeden
cd c:\saimor\saimor-core
python scripts/seed_demo_data.py

# Check DB
curl http://localhost:8081/v1/departments
```

### Problem: Mindloop Events leer

**Ursache:** In-memory Store wurde geleert (Core-Restart)

**Lösung:**
```bash
# Daten neu seeden (generiert neue Events)
python scripts/seed_demo_data.py
```

---

## ✅ Final Check (2 Min vor Demo)

### Quick Test-Flow

1. **Browser öffnen:** `http://localhost:3002`
2. **TreeDock:** Click "Operations" → "Infrastructure" → "Docker Configs"
3. **DetailDock:** Zeigt Folder-Details
4. **ChatDock:** Query "Show me all documents" → Ergebnisse erscheinen
5. **Mindloop:** Tab öffnen → Events sichtbar

### All Systems Green?

- [ ] **Core:** ✅ Healthy
- [ ] **UI:** ✅ Lädt
- [ ] **Data:** ✅ Geladen
- [ ] **Mindloop:** ✅ Events vorhanden
- [ ] **Smoke-Tests:** ✅ Bestanden

---

## 🎉 Ready für Demo!

**Wenn alle Checkboxen ✅ sind → Demo kann starten!**

**Demo-Flow:** Siehe `DEMO_FLOW.md`

---

**Viel Erfolg! 🚀**
