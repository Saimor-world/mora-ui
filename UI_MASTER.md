# MÔRA-UI MASTER DOC
Status: konsolidiert am 2025-11-11 · Dossier v1.2 = stabil nach Sanity Cycle (Core 8081 / UI 3002)

---

## 1. Projektkontext
Môra-UI ist die Next.js-15-Oberfläche des Saimôr/Môra-OS-Stacks. Sie stellt Lens (Navigation), Canvas (Folder-/Field-Mode), Insights (Workflows/Broadcasts) und das Chat-Overlay bereit und konsumiert reale Daten aus der Core-API (`http://localhost:8081`). Ziel: eine überprüfbare, demo-fähige Oberfläche inklusive Diagnostics und Fallback-UX für Januar 2026.

---

## 2. Aktueller IST-Stand
- **Config System (IST)** – `lib/config.ts` liefert geprüfte ENV-Werte (inkl. Fallbacks und Warnungen) und wird überall über Helper verwendet.
- **API Client (IST)** – `lib/api.ts` kapselt `authFetch` mit Timeout, Custom-Errors und Health-Check. `useMemoryFacts` / `useSnapshots` nutzen ihn bereits.
- **Diagnostics Panel (IST)** – `components/diagnostics/DiagnosticsPanel.tsx` zeigt Badge + Statusdetails, wenn `NEXT_PUBLIC_ENABLE_DIAGNOSTICS=true` und Dev-Build aktiv sind; der neue Export-Button liefert JSONL-Einträge gem. Protokoll. Health Export = ✅ (11 Nov 2025, Core 8081 / UI 3002).
- **Diagnostics Logging (IST)** – `docs/DIAGNOSTICS_LOGGING.md` + `docs/DIAGNOSTICS_EXPORT_GUIDE.md` definieren Aufnahme + Archivierung, Export ist ausschließlich in Dev sichtbar und kopiert Einträge in Clipboard & Konsole.
- **Fallback UI (IST)** – `CoreOfflineMessage` wird in Canvas, Insights und Chat automatisch angezeigt, wenn `useHealthCheck` einen Fehlerzustand (`unreachable|error|unauthorized`) meldet. Retry triggert das Health-Refetching, statt kryptischer Fehler.
- **Orb Filter (IST)** – Lens bindet `OrbFilter` ein und `useMemoryFacts` akzeptiert den `orb`-Parameter; Folder- und Insights-Ansichten zeigen nur die selektierte Orb-Sicht.
- **OrbFilter + Chat Pipeline (IST)** – AppContext hält den aktiven Orb, Lens/Folder/Insights geben ihn an `useMemoryFacts`/`api.getObjects?orb` weiter und `MoraChat` bleibt via `useChatData`+Offline-Gate deckungsgleich (Sanity-Check 2025-11-11).
- **Chat (IST)** – `MoraChat` nutzt `useChatData()` (objects oder semantic) für Suche/List/Stats, generiert Antworten daraus und respektiert Offline-Zustände.
- **Diagnostics/Teststatus (IST)** – Dev-Server (`npm run dev` → Port 3002) startet ohne Fehler, Snapshots/Objects werden über React Query geladen, Health-Check ist eingebaut und steuert sowohl Diagnostics Badge als auch die CoreOfflineMessage-Gates.
- **System-Adapter (IST)** – `/v1/system/adapters` liefert optional ein `adapters[]`-Array; UI nutzt es defensiv (kein Blocker, falls leer).
- **Lokaler Quicktest (IST)**  
  - Core (`http://localhost:8081`) läuft und `.env.local` enthält ein gültiges `NEXT_PUBLIC_JWT_TOKEN` (Fallback `NEXT_PUBLIC_ADMIN_TOKEN` bleibt leer).  
  - `npm run dev` startet auf Port 3002 ohne Config-Warnungen; Diagnostics-Badge zeigt nach `Refresh` den Health-Status ✅.  
  - Lens/Folder/Canvas/Insights/Chat laden echte Objects/Snapshots; Badge bleibt grün, während Chat-Fenster live Daten durchsucht.

