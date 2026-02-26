# SAIMÔR Workspace Map

**Stand:** 2025-11-25  
**Zweck:** Übersicht über die drei Haupt-Bereiche im SAIMÔR Workspace

---

## 🗺️ Workspace-Struktur

```
c:\saimor\
├── saimor-core/     ← Backend (FastAPI, Multi-Tenant, Mindloop)
├── mora-ui/         ← Frontend (Next.js 15, Mycelium UI)
└── infranaut/       ← Meta-Schicht (Docs, Orchestrierung, Infra)
```

---

## 1️⃣ saimor-core/ – Backend

### Zweck
Zentrales **FastAPI-Backend** für das Môra Organic OS:
- Multi-Tenant Business Intelligence API
- Semantic Intelligence Layer (Mindloop, Awareness)
- Action System (Revenue, Broadcasts, Email)
- PostgreSQL + Redis + Qdrant

### Tech-Stack
- **Framework:** FastAPI 0.115+
- **Python:** 3.11+
- **Datenbanken:** PostgreSQL 16, Redis 7, Qdrant 1.7.4
- **Auth:** JWT (HS256), RBAC (owner/team_member)
- **Infra:** Docker Compose, Caddy Reverse Proxy

### Rolle im System
- **API-Provider:** Liefert alle Daten für mora-ui (Departments, Spaces, Folders, Nodes)
- **Intelligence Engine:** Mind Loop Timeline, Semantic Events, Context Detection
- **Business Actions:** Revenue-Tracking, Broadcast-System, Email-Integration

### Haupt-Ordner
```
saimor-core/
├── core/                  ← FastAPI App (app.py, 3368 Zeilen)
│   ├── api/v1/           ← API Router (departments, spaces, folders, nodes)
│   ├── semantic/         ← Semantic Layer (Embeddings, Resonanz)
│   ├── mindloop/         ← Mind Loop (Timeline, Synthesis, Intelligence)
│   ├── storage/          ← Persistenz (Upload, Audit)
│   └── migrations/       ← DB-Migrationen (PostgreSQL)
├── gateway/              ← Multi-Tenant Gateway (Claude Router, RAG)
├── voice-realtime/       ← Voice Stack (Deepgram ↔ Claude ↔ Google TTS)
├── ops/                  ← DevOps (Backup, n8n, CI)
└── docs/                 ← Architektur, LLM-Strategie, Knowledge
```

### Zentrale Dokumente
- `CORE_MASTER.md` → **Single Source of Truth** (272 Zeilen, Stand 2025-11-11)
- `README.md` → Quick Start (Features, Docker Compose)
- `SHARED_CONTEXT.md` → Historische Inter-Claude-Kommunikation (1311 Zeilen)

### Status
- ✅ **Phase F Complete** (Intelligence Layer: 6 Micro-Steps)
- ✅ Production-Ready Mock-Default (USE_REAL_* Flags für Adapter)
- ✅ Multi-Tenant Auth (JWT, CORS, Rate Limiting)
- ✅ Mind Loop API (Timeline, Synthesis, Clustering, Intelligence Scan)
- ⏳ Real-Revenue-Linie (Code fertig, Runtime blockiert wegen Auth)

---

## 2️⃣ mora-ui/ – Frontend

### Zweck
**Next.js 15 App** mit Mycelium-inspirierten Design System:
- Hierarchische Navigation (Core → Department → Space → Folder → Nodes)
- Visual + List Views
- Context-Aware Chat Dock (bereit für AI)
- Organic Background (Canvas-basiert, Partikel-System)

### Tech-Stack
- **Framework:** Next.js 15.0.3 (App Router)
- **State Management:** Zustand 5.0.8
- **Styling:** Tailwind CSS 3.4.15
- **Animations:** Framer Motion 12.23.24
- **3D:** React Three Fiber 9.4.0 (optional)
- **Icons:** Lucide React 0.552.0

