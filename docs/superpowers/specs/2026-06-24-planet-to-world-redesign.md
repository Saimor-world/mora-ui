# Planet → Welt Redesign — Spezifikation (Design-only)

**Datum:** 2026-06-24
**Status:** Entwurf zur Freigabe · **keine Implementierung vor Prototypfreigabe**
**Scope:** SAIMÔR OS / INTERFACE — Übergang Haupt-Universe (L1) → Planeten-Welt (L2)
**Auftrag:** `docs/plans/2026-06-24-claude-planet-world-design-handoff.md`
**Grundlage:** `docs/architecture/2026-06-24-saimor-desk-os-foundation.md` §11/§14, Welle 4
**Vorgänger:** `INTERFACE/docs/superpowers/specs/2026-06-18-universe-as-company-desktop.md` (Sprint 4)

> **Exklusive Grenze:** Diese Spec ändert **keine** Produktionsdateien. Insbesondere unangetastet:
> `UniverseView.tsx`, `DepartmentSurface.tsx`, Widget-Registry, Communication-Hooks, CORE, DASHBOARD, WORLD.
> Ergebnis ist ausschließlich dieses Dokument. Code erst nach Prototypfreigabe.

---

## 1. Problem & Ziel

**Heute (verifiziert, §14):** Beim Eintritt in einen Planeten rendert `DepartmentSurface` weitgehend dasselbe Orbit-Bild wie das äußere Universe, nur mit anderem Inhalt. Es fühlt sich wie ein Seitenwechsel an, nicht wie ein Ortswechsel. Die Navigations-Statemachine kann den Übergang bereits (`navStore`: `viewLevel`, `departmentEntryOrigin`), aber die innere Welt ist visuell nicht eigenständig.

**Ziel:** Zwei **klar verschiedene** Ebenen mit einem **räumlichen Eintauch-Übergang** dazwischen.

- **L1 · Org-Universe** — die gemeinsame Organisationsebene. Planeten = oberste Arbeitswelten (primär Abteilungen). Beantwortet: *Wozu gehört etwas, womit hängt es zusammen?*
- **L2 · Planeten-Welt** — die eigenständige Welt einer Abteilung. Beantwortet: *Was passiert hier drin, woran arbeite ich?*

L1 und L2 dürfen denselben Datenwahrheiten dienen, aber **nie dieselbe Bühne** sein.

---

## 2. Produktwahrheit (verbindlich)

- Haupt-Universe = gemeinsame Organisationsebene; bleibt erhalten.
- Planeten = primär Abteilungen; je Organisationsmodell auch andere oberste Arbeitswelten.
- **Sichtbarkeit** eines Planeten und das **Betreten** sind getrennte Rechte. **CORE erzwingt Zugriff — die Oberfläche ist keine Sicherheitsgrenze.** Das Design darf nie suggerieren, dass UI-Zustand = Berechtigung.
- Geschäftsführung sieht ein breiteres Organisationsbild als Mitglieder einzelner Abteilungen.
- Gemeinsame Termine, Updates, Ziele, Ereignisse bleiben auf **L1** sichtbar.
- Finder bleibt die deterministische Kontrolloberfläche; öffnet kontextbezogen **innerhalb** einer Welt.
- MÔRA bleibt dieselbe Assistenz in Desk und OS.
- **Keine Fake-Daten.** Jeder Zustand baut auf echten Datenzuständen (oder ehrlichem Leer-/Lade-/Fehlerzustand) auf.

---

## 3. Zwei Ebenen — Identität & Informationshierarchie

Der entscheidende Hebel gegen „dasselbe Orbit kleiner": L2 wechselt **Bühne, Atmosphäre und Strukturmetapher**, nicht nur den Inhalt.

