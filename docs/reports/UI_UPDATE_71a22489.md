# UI-Update: Live `98c66eae` → `main` `71a22489`

Stand 2026-10-22. Ersetzt [UI_UPDATE_45917470.md](UI_UPDATE_45917470.md), weil `main` seitdem um fünf PRs weiter ist.
**Nicht deployt.** Live geht erst etwas mit Marius' OK.

## Was seit dem letzten Bericht dazugekommen ist

| PR | Inhalt | Wirkung ohne Schalter |
|---|---|---|
| #140, #142 | zwei Berichte unter `docs/` | keine |
| #141 | OS-Recovery-Prototyp (A3): `/os`-Shell, 113 neue Dateien | siehe unten, `/os` selbst bleibt aus |
| #143 | Live-Zahlen der OS-Quellen auf den Universe-Planeten | Planeten-Chips können andere Zahlen zeigen |
| #144 | Regelwerk proaktive MÔRA | keine (keine Anzeige) |

Ohne Tests, E2E und Doku sind seit `45917470` 105 Dateien geändert (+7510 / −345), fast alles aus #141.
Zusammen mit dem alten Bericht ist der Unterschied zu Live also deutlich größer als die dort genannten 17 Dateien.

## `/os` bleibt im Live-Build aus

- `/os` rendert die neue Shell nur mit dem Build-Schalter `NEXT_PUBLIC_OS_PROTOTYPE=1`, sonst einen ruhigen Hinweis.
- Die Middleware-Ausnahme ohne Sitzung gilt nur auf `localhost` **und** mit `NEXT_PUBLIC_OS_PREVIEW=local`.
- Weder das `Dockerfile` (das jede `NEXT_PUBLIC_*`-Variable als `ARG` deklarieren muss) noch ein Workflow setzt diese Schalter.
  Ein Docker-Build kann `/os` also nicht einschalten.
- **Offen:** Ob der Live-Server per Docker oder direkt aus `/root/saimor/ui` mit eigener `.env` baut, ist von hier nicht sichtbar.
  Baut er direkt und steht dort `NEXT_PUBLIC_OS_PROTOTYPE=1`, wäre `/os` für eingeloggte Nutzer sichtbar. Vor dem Deploy kurz prüfen.

## Was Live-Nutzer zusätzlich zum alten Bericht sehen würden

| Bereich | Änderung | Quelle |
|---|---|---|
| Universe | Planeten-Chips mit Live-Zahlen, wo die Quelle geantwortet hat; sonst wie bisher | #143 |
| Universe | Laufband (`UniverseTicker`) bekommt einen dunklen Hintergrund. Die alte Klasse `/92` erzeugte keinen, jetzt `/[0.92]` | #141 |
| Universe | Behebt eine mögliche Render-Schleife im Feld (React #185 auf `/#universe` ohne Sitzung) | #141 |
| Bundle | 4 MP3s unter `public/ambient/` (je 673 KB). Geladen nur von `AmbientPlayer` in der `/os`-Shell (`/ambient/${phase}.mp3`), also live ungenutzt, solange `/os` aus ist | #141 |
| Bundle | Tailwind scannt zusätzlich `features/**`, das CSS wird etwas größer | #141 |

Alles andere aus #141 sind neue Dateien hinter `/os` oder Opt-in-Props, die ohne Aufruf nichts ändern.

## Befund vor dem Deploy: „Saimôr Finance – nur Owner“ stimmt im Launcher nicht

Seit #137 heißt der sichtbare Launcher-Eintrag `finance` „Saimôr Finance“ mit der Beschreibung *„nur lesend, nur Owner“*.
Er lädt aber die **alte** App `apps/finance`, nicht `apps/finance-v2`. Der Owner-Schutz aus #137 steckt nur in `finance-v2`.

- `apps/finance` hat keinen Rollen-Check, Manifeste kennen keine Rollenfelder.
- Ihre Daten kommen aus `/api/finance/xrpl?mode=company`. Die Route prüft weder Owner noch Rolle; die Middleware verlangt nur irgendeine gültige Sitzung.
- Folge: Jede eingeloggte Person, auch aus einer Kundenfirma, sieht Saimôrs Treasury- und Hot-Minter-Salden sowie NFT-Angebote.
- Einordnung: Die Werte stehen ohnehin öffentlich auf dem XRPL-Ledger. Das Risiko ist gering, aber der Eintrag verspricht etwas anderes als er tut,
  und es widerspricht der Entscheidung vom 19.10. (owner-only).
- Live ist das noch nicht: Live (`98c66eae`) hat den Eintrag noch als „Kapital“ ohne Owner-Versprechen.

Lösungsmöglichkeiten (Entscheidung Marius/Head):
1. `apps/finance` ebenfalls hinter `isOwner` stellen und die Route `/api/finance/xrpl` serverseitig auf Owner beschränken.
2. Den Launcher-Eintrag `finance` auf `finance-v2` zeigen lassen und die alte App auslaufen lassen.

## Prüfergebnisse auf `71a22489`

| Prüfung | Ergebnis |
|---|---|
| GitHub CI auf `71a22489` (`ui`: Lint, Unit-Tests, Production-Build; `verify`; Vercel) | **grün**, Unit-Tests 1760/1760 |
| `tsc --noEmit` lokal | **0 Fehler** |
| Jest lokal (Windows) | 1759/1760. `OsUniverse` läuft lokal in eine Wartezeit (dynamischer Import langsamer als `findBy`), in der CI grün |
| Playwright-e2e | nicht ausgeführt |

Korrektur zu #141: Dort stand, `OsUniverse` erwarte eine Test-ID, die es nicht mehr gibt, und die MP3s lade kein Code.
Beides war falsch. Die Test-ID kommt aus einem Mock im Test selbst, und `AmbientPlayer` lädt die MP3s.

## Empfehlung

Vor einem Live-Update:
1. Finance-Befund oben entscheiden und beheben (sonst nicht deployen).
2. Prüfen, wie der Live-Server baut, und dass dort `NEXT_PUBLIC_OS_PROTOTYPE` nicht gesetzt ist.
3. Marius' OK.
4. Danach Universe am Handy und am Desktop ansehen, besonders das Laufband und die Planetenzahlen.
