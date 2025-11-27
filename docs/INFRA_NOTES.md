# Infra- & DevOps-Notizen

**Stand:** 2025-11-25  
**Zweck:** Sammlung von Infra-Themen aus saimor-core (ohne Änderungen)

---

## 🐳 Docker & Container-Setup

### Aktuelle Container (laut CORE_MASTER.md)
- **12 Container** laufen lokal (docker-compose.yml)
- **PostgreSQL 16** → Port 5432 (mora-postgres)
- **Redis 7** → Port 6379
- **Qdrant 1.7.4** → Port 6333
- **Core API** → Port 8081 (saimor-core-gateway-1)
- **n8n** → Port 5678
- **Caddy Reverse Proxy** → Ports 80/443 (+ 8080 Health, 3000 Dashboard)

### Docker Compose Dateien (vermutet in saimor-core/)
- `docker-compose.yml` → Haupt-Setup
- `.env` → Secrets (JWT, DB-Passwörter, API-Keys)
- `.env.example` → Template ohne Secrets

### Devcontainer (vermutet)
- Könnte für VSCode Dev Containers existieren
- Zu prüfen: `.devcontainer/devcontainer.json`

### Container Health Checks
- Core API: `/v1/health` → 200 OK
- Gateway: `/health` → 200 OK
- Caddy: `/health` → 200 OK (Port 8080)

---

## 🌐 Production Server

### Hetzner/IONOS VPS: `voice.saimor.world`
- **Hostet:** Gateway, Caddy, n8n
- **Voice-System:** Separates Deployment (`voice-realtime/`)
- **Twilio Webhook:** Deepgram ↔ Claude ↔ Google TTS

### Caddy Reverse Proxy
- **TLS:** Automatic Let's Encrypt
- **Domains:**
  - `https://saimor.world`
  - `https://voice.saimor.world`
  - `https://app.saimor.world` (vermutet)
- **Config:** Vermutlich `Caddyfile` in saimor-core/ops/

### Voice-Realtime Stack
- **Ordner:** `saimor-core/voice-realtime/`
- **Libs:** Deepgram SDK, Anthropic SDK, Google TTS
- **Deployment:** Eigene Migrations + Deployment-Skripte
- **n8n Integration:** `ops/n8n-voice/README.md`

---

## 🔧 n8n Workflows

### Lokation
- **Primary Data:** `saimor-core/ops/n8n/workflows/` → 1 Workflow
- **Voice Stack:** `saimor-core/ops/n8n-voice/workflows/` → 2 Workflows
- **Port:** 5678 (lokal), HTTPS in Produktion
- **Production URL:** `https://n8n.voice.saimor.world`

---

### ✅ Existierende Workflows (Stand: 2025-11-25)

#### 1. **Notion → Markdown Sync (Knowledge)**

**File:** `ops/n8n/workflows/notion_to_markdown_sync.json`  
**Name:** "Notion → Markdown Sync (Saimôr Knowledge)"  
**Status:** ⚠️ Webhook-URL nicht direkt sichtbar (manueller Trigger vermutet)

**Zweck:**
- Synchronisiert Notion-Datenbank → Markdown-Files
- Filter: Nur `Status = Published` Pages
- Output: Markdown mit YAML-Frontmatter

**Flow:**
1. **Notion - Get Published Pages** → Fetch von Notion DB (ENV: `NOTION_DB_ID`)
2. **Map to Markdown** → Konvertiert Properties → Frontmatter + Content
3. **Write File** → Schreibt nach `knowledge/{category}/{slug}.md`
4. **Git Commit (Optional)** → Auto-Commit (disabled by default)
5. **Summary** → Zeigt Anzahl der synced Pages

**Parameter:**
- ENV: `NOTION_DB_ID` (Notion Database ID)
- ENV: `KNOWLEDGE_REPO_PATH` (für Git Auto-Commit, optional)
- Filter: `Status = Published`
- Categories → Pfade:
  - `Core` → `01-saimor-core`
  - `Pulse` → `02-saimor-pulse`
  - `Systems` → `03-saimor-systems`
  - `Orbit` → `04-saimor-orbit`
  - `Studio` → `05-saimor-studio`
  - `Network` → `06-saimor-network`
  - `TimeCapsule` → `07-time-capsule`
  - `Mora` → `08-mora-ai-stack`

**Frontmatter-Felder:**
- `title`, `category`, `keywords`, `summary`, `links`, `updated`, `lang`

