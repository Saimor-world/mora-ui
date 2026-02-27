# CODEX BRIEFING — 2026-02-27
## Saimor OS · Server-Side Tasks

Hey Codex — hier ist der vollständige Stand. Claude arbeitet parallel an der UI.
Du übernimmst **Server / Backend / Infra / SSE-Wiring**.

---

## 1. Projekt-Überblick

**Saimor OS** = KI-Betriebssystem mit zwei Hauptkomponenten:

| Komponente | Repo/Dir | Deployed |
|---|---|---|
| `mora-ui` (Next.js 15) | `/root/saimor/ui` + GitHub `Saimor-world/mora-ui` | `saimor-ui-1` Container |
| `core` (FastAPI) | `/root/saimor/core` + GitHub `Saimor-world/saimor-core` | `saimor-core-1` Container |
| Caddy Proxy | `/root/saimor/ops/Caddyfile` | `saimor-caddy-1` |
| Compose Stack | `/root/saimor/ops/docker-compose.yml` | `docker compose up -d --build <service>` |

**Domains:**
- `hq.saimor.world` → `ui:3000`
- `api.saimor.world` → `core:8081` (via Caddy)

**Server SSH:** `saimor-server` (alias bereits konfiguriert)

---

## 2. GitHub Status

### mora-ui (Frontend)
- **Active branch:** `stabilize/phaseAB` — das ist deployed und current
- **Main:** ist behind, noch nicht gemergt
- **Open branches:**
  - `codex/phase2-ghcr-ui` — deine alte Arbeit (GHCR Container-Registry Pipeline) — prüfen/schließen/mergen
  - `cursor/development-environment-setup-25ab` — unbekannt, evaluieren
  - `claude/ux-smoke-branding-memory-2026-02-25` — veraltet, kann geschlossen werden

**TODO:**
- `stabilize/phaseAB` → `main` mergen (Frontend ist stable)
- Alte Branches schließen/aufräumen

### saimor-core (Backend)
- **Active branch:** `main` — alles deployed
- Backup: `backup/server-main-6a37e31-20260225`

---

## 3. Was in den letzten Sessions gemacht wurde

### Backend (Claude, deployed auf main):
```
feat(mindloop): MindEventType StrEnum als single source of truth
feat(context): mora_observations in System Prompt injiziert
feat(ai): VERTRAULICH Tonalitäts-Block (Mora "denkt" in Beobachtungen)
feat(awareness): /pulse gibt jetzt insight/curious/bright States zurück
feat(chat): orbState SSE-Preamble vor erstem Token in /stream
feat(mindloop): POST /insight + POST /insight/{id}/confirm Endpoints
feat(mindloop): warmup_tenant() — Cache beim Start aus SQLite aufwärmen
```

### Frontend (Claude, deployed auf stabilize/phaseAB):
```
Dock: UserAvatar Komponente (role-basierter Ring, Aura, Online-Dot)
DepartmentLayer: Golden Sun 176px, 6-Farb-Hintergrund
SpaceLayer: Core Orb 144px, reichere Nebula-Hintergründe
MoraLivingBackground: 380 Sterne, 12 Threads, 5 Farben
TS-Typen: OrbState mit curious/learning/watching
MoraInsightPopup: neue Komponente (noch nicht gemountet)
```

---

## 4. DEINE AUFGABEN (Server-Side)

### 🔴 P0 — Kritisch

#### 4.1 `saimor-core-gateway-1` Crash Loop fixen
```bash
ssh saimor-server "docker logs saimor-core-gateway-1 --tail 50"
```
Der Container startet ständig neu. Vermutung: fehlende `ANTHROPIC_API_KEY` env var.
- Prüfe `/home/deploy/saimor-core/docker-compose.yml` auf env-Konfiguration
- Prüfe ob `.env` oder secrets fehlen
- Entweder fixen ODER den Container dauerhaft stoppen wenn er nicht gebraucht wird
  (es gibt auch `saimor-gateway-1` der seit Tagen healthy läuft — das ist der ALTE Gateway)

#### 4.2 SSE `orbState` Frontend-Wiring
Backend sendet bereits:
```python
# core/api/v1/endpoints/chat.py
yield f"data: {json.dumps({'orbState': orb_state})}\n\n"  # vor ersten Token
```

