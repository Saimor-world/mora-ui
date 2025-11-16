# M├öRA-UI MASTER DOC
Status: konsolidiert am 2025-11-11 ┬╖ Dossier v1.2 = stabil nach Sanity Cycle (Core 8081 / UI 3002)

---

## 1. Projektkontext
M├┤ra-UI ist die Next.js-15-Oberfl├ñche des Saim├┤r/M├┤ra-OS-Stacks. Sie stellt Lens (Navigation), Canvas (Folder-/Field-Mode), Insights (Workflows/Broadcasts) und das Chat-Overlay bereit und konsumiert reale Daten aus der Core-API (`http://localhost:8081`). Ziel: eine ├╝berpr├╝fbare, demo-f├ñhige Oberfl├ñche inklusive Diagnostics und Fallback-UX f├╝r JanuarΓÇ»2026.

---

## 2. Aktueller IST-Stand
- **Config System (IST)** ΓÇô `lib/config.ts` liefert gepr├╝fte ENV-Werte (inkl. Fallbacks und Warnungen) und wird ├╝berall ├╝ber Helper verwendet.
- **API Client (IST)** ΓÇô `lib/api.ts` kapselt `authFetch` mit Timeout, Custom-Errors und Health-Check. `useMemoryFacts` / `useSnapshots` nutzen ihn bereits.
- **Diagnostics Panel (IST)** ΓÇô `components/diagnostics/DiagnosticsPanel.tsx` zeigt Badge + Statusdetails, wenn `NEXT_PUBLIC_ENABLE_DIAGNOSTICS=true` und Dev-Build aktiv sind; der neue Export-Button liefert JSONL-Eintr├ñge gem. Protokoll. Health Export = Γ£à (11 Nov 2025, Core 8081 / UI 3002).
- **Diagnostics Logging (IST)** ΓÇô `docs/DIAGNOSTICS_LOGGING.md` + `docs/DIAGNOSTICS_EXPORT_GUIDE.md` definieren Aufnahme + Archivierung, Export ist ausschlie├ƒlich in Dev sichtbar und kopiert Eintr├ñge in Clipboard & Konsole.
- **Fallback UI (IST)** ΓÇô `CoreStatusBanner` wird in Canvas, Insights und Chat automatisch angezeigt, wenn `useHealthCheck` einen Fehlerzustand (`unreachable|error|unauthorized`) meldet. Retry triggert das Health-Refetching, statt kryptischer Fehler.
- **Orb Filter (IST)** ΓÇô Lens bindet `OrbFilter` ein und `useMemoryFacts` akzeptiert den `orb`-Parameter; Folder- und Insights-Ansichten zeigen nur die selektierte Orb-Sicht.
- **OrbFilter + Chat Pipeline (IST)** ΓÇô AppContext h├ñlt den aktiven Orb, Lens/Folder/Insights geben ihn an `useMemoryFacts`/`api.getObjects?orb` weiter und `MoraChat` bleibt via `useChatData`+Offline-Gate deckungsgleich (Sanity-Check 2025-11-11).
- **Chat (IST)** ΓÇô `MoraChat` nutzt `useChatData()` (objects oder semantic) f├╝r Suche/List/Stats, generiert Antworten daraus und respektiert Offline-Zust├ñnde.
- **Diagnostics/Teststatus (IST)** ΓÇô Dev-Server (`npm run dev` ΓåÆ PortΓÇ»3002) startet ohne Fehler, Snapshots/Objects werden ├╝ber React Query geladen, Health-Check ist eingebaut und steuert sowohl Diagnostics Badge als auch die CoreStatusBanner-Gates.
- **System-Adapter (IST)** ΓÇô `/v1/system/adapters` liefert optional ein `adapters[]`-Array; UI nutzt es defensiv (kein Blocker, falls leer).
- **Lokaler Quicktest (IST)**  
  - Core (`http://localhost:8081`) l├ñuft und `.env.local` enth├ñlt ein g├╝ltiges `NEXT_PUBLIC_JWT_TOKEN` (Fallback `NEXT_PUBLIC_ADMIN_TOKEN` bleibt leer).  
  - `npm run dev` startet auf PortΓÇ»3002 ohne Config-Warnungen; Diagnostics-Badge zeigt nach `Refresh` den Health-Status Γ£à.  
  - Lens/Folder/Canvas/Insights/Chat laden echte Objects/Snapshots; Badge bleibt gr├╝n, w├ñhrend Chat-Fenster live Daten durchsucht.