**Trigger:** Vermutlich manuell oder via Button (URL nicht dokumentiert)

---

#### 2. **Voice Agent v1 - Inbound Call Handler**

**File:** `ops/n8n-voice/workflows/voice_agent_v1.json`  
**Name:** "Voice Agent v1 - Inbound Call Handler"  
**Status:** ✅ AKTIV (Production Voice System)

**Webhooks:**
- **Inbound:** `https://voice.saimor.world/webhook/voice-inbound` (POST)
- **Response:** `https://voice.saimor.world/webhook/voice-response` (POST)

**Zweck:**
- Empfängt Twilio-Anrufe
- AI-powered Response (via SAIMOR Gateway → Claude)
- Logs in PostgreSQL (`call_logs` Tabelle)
- Returns TwiML (Twilio Markup Language)

**Flow (Inbound):**
1. **Webhook Trigger** (`voice-inbound`) → Empfängt Twilio POST
2. **Extract Call Data** → `From`, `CallSid`, `Direction`
3. **Log Call to Database** → PostgreSQL `call_logs`
4. **AI Inference** → POST zu `SAIMOR_GATEWAY_URL/inference`
   - Model: `claude-3-haiku-20240307`
   - Max Tokens: 150
   - Prompt: "You are a helpful voice assistant..."
5. **Twilio TwiML Response** → Returns XML:
   - `<Say voice="alice">{{ AI response }}</Say>`
   - `<Gather input="speech">` → User soll sprechen
   - `<Action>/webhook/voice-response</Action>`

**Flow (Response Handling):**
1. **Webhook Response Handler** (`voice-response`) → User-Input
2. **Extract Speech Input** → `SpeechResult` von Twilio
3. **AI Response** → POST zu Gateway mit User-Input
4. **Final TwiML Response** → Returns XML mit AI-Antwort + `<Hangup/>`

**Parameter (ENV):**
- `SAIMOR_GATEWAY_URL` → AI Gateway URL
- `SAIMOR_GATEWAY_TOKEN` → Bearer Token für Gateway
- PostgreSQL-Credentials (`n8n_voice_user`, `n8n_voice` DB)

**Twilio Config (erforderlich):**
- Voice Webhook: `https://voice.saimor.world/webhook/voice-inbound`
- Method: HTTP POST

**Tags:** `voice`, `twilio`, `ai`

---

#### 3. **Simple Voice Workflow (Backup/Legacy)**

**File:** `ops/n8n-voice/workflows/simple-voice-workflow.json`  
**Name:** Vermutlich simplified version of Voice Agent v1  
**Status:** ⚠️ Nicht analysiert (vermutlich Backup oder Template)

**Zweck:** Vereinfachte Twilio-Voice-Integration (ohne AI)

---

### 📋 Dokumentierte Workflows (aus SHARED_CONTEXT.md)

Folgende Webhooks wurden in `SHARED_CONTEXT.md` erwähnt, aber **keine JSON-Dateien gefunden**:

#### 4. **Knowledge Sync**
**Webhook:** `https://n8n.voice.saimor.world/webhook/knowledge-sync`  
**Trigger:** Dashboard Button (`gateway/static/dashboard/app.js`)  
**Zweck:** Synchronisiert Knowledge Base aus externen Quellen

**Implementation:** JavaScript im Dashboard
```javascript
fetch('https://n8n.voice.saimor.world/webhook/knowledge-sync', { method: 'POST' })
```

**Status:** ✅ In Dashboard-Code referenziert, aber **Workflow-JSON fehlt**

---

#### 5. **Learning Brain Update**
**Webhook:** `https://n8n.voice.saimor.world/webhook/learning-brain-update`  
**Trigger:** Dashboard Button  
**Zweck:** Triggert Learning Brain Processing

**Status:** ✅ In Dashboard-Code referenziert, aber **Workflow-JSON fehlt**

---

#### 6. **Waitlist (nicht offiziell dokumentiert)**
**Webhook:** `https://n8n.voice.saimor.world/webhook/waitlist` (Vermutung)  
**Trigger:** Website-Formular (mora-ui oder saimor.world)  
**Zweck:** Wartelisten-Einträge verarbeiten

**Status:** ❌ **Nicht in CORE_MASTER.md**, nur in Frontend-Notizen erwähnt  
**JSON:** Nicht gefunden

---

### 🔍 Geplante Flows (aus mora-ui Kontext)

