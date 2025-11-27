# SAIMÔR Demo Flow (KI Garage Heilbronn - Januar 2026)

**Letzte Aktualisierung:** 2025-11-25
**Zielgruppe:** KI Garage Heilbronn
**Demo-Dauer:** 10-15 Minuten

---

## 🎯 Demo-Ziel

Zeigen der **SAIMÔR Core + UI Integration** mit:
- Tree-basierte Navigation (Departments → Spaces → Folders → Nodes)
- ChatDock (AI Query Interface)
- Mindloop Synthesis (Intelligence Layer)

---

## 🛠️ Pre-Demo Setup (15 Min vor Demo)

### 1. Services starten

```bash
# Core API starten (Port 8081)
cd c:\saimor\saimor-core
python core/app.py

# UI starten (Port 3002)
cd c:\saimor\mora-ui
npm run dev
```

### 2. Demo-Daten laden

```bash
# Demo-Testdaten in DB seeden
cd c:\saimor\saimor-core
python scripts/seed_demo_data.py
```

**Erwartetes Ergebnis:**
- Core läuft auf `http://localhost:8081`
- UI läuft auf `http://localhost:3002`
- Demo-Daten geladen:
  - 3 Departments (Operations, Strategy, Research)
  - 16 Spaces
  - 80 Folders
  - 80 Nodes
  - 20 Mindloop Events

### 3. Health Check

```bash
# Core Health Check
curl http://localhost:8081/health

# Response:
# {"status": "healthy", "timestamp": "..."}
```

### 4. Browser vorbereiten

- Chrome/Edge öffnen
- URL: `http://localhost:3002`
- DevTools geschlossen (saubere Ansicht)

---

## 📋 Demo Flow (10-15 Min)

### **Schritt 1: Intro & Context (1 Min)**

> "SAIMÔR ist ein Knowledge Management System mit AI Intelligence Layer.
> Wir zeigen heute drei Hauptkomponenten:
> 1. Tree-basierte Navigation
> 2. ChatDock für AI-Queries
> 3. Mindloop Synthesis - unsere Intelligence Layer"

---

### **Schritt 2: Navigation - Tree Exploration (3 Min)**

**2.1 Departments (Orbs) anzeigen**

- UI öffnen: `http://localhost:3002`
- Linke Sidebar: **TreeDock** zeigt Root-Ebene
- Erklären: "Das ist unsere Top-Level-Struktur - Departments"

**Sichtbar:**
- 🔧 Operations (blau)
- 🎯 Strategy (lila)
- 🔬 Research (grün)

**2.2 Space (Galaxy) öffnen**

- Click: **Operations** → expandiert
- Zeigen: Sub-Spaces
  - ⚙️ Infrastructure
  - 💬 Customer Support
  - ✓ Quality Assurance
  - 🔒 Security
  - 📊 Monitoring

**Erklären:**
> "Jedes Department hat mehrere Spaces - das sind thematische Arbeitsbereiche"

**2.3 Folder öffnen**

- Click: **Infrastructure** → expandiert
- Zeigen: Folders
  - 📁 Docker Configs
  - 📁 Kubernetes
  - 📁 CI/CD Pipelines
  - 📁 Backup Scripts
  - 📁 Monitoring Dashboards

**Erklären:**
> "Spaces enthalten Folders - die eigentlichen Container für Dokumente"

**2.4 Folder-Detail anzeigen**

- Click: **Docker Configs**
- Rechter Panel: **DetailDock** zeigt Folder-Metadaten
- Zeigen:
  - Folder Name, Description
  - Creation Date
  - Number of Nodes

---

### **Schritt 3: Node Detail (2 Min)**

**3.1 Node auswählen**

- Im TreeDock: Click auf einen **Node** (z.B. ein Document oder Task)
- DetailDock zeigt:
  - Node Name
  - Type (document/task/note/link)
  - Content Preview
  - Metadata (tags, assignee, status)

**Erklären:**
> "Nodes sind die eigentlichen Arbeitselemente - Dokumente, Tasks, Notes oder Links"

**3.2 Node-Typen zeigen**

- Navigieren zu verschiedenen Nodes:
  - **Document:** "Q4 2025 Performance Report"
  - **Task:** "Implement new authentication flow"
  - **Note:** "Meeting notes from sprint retrospective"
  - **Link:** "https://github.com/saimor/core"

---

### **Schritt 4: ChatDock - AI Query (3 Min)**

**4.1 ChatDock öffnen**

- Button: **ChatDock Toggle** (rechts oben oder Sidebar)
- ChatDock öffnet sich (rechte Sidebar oder Modal)

**Erklären:**
> "ChatDock ist unser AI Query Interface - hier können Nutzer Fragen stellen
> und das System durchsuchen"

**4.2 Demo-Query ausführen**

**Query 1: Einfache Suche**
```
"Show me all documents about infrastructure"
```

**Erwartetes Ergebnis:**
- Liste von Nodes aus Infrastructure-Folders
- Clickable Links zu Nodes

**Query 2: Contextual Query**
```
"What tasks are overdue in Operations?"
```

**Erwartetes Ergebnis:**
- Filtered Tasks mit Status "overdue"
- Grouped by Folder

