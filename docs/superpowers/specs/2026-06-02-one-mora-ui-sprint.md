# Eine Oberfläche für eine MÔRA — UI-Integrationsplan

**Prinzip:** Kein Redesign-Big-Bang, keine neue Vision. Vorhandenes vereinheitlichen + verbinden.
**Befund:** Status-/Severity-Farben sind über 6 Dateien dupliziert (lib/actionCenter/format, lib/openflow/presentation, components/chat/ToolTrace, components/home/homeCards, components/home/OpenFlowLagebild, components/mora/ConfirmationCard). `homeCards.HomeSignalCard` ist bereits eine wiederverwendbare Signal-Karte. App-Platform (appRegistry/surfaceRegistry/PaneManager) kann Nightwatch als App tragen.

## 1. Einheitliches MÔRA-Erlebnis — was vereinheitlichen
- **EINE Status-Sprache:** ein Modul `lib/ui/status.ts` (severity/priority/kind → Farbe+Icon+Label). Ersetzt die 6 verstreuten Paletten.
- **EINE Signal-Karte:** alles „etwas ist passiert / braucht Aufmerksamkeit" nutzt dieselbe Karte (verallgemeinerte `HomeSignalCard` → `StatusCard`).
- **EINE Handlungs-Spur:** das ToolTrace-Vokabular („Gesucht/Gelesen/Gehandelt") wird das *universelle* „MÔRA hat getan"-Element — auch in Nightwatch-Panel + OpenFlow, nicht nur im Chat.
- **EINE Präsenz:** ein Orb + eine Akzent-/Aura-Farbe (vorhandenes `userColors`) über alle Flächen.

## 2. Nightwatch als Panel im OS (mehrfach sichtbar, nie fremd)
- **Dock-App** `apps/nightwatch/index.tsx` (registriert in appRegistry + surfaceRegistry + PaneManager) = Detail-Panel: Monitor-Grid + Incident-Liste + Healing-Actions, liest CORE `/v3/nightwatch/*` (die Nodes aus Woche 1).
- **OpenFlow-Karte** auf Home: offene `nightwatch.incident` erscheinen als Signale (source `server`) unter „Was braucht Aufmerksamkeit?" → „MÔRA beobachtet deine Infrastruktur."
- **Universe (später):** Monitor = kleiner Körper, Incident = pulsierender Punkt (braucht `monitor belongs_to department`).
- **Minimaldaten:** Monitor = Name + Status-Dot; Incident = Titel + Severity + Zeit + offen/behoben. Reuse StatusCard.

## 3. OpenFlow als Zentrale (Lagebild)
- **Incidents → Signale** über das bestehende `lib/openflow/presentation.ts`-Muster (priority aus severity) → Lane „Aufmerksamkeit".
- **ToolTrace-Aktionen → Lane „Zuletzt gehandelt"** (was MÔRA/Larry autonom tat, z.B. „Container neu gestartet").
- **Vorschläge → Lane „Nächster Schritt".**
- **Unterscheidung über `lib/ui/status.ts`:** Warnung (amber/rot, AlertTriangle) · Aufgabe (cyan, ArrowRight) · Handlung (emerald, Sparkles=erledigt) · Erinnerung (violet, Clock). Ein Enum → eine Farbe+Icon, überall gleich.

## 4. Chat + ToolTrace
- **Sitz:** bleibt unter der Antwort (sekundär). 
- **Verbesserung:** standardmäßig als **eine Zusammenfassungszeile** kollabiert („MÔRA hat 3 Schritte gemacht ▸"), aufklappbar; gleiche Kind-Schritte gruppieren; Anzahl deckeln.
- **Hierarchie:** Antwort = primär; Spur = klein/gedämpft; Fehler („nicht abgeschlossen") = amber, sticht hervor.
- **Gegen Überladung:** kollabieren + deckeln + dedup. Nutzt `lib/ui/status.ts`-Icons.

## 5. Universe sinnvoll einbinden
- **Wann:** als *Ziel/Erweiterung*, nicht Eingang. Erreichbar aus einem Signal („Im Universe öffnen" — `handleOpenInUniverse` existiert in Finder; DepartmentSurface hat Karte/Übersicht-Toggle).
- **Was leuchtet:** die Abteilung/der Monitor mit offenem Incident pulst (Severity-Farbe).
- **Signale führen hinein:** jede OpenFlow-Karte/Incident hat „Im Universe zeigen" → fokussiert den Planeten.
- **Incident → Punkt:** via `monitor belongs_to department` → Planet pulst → Klick → Incident-Node.

## 6. UI-System vereinheitlichen
- **NEU `lib/ui/status.ts`** — Single Source für severity/priority/kind → {Farbklassen, Icon, Label}. Löst die 6 Duplikate ab.
- **NEU `components/ui/StatusCard.tsx`** (verallgemeinerte HomeSignalCard) + **`components/ui/Panel.tsx`** (Header + Actions + Empty-State) — viele Panes erfinden das neu.
- **Gemeinsame Icons** über MoraIcons/appRegistry ICON_MAP. **Gemeinsame Empty-States.**
- **Mobile:** Einspalten-Fallback für kleine Screens (Fenster-Modell ist Desktop-lastig) — nur Fallback, kein Umbau.

## 7. Kleinster 1-Wochen-Sprint
- **Tag 1–2 — Fundament:** `lib/ui/status.ts` (TDD) + ToolTrace/homeCards/OpenFlowLagebild darauf umstellen (verhaltensneutral). Macht sofort alles konsistent.
- **Tag 3–4 — Nightwatch in OpenFlow:** offene Incidents (CORE) → Signale in `lib/openflow/presentation.ts` → erscheinen auf Home. „MÔRA beobachtet deine Infrastruktur."
- **Tag 5 — Nightwatch Dock-Panel:** `apps/nightwatch/index.tsx` (minimal: Monitore + Incidents) + Registrierung. Reuse StatusCard.

**Betroffene Dateien:** NEU `lib/ui/status.ts`(+Test), `components/ui/StatusCard.tsx`, `apps/nightwatch/index.tsx`; EDIT `components/chat/ToolTrace.tsx`, `components/home/homeCards.tsx`, `components/home/OpenFlowLagebild.tsx`, `lib/openflow/presentation.ts`, `lib/apps/appRegistry.ts`, `lib/surface/surfaceRegistry.ts`, `components/mora/PaneManager.tsx`. CORE: kleine Read-Endpoints `GET /v3/nightwatch/incidents`+`/monitors`.

**Bewusst NICHT angefasst:** Universe-Interna, larry-ui/Dashboard-Konsolidierung, Mobile-Redesign, neue Design-Sprache, Chat-Neugestaltung.