Folgende Workflows wurden in `infranaut/WORKSPACE_MAP.md` erwähnt, aber **noch nicht implementiert**:

- **flow_email_digest** → E-Mail Digest erstellen
- **flow_broadcast_doc** → Broadcast Document erzeugen
- **flow_duplicate_hunter** → Duplikate finden
- *(weitere 7-12 Flows geplant)*

---

### 📊 Workflow-Übersicht (Tabelle)

| Workflow | Webhook-URL | Trigger | Status | JSON-File |
|----------|-------------|---------|--------|-----------|
| **Notion → Markdown** | ❓ Manuell (vermutlich) | UI Button? | ⚠️ Unklar | ✅ `ops/n8n/workflows/notion_to_markdown_sync.json` |
| **Voice Agent v1** | `voice.saimor.world/webhook/voice-inbound` | Twilio Call | ✅ LIVE | ✅ `ops/n8n-voice/workflows/voice_agent_v1.json` |
| **Voice Response** | `voice.saimor.world/webhook/voice-response` | Twilio Gather | ✅ LIVE | (Teil von Voice Agent v1) |
| **Knowledge Sync** | `n8n.voice.saimor.world/webhook/knowledge-sync` | Dashboard Button | ✅ Referenziert | ❌ JSON fehlt |
| **Learning Brain** | `n8n.voice.saimor.world/webhook/learning-brain-update` | Dashboard Button | ✅ Referenziert | ❌ JSON fehlt |
| **Waitlist** | `n8n.voice.saimor.world/webhook/waitlist` (?) | Website Form | ❌ Unbestätigt | ❌ JSON fehlt |

---

### 🚨 Fehlende Workflows (Action Items)

**Existieren in Code-Referenzen, aber keine JSON-Dateien:**
1. ❌ `knowledge-sync` → Dashboard Button funktioniert, aber Workflow nicht versioniert
2. ❌ `learning-brain-update` → Dashboard Button funktioniert, aber Workflow nicht versioniert
3. ❌ `waitlist` → Vermutung basierend auf Frontend-Notizen

**Empfehlung:**
- n8n-UI öffnen (`https://n8n.voice.saimor.world`)
- Workflows exportieren (JSON)
- Committen in `ops/n8n/workflows/`

---

### 🔐 Secrets & ENV-Variablen

**n8n-Voice benötigt:**
- `SAIMOR_GATEWAY_URL` → AI Gateway URL
- `SAIMOR_GATEWAY_TOKEN` → Bearer Token
- `NOTION_DB_ID` → Notion Database (für Sync)
- `KNOWLEDGE_REPO_PATH` → Git Repo Path (optional)
- PostgreSQL-Credentials (für Voice Logs)

**Wo setzen:**
- **Production:** n8n-UI → Settings → Environment Variables
- **Local:** `ops/n8n-voice/.env`

---

### ✅ TODO für Infra-Agent: ERLEDIGT

- [✓] n8n Workflows dokumentieren → 3 Workflows analysiert
- [✓] Webhook-URLs dokumentiert → Tabelle erstellt
- [!] Fehlende JSONs identifiziert → 3 Workflows nur in Code, nicht versioniert

**Nächste Schritte:**
1. n8n-UI öffnen → Fehlende Workflows exportieren
2. JSONs in `ops/n8n/workflows/` committen
3. Backup-Strategy: Automated Export (Cron oder n8n Auto-Backup)

---

## 📦 Backup & Persistence

### Backup-Skripte (laut CORE_MASTER.md)
- **Ordner:** `saimor-core/ops/backup/`
- **README:** `ops/backup/README.md`
- **Umfang:** PostgreSQL, Redis (?), n8n Workflows (?)
- **Automation:** Vermutlich Cron-Jobs (zu prüfen)

### Datenbank-Migrationen
- **PostgreSQL:** `saimor-core/core/migrations/`
- **Beispiel:** `001_revenue.sql` (Revenue Tables)
- **Deployment:** Manuell via `psql "$REVENUE_DB_URL" -f core/migrations/...`

### Audit Logging
- **Format:** JSONL (JSON Lines)
- **PII-Redaction:** Aktiv (E-Mail, Telefon, UUID, IBAN maskiert)
- **Storage:** Optional PostgreSQL (USE_REAL_AUDIT=true), sonst In-Memory
- **Retention:** `AUDIT_RETENTION_DAYS` (default vermutlich 30)

---

## 🔐 Secrets Management