**Query 3: Cross-Space Query**
```
"Find all notes about AI research"
```

**Erwartetes Ergebnis:**
- Nodes aus verschiedenen Spaces (Research, Strategy)
- Semantic Search Results

**Erklären:**
> "Das System versteht Context - es kann über Spaces hinweg suchen
> und semantisch relevante Ergebnisse liefern"

---

### **Schritt 5: Mindloop Synthesis (4 Min)**

**5.1 Mindloop Panel öffnen**

- Navigation: **Mindloop** Tab (oder Button)
- Panel zeigt: **Synthesis View**

**Erklären:**
> "Mindloop ist unsere Intelligence Layer. Sie analysiert kontinuierlich
> die Aktivitäten im System und generiert Insights"

**5.2 Synthesis Events zeigen**

**Sichtbar:**
- Event Timeline (neueste zuerst)
- Event Types:
  - 🔄 **Context Shift:** "Detected shift in team focus: increased activity in AI Research space"
  - ⚠️ **Potential Risk:** "High number of overdue tasks in Infrastructure folder"
  - 🔗 **Related Objects Cluster:** "Found 5 related documents about similar topic"
  - 💡 **Awareness:** "Multiple teams working on similar problems - potential for collaboration"

**5.3 Event-Detail zeigen**

- Click auf ein Event
- DetailDock zeigt:
  - Event Type
  - Timestamp
  - Description
  - Affected Spaces/Folders
  - Confidence Score
  - Recommended Action

**Erklären:**
> "Mindloop erkennt Muster und gibt Empfehlungen - z.B. wenn mehrere Teams
> an ähnlichen Themen arbeiten, wird Kollaboration vorgeschlagen"

**5.4 Context Shift demonstrieren**

- Event: "Detected shift in team focus: increased activity in AI Research"
- Click: **View affected spaces**
- System navigiert automatisch zu AI Research Space

**Erklären:**
> "Das System erkennt, wo gerade die Aktivität hoch ist und hilft beim
> Fokussieren auf relevante Bereiche"

---

### **Schritt 6: Full Workflow Demo (2 Min)**

**Scenario: Product Manager sucht Infos für Demo-Vorbereitung**

1. **Start:** ChatDock Query: "Show me all tasks for KI Garage demo"
2. **Result:** Liste von Tasks aus verschiedenen Spaces
3. **Action:** Click auf Task → DetailDock zeigt Details
4. **Mindloop:** Zeigt Event "Potential Risk: Demo preparation deadline approaching"
5. **Navigation:** Automatisch zu relevanten Spaces navigieren
6. **Result:** Alle relevanten Infos auf einen Blick

**Erklären:**
> "So sieht ein typischer Workflow aus - von Query über Navigation
> bis hin zu AI-gestützten Insights"

---

## 🎬 Demo-Abschluss (1 Min)

**Key Takeaways:**

1. **Tree-Navigation:** Intuitiv durch Departments → Spaces → Folders → Nodes
2. **ChatDock:** AI-powered Search & Query Interface
3. **Mindloop:** Intelligence Layer mit Context Detection und Recommendations

**Next Steps:**

> "Das System ist Production-Ready und läuft bereits bei SAIMÔR.
> Weitere Features in Planung:
> - Real-time Collaboration
> - Advanced Semantic Search (Qdrant)
> - n8n Workflow Integration"

---

## 🐛 Troubleshooting

### Problem: UI lädt nicht

**Lösung:**
```bash
# Check ob Port 3002 frei ist
netstat -ano | findstr :3002

# UI neu starten
cd c:\saimor\mora-ui
npm run dev
```

### Problem: Core API antwortet nicht

**Lösung:**
```bash
# Health Check
curl http://localhost:8081/health

# Logs prüfen
cd c:\saimor\saimor-core\core
cat core.log

# Neu starten
python app.py
```

### Problem: Keine Demo-Daten sichtbar

**Lösung:**
```bash
# Daten neu seeden
cd c:\saimor\saimor-core
python scripts/seed_demo_data.py

# Check DB
sqlite3 core/data/saimor.db "SELECT COUNT(*) FROM departments;"
```

### Problem: ChatDock zeigt keine Ergebnisse

**Ursache:** Möglicherweise keine Nodes in DB oder Tenant-ID falsch

**Lösung:**
```bash
# Check Tenant in DB
sqlite3 core/data/saimor.db "SELECT DISTINCT tenant_id FROM nodes;"

# Sollte "saimor_demo" sein
```

---

## 📸 Screenshots (Optional)

**Vor Demo:**
1. Screenshot: TreeDock mit allen Departments
2. Screenshot: DetailDock mit Node-Details
3. Screenshot: ChatDock mit Demo-Query
4. Screenshot: Mindloop Synthesis Panel

**Speicherort:** `c:\saimor\infranaut\demo-screenshots\`

---

## 📊 Metrics & Stats

**Nach Demo prüfen:**

```bash
# API Requests
curl http://localhost:8081/v1/stats

# Mindloop Events
curl http://localhost:8081/v1/mindloop/events | jq '.data | length'

# Node Count
curl http://localhost:8081/v1/nodes | jq '.data | length'
```

---

**Ende der Demo** 🎉