Alle Aussagen basieren auf ├╝berpr├╝fbaren Dateien (siehe AbschnittΓÇ»7) und manuell sichtbaren Komponenten; keine Featureversprechen ohne Codebasis.
- **Demo-Daten Kennzeichnung (IST)** ΓÇô Mock-Daten werden mit "Demo-Daten"-Badge visualisiert:
  - `lib/types.ts` enth├ñlt `source?: 'mock' | 'real'` im MoraObject-Interface.
  - `lib/broadcastStore.ts` enth├ñlt `source` im BroadcastMessage-Interface.
  - **ListView** (`FolderMode`): Gelbes "Demo-Daten"-Badge neben Objects mit `source: "mock"`.
  - **FieldMode Stats-Overlay**: "Demo-Daten"-Badge wenn Mock-Snapshots verwendet werden.
  - **FieldMode Node Detail Panel**: "Demo"-Badge bei Mock-Nodes.
  - **BroadcastInbox**: "Demo"-Badge bei Mock-Broadcasts.
  - **ContextPanel**: "Demo"-Badge bei selektiertem Mock-Object.
  - Fehlende Felder werden defensiv gerendert: `path || spaceId || 'ΓÇö'`, Tags zeigen "ΓÇö" wenn leer, Timestamps ebenfalls.
  - Keine produktiven Behauptungen ├╝ber Echtzeit-/Live-Daten bei Mock-Quellen.
- **Adapter Status (IST)** ΓÇô Diagnostics Panel zeigt Adapter-Status:
  - Neuer Block "Adapter Status" nach Health Status im Diagnostics Panel.
  - Ruft `/v1/system/adapters` ab (Falls endpoint nicht verf├╝gbar: "Adapter-Status nicht verf├╝gbar").
  - Zeigt Adapter-Liste mit Name und Status-Label:
    - ≡ƒƒó **Live-Daten** (real adapter)
    - ≡ƒƒá **Demo-Daten** (mock adapter)
    - ≡ƒƒí **Degraded** (degraded adapter, Warnhinweis)
    - ≡ƒö┤ **Offline** (offline adapter, Fehlerhinweis)
  - Unterst├╝tzt `adapter` field oder `status` field als Fallback.
  - Fehlertoleranz: Bei 404/Fehler keine Blocking-UI, nur console.warn und Fallback-Text.
- **Upload & Monitoring Platzhalter (IST)** ΓÇô Geplante Features visualisiert in Insights:
  - `DataUploadPlaceholder.tsx` zeigt disabled Drop-Zone mit "Coming Soon"-Badge.
  - Hinweis auf geplanten Endpoint `/v1/upload` (CSV/JSON).
  - `MonitoringPlaceholder.tsx` zeigt disabled Metrics/Audit-Log-Bereiche.
  - Hinweise auf geplante Endpoints: `/metrics`, `/v1/system/audit`.
  - Beide Komponenten in Insights-Panel integriert (nur Visual, keine echten Requests).


---

## Core Connectivity (IST)
- `curl http://localhost:8081/v1/health` am 2025-11-11 08:55 CET lieferte `{"status":"healthy","timestamp":"2025-11-11T08:55:22.734408Z"}` ΓÇô Core antwortet stabil.
- Das Diagnostics Panel nutzt denselben React-Query-Key (`useHealthCheck`), daher werden Badge und neue CoreStatusBanner-Sperren synchron mit diesem Health-Status aktualisiert.
- `C:\Users\mf4hr\saimor-core\core\app.py` enth├ñlt `http://localhost:3002` in `_allowed_origins`; der Next.js Dev-Port ist damit offiziell freigeschaltet.
- Log-Vorgaben f├╝r Health-Checks sind in `docs/DIAGNOSTICS_LOGGING.md` dokumentiert und sollen bei jeder Session angewendet werden.

