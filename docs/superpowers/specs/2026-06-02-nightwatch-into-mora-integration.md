# Nightwatch → MÔRA: Integrations-Checkliste

**Datum:** 2026-06-02
**Ziel:** Nightwatch wird **erste Fähigkeit innerhalb von MÔRA/SAIMÔR**, kein abspaltendes Produkt.
**Prinzip:** Keine neue Vision, keine neuen Features. Nur: Nightwatch füllt den geteilten Memory Graph + erscheint als Panel im OS. Maximal **wiederverwenden**, was schon da ist.

Ist-Zustand (verifiziert):
- Nightwatch = ein n8n-Workflow (`🌙 Nightwatch – Server Monitor`) der JSON nach `/data/nightwatch/*.json` schreibt; `larry-ui` liest diese JSONs.
- CORE hat bereits: `nodes`/`relations`-Tabellen mit `tenant_id`, Qdrant-Embedding beim Node-Schreiben, v3-API, Session-Auth (`mora_session`), Preview-Tenants.
- OS hat App-Platform: `lib/apps/appRegistry.ts`, `AppLoader`, `surfaceRegistry.ts` (PaneType), `PaneManager`, und `lib/openflow/presentation.ts` (Signale → Lagebild).

---

## 1. Nightwatch schreibt in den geteilten Memory Graph

**Welche Events werden Nodes?** (nur *Zustandsänderungen* + Vorfälle — NICHT jeder Heartbeat, sonst Graph-Flut)

| Node-`type` | Wann | Embedden (Qdrant)? |
|---|---|---|
| `nightwatch.monitor` | ein Node pro überwachtem Ziel (Domain/Container/Endpoint) | nein (reiner Status) |
| `nightwatch.incident` | bei erkanntem Fehler/Statuswechsel zu down/degraded | **ja** (Titel+Summary → semantischer Recall) |
| `nightwatch.action` | wenn Larry repariert (z.B. Container-Restart) | optional |

**Node-Felder** — *keine DB-Migration*: bestehende `nodes`-Tabelle nutzen (id, tenant_id, type, title, content, created_at, updated_at, metadata JSON). Domänen-Felder in `metadata`:
- monitor: `{ target_type, host, status, last_check_at }`
- incident: `{ severity (info|warning|critical), status (open|healing|resolved|escalated), detected_at, resolved_at, monitor_id, error_summary, raw_ref }`
- action: `{ action_type, result (success|failed), executed_at, actor: "larry", details }`

**Relations:**
- `incident` —affects→ `monitor`
- `action` —resolves→ `incident` (bzw. `attempted_on`)
- `monitor` —belongs_to→ Department/Initiative (damit es im Universe am richtigen Ort erscheint)
- `incident` —linked_to→ Initiative „Infrastruktur" (optional)

**Tenant-sicher:** jeder Node trägt `tenant_id`. Self-Monitoring = Owner/System-Tenant; Kunden-Monitoring = Kunden-Tenant. **Immer über den bestehenden CORE-Node-Service schreiben (nicht direktes SQL)** → Isolation + Hooks + Embedding feuern automatisch.

**Qdrant synchron:** passiert *gratis*, wenn über den bestehenden Node-Schreibpfad geschrieben wird (der embeddet schon). Nur `incident` (sinnvoller Text) embedden, `monitor` nicht.

**Mechanismus (die Brücke):** neuer CORE-Endpoint `POST /v3/nightwatch/ingest` der ein Nightwatch-Event → Node(s)+Relations im Tenant mappt (ruft intern den Node-Service). Der n8n-Workflow/Larry ruft ihn **zusätzlich** zum JSON-Schreiben auf (additiv = null Risiko).

## 2. Dashboard als OS-Panel

- **Kein iframe** von larry-ui (Style/Auth-Bruch). Stattdessen native OS-App `apps/nightwatch/index.tsx`, die **dieselben Daten via CORE-v3 liest** (die neuen Nodes).
- **Registrieren:** Eintrag in `lib/apps/appRegistry.ts` (Manifest: id `nightwatch`, icon, defaultSize) + PaneType `nightwatch` in `surfaceRegistry.ts` + `PaneManager`/`AppLoader`.
- **Wiederverwenden:** die *präsentationalen* Teile aus `larry-ui/app/nightwatch/page.tsx` (Status-Karten, Incident-Liste, Monitor-Grid) ins OS-App portieren. Nur die Datenschicht ändert sich (JSON-Fetch → CORE-v3).
- **Standalone bleibt:** `larry.saimor.world` bleibt die Experten-/Standalone-Linse. End-Ziel: geteilte Komponenten-Bibliothek für beide. Kurzfristig: OS-Panel ist eine schlanke neue App auf CORE; larry-ui bleibt bis zur Konsolidierung.
- **API, die das Panel braucht:** `GET /v3/nightwatch/monitors`, `GET /v3/nightwatch/incidents?status=open`, `GET /v3/nightwatch/incidents/{id}` (mit Healing-Actions). Alles tenant-scoped über Session.

