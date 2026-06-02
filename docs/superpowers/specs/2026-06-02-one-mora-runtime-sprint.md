# Sprint: Eine MÔRA Runtime — Larry wird zu MÔRAs Händen

**Datum:** 2026-06-02
**Prinzip:** Keine neue Runtime, kein neuer Agent, keine neue Vision. Nur vorhandene Komponenten verbinden.
**Ziel:** MÔRA im OS fühlt sich so handlungsfähig an wie Telegram-Larry — eine Intelligenz, viele Oberflächen.

## Code-Befund (verifiziert)

- **CORE-Loop:** `core/cognition/agentic.py` (State-Machine S0→S7). Tool-Registry: `core/cognition/tools.py`. Tool-Impls: `core/actions/tools/{search,read,create,legacy}.py`.
- **Agent liefert heute schon** (`lib/api/cognitionClient.ts:151` `AgentResponse`): `final_message`, `iterations[]` (state, llm_thought, tool_name, tool_params, tool_result, requires_confirmation), `tools_executed[]` (tool, params, success, result, error), `pending_confirmations[]`, `work_session_plan?`.
- **UI verwirft fast alles:** `apps/chat/index.tsx` nutzt nur `agentResponse.final_message` (Z. 699/714/816). `iterations`/`tools_executed` werden empfangen und **weggeworfen**.
- **Confirmation-Schicht existiert bereits:** `components/mora/ConfirmationCard.tsx` + `pending_confirmations[]` + Confirm-Handling im Chat.
- **Welt-Zustand teils schon im Graph:** durch Woche 1 sind Nightwatch-Monitore/Incidents bereits Nodes → MÔRA kann sie mit den vorhandenen Graph-Tools lesen.

---

## Phase 1 — Sichtbare Handlungsfähigkeit (reiner OS-Schritt, kein Larry-Risiko)

**Daten, die schon erzeugt & verworfen werden:** `tools_executed[]` + `iterations[]`.
**Anzeigen ohne Chain-of-Thought:** NUR `tool` + `success` + ein sanitisiertes Detail (z.B. Suchbegriff/Node-Titel). **`llm_thought` NIE rendern** (das ist CoT).

Mapping tool → sichtbares Label:
- `search` → „✓ Ich habe gesucht: ‚…'"
- `read_node` / `read_folder` → „✓ Ich habe gelesen"
- (semantische/relations-Vergleiche) → „✓ Ich habe verglichen"
- `work_session_plan` → „✓ Ich habe geplant"
- `create_node` / `update_node` / `navigate` → „✓ Ich habe gehandelt"
- `success=false` → „⚠ konnte X nicht abschließen" (ehrlich, kein Fake-Haken)

**Betroffene Dateien:**
- NEU `lib/chat/toolTrace.ts` — pure Funktion `toToolTrace(tools_executed, iterations) → {icon,label,detail}[]`, **TDD**.
- NEU `components/chat/ToolTrace.tsx` — kompakte Trace-Anzeige (collapsible), kein `llm_thought`.
- EDIT `apps/chat/index.tsx` — `agentResponse.tools_executed`/`iterations` in die Assistant-`Message` übernehmen + `<ToolTrace/>` rendern.
- EDIT Message-Typ (im Chat) um `toolTrace?` ergänzen.

## Phase 2 — Erstes OpenClaw-Read-Tool

**2a (gratis, sofort):** Nightwatch-Status ist durch Woche 1 schon im Graph → MÔRAs vorhandenes `search`/`read` erreicht „Wie steht es um meine Server?" bereits. Nur prüfen, dass die Retrieval-Typenfilter `nightwatch.*` einschließen.
**2b (erstes echtes Welt-Read-Tool):** NEU `core/actions/tools/infra.py` → Tool `get_infrastructure_status` (read-only), registriert in `core/cognition/tools.py`. Liest live über das Gateway (`gateway:8000`, intern) bzw. Nightwatch-`status.json`. Liefert Container-/Domain-Status zurück.
- **API zu verbinden:** CORE → Gateway internal read (kein Public).
- **Sicherheit:** read-only, owner-Rolle + tenant-gegated, internes Netz, keine Secrets im Output. Kein Host-Mutate.