### Rolle im System
- **UI-Consumer:** Dockt an saimor-core API an (JWT Auth)
- **Visualisierung:** Zeigt Departments, Spaces, Folders, Nodes in organischem Layout
- **Navigation:** Tree Sidebar, Breadcrumbs, Orbital Layouts

### Haupt-Ordner
```
mora-ui/
├── app/                   ← Next.js App Router
│   ├── page.tsx          ← Main Page (MoraShell)
│   └── globals.css       ← Global Styles
├── components/
│   ├── layers/           ← CoreLayer, DepartmentLayer, SpaceLayer, FolderLayer
│   ├── sidebar/          ← TreeSidebar (hierarchische Navigation)
│   ├── ui/               ← ChatDock, Breadcrumb, LoadingState
│   └── organic/          ← OrganicBackground, NodeDetailPanel
├── lib/
│   ├── api/              ← coreClient.ts (API-Aufrufe)
│   ├── store/            ← moraState.ts (Zustand Store)
│   └── types/            ← core.ts (TypeScript Interfaces)
└── .env.local.example    ← Env Config Template
```

### Zentrale Dokumente
- `README.md` → Quick Start (Installation, Config)
- `INTEGRATION_STATUS.md` → **Core API Integration** (423 Zeilen, Stand 2025-11-24)
- `UI_V2_OVERVIEW.md` → Architektur-Überblick (58 Zeilen)
- `PHASE_E_SUMMARY.md` → Phase E Finalization Status

### Status
- ✅ **V2 Integration Complete** (Core API fully operational)
- ✅ Alpha Centauri Dataset (1 Dept, 7 Spaces, 48 Folders, 1665+ Nodes)
- ✅ CRUD Create Operations (Spaces, Folders, Nodes)
- ✅ Tree Navigation + Breadcrumbs
- ✅ Chat Dock (UI-only, AI-Integration offen)
- ⏳ Node Detail Panel (Component existiert, noch nicht integriert)

---

## 3️⃣ infranaut/ – Meta-Schicht

### Zweck
**Orchestrierungs- und Infrastruktur-Dokumentation**:
- Workspace-Mapping (Überblick für Menschen + Agenten)
- Agent-Orchestrierung (Supervisor ↔ Worker-Agenten)
- Infra-/DevOps-Notizen (Docker, n8n, Twilio, Deploy-Skripte)

### Rolle im System
- **Koordination:** Plant Cross-Repo-Änderungen ohne direkte Code-Edits
- **Dokumentation:** Sammelt Wissen über Infra, Die nicht in Code-Repos gehört
- **TODOs:** Zentrale Aufgaben-Liste für zukünftige Agenten-Durchläufe

### Haupt-Dateien
```
infranaut/
├── WORKSPACE_MAP.md           ← Diese Datei (Übersicht)
├── AGENT_ORCHESTRATION.md     ← Agenten-Setup + Prompt-Templates
├── INFRA_NOTES.md             ← Infra-/DevOps-Notizen
└── TODO_SUPERVISOR.md         ← TODOs für Core/UI/Infra
```

### Status
- ✅ Initialisiert (2025-11-25)
- 📋 Read-Only Durchlauf (Analyse, kein Code-Edit)

---

## 🔗 Zusammenhänge

### Datenfluss
```
User (Browser)
    ↓
mora-ui (Next.js @ :3000)
    ↓ JWT Auth (Bearer Token)
saimor-core/core/app.py (:8081)
    ↓
PostgreSQL (:5432) + Redis (:6379) + Qdrant (:6333)
```

### Auth-Flow
1. **JWT-Generierung:** `saimor-core/scripts/generate_dev_jwt.py`
2. **UI-Config:** `mora-ui/.env.local` (NEXT_PUBLIC_SAIMOR_CORE_JWT)
3. **Backend-Validierung:** `saimor-core/core/security.py`