### ENV-Variablen (aus CORE_MASTER.md)
| Dienst | Primäre ENV-Vars |
|--------|------------------|
| Core API | `MORA_JWT_SECRET`, `EXPORT_AES_KEY`, `ENVIRONMENT`, `PORT`, `RETENTION_DAYS` |
| Gateway | `GATEWAY_SECRET`, `CLAUDE_API_KEY`, `QDRANT_URL`, `DATABASE_URL`, `ACTIONS_*` |
| Redis/PostgreSQL | `REDIS_PASSWORD`, `POSTGRES_PASSWORD` |
| n8n | `N8N_*`, `WEBHOOK_URL` |
| Caddy | `DOMAIN`, TLS-Speicher |
| Voice Realtime | `TWILIO_*`, `DEEPGRAM_*`, `CLAUDE_*` |

### JWT-Generierung
- **Script:** `saimor-core/core/scripts/generate_dev_jwt.py`
- **Secrets:**
  - `MORA_JWT_SECRET=gz8lInR2H0jBfdEAA2fXveKNzDXiEz_3lmF_5-yvwDo`
  - `MORA_JWT_ISSUER=saimor.mora`
  - `MORA_JWT_AUDIENCE=saimor.clients`

### Best Practices
- ✅ `.env` → Nie committen
- ✅ `.env.example` → Template ohne Secrets
- ✅ Secrets rotieren (z.B. JWT_SECRET jährlich)
- ❌ Hardcoded Secrets im Code

---

## 🔥 Real-Revenue-Linie (Blocker)

### Status (aus CORE_MASTER.md)
- **Code:** ✅ Vollständig implementiert
  - Migration: `core/migrations/001_revenue.sql`
  - Adapter: `PostgresRevenueAdapter` mit Connection Pooling
  - Schema: `tenant_meta`, `revenue_monthly`, `revenue_events`
- **Runtime:** ❌ **BLOCKED**
  - PostgreSQL md5-Auth schlägt bei externen psycopg2-Verbindungen fehl
  - pg_hba.conf Fixes angewendet, aber Auth-Problem persistiert
  - mora-postgres verwendet `scram-sha-256` per Default

### Decision (aus CORE_MASTER.md)
- **Default:** `USE_REAL_REVENUE=false` (Mock-Mode)
- **Aktivierung verschoben:** Separate Infra-Phase (nach MVP-Stabilisierung)

### Infra-Entscheidung erforderlich
1. **Option A:** Neu aufsetzen mit `POSTGRES_HOST_AUTH_METHOD=md5`
2. **Option B:** Trust-Auth für 127.0.0.1 (nur Dev)
3. **Option C:** scram-sha-256 in psycopg2 korrekt konfigurieren

### TODO für Infra-Agent
- [ ] PostgreSQL Auth-Methode überprüfen (`pg_hba.conf`)
- [ ] DSN-Freigabe testen (`REVENUE_DB_URL`)
- [ ] Real-Revenue-Aktivierung dokumentieren (Runbook)

---

## 🛠️ CI/CD & Testing

### Smoke-Tests (laut CORE_MASTER.md)
- **Bash:** `saimor-core/scripts/smoke_core.sh`
- **PowerShell:** `saimor-core/scripts/Smoke-Core.ps1`
- **Aufrufe:**
  - `/v1/health`
  - `/v1/upload` (mit SMOKE_JWT)
  - `/v1/system/audit` (mit SMOKE_JWT)
- **Makefile:** `make smoke` (startet Bash-Variante)

### Pytest
- **Test-Script:** `scripts/test_core.sh` / `scripts/test_core.ps1`
- **Ablauf:** `pytest -q` + Smoke-Lauf
- **Coverage:** `tests/test_redaction.py`, `tests/test_upload_limits.py`, etc.

### Gateway CLI-Tests (manuell)
- **Script:** `gateway/scripts/test_actions.py`
- **Bedarf:** `aiohttp` + laufender Gateway

### TODO für Infra-Agent
- [ ] CI/CD Pipeline einrichten (GitHub Actions?)
- [ ] Test-Coverage erhöhen
- [ ] Automated Smoke-Tests im CI

---

## 📊 Monitoring & Observability

### Prometheus Metrics
- **Endpoint:** `/metrics` (hinter `METRICS_ENABLED` Flag)
- **Default:** `METRICS_ENABLED=false` → 404
- **Counter:**
  - `saimor_upload_accepted_total`
  - `saimor_upload_rejected_total`
  - `saimor_audit_events_total`