Frontend ignoriert das noch. In `/root/saimor/ui` (oder lokal) finde den Streaming-Handler:
- Suche nach `useChat`, `fetchEventSource`, oder `EventSource` in `lib/hooks/`
- Dort muss `{"orbState": "..."}` Events herausgefiltert und an `useMoraStore.setOrbState()` weitergeleitet werden

Beispiel was fehlt:
```typescript
if (data.orbState) {
    useMoraStore.getState().setOrbState(data.orbState as OrbState);
    continue; // nicht als Token rendern
}
```

#### 4.3 `MoraInsightPopup` triggern
Neue Komponente in `components/mora/MoraInsightPopup.tsx`.
Braucht einen Trigger: Poll auf `/v1/mindloop?limit=1` alle 30s,
wenn neues `insight`-Event → Popup zeigen.
Am besten in `lib/hooks/useMindLoop.ts` oder ähnlich.

---

### 🟡 P1 — Stabilisierung

#### 4.4 Branch-Hygiene auf GitHub
```bash
# stabilize/phaseAB → main mergen (Frontend)
cd /root/saimor/ui
git checkout main
git merge stabilize/phaseAB
git push origin main

# Oder via GitHub PR
```

#### 4.5 `awareness_status: "disabled"` im Health Check
```json
{"status":"healthy","awareness_status":"disabled",...}
```
Awareness ist disabled — prüfen warum. In `core/services/awareness_service.py` oder `app.py`.

#### 4.6 Zero-Downtime Deployment Script
Das letzte Deployment hatte ~4min Downtime weil compose `core` und `ui` gleichzeitig neu erstellt.
Schreibe `/root/saimor/ops/deploy.sh` der:
1. `ui` baut, dann hot-swapped
2. `core` baut, dann hot-swapped
3. Caddy nie ohne Backend lässt

---

### 🟢 P2 — Features

#### 4.7 MindLoop WebSocket statt Polling
Aktuell pollt Frontend `/v1/awareness/pulse` alle 60s.
Besser: WebSocket `ws://api.saimor.world/v1/ws/mindloop` der Events pushed.

#### 4.8 `/v1/mindloop` GET Endpoint
Fehlende REST Liste:
```python
@router.get("/")
def list_events(limit: int = 20, event_type: Optional[str] = None):
    ...
```

---

## 5. Wichtige Dateipfade auf dem Server

```
/root/saimor/
├── ui/                    ← Next.js Frontend
├── core/                  ← FastAPI Backend
│   ├── core/              ← Python App
│   │   ├── app.py
│   │   ├── api/v1/endpoints/
│   │   │   ├── chat.py        ← SSE streaming
│   │   │   ├── awareness.py   ← /pulse
│   │   │   └── mindloop.py    ← /insight endpoints
│   │   ├── mindloop/
│   │   │   └── store.py       ← In-memory + SQLite
│   │   └── services/
│   │       ├── context_assembly.py
│   │       └── ai_provider_service.py
│   └── data/saimor_universe.db  ← SQLite (MindLoop + Universe)
└── ops/
    ├── docker-compose.yml   ← Main compose stack
    └── Caddyfile            ← Reverse proxy config

/home/deploy/saimor-core/    ← NEUER Agent Gateway (separates Projekt)
    ├── docker-compose.yml   ← gateway + agent-worker + postgres + redis
    ├── gateway/             ← FastAPI gateway (crasht gerade)
    └── agent-worker/        ← Background workers
```

## 6. Deployment-Workflow

```bash
# Auf dem Server (nach git pull):
cd /root/saimor/ops
docker compose up -d --build ui    # nur UI
docker compose up -d --build core  # nur Core

# Health checks:
docker exec saimor-core-1 python3 -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8081/v1/health').read().decode())"
docker logs saimor-ui-1 --tail 5
```

## 7. Koordination mit Claude

- Claude arbeitet auf Branch `stabilize/phaseAB` (UI-Sachen)
- Du arbeitest direkt auf `main` für core, oder auf neuem Branch für Frontend-SSE-Fixes
- Wenn du Frontend-Änderungen machst: auf `stabilize/phaseAB` commiten, Claude picked sie auf

---

*Briefing erstellt von Claude Sonnet 4.6 — 2026-02-27*
