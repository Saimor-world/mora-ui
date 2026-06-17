# SAIMÔR OS — Der große Desktop-Plan (Universe-as-Desktop)

Stand 2026-06-17. Vision + Bauplan für den AI-gesteuerten, datengefüllten Desktop. Self-contained für jeden Agenten.

## Das Prinzip

**Der Universe IST der Desktop.** Hinter den Planeten liegt *immer* eine lebende, AI-gefüllte, anklickbare **Widget-Fläche**. Die Planeten (= Abteilungen) sind ein Layer, den man mit *einem Klick* wegblenden kann → reiner Daten-Desktop. Der Desktop ist echt, datengefüllt, klickbar — keine Deko.

Code-Beleg: `UniverseView.tsx:908` — *„Universe IS the Desktop — widgets always float on the starfield"*. Gerüst `universeMode: 'map' | 'desktop'` existiert schon, nur nicht fertig verdrahtet.

## Die große Verschiebung: EIN Widget-System überall

Heute zwei parallele Welten:
- **Home-Cockpit** (`components/home/HomeCockpit.tsx`): 3 feste Panels (Mein Tag / Team / Signale) — *„alt, nicht schön, passen nicht mehr"*.
- **WidgetGrid** (`components/widgets/`): das echte, editierbare Widget-System (Home-rechts + Universe).

→ **Auflösen:** Die 3 Cockpit-Panels werden zu echten **Widgets** im WidgetGrid. Danach gibt es EINE Widget-Fläche, die überall (Home + Universe) hinter den Planeten lebt — editierbar, draggbar, scope-bewusst.
- Mein Tag → **Tag/Kalender-Widget** · Team → **Team-Widget** · Signale → **Signale-Widget**
- Dazu bestehend: **Uhr** (geliebt — Qualitäts-Vorbild), Datenlage, Nightwatch.

## Qualitäts-Latte: jedes Widget echt + klickbar + datengefüllt

Vorbild = **die Uhr** (die magst du). So sauber müssen alle sein.
- **Nightwatch-Widget**: hat aktuell *keine Daten* + *nichts anklickbar* → echte Incidents anbinden, Klick öffnet Nightwatch-App.
- **Neue Daten-Widgets**: Mail (Posteingang), Kalender (nächste Termine), Cloud/OneDrive (letzte Dateien), Aufgaben, Team.
- Regel: **jedes Widget Klick → öffnet die volle App/Pane.** Kein totes Pixel.

## Die Bridge: externe Daten → OS

Mail, Kalender, Cloud (OneDrive/Google Drive) über Integrationen verbunden, via **Bridge** in Widgets gespiegelt. Macht den Desktop zum echten Cockpit — *nicht nur Nightwatch*. Baut auf bestehender Integrations-App + `useCommunicationSurface`/`useCommunicationLiveData` auf.

## Planeten-Toggle (map ↔ desktop)

`universeMode`-Gerüst fertig verdrahten: ein Klick → Planeten sanft aus, reiner Widget-Desktop. Nochmal → Planeten zurück. Widgets sind *immer* da; der Toggle betrifft nur den Planeten-Layer.

## Baureihenfolge (Phasen — je eigener Branch/Commit, tsc+build grün)

1. **Cockpit → Widgets**: die 3 Home-Panels als echte Widgets in die Registry; Home-Cockpit auflösen, EINE Widget-Fläche. (Größter Architektur-Schritt.)
2. **Widget-Qualität**: Nightwatch klickbar + echte Daten; Mail/Kalender/Cloud-Widgets real (honest empty state wenn keine Daten).
3. **Planeten-Toggle** (map/desktop) fertig + sauberer Übergang.
4. **Bridge**: externe Datenquellen sauber in Widgets spiegeln.
5. **Planeten-Knoten-Optik** modernisieren (alte `<Planet>`-Optik → lebendiger, klickbar, datengetrieben).

## Leitplanken

- **Scope-bewusst**: `public_playground`/Besucher (siehe `playground-visitor-scope`-Memory) — Besucher sieht keine Voll-User-Widgets; Umbau darf VisitorHomeSurface nicht brechen.
- **Keine Fake-Daten**: Widget leer = ehrlicher Leerzustand, nie erfundene Wahrheit.
- **Chirurgisch**: `UniverseView.tsx` ist 1771 Zeilen (semantische Verbindungen, Parallax, Membership-Logik) — nichts blind reinhauen, jeder Schritt `tsc --noEmit` + `next build` (Dev-Server vorher stoppen).

## Widget-System — Technik-Fakten (für den Bau)

- `components/widgets/WidgetGrid.tsx` — react-grid-layout, surfaces `home`/`department`/`universe`, persist `saimor_widget_layouts_v2`.
- `components/widgets/registry.tsx` — `WIDGET_REGISTRY` / `WIDGET_TYPES`; jedes Widget: `surfaces`, `defaultW/H`, `minW/H`, `render({context})`, `label`, `icon`, `hint`.
- Kontext rein über `WidgetContext` (openMora/openFinder/openNightwatch/goExplore …).
- Home-Panel: `HomeSurface.tsx:832` (rechts, jetzt 440/520/600px). Universe-Desktop: `UniverseView.tsx:909` (full inset, schwebt über Planeten).