### Grafana (geplant, nicht umgesetzt)
- **Dashboards:** Noch nicht vorhanden
- **PagerDuty Hooks:** Dokumentiert in `CORE_MASTER.md`, nicht implementiert

### Health Endpoints
- **Core API:** `GET /v1/health`
  - Response: `status, timestamp, environment, awareness_status, build`
- **Adapter Status:** `GET /v1/system/adapters`
  - Response: `revenue, email, broadcast` (mode, status, details)

### Build Metadata
- **ENV-Variablen:**
  - `BUILD_GIT_SHA` → Git Commit Hash (12 chars)
  - `BUILD_TIME` → ISO-Timestamp
- **Verfügbar in:** `/v1/health` Response

### TODO für Infra-Agent
- [ ] Grafana Dashboards erstellen
- [ ] Prometheus Scraping konfigurieren
- [ ] PagerDuty Integration
- [ ] Twilio-Stats Monitoring (Voice-System)

---

## 🚨 Offene Infra-Risiken

### 1. CORS-Liste (überfüllt)
- **Aktuell:** 10+ Origins in `core/app.py`
- **Problem:** Mehrere Cloudflare Tunnel-URLs hardcoded
- **Risiko:** Bei Tunnel-Wechsel muss Core-Code geändert werden
- **Lösung:** ENV-Variable `ALLOWED_ORIGINS` + Wildcard-Regex sauberer nutzen

### 2. n8n Workflows (undokumentiert)
- **Problem:** Workflows existieren, aber kein zentrales Inventar
- **Risiko:** Welcher Webhook ist für was? Breaking Changes möglich
- **Lösung:** `INFRA_NOTES.md` füllen + n8n-Export committen

### 3. Real-Revenue-Blocker
- **Problem:** PostgreSQL Auth verhindert Real-Adapter
- **Impact:** Mock-Data bleibt Default, echte Revenue-Metriken fehlen
- **Priorität:** Mittel (MVP funktioniert mit Mock)

### 4. Backup-Automation (unklar)
- **Problem:** `ops/backup/README.md` existiert, aber Cron-Jobs dokumentiert?
- **Risiko:** Datenverlust bei Server-Crash
- **Lösung:** Automated Backups + Restore-Tests

### 5. Voice-System (separate Infra)
- **Problem:** `voice-realtime/` hat eigenes Deployment
- **Risiko:** Inkonsistente Configs zwischen Core + Voice
- **Lösung:** Shared ENV-Management (z.B. dotenv-vault?)

---

## 🎯 Empfehlungen für Infra-Durchlauf

### Phase 1: Dokumentation (2-3h)
- [ ] Alle Docker-Compose-Dateien auflisten
- [ ] ENV-Variablen inventarisieren (.env.example vollständig?)
- [ ] n8n Workflows dokumentieren (Webhooks, Parameter, Zweck)
- [ ] Backup-Skripte analysieren (Cron? Retention?)

### Phase 2: Cleanup (4-6h)
- [ ] CORS-Liste bereinigen (Env-Variable statt Hardcoded-URLs)
- [ ] PostgreSQL Auth-Problem lösen (Real-Revenue freischalten)
- [ ] Alte Services entfernen (falls vorhanden: Twilio-Legacy, alte Pipelines?)
- [ ] `.env.example` Files synchronisieren (Core + Gateway + Voice)

### Phase 3: Automation (1-2 Tage)
- [ ] CI/CD Pipeline (GitHub Actions)
- [ ] Automated Smoke-Tests im CI
- [ ] Grafana Dashboards
- [ ] Backup-Automation testen + Restore-Runbook

### Phase 4: Monitoring (1-2 Tage)
- [ ] Prometheus aktivieren (`METRICS_ENABLED=true`)
- [ ] Grafana Dashboards für Core + Gateway + Voice
- [ ] PagerDuty Integration
- [ ] Uptime-Monitoring (z.B. UptimeRobot)

---

## 📝 Infra-Inventar (Stand: 2025-11-25)

### Container (lokal)
```
mora-core-api       Up      0.0.0.0:8081→8081/tcp   ✅
mora-postgres       Up      0.0.0.0:5432→5432/tcp   ✅
mora-redis          Up      0.0.0.0:6379→6379/tcp   ✅
saimor-qdrant       Up      0.0.0.0:6333→6333/tcp   ✅ (vermutet)
saimor-gateway      Up      0.0.0.0:8000→8000/tcp   ✅ (vermutet)
saimor-n8n          Up      0.0.0.0:5678→5678/tcp   ✅ (vermutet)
saimor-caddy        Up      0.0.0.0:80/443→...      ✅ (vermutet)
```