---

## 3. Architektur & ENV Variablen
**Zentrale Dateien**
- `app/page.tsx` ΓÇô Layout (Lens ΓÇó Canvas ΓÇó Insights ΓÇó Chat ΓÇó Diagnostics) wrapped von `QueryProvider` und `AppProvider`.
- `lib/contexts.tsx` ΓÇô globale View- und Selection-States.
- `lib/queryClient.tsx` ΓÇô React-Query-Konfiguration (5ΓÇ»min stale, 10ΓÇ»min cache).
- `lib/hooks/useApi.ts` & `lib/hooks/useChatData.ts` ΓÇô Datenzugriffsschicht.
- `components/*` ΓÇô Feature-Module (Diagnostics, Errors, Lens, Canvas, Insights, Chat).

**ENV Keys (aus `.env.local.example`)**

| Key | Beschreibung | Pflicht |
| --- | --- | --- |
| `NEXT_PUBLIC_CORE_API_URL` | Basis der Core-API (Standard: `http://localhost:8081`). | Ja |
| `NEXT_PUBLIC_JWT_TOKEN` (Fallback `NEXT_PUBLIC_ADMIN_TOKEN`) | JWT f├╝r alle authFetch-Aufrufe. | Ja |
| `NEXT_PUBLIC_CHAT_SOURCE` | `objects` (aktuell aktiv) oder `semantic` (bereitet semantische Suche vor). | Ja |
| `NEXT_PUBLIC_ENABLE_DIAGNOSTICS` | Schaltet Diagnostics-Badge in Dev frei (Production ΓåÆ `false`). | Ja |
| `NEXT_PUBLIC_N8N_EMAIL_DIGEST`, `_BROADCAST_DOC`, `_DUPLICATE_HUNTER` | Optional; ohne Werte laufen Workflows im Simulationsmodus. | Optional |
| `NEXT_PUBLIC_AUTH_HEADER` | Optional: Header-Name f├╝r den JWT (Default `Authorization`). | Optional |

**API-Endpunkte (bereits implementiert)**
- `GET /v1/objects?orb=<slug>` ΓÇô Listet Objekte (15 reale Datens├ñtze vorhanden).
- `GET /v1/relations`, `GET /v1/snapshots` ΓÇô Datenquellen f├╝r Field Mode.
- `POST /v1/semantic/search`, `/v1/semantic/suggest-broadcasts` ΓÇô vorbereitet f├╝r `semantic` Chat-Quelle.
- `GET /v1/health` ΓÇô ungeauthed Ping (Diagnostics Panel).
- `GET /v1/system/adapters` ΓÇô Adapter-Status (optional, zeigt Mock/Real/Offline pro Modul).
- `POST /v1/upload` ΓÇô Stub (202) f├╝r zuk├╝nftige CSV/JSON Uploads, keine Persistenz ΓÇô UI nutzt nur Platzhalter.
- `GET /v1/system/audit` ΓÇô Stub (200) f├╝r Audit-Panel, keine Persistenz ΓÇô UI bleibt visuell.

**API-Endpunkte (geplant)**
- `POST /v1/upload` ΓÇô Data Upload f├╝r CSV/JSON (Placeholder in UI vorhanden).
- `GET /metrics` ΓÇô System Metrics (Placeholder in UI vorhanden).
- `GET /v1/system/audit` ΓÇô Audit Log (Placeholder in UI vorhanden).

**Ports & CORS**
- Frontend fix auf PortΓÇ»3002 (`package.json > dev`).
- Core-CORS muss `http://localhost:3002` erlauben (siehe `CORS_REQUIREMENT.md`; altes Dokument nennt noch 3004 ΓåÆ beim Backend-Update korrigieren).

