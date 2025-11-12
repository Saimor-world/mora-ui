# Diagnostics Logging Protocol

Gültig seit: 2025-11-11 · Verantwortlich: Mora UI Team  
Ziel: Health-/Diagnostics-Ergebnisse pro Session konsistent erfassen und lokal archivieren.

---

## 1. Zweck
- Jede Öffnung des Diagnostics Panels (Badge-Klick) soll einen Logeintrag triggern.
- Logs bleiben lokal (kein Upload), dienen dem Abgleich mit Core (siehe CORE_MASTER.md).
- Empfohlenes Speicherformat: JSON Lines (`logs/diagnostics-YYYY-MM-DD.jsonl`).

---

## 2. Pflichtfelder pro Eintrag
| Feld | Typ | Beschreibung |
| --- | --- | --- |
| `timestamp` | ISO-8601 (UTC) | Zeitpunkt der Health-Abfrage. |
| `endpoint` | String | z. B. `/v1/health`. |
| `status` | String | `healthy`, `warning`, `error`, `unreachable`. |
| `latency_ms` | Number / `null` | Antwortzeit falls verfügbar. |
| `environment` | String | `development`, `staging`, `production`. |
| `details` | Object | Optional: Zusatzinfos (DB, Qdrant, LLM). |
| `note` | String | Optionaler Freitext (z. B. „Core neu gestartet“). |

---

## 3. JSONL-Beispiel
```json
{"timestamp":"2025-11-11T08:55:22.734Z","endpoint":"/v1/health","status":"healthy","latency_ms":7,"environment":"production","details":{"db":"ok","qdrant":"ok","llm":"ok"},"note":""}
{"timestamp":"2025-11-11T09:03:11.102Z","endpoint":"/v1/health","status":"unreachable","latency_ms":null,"environment":"development","details":{},"note":"Core gestoppt für Fallback-Test"}
```

> **Hinweis:** Ein Eintrag = eine Zeile. Keine Arrays, keine abschließenden Kommas.

---

## 4. Ablauf pro Session
1. Diagnostics Badge klicken → Panel öffnet Health-Check.
2. Werte aus dem Panel übernehmen und als JSONL-Zeile ergänzen.
3. Datei unter `logs/diagnostics-YYYY-MM-DD.jsonl` speichern/anhängen.
4. Optional: Kurznotiz im Commit oder Session-Log verlinken.

---

## 5. UI-Verknüpfung
- `UI_MASTER.md` (Abschnitt „Core Connectivity“) verweist auf dieses Dokument.
- Ein späterer „Export Log“-Button im Panel darf denselben Output generieren (JSONL-kompatibel).

---

**Status:** Dieses Protokoll ersetzt ältere freie Notizen. Bis ein automatischer Export existiert, genügt das manuelle Logging gemäß obigem Schema.