| Dimension | L1 · Org-Universe | L2 · Planeten-Welt |
|---|---|---|
| Metapher | Orbit von Planeten um einen Kern | Du bist **in/auf** einer Welt — Horizont statt Vogelperspektive |
| Hintergrund | Tiefes neutrales Sternenfeld (org-neutral) | **Atmosphäre in der Abteilungs-Identität** (Akzentfarbe, Nebel, Lichtstimmung) |
| Zentrum | Org-Kern (HQ-Logo) | Kein zweiter Kern — der Planet **ist** der Ort; ein Welt-Horizont/Bodenband trägt die Szene |
| Struktur-Einheiten | Abteilungsplaneten | **Monde / Regionen** = Projekte/Spaces |
| Widgets | Org-weite Glances (Termine, Ankündigungen, Org-Puls) | **Welt-Kontext-Widgets** (Aufgaben, Aktivität, Ziele dieser Abteilung) |
| Finder | Pane bei Bedarf (z-100) | **Bodenfläche/Seitenfläche** der Welt — als Ort verankert, nicht als Fenster |
| Tiefe/Maßstab | Weiter Raum, viele Objekte klein | Naher Raum, wenige Objekte groß, klare Hierarchie |
| Primärfrage | Zugehörigkeit & Zusammenhang | Arbeit & Fokus |

**Informationshierarchie je Ebene** (oben = stärkster visueller Rang):

- **L1:** Org-Ereignisse/Ziele → sichtbare Abteilungsplaneten → semantische Verbindungen → Org-Puls-Widgets → systemweite Hinweise.
- **L2:** Welt-Identität (Name, Atmosphäre, Gesundheits-/Aktivitätssignal) → Projekte/Spaces als Monde → Welt-Aktivität & Aufgaben → Finder-Boden (Orte: Privat/Workspace/verbundene Quellen) → „Orbit verlassen".

---

## 4. Übergangs-Statemachine

Geerdet in der bestehenden `navStore`-Wahrheit — **nicht neu erfinden, präzisieren**:

```
viewLevel:  'core'(coreMode='explore')   ──►   'department'   ──►   'space'
            = L1 Org-Universe                   = L2 Planeten-Welt    = Region/Mond-Detail
departmentEntryOrigin = {x,y} %  ← Planet-Viewport-Punkt, Transform-Origin des Zooms
universeScope: 'org' | 'dept'    ← 'dept' = Mitarbeiter mit Einzel-Abteilung startet direkt in L2-ähnlicher Scope
```

**Zustände des Übergangs (UI-Transition-Maschine, über `navStore` hinaus):**

```
IDLE_L1
  └─ hover(planet) ─────────────► PLANET_PREVIEW        (Name/Stats-Bloom, Fokus-Dim)
       └─ select(planet) ───────► ENTERING (forward)    setze departmentEntryOrigin = planetPos
            ├─ during ───────────► TRANSITION_FORWARD    Zoom in entryOrigin, L1 tritt zurück, L2 baut sich auf
            └─ settle ───────────► IDLE_L2 (Welt aktiv)
IDLE_L2
  ├─ leaveOrbit / Esc / Back ───► EXITING (reverse)      Zoom heraus zur selben entryOrigin
  │     └─ settle ──────────────► IDLE_L1
  ├─ select(mond/region) ───────► ENTERING_SPACE         viewLevel='space' (kein voller Bühnenwechsel; Vertiefung)
  └─ openFinder ────────────────► L2 + Finder-Boden offen (kein Ebenenwechsel)
```

**Eigenschaften:**

