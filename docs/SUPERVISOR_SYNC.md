# SUPERVISOR RESET & SYNC PROMPT

**Datum:** 25.11.2025 — 13:40
**Version:** Stable Sync Build

Ich bestätige hiermit den vollständigen Systemstand und bitte um eine NEUE, SAUBERE SYNCHRONISIERUNG der drei Agenten (Core, UI, Infra).

---

## 📌 1. AKTUELLER TECHNISCHER STAND

### SAIMÔR CORE
- **Status:** Phase F COMPLETE (Quelle: PHASE_G_COMPLETE.md, CORRECTION_SUMMARY.md)
- Core läuft stabil auf Port 8081
- V2.2 + Full Mindloop Intelligence Layer fertig
- Wichtige Endpoints funktionieren: `/health`, `/v1/tree`, `/v1/departments`, `/v1/spaces`, `/v1/folders`, `/v1/nodes`, `/v1/relations/preview`, `/v1/mindloop/synthesis`, `/v1/mindloop/events`
- Kein Chat-Endpoint existiert (kommt erst Phase G/H)
- Voice/Twilio ist NICHT relevant und abgespeckt
- Lokale KI (Ollama/vLLM) ist später geplant, NICHT jetzt

### MÔRA UI
- **Status:** Phase E COMPLETE (Quelle: PHASE_E_CLEANUP_SUMMARY.md)
- Läuft stabil auf Port 3002
- Tree/Spaces/Folders/Nodes funktionieren, CRUD komplett
- Mycelium v1 (optimiert)
- Calm UI
- ChatDock existiert, aber OHNE KI-Anbindung (nur console.log)
- Mindloop ist NOCH NICHT visualisiert

### INFRA
- **Status:** Solide, aber:
  - Demo-Seeds fehlen
  - Backup unklar
  - Monitoring/CI optional
  - Für Januar muss Demo stabil laufen

---

## 📌 2. WAS DIE AGENTEN JETZT TUN SOLLEN

Lade die drei bereitgestellten Prompts (die einzigen gültigen Aufgaben):
- `PROMPT_CORE_AGENT.md`
- `PROMPT_UI_AGENT.md`
- `PROMPT_INFRA_AGENT.md`

### UI-Agent
- ChatDock → echte KI API (Claude/Gemini/OpenAI)
- Context‑aware messages
- Synthesis Panel anzeigen
- Relations (optional)
- KEIN Voice, KEIN Kamerazeug

### Core-Agent
- Optionalen Chat‑Endpoint vorbereiten (Mock)
- Mindloop Context verfügbar halten
- Provider‑Struktur für später vorbereiten
- KEIN echtes LLM jetzt

### Infra-Agent
- Demo‑Seeds
- Demo‑Flow
- Backup‑Check
- Smoke Tests
- Monitoring optional

---

## 📌 3. VHS‑IDEEN (ZUKUNFT)

- VHS‑Werbespots & historische TV‑Aufnahmen (80–2000er) als emotionale Datengrundlage für spätere Modellschichten.
- Lokales Training (RAM + GPU → 2026) geplant, nicht jetzt.
- Nur dokumentieren, nicht implementieren.

---

## 📌 4. DEINE AUFGABE ALS SUPERVISOR
1. Agents wieder KORREKT ausrichten
2. Prüfen, ob meine Dateien vollständig und logisch sind
3. Mir in einem Satz bestätigen:
   **„Alle Agenten sind synchronisiert und der Weg ist klar.“**

---

*Ende des Prompts*