---

## Auth & ENV Validation
- **Token-Priorit├ñt:** `lib/config.ts` liest zuerst `NEXT_PUBLIC_JWT_TOKEN`, f├ñllt bei leerem Wert automatisch auf `NEXT_PUBLIC_ADMIN_TOKEN` zur├╝ck und meldet in Dev klar, wenn beide fehlen (Hinweis auf `.env.local.example`).
- **Header-Kontrolle:** `lib/api.ts` bezieht den Header-Namen aus `NEXT_PUBLIC_AUTH_HEADER` (Standard `Authorization`) und setzt konsequent `Authorization: Bearer <token>` (bzw. mit custom Header).
- **Fehlerbehandlung:**
  - **Fehlender Token:** Roter Toast ("JWT Token fehlt oder ist leer...") + `ApiUnauthorizedError`, aber kein UI-Crash.
  - **401 Unauthorized:** Roter Toast ("Authentication failed (401)...") + `ApiUnauthorizedError`.
  - **403 Forbidden:** Roter Toast ("Zugriff verweigert (403)...") + `ApiError(403)`.
- **Runtime-Signal:** Bei fehlendem oder ung├╝ltigem Token erscheint Toast, `authFetch` stoppt, ohne das UI abzuschie├ƒen. Alle Hooks/Components zeigen leere States + Hinweis statt Crash.

---

## 4. LLM-Strategie (Frontend-Sicht)
- **IST** ΓÇô Chat bezieht alle Antworten indirekt ├╝ber Core (`/v1/objects` o.ΓÇ»├ñ.). Core selbst verwendet heute die Claude API. Frontend unterscheidet nicht zwischen Claude oder lokalem Modell.
- **GEPLANT** ΓÇô Laut `docs/LLM_SWITCH.md` f├╝hrt der Core eine ENV `LLM_PROVIDER=external|local` ein und kann auf Ollama/vLLM (z.ΓÇ»B. MistralΓÇ»7B) umschalten. Frontend bleibt unver├ñndert; `MoraChat` konsumiert weiterhin nur Core-Endpunkte. Wichtige zus├ñtzliche ENV (Core-seitig) w├ñren `LLM_LOCAL_BASE_URL`, `LLM_LOCAL_MODEL`, `ANTHROPIC_API_KEY`.

---

## 5. Roadmap bis JanΓÇ»2026
1. **Stabilisierung der Core-Verbindung & Diagnostics (GEPLANT, KWΓÇ»45)** ΓÇô Health-Checks regelm├ñ├ƒig ausf├╝hren, CORS f├╝r PortΓÇ»3002 final anpassen, Diagnostics-Badge als Standard-Testschritt etablieren.
2. **OrbFilter + Chat-Datasource live schalten (GEPLANT, KWΓÇ»46)** ΓÇô Lens/Objects wirklich ├╝ber `?orb` filtern, `MoraChat` auf `useChatData` umziehen und Source-Toggle exponieren.
3. **Fallback-UX & 3D-Mycelium solidifizieren (GEPLANT, KWΓÇ»47)** ΓÇô `CoreStatusBanner` zentral einsetzen, optionale R├╝ckkehr zur React-Three-Fiber-Szene wenn WebGL stabil ist.
4. **LLM-Switch Vorarbeit + Deployment-Pfade (GEPLANT, KWΓÇ»48ΓÇô50)** ΓÇô Backend-ENV `LLM_PROVIDER` testen, Ollama-Guides anwenden, Vercel/Hetzner Deployment finalisieren inkl. Auth-Plan.
5. **Demo/Prod Readiness (GEPLANT, bis JanΓÇ»2026)** ΓÇô End-to-End Testlauf mit echtem Core, Workflows mit n8n-Webhooks, Monitoring/Latency in Diagnostics erg├ñnzen.

---

