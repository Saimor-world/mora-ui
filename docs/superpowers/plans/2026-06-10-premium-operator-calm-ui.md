# Premium Operator OS — Calm-UI Refactor Plan (klein, kein Big-Bang)

**Date:** 2026-06-10 · Branch: `feat/visual-cleanup` (weiterführen)
**Leitsatz:** „Premium Operator OS, nicht Sci-Fi-Spiel." Stilreferenz = dunkles, seriöses
Mission-Control-SaaS. Mehr Ruhe, weniger Elemente, stärkere Hierarchie.
**Regel:** Jeder Schritt einzeln, live in Chrome verifiziert, Tests grün, eigener Commit.
Kein Layout-Umbau — nur beruhigen, reduzieren, hierarchisieren.

## Behalten (nicht anfassen)
Linke Seitenleiste · zentrales Lagebild · rechte Status-Spalte · Bottom Dock · Statuskarten ·
dezente grün/türkis/violette Akzente · die bereits kompakten Connector-/Suggestion-Rows.

## Schritte (Priorität = Reihenfolge)

### 1. Lagebild beruhigen (`OpenFlowLagebild.tsx`, `HomeSurface.tsx`)
- Glow runter: große `shadow-[0_18px_60px…]`/`shadow-[0_24px_80px…]` auf eine ruhige,
  einheitliche Schatten-Stufe; `animate-pulse`-Nebel-Blobs in HomeSurface entfernen oder
  Opacity halbieren; `blur-[110px]`-Flächen reduzieren.
- Text pro Karte kürzen: SignalCard-Beschreibungen auf 1 Zeile clampen; Setup-Karten
  („Mail/Kalender für OpenClaw vorbereiten") zu EINER kompakten Zeile zusammenfassen
  (gleiche Aktion, ein Eintrag „Quellen im Dashboard einrichten →").
- Doppelte Navigation raus: „Dashboard öffnen"-Button existiert je Karte + rechte Spalte —
  nur noch an EINER Stelle (rechte Spalte).

### 2. Nightwatch-Signal als Hauptkarte
- HeadlineHero: wenn ein verified `incident_status`-Panel existiert → als EINZIGE prominente
  Karte oben (volle Breite), alles andere tritt zurück. Calm-State („Alles ruhig") bleibt
  einzeilig, kein Grün-Glow-Banner mehr, nur dezenter Haken.

### 3. ToolTrace kompakt/kollabierbar
- Erst lokalisieren (vermutlich Chat-Frames / FramedMessage). Default: eingeklappt,
  eine Zeile „n Schritte ▸", Klick expandiert. Kein Dauer-Sichtbar-Trace.

### 4. Rechte Spalte → 2 klare Cards
- Heute: Initiativen + Quellenstatus (+ Hinweise). Ziel: genau 2 Cards —
  **„System"** (Quellenstatus, kompakte Rows, 1 Dashboard-Link) und
  **„MÔRA"** (Status/Initiativen zusammengeführt). Leere Initiativen: Card weglassen.

### 5. Bottom Dock kleiner & ruhiger (`mora/Dock.tsx`)
- Orb-Größe ~20% runter, Dauer-Glow (grüner Schein) auf Hover/Aktiv beschränken,
  Icon-Abstände leicht enger, Tooltip-Verzögerung statt sofort.

### 6. Universe/Orb nur Akzent
- Auf Home: Hintergrund-Orbits/Sterne-Opacity senken (Akzent, nicht Show).
  Universe-Layer selbst unverändert (eigene Szene).

## Verifikation pro Schritt
`npx jest __tests__/components/home` grün + Screenshot-Vergleich in Chrome (vorher/nachher).
Schritte 1–2 zuerst (größte Wirkung), 3–6 danach einzeln.

## Explizit NICHT in diesem Plan
Kein Theming-/Token-System (Phase 3 A→Z-Plan) · kein Scene-Manager-Umbau · keine neuen
Komponenten · kein Farbschema-Wechsel — nur Reduktion des Bestehenden.
