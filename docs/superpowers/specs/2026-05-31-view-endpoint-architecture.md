# View-Endpoint Architecture — Backend liefert Wahrheit, Frontend malt

**Date:** 2026-05-31
**Status:** Draft — awaiting approval
**Scope:** CORE (primary) · INTERFACE (consumer)

---

## Das Prinzip (ein Satz)

> **Das Backend liefert fertig beantwortete Views. Das Frontend rendert sie nur — keine Geschäftslogik im Browser.**

Heute trifft das Frontend Entscheidungen, die ins Backend gehören:
- `buildWebsiteEntryContext` erfindet rooms/documents/tasks aus URL-Params
- `MoraShell.displayCompany` baut ein Company-Objekt zusammen
- Score-Narrative, Dossier-Struktur, Fallback-Namen — alles im Browser

Folge: verstreute Logik, mehrere Wahrheitsquellen, Kontext-Leaks. Ein falscher Firmenname muss an 4 Stellen gefixt werden statt an einer.

---

## View-Endpoints statt Daten-Endpoints

**Alt (Daten-Endpoint):** Frontend holt Rohdaten, rechnet sich die Anzeige zusammen.
```
GET /v3/companies  → Frontend: aktive raussuchen, Namen bauen, Fallbacks mappen
```

**Neu (View-Endpoint):** Frontend fragt „was soll ich zeigen?", Backend antwortet komplett.
```
GET /v3/views/home  → { greeting, company, changes[], attention[], next_steps[] }
```

Ein View-Endpoint ist nach der **Oberfläche** benannt, die er bedient — nicht nach der Tabelle. Er macht die Joins, die Sortierung, die Fallbacks, die Formatierung. Das Frontend bekommt anzeige-fertige Strukturen.

---

## Hybrid: Fakten sofort, Interpretation asynchron

Der View-Endpoint hat **zwei Schichten**:

**Schicht 1 — Fakten (synchron, schnell, immer da):**
Aggregation aus den existierenden Tabellen. Joins, Sortierung nach `severity`, Fallback-Namen, Zeitformatierung. Antwortet in Millisekunden. Kein LLM.

**Schicht 2 — Interpretation (asynchron, optional, Môra):**
Cognition (`memory_recall`, `agentic`) reichert an: priorisiert „nächste Schritte", interpretiert Muster, formuliert Môras Sicht. Kommt als zweiter Call — die UI wartet **nie** auf das LLM.

```
GET /v3/views/home            → Fakten sofort (Schicht 1)
GET /v3/views/home/insight    → Môras Interpretation, wenn bereit (Schicht 2)
```

Das Frontend rendert Schicht 1 sofort und blendet Schicht 2 ein, sobald sie eintrifft. Fällt Schicht 2 aus, bleibt die UI vollständig funktional.

---

## Die erste Surface: Home

Home zuerst, weil sie (a) deine neue Vision trägt — die drei Fragen — und (b) heute die meiste Frontend-Logik enthält.

**`GET /v3/views/home` (Schicht 1) liefert:**
```json
{
  "company": { "id": "...", "name": "...", "is_visitor": false },
  "greeting": "Guten Morgen",
  "changes":      [ { "id", "title", "scope", "occurred_at", "severity" } ],
  "attention":    [ { "id", "title", "severity", "category", "scope" } ],
  "next_steps":   [ { "id", "title", "due_date", "priority", "source" } ]
}
```

Mapping auf existierende Tabellen (kein neues Schema nötig):
- `changes`    → `mindloop_events`, nach `created_at DESC`
- `attention`  → `mindloop_events`, nach `severity DESC`, category in (risk, anomaly)
- `next_steps` → `nodes` mit `type=task`, nach `due_date` / `priority`
- `company`    → die EINE company des Tenants, Fallback-Name **hier** (nicht im Frontend)

**`GET /v3/views/home/insight` (Schicht 2):**
```json
{ "summary": "Môras Lagebild in 1-2 Sätzen", "suggested_focus": "..." }
```

---

## Migration: Strangler, kein Rewrite

Wir bauen den sauberen Weg **neben** dem alten und ziehen eine Surface nach der anderen um.

```
Schritt 1  CORE: GET /v3/views/home (Schicht 1) — Fakten aus mindloop_events + nodes
Schritt 2  CORE: GET /v3/views/home/insight (Schicht 2) — Cognition-Anreicherung
Schritt 3  INTERFACE: HomeSurface rendert nur noch die View-Antwort.
           Alle lokale Logik (displayCompany-Bau etc.) raus.
Schritt 4  Beweisen: weniger Frontend-Code, eine Wahrheitsquelle, Tests grün.
Schritt 5  Nächste Surface (Dossier → Wall → Entry) nach gleichem Muster.
```

Jeder Schritt ist eigenständig testbar und deploybar. Kein Big-Bang.

---

## Konventionen für alle künftigen View-Endpoints

1. **Benennung:** `/v3/views/<surface>` — nach Oberfläche, nicht nach Tabelle.
2. **Anzeige-fertig:** Fallbacks, Formatierung, Sortierung passieren im Backend.
3. **Zwei Schichten:** Fakten synchron, Interpretation asynchron. UI wartet nie auf das LLM.
4. **Eine Wahrheitsquelle:** Firmenname, Status etc. kommen aus dem View, nirgends sonst.
5. **Leerer Zustand ist gültig:** leere Arrays sind eine vollständige Antwort, kein Fehler.

---

## Out of Scope (später)

- Initiative als sichtbare Einheit (eigener Spec — baut auf diesem auf)
- `mindloop_events` 30-Tage-TTL → Archivierung (separate Schema-Arbeit)
- Schema-Drift-Bereinigung (drei überlappende `003_*intelligence*`-Migrationen)
- Umbenennung „Node" → „Material" in der UI

---

## Was „fertig" heißt (für Home)

1. `GET /v3/views/home` liefert die 3 Fragen fertig beantwortet, in <100ms, ohne LLM
2. `GET /v3/views/home/insight` liefert Môras Lagebild, asynchron
3. `HomeSurface.tsx` enthält **keine** Company-Bau-Logik mehr — nur Render
4. Visitor-Mode: View liefert `is_visitor: true` + leere Arrays, UI zeigt sauberen Raum
5. Tests grün, Frontend-Zeilen messbar weniger als vorher