- **Eine Quelle der Wahrheit:** `viewLevel` + `departmentEntryOrigin` steuern Vorwärts/Rückwärts. Die Transition ist eine reine Präsentationsebene darüber.
- **Symmetrie:** Eintritt zoomt in `entryOrigin` hinein; Austritt zoomt zur selben Stelle heraus → „Rückkehr an denselben Planeten".
- **Unterbrechbarkeit:** Während `TRANSITION_FORWARD`/`EXITING` ist ein Abbruch (Esc, Gegenrichtung) jederzeit möglich; die Animation interpoliert ab Ist-Fortschritt (kein „Springen").
- **Kein Datenverlust:** Offene Panes/Arbeitskontexte (paneStore) überleben den Ebenenwechsel — siehe §5.10.

---

## 5. Designbereiche (Auftrag 1–10)

### 5.1 Hover, Auswahl, Fokus eines Planeten
Bestehende iOS-Hover-Spec (Vorgänger §iOS Hover) wird **referenziert und erweitert**, nicht ersetzt:
- Rest → Pre-Dwell (Name-Whisper 65 %, scale 1.03) → Dwell 520 ms (scale 1.08, Glow-Ring, Orbital-Stat-Bloom: Gesundheit/Bereiche/Aktivität) → Fokus (andere Planeten dim 0.6, Widgets dim 0.25).
- **Neu:** Im Fokus erscheint eine **leise Eintritts-Affordance** („öffnen" / Doppelklick / Enter) + ein subtiler Atmosphären-Vorschimmer in der Abteilungsfarbe am Planetenrand (Vorgeschmack auf L2-Identität).
- Gesperrte/teilweise sichtbare Planeten: siehe §5.8.

### 5.2 Räumlicher Übergang in die Welt
- Transform-Origin = `departmentEntryOrigin` (Planet-Position in Viewport-%). Der Planet **wächst zum Horizont**, das umgebende Sternenfeld weicht nach außen/hinten (Parallax-Tiefe, nicht nur Scale).
- L1-Objekte (andere Planeten, Org-Widgets) faden + driften nach außen heraus; L2-Atmosphäre + Monde bauen sich gestaffelt auf (nicht gleichzeitig „Pop").
- **Keine harte Schnittkante.** Crossfade über Tiefe: kurzer Moment, in dem man „durch die Atmosphäre eintritt".

### 5.3 Visuell eigenständige innere Welt
- Hintergrund wechselt von neutralem Sternenfeld zu **abteilungsgefärbter Atmosphäre** (Akzent + Nebel + Lichtstimmung; respektiert bestehende Ritual-Scene-Tönung, überlagert sie abteilungsspezifisch).
- **Kein zweiter Org-Kern.** Stattdessen ein **Welt-Horizont/Bodenband** als Anker. Die Welt-Identität (Name, Gesundheits-/Aktivitätssignal) sitzt oben, ruhig.
- Maßstab nah: wenige große Objekte, klare Hierarchie statt vieler kleiner Punkte.

### 5.4 Projekte/Spaces als Monde, Regionen oder Strukturen
- Default-Metapher: **Monde** (Projekte/Spaces) auf nahen Bahnen um die Welt. Anzahl bestimmt die Dichte; viele Spaces → ruhige Cluster/Regionen statt Punktwolke.
- Alternative je Organisationsmodell: **Regionen** auf der Bodenfläche (für flächige Strukturen) — die Spec erlaubt beide, der Prototyp testet welche pro Datendichte trägt.
- Jeder Mond zeigt **echten** Status (Aktivität/offene Aufgaben), kein Fake. Leerer Space = ehrlich leerer Mond (§5.12).

### 5.5 Kontextbezogene Widgets & Aktivität
- Beim Eintritt wechseln Widgets **vollständig** in den Weltkontext: Aufgaben/Aktivität/Ziele **dieser Abteilung** (gespeist aus dem abteilungsskopierten Datenstrom — wie heute `DepartmentSurface` scope='department').
- Gleiche Glance-Sprache wie L1 (gläserne Eck-/Randpanels, recede-on-focus), aber **anderer Inhalt + Tönung**. Org-weite Widgets erscheinen hier **nicht** (die bleiben L1).

### 5.6 Finder als Seiten-/Bodenfläche innerhalb der Welt
- In L2 öffnet Finder als **verankerte Boden- oder Seitenfläche** der Welt (Sheet-Präsentation, nicht zentriertes Fenster) — die Welt bleibt dahinter sichtbar/interaktiv.
- Orte-Leiste kontextgebunden: **Privat · Workspace · verbundene Quellen** (Drive read-only) — und später Gerät. Eröffnet kontextbezogen am Welt-Scope (Abteilung vorausgewählt).
- Finder bleibt **jederzeit verlässlich erreichbar** (Dock + Tastatur), auch mitten im Übergang.

### 5.7 Eindeutiges „Orbit verlassen"
- Persistente, ruhige Affordance oben-links der Welt: **„← Orbit verlassen"** (Wort, nicht nur Icon).
- Zusätzlich: Esc und Browser-/Dock-Back lösen denselben `EXITING`-Zoom aus.
- Breadcrumb als kosmischer Kontext: `Organisation › Produkt › Finder` — Klick auf „Organisation" = zurück zu L1.

### 5.8 Sichtbare, gesperrte und vollständig verborgene Planeten
Drei **getrennte** Zustände (CORE liefert die Wahrheit; UI spiegelt sie nur):
- **Sichtbar & betretbar:** voller Hover/Eintritt.
- **Sichtbar, gesperrt** (sehen erlaubt, betreten nicht): Planet sichtbar mit ruhigem Schloss-Signal; Hover zeigt „kein Zutritt" + Grund; **kein** Eintritts-Zoom. (Bestehende `LockedPlanetTooltip` referenzieren.)
- **Verborgen:** erscheint gar nicht — kein Platzhalter, kein Hinweis auf Existenz. (Sicherheit: keine Information-Leakage über UI.)
- Geschäftsführung sieht mehr Planeten/breiteres Bild als Einzelabteilungs-Mitglieder — gesteuert durch CORE-Sichtbarkeit, nicht durch Client-Filter allein.

### 5.9 Tastatur, reduzierte Bewegung, kleinere Displays
- **Tastatur:** Planeten fokussierbar (Tab/Pfeile), Enter = eintreten, Esc = verlassen, Finder per Shortcut. Sichtbarer Fokusring.
- **Reduzierte Bewegung** (`prefers-reduced-motion`): Zoom/Parallax → schneller Crossfade ohne Bewegung; identische End-Zustände, gleiche Informationshierarchie.
- **Kleinere Displays:** L1/L2 bleiben unterscheidbar; auf schmalen Viewports wird die Orbit-Konstellation kompakter, Monde ggf. als Liste/Regionen statt Bahnen, Finder als Vollbreite-Bottom-Sheet. Atmosphären-Identität bleibt das Unterscheidungsmerkmal.

### 5.10 Rückkehrzustand ohne Verlust geöffneter Pane-/Arbeitskontexte
- Offene Panes (paneStore) überleben L1↔L2-Wechsel; sie werden während des Zooms ggf. kurz abgesenkt (recede), nicht geschlossen.
- Rückkehr nach L1 stellt den L1-Zustand wieder her (Scroll/Fokus/letzter Planet via `entryOrigin`).
- Erneuter Eintritt in dieselbe Welt stellt deren letzten Kontext wieder her (offene Monde/Finder-Scope), soweit serverseitig/ session-seitig bekannt.

---

## 6. Bewegung — Dauer & Unterbrechbarkeit

- **Eintritt/Austritt:** ~520–700 ms, Spring-Charakter (vgl. Vorgänger `{stiffness:380, damping:28}`), Ease-out dominanter Zoom + gestaffelter Aufbau (Atmosphäre → Horizont → Monde → Widgets, je ~60–90 ms versetzt).
- **Mond-Eintritt (L2→space):** kürzer (~300 ms), Vertiefung statt Bühnenwechsel.
- **Unterbrechbar:** jede laufende Transition kann gegenläufig abgebrochen werden; Interpolation ab Ist-Fortschritt.
- **Ruhe als Default:** kein Dauer-Geflacker; Bewegung nur bei Interaktion/echtem Event. Reduced-Motion respektiert.

---

## 7. Lade-, Leer- und Fehlerzustände

| Zustand | L1 | L2 |
|---|---|---|
| **Laden** | Planeten erscheinen als ruhige Silhouetten, Stats laden nach (Skeleton, kein Spinner-Chaos) | Atmosphäre + Horizont sofort; Monde/Widgets laden gestaffelt nach |
| **Leer** | Keine Abteilungen → ehrlicher „Noch keine Abteilungen"-Zustand, kein Fake-Planet | Welt ohne Projekte → ruhige leere Welt + „Noch keine Projekte" (kein erfundener Mond) |
| **Fehler** | Stats nicht ladbar → Planet bleibt, Signal „Status nicht verfügbar" (nie grün faken) | Welt-Daten nicht ladbar → Welt-Shell bleibt, ehrlicher Fehlerhinweis + Retry; **Finder bleibt erreichbar** |
| **Kein Zutritt** | gesperrter Planet (§5.8) | n/a (Eintritt war nicht möglich) |

Grundsatz (Fundament): **Keine Oberfläche behauptet eine Wahrheit, die die Daten nicht hergeben.**

---

## 8. Wiederverwenden / Ersetzen / Referenz

| Bestehend | Rolle im Redesign |
|---|---|
| `navStore` (`viewLevel`, `coreMode`, `universeScope`, `departmentEntryOrigin`, `navigateToDepartment/Explore`) | **Wiederverwenden** — Statemachine bleibt die Wahrheit; ggf. nur additive Felder für Welt-Kontext |
| `lib/universe/layout.ts` (organische Planetenplatzierung, Routen) | **Wiederverwenden** für L1; für L2 eigene, nähere Mond-Layout-Logik |
| `lib/universe/interactionZones.ts` (Cosmos/Peripheral, Widget-Opacity) | **Referenz/Wiederverwenden** — Fokus-Dim-Prinzip auch in L2 |
| `Planet.tsx`, `LockedPlanetTooltip` | **Wiederverwenden** (Hover, gesperrt) |
| `UniverseView.tsx` | **Referenz** — L1 bleibt; nicht in dieser Spec ändern |
| `DepartmentSurface.tsx` / `DepartmentLayer.tsx` | **Ersetzen (visuell)** — heute „Orbit kleiner"; Ziel = eigenständige Welt. **Erst nach Prototypfreigabe.** |
| `DepartmentView.tsx` | **Nur alternatives Material** |
| `components/layout/ViewPort.tsx` | **Referenz** — Surface-Router nach `viewLevel`; Einstiegspunkt für L2 |
| `WidgetGrid` / Widget-Registry | **Wiederverwenden** (Glance-Sprache); in L2 nur Weltkontext-Inhalte. Registry **nicht** in dieser Spec ändern |
| `paneStore` + Sheet-Präsentation (Vorgänger Sprint 2) | **Wiederverwenden/erweitern** — Finder als Boden-/Seiten-Sheet |
| Ritual-Scene-Tönung | **Referenz** — abteilungsspezifische Atmosphäre überlagert, ersetzt sie nicht |

---

## 9. Klickbarer Prototyp-Umfang (vor Produktionscode)

Ein **isolierter, klickbarer Prototyp** (z. B. eigene Route/Story, keine Produktionspfade) demonstriert und friert die Entscheidungen ein, **bevor** `DepartmentSurface` o. Ä. angefasst wird:

1. L1 mit 3–5 Planeten (echte oder klar als Demo markierte Daten).
2. Hover → Fokus → Eintritt-Zoom in einen Planeten (mit `entryOrigin`).
3. L2 mit eigenständiger Atmosphäre, 2–3 Monden, 1 Weltkontext-Widget.
4. Finder als Boden-Sheet (Orte-Leiste, ohne echte Mutationen).
5. „Orbit verlassen" → Rück-Zoom an dieselbe Stelle.
6. Reduced-Motion-Variante (Crossfade statt Zoom).
7. Gesperrter + verborgener Planet als Zustände.

**Akzeptanz des Prototyps:** L1≠L2 spür- und sichtbar verschieden; Übergang = Eintauchen, kein Seitenwechsel; Rechte-/Sichtbarkeitsmodell unangetastet; Finder jederzeit erreichbar; ruhig & professionell; **keine Fake-Daten**. Erst danach Produktionsumbau in eigener Welle.

---

## 10. Akzeptanz (Mapping zum Handoff)

- ✅ **L1 und L2 visuell + funktional klar verschieden** → §3 (Identitätstabelle), §5.3.
- ✅ **Übergang vermittelt räumliches Eintauchen statt Seitenwechsel** → §5.2, §6.
- ✅ **Rechte-/Sichtbarkeitsmodell bleibt erhalten** → §2, §5.8 (CORE erzwingt, UI spiegelt).
- ✅ **Finder jederzeit verlässlich erreichbar** → §5.6.
- ✅ **Ruhig, professionell, auf echten Datenzuständen** → §7, Non-Negotiables.
- ✅ **Keine Fake-Daten / keine Implementierung vor Prototypfreigabe** → §1 (Grenze), §9.

---

## Anhang — Visuelle Konzept-Ankerung

Eine begleitende Konzeptskizze (im Review-Chat gezeigt) stellt L1 (Org-Universe, Abteilungsplaneten) der L2-Welt gegenüber (Atmosphäre, Projekt-Monde, Finder-Boden, „Orbit verlassen") und zeigt den Eintauch-Übergang. Sie ist Stimmungs-/Strukturreferenz, kein Pixel-Mockup; verbindlich ist dieser Text.