## Phase 3 — Confirmation Layer (großteils vorhanden)

Action-Tools (Container-Neustart, Mail/Telegram senden) werden in **derselben** Registry (`core/cognition/tools.py`) mit `risk_level="write"` registriert. Dann fließen sie automatisch über `pending_confirmations[]` → `ConfirmationCard.tsx` → Nutzer bestätigt → Tool-Impl ruft das Gateway (OpenClaw führt aus). **Die Confirmation-UX wird wiederverwendet, nicht neu gebaut.** Tool-Impls = dünne Gateway-Proxys.

## Phase 4 — Gemeinsamer Loop (später, größer)

Heute: OS → CORE `/v3/cognition/agent`; Telegram/Discord → OpenClaw-eigener Loop.
Konvergenz mit Vorhandenem: die **Channel-Adapter** (Telegram/Discord-Bots in larry) so umbauen, dass sie **denselben** CORE-Endpoint `/v3/cognition/agent` aufrufen (mit tenant + `surface`-Tag), statt einer eigenen Schleife. OpenClaw schrumpft auf (1) Channel-Transport + (2) Ausführungs-Tools, die CORE aufruft. Keine neue Runtime — CORE-Agent + OpenClaw-Transport/Tools wiederverwenden.

---

## 1. Ist-Zustand
```
OS-Chat ────► CORE /v3/cognition/agent ──► ToolRegistry (Graph-Tools) ──► Memory Graph
                 (liefert iterations+tools_executed, UI zeigt nur final_message)

Telegram ─┐
Discord  ─┼─► OpenClaw / larry_v2 (eigener Loop) ──► Welt-Tools (docker, mail, channels)
Dashboard ┘                                          (eigenes Gedächtnis, NICHT der Graph)
```
Zwei Loops, zwei Werkzeugkästen, zwei „Wer".

## 2. Ziel-Zustand
```
OS · Telegram · Discord · Dashboard · Voice   (dünne Adapter + surface-Tag)
            \         \       |      /        /
             ──────► CORE /v3/cognition/agent  (EIN Loop, EINE Persönlichkeit)
                          │
        ┌─────────────────┼──────────────────┐
   Memory (geteilt)   EINE Tool-Registry   Trigger (chat/schedule/event)
   Graph+Qdrant       ├ Graph-Tools
                      └ Welt-Tools ─► OpenClaw (gesandboxte Ausführung, least-priv)
```

## 3. Kleinster sinnvoller Sprint (≤ 1 Woche)
**Phase 1 komplett + Phase 2a.** OS-MÔRA macht sichtbar „gesucht/gelesen/verglichen/geplant/gehandelt" (Daten existieren schon) **und** beantwortet Infra-Fragen über die Nightwatch-Nodes aus Woche 1. Null Larry-Risiko, rein additiv, schließt den größten „fühlt sich passiv an"-Abstand.

## 4. Betroffene Dateien
- NEU `lib/chat/toolTrace.ts` (+ Test)
- NEU `components/chat/ToolTrace.tsx`
- EDIT `apps/chat/index.tsx` (Trace in Message übernehmen + rendern)
- (Phase 2b) NEU `core/actions/tools/infra.py` + EDIT `core/cognition/tools.py`

## 5. Risiken
- **Phase 1:** Tool-Params könnten sensible Inhalte zeigen → sanitisieren/kürzen, nie `llm_thought`. Bei `success=false` ehrlich anzeigen (kein Fake-Haken). Sonst risikoarm (OS-only).
- **Phase 2b/3:** berühren Gateway/OpenClaw → Least-Privilege, owner-gating, internes Netz, read-before-write.
- **Phase 4:** fasst Live-Channels an → später, vorsichtig, je Channel einzeln.

## 6. Reihenfolge-Empfehlung
Phase 1 (jetzt) → Phase 2a (gratis) → Phase 2b (erstes Read-Tool) → Phase 3 (Action-Tools über vorhandene Confirmation) → Phase 4 (Channels auf den CORE-Loop). Jede Stufe einzeln deploybar; nichts Riskantes vor dem jeweiligen Go.