### API-Endpunkte (Core ↔ UI)
| Endpoint | Zweck | UI-Component |
|----------|-------|--------------|
| `GET /v1/departments` | Load departments | CoreLayer |
| `GET /v1/spaces?department_id=...` | Load spaces | DepartmentLayer |
| `GET /v1/folders?space_id=...` | Load folders | SpaceLayer |
| `GET /v1/nodes?folder_id=...` | Load nodes | FolderLayer |
| `GET /v1/tree` | Full hierarchy | TreeSidebar |
| `POST /v1/spaces` | Create space | DepartmentLayer |
| `POST /v1/folders` | Create folder | SpaceLayer |
| `POST /v1/nodes` | Create node | FolderLayer |
| `GET /v1/mindloop/synthesis` | Intelligence | ChatDock (future) |

---

## 🛠️ Entwicklungs-Setup

### 1. Backend starten (saimor-core)
```bash
cd c:\saimor\saimor-core
docker-compose up -d    # PostgreSQL, Redis, Qdrant
python run.py           # Core API @ :8081
```

### 2. Frontend starten (mora-ui)
```bash
cd c:\saimor\mora-ui
npm install
npm run dev             # Next.js @ :3000
```

### 3. Ports
- **Core API:** http://localhost:8081
- **Môra UI:** http://localhost:3000/home
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379
- **Qdrant:** localhost:6333

---

## 📊 Zahlen & Fakten

### saimor-core
- **442 Dateien/Ordner**
- **Haupt-App:** `core/app.py` (3368 Zeilen)
- **Master-Doc:** `CORE_MASTER.md` (272 Zeilen)
- **Shared-Context:** `SHARED_CONTEXT.md` (1311 Zeilen, historisch)

### mora-ui
- **96 Dateien/Ordner**
- **Package:** Next.js 15, React 18.3, Zustand 5.0
- **Integration-Status:** 423 Zeilen (INTEGRATION_STATUS.md)
- **Test-Dataset:** 1 Department, 7 Spaces, 48 Folders, 1665+ Nodes

---

## 🎯 Vision

**Clarity Home** – Einheitliches Business Dashboard, wo Môra:
- **Lesen** kann: KPIs, Revenue, Email, Broadcasts
- **Schreiben** kann: Actions, Exports, Broadcasts
- **Lernen** kann: Mind Loop Timeline, Semantic Events, Context Shifts

**Organisches UI** – Mycelium-inspiriertes Design:
- Tiefe Waldgrüntöne + Gold-Akzente
- Partikel-Systeme (Biolumineszenz)
- Glaspanel-Ästhetik
- Atmende Animationen

---

## ✅ Was funktioniert gut

1. **Klare Trennung:** Backend (saimor-core) ↔ Frontend (mora-ui)
2. **Moderne Stacks:** FastAPI + Next.js 15 (App Router)
3. **Multi-Tenant-Ready:** JWT Auth, Tenant-Isolation
4. **Intelligence-Layer:** Mind Loop, Semantic Events (Phase F complete)
5. **UI-Integration:** Full hierarchical navigation, real data
6. **Dokumentation:** CORE_MASTER.md als Single Source of Truth

---

## ⚠️ Offene Punkte (siehe TODO_SUPERVISOR.md)

1. **Real-Revenue-Linie:** Code fertig, Runtime blockiert (Auth-Problem)
2. **Node Detail Panel:** Component existiert, noch nicht integriert
3. **Chat AI:** UI bereit, Backend-Integration fehlt
4. **Infra-Cleanup:** n8n, Twilio, alte Pipelines (Konflikt-Potential)
5. **CORS-Harmonisierung:** Mehrere Tunnel-URLs in Core-CORS-Liste

---

**Next:** Siehe `AGENT_ORCHESTRATION.md` für geplante Agenten-Setup  
**TODOs:** Siehe `TODO_SUPERVISOR.md` für konkrete Aufgaben

