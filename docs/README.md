# infranaut/ – Meta-Schicht

**Stand:** 2025-11-25  
**Zweck:** Orchestrierungs- und Infrastruktur-Dokumentation für den SAIMÔR Workspace

---

## 📂 Was ist infranaut/?

Dieser Ordner dient als **Meta-Schicht** über den beiden Hauptrepos:
- `saimor-core/` → Backend (FastAPI, Multi-Tenant, Mindloop)
- `mora-ui/` → Frontend (Next.js 15, Mycelium UI)

**infranaut/** ist die **Read-Only Zone** für Supervisor-Agenten:
- Analysiert beide Repos ohne Code-Änderungen
- Dokumentiert Architektur, Infra, DevOps
- Plant Cross-Repo-Änderungen
- Koordiniert Worker-Agenten (Core-Agent, UI-Agent, Infra-Agent)

---

## 📄 Dateien

### 1. WORKSPACE_MAP.md
**Übersicht** über die drei Haupt-Bereiche:
- saimor-core (Backend: FastAPI, PostgreSQL, Mind Loop)
- mora-ui (Frontend: Next.js, Zustand, Mycelium Design)
- infranaut (Meta: Docs, Orchestrierung, TODOs)

**Zeigt:**
- Tech-Stacks
- Datenfluss (API-Endpoints)
- Zusammenhänge
- Was funktioniert gut / Was ist offen

---

### 2. AGENT_ORCHESTRATION.md
**Agenten-Setup** für zukünftige Durchläufe:
- Supervisor-Agent (Planung, Read-Only über alles)
- Core-Agent (Backend-Entwicklung in saimor-core)
- UI-Agent (Frontend-Entwicklung in mora-ui)
- Infra-Agent (DevOps in ops/ + infranaut/)

**Enthält:**
- Prompt-Templates für jeden Agenten
- Koordinations-Regeln
- Beispiel-Workflows
- Best Practices

---

### 3. INFRA_NOTES.md
**DevOps-Sammlung** aus saimor-core:
- Docker & Container-Setup (PostgreSQL, Redis, Qdrant, n8n)
- Production Server (Hetzner VPS, Caddy, Voice-System)
- n8n Workflows (Knowledge Sync, Learning Brain, Waitlist)
- Backup & Persistence
- Secrets Management
- Monitoring & Observability
- **Offene Risiken** (CORS, Auth-Blocker, n8n-Doku)

**Zweck:** Infra-Agent bekommt kompletten Überblick ohne Code zu ändern

---

### 4. TODO_SUPERVISOR.md
**Zentrale Aufgaben-Liste** für Worker-Agenten:
- TODOs für **Core-Agent** (Real-Revenue, CORS, Embeddings)
- TODOs für **UI-Agent** (Node Detail Panel, Chat AI, Search)
- TODOs für **Infra-Agent** (n8n-Docs, Backups, CI/CD)
- **Konsistenz-Checks** (API-Kontrakt, Auth, CORS)
- **Offene Fragen / Blocker**
- **Empfohlene Reihenfolge** (Phase A/B/C)

**Format:** `[ ]` Offen, `[✓]` Erledigt, `[!]` Blockiert

---

## 🎯 Wie nutzt man infranaut/?

### Als Mensch (Developer/PM)
1. **Start:** Lies `WORKSPACE_MAP.md` → Gesamtüberblick
2. **Planung:** Check `TODO_SUPERVISOR.md` → Was steht an?
3. **DevOps:** Check `INFRA_NOTES.md` → Was läuft wie?
4. **Agenten:** Check `AGENT_ORCHESTRATION.md` → Wie läuft ein Durchlauf?

### Als Supervisor-Agent
1. **Initialisierung:** Erstelle/update diese vier Dateien
2. **Analyse:** Lese saimor-core + mora-ui (READ-ONLY)
3. **Planung:** Fülle `TODO_*.md` mit konkreten Aufgaben
4. **Koordination:** Worker-Agenten abarbeiten TODOs

### Als Worker-Agent (Core/UI/Infra)
1. **Input:** Lese `TODO_[DEIN_BEREICH].md`
2. **Arbeit:** Implementiere Aufgaben in deinem Repo
3. **Output:** Update Status (`[✓]` in TODO)
4. **Feedback:** Schreibe neue Blocker/Fragen zurück

---

## 🔒 Regeln

### Was darf in infranaut/ geschrieben werden?
- ✅ Meta-Docs (WORKSPACE_MAP, AGENT_ORCHESTRATION)
- ✅ Infra-Notizen (INFRA_NOTES)
- ✅ TODOs (TODO_SUPERVISOR, TODO_CORE, TODO_UI, TODO_INFRA)
- ✅ Blocker/Fragen-Dateien (BLOCKERS.md, QUESTIONS.md)

### Was NICHT?
- ❌ Kein Produktions-Code (→ saimor-core oder mora-ui)
- ❌ Keine ENV-Files mit Secrets (→ nur .example)
- ❌ Keine Duplikation von Code-Docs (Core hat CORE_MASTER.md)

---

## 🛠️ Typische Workflows

### Workflow 1: Neuer Durchlauf starten
```bash
# Supervisor-Agent aktiviert
# 1. WORKSPACE_MAP.md refreshen (falls nötig)
# 2. TODO_SUPERVISOR.md neue Tasks einfügen
# 3. User entscheidet: Welcher Worker-Agent soll ran?
```

### Workflow 2: Core-Feature implementieren
```bash
# User: "Aktiviere Real-Revenue"
# Supervisor: Check TODO_SUPERVISOR.md → CORE-01
# Core-Agent aktiviert → liest TODO → implementiert → committed
# Supervisor: Update TODO [✓], WORKSPACE_MAP falls Architektur-Änderung
```

### Workflow 3: Cross-Repo-Feature
```bash
# User: "Implementiere Search"
# Supervisor: Analyse → braucht Core-Endpoint + UI-Component
# 1. Core-Agent: Endpoint `/v1/search` implementieren
# 2. UI-Agent: Search-Component + Integration
# 3. Supervisor: Konsistenz-Check (API-Kontrakt)
```

---

## 📊 Status (2025-11-25)

### Initialisierung ✅
- [✓] `WORKSPACE_MAP.md` erstellt (Gesamt-Überblick)
- [✓] `AGENT_ORCHESTRATION.md` erstellt (Agenten-Setup)
- [✓] `INFRA_NOTES.md` erstellt (DevOps-Sammlung)
- [✓] `TODO_SUPERVISOR.md` erstellt (Aufgaben-Liste)
- [✓] `README.md` erstellt (diese Datei)

### Analyse ✅
- [✓] saimor-core analysiert (READ-ONLY)
- [✓] mora-ui analysiert (READ-ONLY)
- [✓] CORE_MASTER.md gelesen
- [✓] INTEGRATION_STATUS.md gelesen
- [✓] Tech-Stacks dokumentiert

### Erkenntnisse ✅
- ✅ **Gut:** Klare Trennung Backend/Frontend, moderne Stacks
- ✅ **Gut:** Intelligence Layer (Phase F complete)
- ✅ **Gut:** UI vollständig integriert (Alpha Centauri Dataset)
- ⚠️ **Offen:** Real-Revenue blockiert (Auth-Problem)
- ⚠️ **Offen:** Node Detail Panel (Component da, nicht integriert)
- ⚠️ **Offen:** Chat AI (UI bereit, Backend fehlt)
- ⚠️ **Offen:** Infra-Cleanup (n8n-Doku, CORS, Backups)

---

## 🎯 Nächste Schritte

### Empfohlene Durchläufe
1. **Core-Agent** → Real-Revenue + CORS-Cleanup (1 Tag)
2. **UI-Agent** → Node Detail Panel + Chat AI (1-2 Tage)
3. **Infra-Agent** → n8n-Docs + Backups + CI/CD (2-3 Tage)

### Siehe auch
- `TODO_SUPERVISOR.md` für detaillierte Aufgaben
- `WORKSPACE_MAP.md` für Gesamt-Kontext
- `AGENT_ORCHESTRATION.md` für Prompt-Templates

---

**Owner:** Supervisor-Agent  
**Last Updated:** 2025-11-25  
**Version:** 1.0.0