## 5. Demo-View-Zust├ñnde
- **Field Mode** ΓÇô Zeigt Spinner ΓÇ₧M├┤ra sammelt Field-Daten ΓÇªΓÇ£, sobald Snapshots geladen werden. Wenn keine Nodes im aktuellen Snapshot vorhanden sind, erscheint der Hinweis ΓÇ₧Noch keine Field-ImpulseΓÇ£; Auswahl synchronisiert weiter ins Insights-Panel.
- **Folder Mode** ΓÇô Leerer Folder meldet ΓÇ₧Keine Dokumente im aktuellen BlickΓÇ£, Hover-Toolbar ist auch per Tastatur erreichbar (Fokus blendet Quick Actions ein).
- **Insights Panel** ΓÇô Ohne Auswahl fordert das Context-Panel klar auf, ein Objekt im Field oder Folder zu w├ñhlen; bei Offline/Auth greift der CoreStatusBanner mit identischem Retry-Flow.
- **M├┤ra Chat** ΓÇô Offline/Auth nutzt ebenfalls den CoreStatusBanner; Header weist explizit auf den Demo-Modus hin, Antworten spiegeln weiterhin Mock-Objects wider.

## 6. Offene Punkte / TODOs
- **Diagnostics Logging** ΓÇô Health/Ping funktioniert; es fehlt weiterhin ein klarer Prozess, wann Panel-Ergebnisse dokumentiert werden (z.ΓÇ»B. automatischer Logeintrag).
- **Error Toasts** ΓÇô Fehlermeldungen erscheinen nur als Console-Warnung; UI-Feedback (Toast/Alert) fehlt weiterhin.
- **3D-Mycelium** ΓÇô Canvas-2D-Version ist aktiv, die urspr├╝ngliche React-Three-Fiber-Szene bleibt aufgrund WebGL-Issues deaktiviert; Re-Enable sobald Browser/GPU stabil sind.
- **Auth & Deployment** ΓÇô Noch keine User Auth oder Prod Deployment; Guides vorhanden, Umsetzung steht aus.

---

## 7. Quellen & Referenzen
- `README.md` ΓÇô Quickstart, ENV-Doku, Diagnostics-/Chat-Hinweise (Stand 2025-11-10).
- `.env.local.example` ΓÇô Vollst├ñndige Liste der ben├╢tigten Variablen.
- `lib/config.ts`, `lib/api.ts`, `lib/hooks/useApi.ts`, `lib/hooks/useChatData.ts` ΓÇô Technische Implementierung der beschriebenen Systeme.
- `components/diagnostics/DiagnosticsPanel.tsx`, `components/errors/CoreStatusBanner.tsx`, `components/lens/OrbFilter.tsx`, `components/chat/MoraChat.tsx`, `components/canvas/FieldMode.tsx`, `components/insights/WorkflowRunner.tsx` ΓÇô Codebelege f├╝r den IST-Stand der Module.
- `docs/DIAGNOSTICS_LOGGING.md`, `docs/DIAGNOSTICS_EXPORT_GUIDE.md`, `docs/LLM_SWITCH.md` ΓÇô Logging-/Export- bzw. LLM-Spezifikationen.
- `CORS_REQUIREMENT.md`, `TEST_GUIDE.md`, `DEMO_GUIDE.md` ΓÇô Hintergrund f├╝r Port-/Testing-Details (teils veraltet, aber Fakten gepr├╝ft).

Alle Aussagen in diesem Dokument wurden gegen diese Quellen abgeglichen; ├ñltere Logs (PROJECT_STATUS, PHASE*_COMPLETE, FINAL_SUMMARY etc.) dienen nur noch der Historie und flossen nicht in den IST-Status ein.

---

**Letztes Update:** 2025ΓÇæ11ΓÇæ11 ┬╖ Verantwortlich: Codex Agent  
Dieses Dokument ersetzt alle vorherigen Status-Zusammenfassungen f├╝r mora-ui.


## Demo State Reference