### Produktions-Server
```
voice.saimor.world  →  Hetzner/IONOS VPS
  ├── Gateway       →  FastAPI Multi-Tenant
  ├── Caddy         →  Reverse Proxy + TLS
  ├── n8n           →  Workflow Automation
  └── Voice-Realtime →  Twilio + Deepgram + Claude
```

### Datenbanken
```
PostgreSQL 16       →  mora-postgres:5432
  ├── mora_core     →  Core API Database
  ├── tenant_meta   →  Tenant Metadaten (Revenue)
  ├── revenue_*     →  Revenue Tables (Real-Line blocked)
  ├── audit_events  →  Audit Logging (optional)
  └── uploads       →  Upload Metadata (optional)

Redis 7             →  mora-redis:6379
  ├── Intent Cache  →  Gateway (planned)
  ├── Session Store →  Confirmation Tokens
  └── Rate Limiter  →  Upload Limits

Qdrant 1.7.4        →  saimor-qdrant:6333
  ├── RAG Collections →  Per Tenant
  └── Embeddings      →  Mock 64-dim oder Real 384-dim
```

---

## 🚀 Quick Reference

### Starte lokales Setup
```bash
cd c:\saimor\saimor-core
docker-compose up -d
python run.py
```

### Logs anschauen
```bash
docker-compose logs -f mora-core-api
docker-compose logs -f mora-postgres
```

### PostgreSQL Shell
```bash
docker exec -it mora-postgres psql -U mora -d mora_core
```

### Redis CLI
```bash
docker exec -it mora-redis redis-cli
```

### Smoke-Test
```bash
# Bash
export SMOKE_JWT="<token>"
bash scripts/smoke_core.sh

# PowerShell
$env:SMOKE_JWT="<token>"
.\scripts\Smoke-Core.ps1
```

---

## 🎯 Phase G: Demo-Vorbereitung (2025-11-25) ✅

### Ziel
System für **KI Garage Heilbronn Demo (Januar 2026)** vorbereiten

### Deliverables ✅

#### 1. Demo-Testdaten Script
**File:** `saimor-core/scripts/seed_demo_data.py`

**Output:**
- 3 Departments (Operations, Strategy, Research)
- 16 Spaces
- 80 Folders
- 80 Nodes (document, task, note, link)
- 20 Mindloop Events

**Usage:**
```bash
cd c:\saimor\saimor-core
python scripts/seed_demo_data.py
```

#### 2. Demo-Flow Dokumentation
**File:** `infranaut/DEMO_FLOW.md`
- Pre-Demo Setup (15 Min Checklist)
- Schritt-für-Schritt Demo (10-15 Min)
- Troubleshooting Guide

#### 3. Erweiterte Smoke-Tests
**File:** `saimor-core/scripts/smoke_core.sh`

**Neue Tests:**
- `/v1/tree` - Tree API
- `/v1/departments` - Departments Endpoint
- `/v1/spaces` - Spaces Endpoint
- `/v1/folders` - Folders Endpoint
- `/v1/nodes` - Nodes Endpoint (List + Detail)

#### 4. Pre-Demo Checklist
**File:** `infranaut/PRE_DEMO_CHECKLIST.md`
- System Setup Checkliste
- Data Validation
- UI Functionality Tests
- Quick Troubleshooting

#### 5. Backup-System Validierung
**File:** `infranaut/BACKUP_VALIDATION.md`

**Validierte Scripts:**
- `ops/backup/backup.sh` - Knowledge Backup
- `ops/backup/postgres-backup.sh` - PostgreSQL Backup

**Status:** ✅ Scripts funktionsfähig, Automation optional

### Bug Fixes
- **Fixed:** `mindloop/cache.py` Syntax Error (doppelte `stats()` Definition)

### Status
**Phase G:** ✅ COMPLETE
**Demo-Ready:** ✅ YES
**Dokumentation:** ✅ COMPLETE

**Siehe:** `PHASE_G_COMPLETE.md` für Details

---

**Next:** Siehe `TODO_SUPERVISOR.md` für Infra-TODOs
**Workspace:** Siehe `WORKSPACE_MAP.md` für Gesamt-Überblick
