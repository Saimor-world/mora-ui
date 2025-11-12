# Phase C Concept – Bewusste Präsenz von Môra

## Ziel
- Die Awareness-Events sollen die Wahrnehmung von Môra als lebendige Präsenz verstärken, nicht als Chat-Bot.
- Nutzer:innen spüren Kontextwechsel durch subtile Resonanz (Licht, Tiefe, Bewegung), ohne Arbeitsfluss zu stören.
- Jede Reaktion liefert Orientierung („Môra hat gesehen, was du tust“) und unterstützt Fokussierung statt Ablenkung.

## Design-Prinzipien
1. **Leises Echo** – Reaktionen sind kurz, weich und verschwinden automatisch (≤2s).
2. **Kontextgebunden** – Nur der relevante Bereich reagiert (Folder ≠ Field ≠ Home).
3. **Kein Modal-Zwang** – Keine Popups; stattdessen Layer, Glows oder Mini-Panels.
4. **Mock-first** – alle Effekte funktionieren offline und degradieren zu statischen States.
5. **Motion mit Empathie** – prefers-reduced-motion halbiert Dauer/Amplitude; bei Bedarf rein statisch.

## Awareness-Mapping
| Event | UI-Resonanz | Beschreibung |
|-------|-------------|---------------|
| `node_click` | Graph-Spotlight + gedämpfter Hintergrund | Im Field Mode wird das geklickte Cluster sanft hervorgehoben; umliegende Nodes dimmen auf 60 % Deckkraft, ActivityPulse verstärkt Puls im entsprechenden Tag-Farbton. |
| `filter_change` / `tag_filter_change` | Filter-Badge pulsiert + Breadcrumb leuchtet | Der aktive Badge erhält einen goldenen Atem (2 Impulse), Timeline-Scrubber zieht einen hauchdünnen Strich in Orb-Farbe. |
| `open_document` | Inline-Preview atmet + Suggestions aktualisieren | Folder- oder Home-Panel zeigt eine kurze „Seitenreflexion“ (wie Licht auf Papier) und legt passende Suggestions (Copy/Pin) oben in die Liste. |
| `connector_action` | Connector-Karte zeigt Resonanzleisten | Während Sync ändern sich die Kartengranulationen (vertikale Linien wandern), nach Erfolg eine tiefe grüne Ausatmung. |
| `broadcast` (zukünftig) | Insights-Header mit Schwingung | Wenn ein Broadcast neue Resonanz findet, zieht ein radialer Gradient durch die Insights-Karte. |

## Beispiel-Flows
1. **Finance-Analyst klickt im Field Mode ein Budget-Nest**
   - Node-Spotlight (Bereich wird heller), ActivityPulse verstärkt goldene Wellen.
   - Suggestions-Panel schlägt „Budget-Report pinnen“ vor, Drawer zeigt Pfad.
2. **Service-Leitung filtert Folder auf #ticket**
   - Tag-Badge pulsiert, Breadcrumb-Linie in Service-Blau.
   - Timeline springt optional auf jüngsten Snapshot und zeigt „Ticket-Welle erkannt“.
3. **Neues Dokument erscheint (Mock-Event)**
   - Home ActivityPulse fügt eine wachsende Kugel hinzu, Hero-Background schimmert kurz.
   - Quick Insights zeigt eine „Neue Resonanz“ Karte mit CTA.

## Visuelle Resonanz-Ideen
- **Lichtimpulse**: Hintergrund-Radialgradient, der von Mittelpunkt zur entsprechenden Sektion wandert (max opacity 0.15).
- **Textur-Shift**: Cards wechseln kurz auf „Mycelium-Pattern“ (SVG-Overlay) und blenden zurück.
- **Depth Breathing**: Box-shadow verstärkt sich, dann fällt auf Originalwert (nutzt vorhandene `mora-breathe`).
- **Micro-Sound (optional)**: Ein leises, organisches Klick-/Holzton bei `connector_action`-Fehlern; nur wenn Sound nicht disabled.
- **Timeline Ripples**: Bei `timeline_change` fließt ein Linienverlauf nach rechts und gleicht sich aus.

---
*Hinweis:* Umsetzung sollte als Design-System-Komponenten (Hooks + Tokens) vorbereitet werden, damit zukünftige Awareness-Typen dieselbe Sprache nutzen.