### Field Mode
- **Loading:** Spinner + Text "Mora sammelt Snapshot-Daten. Einen Moment bitte." solange keine Live-Snapshots vorhanden sind.
- **Empty:** Hinweis "Keine Objekte im aktuellen Snapshot." mit Verweis auf Timeline/Quellen.
- **Selection:** Fokus erzeugt einen goldenen Ring, ContextPanel/Insights aktualisiert sofort.
- **Offline:** Canvas zeigt automatisch den `CoreStatusBanner` (auth/offline konsistent).

### Folder Mode
- **Empty:** Hinweis "In diesem Ordner liegen aktuell keine Objekte. Verbinde ...".
- **Sortierung:** Buttons "Name"/"Modified" mit aktivem State + Tastatur-Toolbar bleibt stabil.
- **Filter-Hinweis:** Aktive Filter werden neben dem Counter visualisiert.

### Insights Panel
- **No selection:** Neutraler Text "Waehle ein Objekt im Field oder Folder, dann halte ich hier die Details fest."
- **Selection:** Titel, Typ, Space-Fallback, Demo-Tags + Quick-Actions mit Demo-Toasts.
- **Offline:** Kompakter Banner aus `CoreStatusBanner`.

### Mora Chat
- **Offline/Auth:** `CoreStatusBanner` blockt Eingaben.
- **Keine Daten:** Hinweisbox + Demo-Antwort "Du hast gefragt ... Demo-Modus: Es sind noch keine Objekte geladen."
- **Fallback:** Jede Antwort echos die Eingabe und endet mit "(Demo-Modus - Mora liefert spaeter ...)".

### Wave 3 Manual Checks
1. `/field` ohne Daten laden ΓåÆ Spinner erscheint; danach Mock-Daten aktivieren und auf Node klicken ΓåÆ ContextPanel aktualisiert sich.
2. `/field` Timeline klicken ΓåÆ aktiver Snapshot-Chip zeigt Glow, Reset/View Buttons funktionieren.
3. `/folder` Filter setzen, leeren und per Tab in eine Row wechseln ΓåÆ Hover-Toolbar reagiert, Sortierbuttons wechseln Reihenfolge (Name vs. Modified).
4. `/insights` ohne Auswahl starten ΓåÆ Intro-Text sichtbar; danach Objekt waehlen ΓåÆ Titel/Typ/Quick-Actions inklusive Demo-Hinweis.
5. Mora Chat oeffnen ΓåÆ Offline (falls Health down) zeigt Banner; ohne Objekte Nachricht senden ΓåÆ Echo + Demo-Text; nach Mock-Sync erscheinen normale Listen/Suchen.

## Wave 4 - Demo Journey
- Home Intro weist klar auf Demo-Kontext hin (Mock-Daten, keine Produktion) und bietet einen CTA zum Neustart des Onboardings.
- Pulse-Card zeigt Core-Status (online/offline/auth), aktive Connectoren und letzten Health-Timestamp; Buttons fuer Diagnostics und Mock-Sync.
- Onboarding-Overlay fuehrt durch 3 Schritte: Verbindungen simulieren, Myzel ansehen, Chat testen (alles lokal gespeichert).
- Diagnostics ist von Home aus erreichbar (Button oeffnet das bestehende Panel), Pulse/Banner bleiben konsistent.
- Gefuehrter Flow listet naechste Schritte und Links zu Field/Folder.

### Wave 4 Manual Checks
1. Home laden: Overlay erscheint bei Erstbesuch oder via "Onboarding anzeigen".
2. Pulse-Card zeigt Core-Status und Connector-Zahl; Health offline simulieren ? Text wechselt.
3. Mock-Sync starten ? Connector-Karten springen auf "connected", Pulse-Card spiegelt die Anzahl.
4. "Diagnostics oeffnen" klickt ? Panel sichtbar; Status deckt sich mit Pulse/Banner.
5. CTAs zu Field/Folder/Chat funktionieren; Chat ohne Daten echos Eingabe mit Demo-Hinweis.

