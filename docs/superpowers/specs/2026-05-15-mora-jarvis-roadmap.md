# Mora → Jarvis: Roadmap

**Vision:** Mora ist nicht ein Chatbot mit Gedächtnis. Sie ist ein OS-Agent der im Hintergrund lebt, proaktiv handelt, und sich über Zeit an den Nutzer anpasst. Das Endprodukt ist Jarvis — nicht Copilot.

**Architekturprinzip:** Jeder Spec produziert ein funktionierendes Inkrement. Nach Spec 5 ist Jarvis vollständig.

---

## Spec 1 — Memory Chat-Integration ← AKTIV
`2026-05-15-mora-memory-chat-integration-design.md`

**Liefert:** Mora ist im Chat konsistent mit dem was sie weiß.
- Recall-Intent-Detection (kein FinderPane-Missbrauch)
- Memory-Kontext-Injection in Agentic Loop
- Save-Confirmation mit Scope-Label (👤 / 🏢)
- User + Company Memories parallel im Chat

---

## Spec 2 — Cross-Surface Memory Layer
`2026-05-15-mora-cross-surface-memory-design.md`

**Liefert:** Jede Surface (DocumentPane, FinderPane, ScannerPane...) kennt Moras Kontext.
- Globaler Memory-Hook der in jeder Pane verfügbar ist
- "Mora weiß" — passiver Kontext-Indikator pro Surface
- Memory schreibt nicht nur in Chat, sondern aus jeder Interaktion

---

## Spec 3 — Proaktive Trigger + Event-Bus
`2026-05-15-mora-proactive-triggers-design.md`

**Liefert:** Mora spricht zuerst.
- Event-Bus: Kalender, Mail, Deadlines, MindLoop-Events
- Mora pingt Nutzer über Dock/Notification wenn relevant
- Schwellenwert-Konfiguration (was ist pinging-würdig?)
- "Mora-Initiative" vs "Nutzer-Request" klar unterschieden

---

## Spec 4 — Outcome-Feedback + Persönlichkeits-Adaption
`2026-05-15-mora-outcome-feedback-design.md`

**Liefert:** Mora wird besser, nicht nur größer.
- Implizite Feedback-Signale (Antwort akzeptiert/ignoriert/korrigiert)
- Confidence-Score auf Memory-Nodes aktiv genutzt
- `tone`/`phrasing`-Kategorien werden in System-Prompt gerendert
- Mora klingt nach 3 Monaten anders als nach Tag 1

---

## Spec 5 — OpenClaw als Tool-Provider
`2026-05-15-mora-openclaw-integration-design.md`

**Liefert:** Mora handelt im OS = Jarvis vollständig.
- OpenClaw/Larry als Tool-Provider für Mora
- Mora ruft Larry → Larry führt aus (lokales LLM, Ollama)
- Ergebnis zurück in Mora-Chat-Kontext
- Sicherheitsmodell: welche Tools darf Mora autonom ausführen?

---

## Timing-Schätzung

| Spec | Dauer | Abhängigkeit |
|------|-------|-------------|
| 1 — Memory Chat | 1 Woche | — |
| 2 — Cross-Surface | 1 Woche | Spec 1 |
| 3 — Proaktiv | 2 Wochen | Spec 2 |
| 4 — Feedback | 1 Woche | Spec 1 |
| 5 — OpenClaw | 2 Wochen | Larry läuft |

**Gesamt:** ~7 Wochen für vollständigen Jarvis.