## 3. Gemeinsames Tenant- & Auth-Modell

- **Nightwatch-Kunde = SAIMÔR-Tenant** mit Fähigkeit „nightwatch" aktiviert. **Kein** separates Larry-/Dashboard-Konto.
- **Capability-Flag pro Tenant:** `tenant.metadata.capabilities = ['nightwatch', ...]`. OS zeigt die App nur, wenn aktiviert.
- **Geteilten `DASHBOARD_TOKEN` für kundenseitige Dash ablösen** → Standalone-Dashboard authentifiziert über dieselbe CORE-Session/JWT wie das OS. Der Token bleibt nur für interne Ops (`larry.saimor.world`-Admin).
- **Preview → Claim → Paid:**
  - Preview: Scan → `tenant-preview-*` (existiert).
  - Claim: Preview-Tenant → persistenter Tenant promoten (Daten behalten, Preview-Flag entfernen, echten User setzen).
  - Paid: Stripe-Checkout → Webhook `POST /v3/billing/webhook` setzt `tenant.plan='paid'` + schaltet Capabilities frei. Features nach Plan gaten.
  - Lifecycle-States definieren: `preview → claimed(free) → paid`.

## 4. Môra als Stimme über Nightwatch

- **Incidents erklären:** Môra liest `nightwatch.incident`-Nodes des Tenants (gleicher Graph) → fasst auf Frage „was ist mit meinem Server?" zusammen. Braucht: Nodes aus #1 + Retrieval (bestehende Node-Suche nach `type` gefiltert).
- **Reparaturen zusammenfassen:** Kette `incident —resolves→ action` lesen → „Larry hat den Container um 03:12 neu gestartet, seitdem stabil."
- **Nächste Schritte vorschlagen:** wiederkehrende Incidents am selben Ziel → Heuristik-Vorschlag. **Wiederverwenden:** Incidents → OpenFlow-Signale (`lib/openflow/presentation.ts`) → erscheinen automatisch im Home-Lagebild *und* sind für Môra greifbar.
- **Daten, die sie braucht:** incident/action/monitor-Nodes (aus #1) + Qdrant-Embeddings (semantischer Recall).

---

## 5. Minimaler 30-Tage-Plan (priorisiert)

**Woche 1 — Die Brücke (Daten zuerst). Schlüssel: alles hängt daran.**
- Node-Typen + metadata-Schema festlegen (monitor/incident/action) — keine Migration, `nodes`-Tabelle + `metadata` + `type` nutzen.
- CORE `POST /v3/nightwatch/ingest` bauen: Event → tenant-scoped Node(s)+Relations über bestehenden Node-Service (Qdrant+Hooks feuern). **TDD.**
- n8n-Workflow/Larry ruft den Endpoint **zusätzlich** zum JSON-Schreiben (additiv).
- Ergebnis: Incidents landen tenant-sicher + embedded im Memory Graph.

**Woche 2 — Sichtbar im OS (Panel).**
- OS-App `apps/nightwatch/index.tsx` liest `/v3/nightwatch/monitors` + `/incidents`. Registrieren (appRegistry + surfaceRegistry + PaneManager).
- Präsentations-Komponenten aus `larry-ui` portieren.
- Ergebnis: Nightwatch als App/Panel in MÔRA OS, liest den geteilten Graph.

**Woche 3 — Môra + Lagebild (das Schwungrad).**
- Offene Incidents → OpenFlow-Signale (`lib/openflow`) → automatisch im Home-Lagebild.
- Môra-Retrieval für Incidents (Tool/Kontext) → erklären/zusammenfassen.
- Ergebnis: Incidents auf Home, Môra spricht darüber. Der Organismus ist sichtbar *eins*.

**Woche 4 — Tenant/Auth-Vereinheitlichung + Claim.**
- Capability-Flag pro Tenant; OS zeigt Nightwatch-App nur wenn aktiv.
- Standalone-Dash authentifiziert über CORE-Session (statt geteiltem Token) für Kunden-Tenants.
- Claim verdrahten: Preview → persistenter Tenant (Daten promoten), Capability setzen. (Stripe/Paid = Folgemonat, markiert.)
- Ergebnis: Nightwatch-Nutzer *ist* SAIMÔR-Tenant; Preview→Claim funktioniert; kein separates Konto.

## Leitplanken
- Keine Heartbeat-Flut — nur Zustandswechsel + Incidents als Nodes.
- Immer über CORE-Node-Service schreiben (Isolation + Embedding), nie direktes SQL.
- Additiver Rollout — JSON-Schreiben bleibt während der Übergangsphase.
- Tenant-Isolation explizit testen (ein Tenant darf nie fremde Incidents sehen).

---

# LIVE-Status (2026-06-02) + n8n-UI-Vorlage für Schritt 4

## Live & bewiesen
- Endpoint `POST /v3/nightwatch/ingest` ist **deployt** (CORE main `14486a9`) und secret-geschützt (fail-closed).
- Kontrollierter **Test-Incident** in Production (`tenant-saimor-hq`) — bewusst **drin gelassen** als Beweis, klar markiert im Titel **„BRIDGE TEST – Nightwatch ingest verification"**:
  - incident `3cf0e849-238c-448e-8b01-6ce0e0bd089d`
  - monitor `186c5ae2-7df6-4bab-ad9b-97edca0dbb2e`
  - action `cabc0efd-62ec-4e85-9a9e-db0d82af0c2a`
  - Verifiziert: Nodes + Relations (affects/resolves) + tenant-scoped + graph-findbar. Bei Bedarf später löschbar (Titel-Marker).
- Bestehender Nightwatch-JSON-Pfad **unberührt** (history/incidents/status.json laufen weiter).

## Schritt 4 — n8n-UI-Vorlage (NICHT automatisch ausgeführt; manuell im UI, additiv)

**WO der Node hängt (entscheidend gegen Heartbeat-Flut):**
- Den neuen Node an **denselben Ausgang** hängen, der schon den **`incidents.json`-Write** speist (der Incident-Zweig) — *parallel*, nicht in Reihe: vom bestehenden Incident-Node eine zweite Verbindung zum neuen HTTP-Node ziehen.
- **NICHT** an den Schedule-Trigger und **NICHT** an den OK-/Status-Check, der jeden Zyklus läuft. Gleiche Auslöse-Bedingung wie der JSON-Write ⇒ feuert nur bei echten Incidents.

**Node:** „HTTP Request"
- **Method:** POST
- **URL:** `http://core:8081/v3/nightwatch/ingest`  (intern, im `saimor_app`-Netz erreichbar — verifiziert)
- **Authentication:** None (wir nutzen einen Header)
- **Headers:**
  - `X-Nightwatch-Secret` = `={{ $env.NIGHTWATCH_INGEST_SECRET }}`
  - `Content-Type` = `application/json`
- **Body** (Specify Body → JSON; Felder an die Incident-Datenform des Workflows anpassen):
```json
{
  "tenant_id": "tenant-saimor-hq",
  "monitor": {
    "name": "={{ $json.target || $json.host || 'unknown' }}",
    "target_type": "domain",
    "host":  "={{ $json.host || $json.target }}"
  },
  "incident": {
    "title": "={{ $json.title || ('Incident: ' + ($json.host || $json.target)) }}",
    "severity": "={{ $json.severity || 'critical' }}",
    "status": "open",
    "detected_at": "={{ $now.toISO() }}",
    "error_summary": "={{ $json.error || $json.message || '' }}"
  }
}
```
(`company_id` weggelassen → der Endpoint löst die Company des Tenants automatisch auf.)
Optional `"action": { "action_type": "...", "result": "success|failed", "details": "..." }` **nur**, wenn im selben Lauf eine Reparatur lief.

**Env-Variable in n8n ergänzen (einziger Prod-Change — braucht dein Go):**
- In `/root/saimor/ops/docker-compose.yml`, im **n8n**-Service `environment:` ergänzen:
  `- NIGHTWATCH_INGEST_SECRET=${NIGHTWATCH_INGEST_SECRET}` (Wert liegt bereits in `.env`)
- danach `docker compose up -d n8n` (nur n8n neu, Volume bleibt).
- Bis dahin ist `{{ $env.NIGHTWATCH_INGEST_SECRET }}` leer ⇒ Endpoint antwortet **401** (sicher: kein Müll im Graph, es wird nur nichts ingestet).

**Verifikation „nur Incidents, keine Heartbeats":**
1. Vorher: Anzahl `nightwatch.incident`-Nodes im Tenant zählen.
2. Den Monitor mehrere **normale OK-Zyklen** laufen lassen.
3. Erneut zählen → **muss unverändert sein** (OK-Checks erreichen den HTTP-Node nicht, da er am Incident-Zweig hängt).
4. Einen echten Down-Event abwarten/auslösen → Anzahl steigt um genau 1.
5. Quercheck im n8n: die **Execution-Zahl des HTTP-Nodes == Execution-Zahl des `incidents.json`-Writes** (nicht == Schedule-Trigger).