## Wave 5 Stage 1 - Home/Pulse/Onboarding
- Hero: rolle-aware Chips (Demo-Raum, Rolle, Stage), Role-Message bleibt erhalten, CTA + kleiner Onboarding-Reset.
- Pulse: kompakte Karte mit Core-Status, Connector-Anzahl und letztem Check; Aktionen fuer Diagnostics, Mock-Sync und Health-Refresh.
- Onboarding: 3 Schritte (Mock- oder echte Quellen, Field ansehen, Chat testen); auto beim ersten Besuch, jederzeit ueber CTA erneut oeffnbar.
- Layout: Sektionen auf max-w-6xl begrenzt, Awareness/Steps bleiben bestehen, Demo-Hinweise sind sachlich.

### Wave 5 Stage 1 Manual Checks
1. Home laden -> Hero-Chips (Demo-Raum/Rolle/Stage) und CTA sehen.
2. Pulse-Karte zeigt Core-Status, Connector-Zahl, "Zuletzt geprueft"; Buttons fuer Diagnostics/Mock-Sync/Health-Refresh klicken.
3. Onboarding anzeigen -> Overlay mit 3 Schritten, Weiter/Schliessen reagiert.
4. Awareness-Block zeigt letzte Impulse oder Fallback; Links zu Field/Folder bleiben erreichbar.
5. Mock-Sync aus Pulse oder Schritt 1 starten -> Connector-Karten und Pulse aktualisieren sich.

## Wave 5 Stage 2 - Field/Folder/Insights/Chat
- Field: Header/section framing im Myzel, ruhige Toolbar + Timeline im Kartenrahmen; Fokus-Gold bleibt, Reset/Legende unveraendert.
- Folder: Oberer Abschnitt mit Listen-Hero, gleiche Sort/Filter/Empty-States, Toolbar/A11y unveraendert.
- Insights/Context: Kompakte Meta-Header-Karte (Kein Objekt / Objekt ausgewaehlt), Tags/Quick-Actions bleiben, Rahmen vereinheitlicht.
- Chat: Panel-Radius/Border wie Home, Bubbles gruppiert, Input-Bar an Home-Form-Style; Antwort-Logik bleibt Demo, zentraler Reply-Hook fuer spaetere Real-API.

### Wave 5 Stage 2 Manual Checks
1. Field ÷ffnen -> Header (Myzel-Ansicht), Toolbar-Chips, goldener Fokus + Timeline-Chips wie zuvor.
2. Snapshot ohne Nodes -> Empty-State bleibt; Reset/Zoom/Legend funktionieren.
3. Folder ÷ffnen -> neuer Listen-Hero, Sortierung Name/Modified funktioniert, Hover-Toolbar per Tastatur weiterhin sichtbar; Empty-State klar.
4. Insights ÷ffnen -> ContextPanel zeigt Meta-Header; kein Objekt vs. Objekt gewΣhlt (Titel/Typ/Tags/Actions) bleibt funktionsgleich.
5. Chat togglen -> Banner bei Offline/Auth unveraendert, Echo-Antwort im Demo-Modus, Input-Bar und Bubbles im neuen Layout.
## Mycelium Model & Shared Selection (Wave 7)
- Modell: `MoraNode` (id, label, type, space, tags, meta), `MoraEdge` (source/target/kind/weight), `MoraSpace` (id/label/kind) in `lib/mycelium/model.ts`.
- Auswahl: zentral im Session-Store (`myceliumSelection`), Helper-Hook `useMyceliumSelection` verbindet UI-State mit Auswahl.
- Schreibende Flaechen: Field (Knoten-Klick) und Folder (Row-Select) setzen die Selection ohne das Awareness-Logging zu aendern.
- Lesende Flaechen: ContextPanel und Chat zeigen den gleichen Kontext (MyceliumContextChip) und leiten daraus die Antworten/Quick-Actions ab.
- Story: Wald oben, Myzel unten - der Chip benennt den Kontext aus Feld/Ordner. Semantische Auswertung ist vorbereitet und nur bei Flag aktiv; Standard bleibt das Demo-Dashboard, spaeter laeuft derselbe Pfad mit echten Organisationsdaten.
