# Diagnostics Export Guide

Dieses Dokument beschreibt, wie die JSONL-basierten Diagnostics-Logs geprüft, exportiert und archiviert werden können. Es ergänzt das Logging-Protokoll in `docs/DIAGNOSTICS_LOGGING.md`.

---

## 1. Speicherort & Dateinamen
- Standardpfad: `logs/diagnostics-YYYY-MM-DD.jsonl`
- Eine Zeile pro Health-Check (JSONL). Beispiel:
  ```
  {"timestamp":"2025-11-11T09:10:22.100Z","endpoint":"/v1/health","status":"healthy","latency_ms":5,"environment":"development","details":{"db":"ok","qdrant":"ok"},"note":""}
  ```
- Dateien können fortlaufend ergänzt werden; keine JSON-Arrays verwenden.

---

## 2. Export aus dem Diagnostics Panel
1. Diagnostics Badge öffnen (nur in Dev sichtbar).
2. Health-Check ausführen (`Refresh`), damit aktuelle Daten vorliegen.
3. Button **Export Log** klicken (nur in Dev/Preview verfügbar).  
   - Der Eintrag wird in die Zwischenablage kopiert und zugleich in der Browser-Konsole ausgegeben (`[Diagnostics Log] ...`).
4. Den JSONL-Eintrag in die passende Logdatei einfügen.

> Hinweis: Ist kein Health-Result vorhanden, wird eine Toast-Warnung angezeigt.

---

## 3. Manuelles Prüfen & Archivieren
- **Prüfen:** JSONL mit jeder Textverarbeitung oder `jq` inspizieren:
  ```bash
  jq '.' logs/diagnostics-2025-11-11.jsonl
  ```
- **Archivieren:** Ältere Dateien z. B. monatlich in ein Unterverzeichnis verschieben (`logs/archive/2025-11/`).
- **Rotation:** Empfehlung: pro Tag eine Datei, pro Monat archivieren. Keine automatisierte Löschung ohne vorherige Sicherung.

---

## 4. Troubleshooting
- Export-Button fehlt → Nur verfügbar, wenn `process.env.NODE_ENV !== 'production'`.
- Clipboard schlägt fehl → Eintrag wird trotzdem in der Konsole geloggt; manuell kopieren.
- Keine Logs geschrieben → Health-Check zuerst ausführen (Refresh), dann Export nutzen.

---

**Letzte Aktualisierung:** 2025-11-11  
Verantwortlich: Mora UI Team
