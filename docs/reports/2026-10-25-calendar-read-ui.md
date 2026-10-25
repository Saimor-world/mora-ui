# Home/Heute/Universe: bestätigte Kalenderdaten für MÔRA

Status PREPARED; Risiko B. Branch `gpt/calendar-read-ui`, Basis main `a600a6d7`
(enthält inzwischen extern gemergtes #159). Kein Merge oder Deploy durch diese Arbeit.

## Problem und Akzeptanz

`useWorld` las beim Öffnen direkt `/v3/calendar/events`, wodurch ein Providerabruf ausgelöst
werden konnte. Fehlende Antworten wurden zu leeren Arrays; mehrere Verbraucher konnten
daraus einen freien/erledigten Tag ableiten. Der neue CORE-Lesevertrag aus CORE #149 soll
stattdessen gespeicherte, berechtigte Daten mit Vollständigkeit und Frische liefern.

Akzeptanz: keine Providerabfrage beim Lesen, keine Rückkehr zum alten Kalender bei Fehlern,
keine übernommene Antwort aus anderem Nutzer-/Firmen-/Sitzungskontext, unbekannte Werte
nicht als null Termine ausgeben. Universe und vorhandene Navigation/Planeten bleiben bei
einer fehlenden Kalenderquelle bedienbar. Berlin bestimmt Datenfenster und Tagesableitung.

## Umsetzung

- Separater typisierter Client validiert angeforderte und effektive Quelle, Nutzer/Mandant,
  Firma, Datumsfenster, Abdeckung, Counts, Status, Ereignisfelder und Nullwerte. Nur bekannte
  Felder werden übernommen, keine rohen Providerdaten. Google bleibt ausdrücklich persönliche
  Nutzerquelle. Das Lesen verändert weder Quellen noch OAuth oder Zugangsdaten.
- React Query bindet die neue Kalenderanfrage an Nutzer, Mandant, Sitzungsgeneration,
  Firma und Fenster. Für diesen Pfad wird kein noch laufender HTTP-Aufruf eines früheren
  Nutzers anhand derselben URL wiederverwendet. Alte andere Datenpfade werden dadurch nicht
  pauschal als vollständig sitzungssicher bestätigt.
- Acht Berliner Starttage passen zum vorhandenen Hintergrund-Snapshot; höchstens 31 Tage
  sind im Client zulässig. Das ist ausdrücklich keine Überschneidungs-/Frei-Belegt-Abfrage.
- Lesende Aktualisierung alle 30 Sekunden im sichtbaren Fenster; Minuten-Uhr für Tageswechsel
  und Ablauf. Keine zusätzlichen Animationsschleifen, kein neuer Renderer, keine Änderung
  an Nebel, Navigation oder Planetenmaterial. Berliner Formatter werden wiederverwendet.
- Nach Ablauf oder Refetchfehler erhält auch MÔRAs Kontext `complete=false`, unbekannten
  Count und effektiven Fehlerstatus. Bestätigte alte Metadaten bleiben nicht scheinbar aktuell.
- Handy, DayPanel, beide Desktop-Heute-Kalenderdarstellungen, Horizont und PlanetFocus
  verwenden denselben bestätigten Stand. Fehlendes/partial/403/alter CORE ergibt einen
  unbekannten Zustand, kein falsches Leer und keinen Fallback auf alte Today-Kalenderdaten.
- Tagesfunktionen erhalten ausdrücklich Europe/Berlin; allgemeine alte Aufrufe ohne Zone
  behalten ihre Semantik. Winterzeit, beide wiederholten Stunden und Mitternacht sind geprüft.
  Unbekannte Dauer wird nicht als erfundene 60 Minuten zum vermeintlichen Abschluss verwendet.

## Gegenprüfung

Unabhängige lesende AI-Gegenprüfung durch `logic_release_review`: Rückfall der Desktop-Karten,
erfolgreiche alte Kontext-Metadaten nach Fehler, Gerätezeit statt Vertragszeit sowie zwei
weitere Verbraucher (zweite Kalenderliste, PlanetFocus) wurden gefunden und korrigiert.
Abschließende Nachprüfung: alle gemeldeten Punkte behoben, keine verbleibenden Blocker.
Keine zweite Codebearbeitung durch den Reviewer.

## Prüfung

Abschließender Gesamtstand: 337 Suites / 1935 Tests grün (`jest --maxWorkers=2`).
Zusätzlich 53 OS-Smoke-Tests, `verify:types`, Lint, Critical-Flow-Baseline-Gate und
Produktionsbuild erfolgreich. 100 gezielte Verbrauchertests sowie sechs explizite
Berlin-/Winterzeit-/PlanetFocus-Fälle auch mit UTC-Gerätezone grün. Bestehende Lint-/
React-Testwarnungen außerhalb dieses Diffs; keine fehlgeschlagenen Gates. Lokale Logs
liegen außerhalb des Repos in `outputs/os-calendar-read-20261025` des Codex-Arbeitsordners.
Keine Browserbilder oder realen Modell-/Provider-Erfolge behauptet.

Marius hat für die lokale OS-Arbeit Typecheck, Tests und Build als Prüfumfang akzeptiert;
Sichtprüfung übernimmt Head. Physisches iPhone, 60-fps-Nachweis und authentifizierte echte
CORE-/Sprachmodellreise sind damit nicht bestätigt. Kein neuer Vorschau-Server gestartet.

## Abhängigkeiten und Rückweg

CORE #149 muss vor produktiver Nutzung dieses Pfads bereitstehen. Auf einem alten CORE
zeigt der Kalender bewusst unbekannt; die Oberfläche aktiviert keinen direkten Google-Fallback.
Diese Änderung schaltet noch nicht die eigenständige Kalender-App auf den neuen Leseweg um.
Terminstatus/Antwortbestätigung aus UI #161 bleiben ein eigener Review-/Integrationsschritt.
Figur/MÔRA Alive #163 wird nicht nachgebaut oder vorzeitig als fertig übernommen.

Keine Backend-Migration, Auth-Umgehung, offene Test-/Adminroute oder echten Kalender-Schreibaufrufe.
Rücknahme dieses UI-Commits stellt den vorigen Leseweg wieder her; keine Datenmigration rückgängig
zu machen. Produktive Freigabe und Merge bleiben Marius vorbehalten.