Alle Aussagen basieren auf überprüfbaren Dateien (siehe Abschnitt 7) und manuell sichtbaren Komponenten; keine Featureversprechen ohne Codebasis.
- **Demo-Daten Kennzeichnung (IST)** – Mock-Daten werden mit "Demo-Daten"-Badge visualisiert:
  - `lib/types.ts` enthält `source?: 'mock' | 'real'` im MoraObject-Interface.
  - `lib/broadcastStore.ts` enthält `source` im BroadcastMessage-Interface.
  - **ListView** (`FolderMode`): Gelbes "Demo-Daten"-Badge neben Objects mit `source: "mock"`.
  - **FieldMode Stats-Overlay**: "Demo-Daten"-Badge wenn Mock-Snapshots verwendet werden.
  - **FieldMode Node Detail Panel**: "Demo"-Badge bei Mock-Nodes.
  - **BroadcastInbox**: "Demo"-Badge bei Mock-Broadcasts.
  - **ContextPanel**: "Demo"-Badge bei selektiertem Mock-Object.
  - Fehlende Felder werden defensiv gerendert: `path || spaceId || '—'`, Tags zeigen "—" wenn leer, Timestamps ebenfalls.
  - Keine produktiven Behauptungen über Echtzeit-/Live-Daten bei Mock-Quellen.
- **Adapter Status (IST)** – Diagnostics Panel zeigt Adapter-Status:
  - Neuer Block "Adapter Status" nach Health Status im Diagnostics Panel.
  - Ruft `/v1/system/adapters` ab (Falls endpoint nicht verfügbar: "Adapter-Status nicht verfügbar").
  - Zeigt Adapter-Liste mit Name und Status-Label:
    - 🟢 **Live-Daten** (real adapter)
    - 🟠 **Demo-Daten** (mock adapter)
    - 🟡 **Degraded** (degraded adapter, Warnhinweis)
    - 🔴 **Offline** (offline adapter, Fehlerhinweis)
  - Unterstützt `adapter` field oder `status` field als Fallback.
  - Fehlertoleranz: Bei 404/Fehler keine Blocking-UI, nur console.warn und Fallback-Text.
- **Upload & Monitoring Platzhalter (IST)** – Geplante Features visualisiert in Insights:
  - `DataUploadPlaceholder.tsx` zeigt disabled Drop-Zone mit "Coming Soon"-Badge.
  - Hinweis auf geplanten Endpoint `/v1/upload` (CSV/JSON).
  - `MonitoringPlaceholder.tsx` zeigt disabled Metrics/Audit-Log-Bereiche.
  - Hinweise auf geplante Endpoints: `/metrics`, `/v1/system/audit`.
  - Beide Komponenten in Insights-Panel integriert (nur Visual, keine echten Requests).


---

## Core Connectivity (IST)
- `curl http://localhost:8081/v1/health` am 2025-11-11 08:55 CET lieferte `{"status":"healthy","timestamp":"2025-11-11T08:55:22.734408Z"}` – Core antwortet stabil.
- Das Diagnostics Panel nutzt denselben React-Query-Key (`useHealthCheck`), daher werden Badge und neue CoreOfflineMessage-Sperren synchron mit diesem Health-Status aktualisiert.
- `C:\Users\mf4hr\saimor-core\core\app.py` enthält `http://localhost:3002` in `_allowed_origins`; der Next.js Dev-Port ist damit offiziell freigeschaltet.
- Log-Vorgaben für Health-Checks sind in `docs/DIAGNOSTICS_LOGGING.md` dokumentiert und sollen bei jeder Session angewendet werden.

---

## 3. Architektur & ENV Variablen
**Zentrale Dateien**
- `app/page.tsx` – Layout (Lens • Canvas • Insights • Chat • Diagnostics) wrapped von `QueryProvider` und `AppProvider`.
- `lib/contexts.tsx` – globale View- und Selection-States.
- `lib/queryClient.tsx` – React-Query-Konfiguration (5 min stale, 10 min cache).
- `lib/hooks/useApi.ts` & `lib/hooks/useChatData.ts` – Datenzugriffsschicht.
- `components/*` – Feature-Module (Diagnostics, Errors, Lens, Canvas, Insights, Chat).

**ENV Keys (aus `.env.local.example`)**

