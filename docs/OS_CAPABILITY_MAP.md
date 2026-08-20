# Saimôr OS — Capability Map

Stand: 2026-08-20. Diese Liste beschreibt den aktiven Code, nicht Produkt-Erinnerungen oder geplante Funktionen.

## Produkt-Choreografie

| Arbeitsweise | Aufgabe | Bestehende Bausteine | Status |
|---|---|---|---|
| Home | persönliche Tageslage, nächste Handlung, Kommunikation | `HomeCockpit`, Mail, Kalender, RSS, Nightwatch | aktiv |
| Universe | Organisation räumlich verstehen und betreten | `UniverseView`, `OrganizationField`, Observatorium | aktiv, im Umbau |
| Wissen | alle Inhalte suchen, filtern und öffnen | `apps/grid`, Finder, Suche | aktiv, bisher schlecht auffindbar |
| Studio | skizzieren, präsentieren, gemeinsam erklären | `apps/canvas` | experimentell; Präsentationsmodus fehlt |
| Ambient | mit Môra sprechen und OS-Stimmung steuern | `AmbientRoomOverlay`, Audio, Canopy, NeuralGrid | aktiv, Einstellungen schlecht auffindbar |

## Ehrlicher Capability-Status

### Canvas / Studio

- Registriert und über App Loader erreichbar.
- Zeichnet nur über Mouse-Events; Pointer, Touch und Apple Pencil fehlen.
- Kein Persistieren, Exportieren, Undo/Redo oder gemeinsamer Dokumenttyp.
- Kein belegter Präsentationsmodus im aktiven Code.
- Entscheidung: nicht entfernen. Als `Studio (Beta)` neu aufbauen; erst Speichern + Pointer, dann Präsentationsbühne.

### Alle Inhalte / Wissensansicht

- `apps/grid` lädt echte, firmengebundene Nodes und öffnet Dokumente.
- Suche und Typfilter funktionieren konzeptionell.
- Es ist ein Kartenraster, kein Neural Graph.
- Entscheidung: als verlässliche Wissensübersicht behalten; später optionale Ansichten `Raster`, `Liste`, `Beziehungen` ergänzen.

### Neural Grid

- `components/visual/NeuralGrid.tsx` ist nur eine atmosphärische Shell-Ebene.
- Es zeigt keine Dateien und keine semantischen Beziehungen.
- Entscheidung: Name intern langfristig ändern, damit Hintergrundästhetik und Wissensansicht nicht verwechselt werden.

### Ambient, Licht und Audio

- `ForestLightCanopy`, `NeuralGrid`, `AmbientAudioController` und `AmbientRoomOverlay` werden von `MoraShell` geladen.
- Heavy Backgrounds sind Capability-/Performance-gated.
- Audio besitzt lokale IndexedDB-Bibliothek und Szenenzuordnung.
- Entscheidung: eine verständliche `Atmosphäre`-Einstellung schaffen: Szene, Intensität, Bewegung, Audio; keine verstreuten geheimen Schalter.

### Präsentationsfläche

- Kein produktiver Presenter-/Slide-/Stage-Renderer im aktiven `apps`, `components` oder `lib` gefunden.
- Entscheidung: als neue Studio-Funktion spezifizieren, nicht durch Umbenennen des alten Canvas vortäuschen.

## Nächste Umsetzung

1. App-Bibliothek nach Arbeitsweisen statt nur Kategorien erschließen.
2. Studio V1: Pointer Events, Persistenz als Node, Undo/Redo, Export.
3. Studio V2: Bühne/Presenter, Vollbild, Seiten/Frames, Remote-Steuerung.
4. Wissensraum: Raster/Liste/Beziehungen auf derselben echten Node-Query.
5. Atmosphäre: zentraler Szenenregler mit ehrlichem Performance-Fallback.
6. Verwaiste visuelle Renderer erst entfernen, wenn ihre Capability nachweislich ersetzt ist.