| Key | Beschreibung | Pflicht |
| --- | --- | --- |
| `NEXT_PUBLIC_CORE_API_URL` | Basis der Core-API (Standard: `http://localhost:8081`). | Ja |
| `NEXT_PUBLIC_JWT_TOKEN` (Fallback `NEXT_PUBLIC_ADMIN_TOKEN`) | JWT für alle authFetch-Aufrufe. | Ja |
| `NEXT_PUBLIC_CHAT_SOURCE` | `objects` (aktuell aktiv) oder `semantic` (bereitet semantische Suche vor). | Ja |
| `NEXT_PUBLIC_ENABLE_DIAGNOSTICS` | Schaltet Diagnostics-Badge in Dev frei (Production → `false`). | Ja |
| `NEXT_PUBLIC_N8N_EMAIL_DIGEST`, `_BROADCAST_DOC`, `_DUPLICATE_HUNTER` | Optional; ohne Werte laufen Workflows im Simulationsmodus. | Optional |
| `NEXT_PUBLIC_AUTH_HEADER` | Optional: Header-Name für den JWT (Default `Authorization`). | Optional |

**API-Endpunkte (bereits implementiert)**
- `GET /v1/objects?orb=<slug>` – Listet Objekte (15 reale Datensätze vorhanden).
- `GET /v1/relations`, `GET /v1/snapshots` – Datenquellen für Field Mode.
- `POST /v1/semantic/search`, `/v1/semantic/suggest-broadcasts` – vorbereitet für `semantic` Chat-Quelle.
- `GET /v1/health` – ungeauthed Ping (Diagnostics Panel).
- `GET /v1/system/adapters` – Adapter-Status (optional, zeigt Mock/Real/Offline pro Modul).
- `POST /v1/upload` – Stub (202) für zukünftige CSV/JSON Uploads, keine Persistenz – UI nutzt nur Platzhalter.
- `GET /v1/system/audit` – Stub (200) für Audit-Panel, keine Persistenz – UI bleibt visuell.

**API-Endpunkte (geplant)**
- `POST /v1/upload` – Data Upload für CSV/JSON (Placeholder in UI vorhanden).
- `GET /metrics` – System Metrics (Placeholder in UI vorhanden).
- `GET /v1/system/audit` – Audit Log (Placeholder in UI vorhanden).

**Ports & CORS**
- Frontend fix auf Port 3002 (`package.json > dev`).
- Core-CORS muss `http://localhost:3002` erlauben (siehe `CORS_REQUIREMENT.md`; altes Dokument nennt noch 3004 → beim Backend-Update korrigieren).

---

## Auth & ENV Validation
- **Token-Priorität:** `lib/config.ts` liest zuerst `NEXT_PUBLIC_JWT_TOKEN`, fällt bei leerem Wert automatisch auf `NEXT_PUBLIC_ADMIN_TOKEN` zurück und meldet in Dev klar, wenn beide fehlen (Hinweis auf `.env.local.example`).
- **Header-Kontrolle:** `lib/api.ts` bezieht den Header-Namen aus `NEXT_PUBLIC_AUTH_HEADER` (Standard `Authorization`) und setzt konsequent `Authorization: Bearer <token>` (bzw. mit custom Header).
- **Fehlerbehandlung:**
  - **Fehlender Token:** Roter Toast ("JWT Token fehlt oder ist leer...") + `ApiUnauthorizedError`, aber kein UI-Crash.
  - **401 Unauthorized:** Roter Toast ("Authentication failed (401)...") + `ApiUnauthorizedError`.
  - **403 Forbidden:** Roter Toast ("Zugriff verweigert (403)...") + `ApiError(403)`.
- **Runtime-Signal:** Bei fehlendem oder ungültigem Token erscheint Toast, `authFetch` stoppt, ohne das UI abzuschießen. Alle Hooks/Components zeigen leere States + Hinweis statt Crash.

---

## 4. LLM-Strategie (Frontend-Sicht)
- **IST** – Chat bezieht alle Antworten indirekt über Core (`/v1/objects` o. ä.). Core selbst verwendet heute die Claude API. Frontend unterscheidet nicht zwischen Claude oder lokalem Modell.
- **GEPLANT** – Laut `docs/LLM_SWITCH.md` führt der Core eine ENV `LLM_PROVIDER=external|local` ein und kann auf Ollama/vLLM (z. B. Mistral 7B) umschalten. Frontend bleibt unverändert; `MoraChat` konsumiert weiterhin nur Core-Endpunkte. Wichtige zusätzliche ENV (Core-seitig) wären `LLM_LOCAL_BASE_URL`, `LLM_LOCAL_MODEL`, `ANTHROPIC_API_KEY`.

---

## 5. Roadmap bis Jan 2026
1. **Stabilisierung der Core-Verbindung & Diagnostics (GEPLANT, KW 45)** – Health-Checks regelmäßig ausführen, CORS für Port 3002 final anpassen, Diagnostics-Badge als Standard-Testschritt etablieren.
2. **OrbFilter + Chat-Datasource live schalten (GEPLANT, KW 46)** – Lens/Objects wirklich über `?orb` filtern, `MoraChat` auf `useChatData` umziehen und Source-Toggle exponieren.
3. **Fallback-UX & 3D-Mycelium solidifizieren (GEPLANT, KW 47)** – `CoreOfflineMessage` zentral einsetzen, optionale Rückkehr zur React-Three-Fiber-Szene wenn WebGL stabil ist.
4. **LLM-Switch Vorarbeit + Deployment-Pfade (GEPLANT, KW 48–50)** – Backend-ENV `LLM_PROVIDER` testen, Ollama-Guides anwenden, Vercel/Hetzner Deployment finalisieren inkl. Auth-Plan.
5. **Demo/Prod Readiness (GEPLANT, bis Jan 2026)** – End-to-End Testlauf mit echtem Core, Workflows mit n8n-Webhooks, Monitoring/Latency in Diagnostics ergänzen.

---

## 6. Offene Punkte / TODOs
- **Diagnostics Logging** – Health/Ping funktioniert; es fehlt weiterhin ein klarer Prozess, wann Panel-Ergebnisse dokumentiert werden (z. B. automatischer Logeintrag).
- **Error Toasts** – Fehlermeldungen erscheinen nur als Console-Warnung; UI-Feedback (Toast/Alert) fehlt weiterhin.
- **3D-Mycelium** – Canvas-2D-Version ist aktiv, die ursprüngliche React-Three-Fiber-Szene bleibt aufgrund WebGL-Issues deaktiviert; Re-Enable sobald Browser/GPU stabil sind.
- **Auth & Deployment** – Noch keine User Auth oder Prod Deployment; Guides vorhanden, Umsetzung steht aus.

---

## 7. Quellen & Referenzen
- `README.md` – Quickstart, ENV-Doku, Diagnostics-/Chat-Hinweise (Stand 2025-11-10).
- `.env.local.example` – Vollständige Liste der benötigten Variablen.
- `lib/config.ts`, `lib/api.ts`, `lib/hooks/useApi.ts`, `lib/hooks/useChatData.ts` – Technische Implementierung der beschriebenen Systeme.
- `components/diagnostics/DiagnosticsPanel.tsx`, `components/errors/CoreOfflineMessage.tsx`, `components/lens/OrbFilter.tsx`, `components/chat/MoraChat.tsx`, `components/canvas/FieldMode.tsx`, `components/insights/WorkflowRunner.tsx` – Codebelege für den IST-Stand der Module.
- `docs/DIAGNOSTICS_LOGGING.md`, `docs/DIAGNOSTICS_EXPORT_GUIDE.md`, `docs/LLM_SWITCH.md` – Logging-/Export- bzw. LLM-Spezifikationen.
- `CORS_REQUIREMENT.md`, `TEST_GUIDE.md`, `DEMO_GUIDE.md` – Hintergrund für Port-/Testing-Details (teils veraltet, aber Fakten geprüft).

Alle Aussagen in diesem Dokument wurden gegen diese Quellen abgeglichen; ältere Logs (PROJECT_STATUS, PHASE*_COMPLETE, FINAL_SUMMARY etc.) dienen nur noch der Historie und flossen nicht in den IST-Status ein.

---

**Letztes Update:** 2025‑11‑11 · Verantwortlich: Codex Agent  
Dieses Dokument ersetzt alle vorherigen Status-Zusammenfassungen für mora-ui.
