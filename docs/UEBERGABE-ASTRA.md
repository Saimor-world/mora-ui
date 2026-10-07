<!-- Übergabe an Astra · alle Teile in einem Dokument · Screens: UEBERGABE-ASTRA/screens im Übergabe-Zip -->
# Übergabe an Astra – SAIMÔR OS-Prototyp (07.10.2026)

Repo `Saimor-world/mora-ui` · Branch `grok/os-recovery-prototype-v1` · PR #101 (Draft) · Code-Stand **V1.7 „Andockstation“** (Quellen-Redesign gebaut, siehe 04 › 4.4)

| Datei | Inhalt |
|---|---|
| [01-STATUS.md] | Repo, Branch, PR, Start lokal (Flags, Dev-Login mit lokalem CORE, Ports), Tests, Versionen V1–V1.6 |
| [02-VISION-UND-REGELN.md] | Marius' Vision, Designregeln, Definition of Done, Sicherheitsregeln |
| [03-MARKTRECHERCHE.md] | Wie die Besten Quellen und Onboarding lösen, generisch vs. innovativ, Konzepte für SAIMÔR, Links |
| [04-KRITIK-UND-REDESIGN-BRIEF.md] | Ehrliche Kritik an Quellen-Seite und Onboarding (V1.6, mit Screens), Redesign-Brief, **4.4 Umsetzung V1.7 und was offen ist** |
| [05-OFFENE-PUNKTE-UND-BACKLOG.md] | Priorisiertes Backlog P0–P3 |
| [06-STARTPROMPT-ASTRA.md] | Fertiger Startprompt. **Neue erste Aufgabe: erste echte lokale Quelle, damit das Briefing live geht** |
| `werkzeuge/` | Kontrast-Messung: `contrast-pixels.mjs` (Playwright-Messung) und `contrast-analyze.py` (Auswertung). Pfade ggf. anpassen. |
| `UEBERGABE-ASTRA/screens/` (Übergabe-Zip) | Ausgewählte Screens: 1x Ist-Quellen, 2x Ist-Onboarding, 3x Flächen, 4x Phasen, 5x Legacy-Vergleich, **6x V1.7 Andockstation** (65 = Testaufnahme mit gemockter CORE-Antwort) |

Im Repo liegt dieselbe Übergabe als `docs/UEBERGABE-ASTRA.md` (ohne Bilder).


# 1 · Status (Stand 07.10.2026, 22:00 Berlin)

## Repo, Branch, PR
| | |
|---|---|
| Repo | `Saimor-world/mora-ui` (öffentlich) |
| Branch | `grok/os-recovery-prototype-v1` |
| Basis | `main @ a053dd39` |
| PR | **#101**, Draft, nicht gemergt, **nicht deployed** |
| Code-Head | V1.7 „Andockstation“ (`9f969603` und Folge-Commits, siehe `git log`). Doku-Übergabe: `docs/UEBERGABE-ASTRA.md`. |
| CI | GitHub Actions „CI“ (lint, verify:types, critical-flow, os-smoke, Jest, Build) und Vercel Preview: grün, `mergeable_state: clean` |
| Hauptdoku | `OS-RECOVERY-PROTOTYPE-V1.md` im Repo-Root, §1–§29 (Versionen ab §23, V1.7 = §29) |

„unstable“ am PR erscheint nur, solange CI nach einem Push noch läuft. Das ist kein Code-Fehler.

## Lokal starten
Voraussetzungen: Node 20/22, `npm ci` im Ordner `mora-ui`.

### A) Vorschau ohne CORE (Demo-Daten, nur localhost)
```bash
cd mora-ui
NEXT_PUBLIC_OS_PROTOTYPE=1 NEXT_PUBLIC_OS_PREVIEW=local npx next build
NEXT_PUBLIC_OS_PROTOTYPE=1 NEXT_PUBLIC_OS_PREVIEW=local npx next start -p 3000
# http://localhost:3000/os   (Deep-Links: #today #universe #mora #post #knowledge #finance #settings #labs)
```
- Die Flags werden beim Build eingebrannt. Vor jedem Neubau `fuser -k 3000/tcp; rm -rf .next` ausführen, sonst liefert ein alter `next start` einen kaputten Build.
- URL-Schalter für Screenshots: `?phase=flow|build|lounge|night&look=kosmos|klar&onboarding=off`, außerdem `?section=sources` für Einstellungen.
- Das Onboarding erscheint beim ersten Besuch. Für Tests setzt man `localStorage.saimor_product_tour_dismissed = '1'`.

### B) Mit lokalem CORE (echte Sitzung, nie Produktion)
```bash
# CORE (privates Repo saimor-core, lokal geklont unter os-recovery-v1/saimor-core)
cd saimor-core/core
mkdir -p ../data/logs
ENVIRONMENT=development PYTHONPATH=<repo>:<repo>/core \
  <venv>/bin/python -m uvicorn app:app --port 8081
# SQLite: saimor-core/data/saimor_universe.db; die Simple Coffee Group wird beim Start geseedet.

# UI gegen lokalen CORE
cd mora-ui
NEXT_PUBLIC_OS_PROTOTYPE=1 NEXT_PUBLIC_SAIMOR_CORE_URL=http://localhost:8081 SAIMOR_CORE_URL=http://localhost:8081 npx next build
NEXT_PUBLIC_OS_PROTOTYPE=1 SAIMOR_CORE_URL=http://localhost:8081 npx next start -p 3000
```
- **Dev-Login:** `POST /api/auth/core-login` auf :3000 mit `{email, password}`. Das setzt die Cookies `mora_session` und `mora_auth_token`. Danach `/os` öffnen. Seit V1.6 lädt `OsSessionBoot` das Profil selbst.
- **Konten:**
  - Ein Demo-Konto (`tenant-demo`) zeigt die Demo-Firma. CORE liefert dafür bewusst **keine** Quellen und keine Agenten-Gedanken (`boundary`).
  - Für echte Quellen-Status wird ein **lokales Nicht-Demo-Konto** gebraucht. Es lässt sich nur direkt in der lokalen SQLite anlegen, weil die öffentliche Registrierung deaktiviert ist.
  - Zugangsdaten stehen nicht in dieser Übergabe. Lokal selbst setzen, nie in Produktion.
- **Ports:** CORE 8081, /os 3000, Legacy-UI (`next dev`, Worktree `legacy-ui`) 3001. Die CORS-Einstellung von CORE erlaubt 3000 und 3001.
- Agenten-Gedanken entstehen echt, z. B. durch `GET /v3/search/semantic?query=…` mit Sitzung.

## Tests
```bash
npx tsc --noEmit                         # 0 Fehler
npm run lint                             # 0 Fehler (nur Alt-Warnungen in HomeSurface)
npx jest --maxWorkers=2                  # 271 Suites / 1557 Tests
npx playwright test e2e/os-prototype     # 48 Tests; Server auf :3000 (Vorschau-Build) muss laufen
npm run verify:types && npm run verify:critical-flow && npm run verify:os:smoke   # wie CI
```
- **Viewports:** 1024×768, 1280×800, 1440×900, 1180×820 und 820×1180. Nur Desktop und iPad, kein Phone.
- **Kontrast:** `contrast-pixels.mjs` und `contrast-analyze.py` (im Übergabe-Zip und unter `os-recovery-v1/`). V1.6: 0 von 3 200 Textstellen unter 4.5:1. V1.7 (misst jetzt auch SVG-Text, Fläche `sources`): 0 von 1 720.
- **Privacy-Grep** über den Diff muss 0 ergeben. Muster: Mail-Domains, IBAN, Telefonnummern, `ghp_`, `github_pat_`, `sk-…`, Private Keys sowie Pilot- und Kundennamen.
- **Achtung:** `npm ci --dry-run` löscht trotzdem `node_modules`.

## Was jede Version enthält
| Version | Inhalt (Doc-§) |
|---|---|
| **V1** | `/os` hinter Flag. Manifest-Shell mit Heute, MÔRA, Finance, Post, Wissen, Einstellungen und Labs. Token-Designsystem (`osTokens.ts` → `--os-*`), 8 gemeinsame Zustände. Alle 29 Legacy-Apps eingeordnet. Finance v2 verdrahtet. Lokale Vorschau. (§1–§22) |
| **V1.1** | Universe, Hintergrundbild und Vibe bleiben. Volles Universe nur in Universe, alle anderen Flächen „calm“. (§23) |
| **V1.2** | Universe-Experience: Landschaft mit Planeten um MÔRA als Kern, Organisationsfeld. (§24) |
| **V1.3** | Am Original orientiert: Marius' Dock als Hauptnavigation (Legacy-Kapsel), Original-Planeten (`OrganizationField`), Demo-Pack Simple Coffee Group. (§25) |
| **V1.3.1** | Bugfixes. |
| **V1.4** | „Kommandozentrale“: ⌘K-Palette, Kürzel, MÔRA-Lagebild, Planeten-Fokus, Control Center, Kontext-Kapsel. Legacy-OS per Dev-Login erkundet und übernommen. Desktop/iPad. (§26) |
| **V1.5** | Heller Legacy-Hintergrund. Looks **Kosmos/Klar**. **4 Tagesphasen** (Flow, Build, Lounge, Nacht) färben alles. Synthetische Ambient-Loops (Platzhalter, standardmäßig aus). Ehrliches MÔRA-Morgenbriefing. Universe-UX-Kritik und Fixes. Inventar ruhender Teile (§27.5). |
| **V1.5.1** | Klar mit dezenten Phasenfarben. Begrüßung folgt der gewählten Phase. (§27.7) |
| **V1.6** | Onboarding in 4 Schritten (firstRunStore), Agenten-Feed (`/v3/agency/thoughts`), Einstellungen › Quellen (`/v3/connections`, Verbinden nur gegen lokalen CORE), Kontrast gemessen und auf 0 Unterschreitungen gebracht. Fixes: Briefing-Envelope, `/os` lädt die Sitzung selbst, kaputte Tailwind-Opacity-Klassen im Universe. (§28) **Marius' Urteil: Quellen-Seite und Onboarding-Schritt sind zu generisch. Siehe 04.** |
| **V1.7** | **Andockstation:** Quellen docken als Stationen an die Abteilungs-Planeten an, die sie speisen. Ein MÔRA-Satz, eine Aktion, Freigabe-Schleuse, erstes Signal, Fehler übersetzt, Progressive Disclosure. Kosmos und Klar, alle Phasen. Onboarding Schritt 3 nutzt dieselbe Szene. Alte Liste und Tab „Verbindungen“ aufgelöst. (§29, 04 › 4.4) |

## Wichtige Dateien
`app/os/page.tsx` · `components/os-shell/*` (OsShell, OsDock, OsAtmosphere, ControlCenter, CommandPalette, OsOnboarding, OsSessionBoot, AmbientPlayer) · `components/os-kit/*` (Primitive, `os-kit.css`: nur `var(--os-*)`, keine rgba/hex) · `lib/design/osTokens.ts` (Tokens, `osPhaseVariables`) · `lib/os-prototype/*` (shellStore, usePhase, useSources, sourceDock, onboarding, demoPack, scene) · `features/settings/ui/SourceDock.tsx` (Andockstation) · `features/*` (today, universe, mora, post, knowledge, finance, settings, labs) · `e2e/os-prototype.spec.ts` · `public/ambient/*.mp3`.


# 2 · Marius' Produktvision und Designregeln

> **„Ein ruhiges Cockpit für ein Unternehmen – mit MÔRA als Bedienung.“**
> **Klarheit im Wandel.**

Diese Seite ist der Maßstab für jede Entscheidung. Wenn etwas „ganz okay“ aussieht, aber auch in einem beliebigen SaaS-Tool stehen könnte, ist es falsch.

## Die Vision in Marius' Sinn
- **SAIMÔR ist ein Cockpit, kein Tool-Sammelsurium.** Eine Firma wird als Raum erlebt (Universe), nicht als Liste von Apps. MÔRA ist die Bedienung: Sie sieht den Kontext, erklärt, schlägt den nächsten Schritt vor und handelt nur mit Bestätigung.
- **Der Ansatz existiert so noch nicht am Markt.** Er wird nur etwas, wenn er ernsthaft und kompromisslos hochwertig umgesetzt wird. **Innovativ und premium**, nie generisch.
- **Universe, Hintergrund und Vibe bleiben** und werden nur besser. Das volle Universe gibt es im Universe, alle anderen Flächen tragen denselben Vibe ruhiger.
- **Sein Dock und seine Original-Planeten** (Abteilungen als Planeten, Ordner als Monde, Dokumente als Sterne, Fäden „belegt / vermutet“) sind gesetzt. Nicht ersetzen, verfeinern.
- **Legacy übernehmen, wo es besser aussieht.** Erst im alten OS nachsehen (Dev-Login mit lokalem CORE), dann verbessern. Nicht neu erfinden, was es dort schon schöner gibt.
- **Wenige Elemente, dafür wirklich gut.** Lieber eine perfekte Aktion als zehn Infokästen.

## Designregeln
1. **Kein 0815-SaaS:** keine Logo-Raster mit „Connect“-Buttons, keine Karten-Wüsten, keine Status-Pillen-Listen, keine Erklärtext-Kästen über jedem Abschnitt.
2. **Kein „vibe-coded“-Look:** keine beliebigen Glows, keine Gradient-Spielereien ohne Bedeutung, keine generischen Icons als Dekoration, keine KI-typischen Lila-Verläufe.
3. **Keine kindliche Grafik:** keine Comic-Illustrationen, keine Emojis, keine verspielten Maskottchen. Raumfahrt-Ernst, nicht Spielzeug.
4. **Zwei Looks, gleiche Funktion:**
   - **Kosmos:** Raum, Licht, Legacy-Hintergrund.
   - **Klar:** nüchterne Business-Ansicht, deckende Flächen, dezente Phasenfarbe.
   - Beide werden lokal gespeichert.
5. **Vier Tagesphasen mit Farbe und Ambient-Klang:**
   - Flow (morgens, Smaragd), Build (tags, Himmelblau), Lounge (abends, Amber), Nacht (Indigo).
   - Sie färben Universe, Karten und Akzente.
   - Ambient ist standardmäßig aus, mit klarem Schalter. Autoplay-Regeln und Reduced Motion werden beachtet.
6. **Nur Desktop und iPad (ab 768 px).** Kein Phone-Layout, keine Phone-Tests.
7. **Selbsterklärend für den Mittelstand:** Klartext statt Jargon, klare Hierarchie, immer eine offensichtliche nächste Aktion. Cockpit, aber nicht verspielt und nicht zu luftig.
8. **Ehrliche Daten:**
   - Demo-Inhalte tragen sichtbar „Beispiel“.
   - Was nicht belegt ist, heißt „unbekannt“, nicht „nichts“.
   - **Keine erfundenen Finanzzahlen.**
   - Nie „verbunden“ behaupten, wenn CORE es nicht sagt.
9. **Kontrast mindestens 4.5:1** (große Schrift 3:1), in allen Phasen und in beiden Looks gemessen.
10. **Tokens statt Farben im Code:** In `os-kit.css` und neuen Komponenten keine rgba- oder hex-Werte, nur `var(--os-*)`.

## Definition of Done
Fertig ist erst, was **gebaut, integriert, sichtbar, deployed, verifiziert und dessen alte Variante aufgelöst** ist. Im Prototyp heißt „deployed“ derzeit: gepusht, CI grün, PR #101 aktualisiert. Ein echtes Deployment nur nach ausdrücklicher Freigabe durch Marius.

## Sicherheitsregeln (nicht verhandelbar)
- **Keine Produktion:** kein Deploy, keine Produktions-Datenbank, keine Produktions-CORE-Aufrufe aus dem Prototyp. Ein lokaler CORE ist erlaubt.
- **Keine Secrets:** keine Tokens oder Passwörter in Code, Doku, Screenshots oder Logs. Gepusht wird mit dem bereitgestellten Token, der nie ausgegeben wird.
- **Keine Migrationen, kein Löschen** (Daten, Branches, Apps, Stores). Alte Teile werden verschoben oder versteckt, nicht entfernt.
- **Keine Wallets, kein XRPL**, kein Signieren, Minten oder Treasury-Aktionen. Höchstens Anzeige.
- **Keine privaten oder Pilot-Namen.** Der Privacy-Grep über den Diff muss **0** ergeben. Demo-Firma ist die fiktive „Simple Coffee Group“.
- **YORI bleibt getrennt vom OS:** keine Kopplung, kein Import, keine Vermischung.
- Nach außen sichtbare Aktionen (Mails, Posts, Tickets) nur mit ausdrücklicher Freigabe.


# 3 · Marktrecherche: Datenquellen anbinden und Onboarding

Ziel: verstehen, was die Besten machen, was davon **generisch** ist und was SAIMÔR **anders** machen kann. Quellen sind unten verlinkt (Stand Oktober 2026).

## 3.1 Was die führenden Produkte tun
| Produkt | Ansatz | Was wir lernen |
|---|---|---|
| **Linear** | Kurzer Wizard: Theme, ⌘K-Einführung, optional GitHub und Einladungen. Danach ein vorbefüllter Workspace mit Starter-Issues und einer Aufgaben-Checkliste. Aktivierung = erstes Issue **gelöst**, nicht nur angelegt. | Das Bedienmodell (⌘K) zuerst beibringen. Lernen durch Tun statt durch Tour. Integrationen sind optional und kommen nach dem Wert. Kritik: Der Wizard fragt nie, wer man ist; das Wichtigste liegt versteckt in der Doku. |
| **Superhuman** | Jahrelang 1:1-Onboarding durch Spezialisten (Genius-Bar- und Hotel-Concierge-Vorbild), dann produktisiert. Setup-, Aha- und Habit-Moment in ca. 30 Minuten. Die erste Self-Serve-Version war bewusst „Mario 1-1“: kontrollierte Umgebung zum Üben. | **Concierge statt Formular.** Genau diese Rolle kann MÔRA übernehmen: diagnostizieren, einrichten, üben lassen. |
| **Arc** | „Unboxing“ statt Setup: Farbe, Bewegung, Klang, Import der alten Daten, kluge Voreinstellungen. Am Ende eine persönliche „Mitgliedskarte“ (Endowment und Peak-End). Kritik: Account-Zwang und Dark Patterns kosten Vertrauen. | Emotionaler erster Eindruck und Ownership-Moment. Aber nie erzwingen, immer überspringbar, keine Tricks. |
| **Raycast** | Store als eigener Befehl. Erforderliche Einstellungen blockieren einen Befehl, bis sie gesetzt sind. Die Setup-Hilfe steht direkt neben dem Formular (`help.md`). | Konfiguration genau dort, wo sie gebraucht wird (just-in-time), nicht vorab in einer langen Liste. |
| **Notion** | Settings › Connections mit Discover-Katalog und Verwaltung, AI-Connectors separat, MCP-Server als Quellen. | Der Branchenstandard: Katalog plus Liste. Funktional, aber **genau das generische Muster**, das Marius nicht will. |
| **Zapier / Make** | Riesige App-Verzeichnisse (Logo-Raster, Suche, Kategorien). Verbinden per OAuth-Popup oder Redirect, sonst API-Key-Formulare. Bei Make entsteht die Verbindung im Moment des Bedarfs im Scenario Builder. | Verzeichnisse skalieren, sind aber anonym. Gut ist das Verbinden **im Kontext**, wenn ein Baustein es braucht. Reconnect und Ablauf werden proaktiv gemeldet. |
| **Apple Home / Matter** | Gerät anschalten, Code scannen oder iPhone daneben halten. Danach **benennen und einem Raum zuordnen**, fertig. Eigene Zusatzfunktionen erst **nach** der Grundeinrichtung. | Der Kern ist ein physischer Akt plus Zuordnung zu einem Ort. Übertragen: eine Quelle wird einer Abteilung, einem Planeten zugeordnet. |
| **Apple Control Center (iOS 18)** | Einfache Grundansicht. Der volle Katalog erscheint erst im Bearbeiten-Modus. Größere Kacheln zeigen mehr Werte. | Progressive Disclosure als Grundprinzip: Katalog verstecken, bis man ihn will. |
| **Limitless / Rewind** | Pairing über die App, sichtbare Aufnahme-LED, Pflicht zu Hinweis und Einwilligung, Nutzerkontrolle über Aufbewahrung. (Rewind wurde 2025 eingestellt.) | **Vertrauen sichtbar machen:** Man sieht jederzeit, was gerade fließt, und kann es mit einem Griff stoppen. |
| **Tesla UI** | Minimal und softwaredefiniert. Die Umfeld-Visualisierung zeigt, **was das System wahrnimmt**, und schafft so Vertrauen. Kritik: Sie kann ablenken und Platz kosten. | Systemwahrnehmung räumlich zeigen statt in Tabellen, aber sparsam und nur Relevantes. |
| **Spiele- und Raumschiff-HUDs** (Dead Space, Elite Dangerous) | Diegetische UI: Anzeigen leben in der Welt, etwa auf dem Anzug oder im Cockpit. Kontextmodi zeigen nur die relevanten Panels. Strenge Farbsprache (Rot Alarm, Blau/Weiß interaktiv, Amber Umgebung). | Das Universe **ist** die Oberfläche. Status gehört an die Objekte, nicht in Listen daneben. Feste Farbsemantik. |

## 3.2 Generisch oder innovativ?
**Generisch (vermeiden):**
- Logo-Raster bzw. Katalog mit „Verbinden“-Buttons (Zapier, Notion, Make)
- Lange Listen mit Beschreibung, Status-Pille und Button pro Zeile (unsere V1.6-Quellen-Seite)
- Infotext-Kästen über jedem Abschnitt
- Modaler Wizard mit Fortschrittsbalken und Formularfeldern
- Technische Felder vorab (API-Token, Client-ID, App-Passwort), interne Admin-Zustände vor Kunden („Server-Einrichtung fehlt“)
- Checklisten-Widgets „3 von 7 erledigt“

**Innovativ (übernehmen und weiterdenken):**
- Concierge-Prinzip (Superhuman): eine kundige Instanz führt. Bei uns ist das MÔRA.
- Zuordnung zu einem Ort als Kern der Einrichtung (Apple Home)
- Systemwahrnehmung räumlich zeigen (Tesla)
- Diegetische, kontextuelle Anzeige (HUDs)
- Ownership-Moment am Ende (Arc), aber erwachsen
- Lernen durch die echte erste Handlung (Linear)
- Verbinden genau dann, wenn es gebraucht wird (Make, Raycast)
- Sichtbares Vertrauen und Stopp mit einem Griff (Limitless)

## 3.3 Konkrete Konzepte für SAIMÔR
1. **Quellen docken physisch ins Universe an.**
   - Jede Quelle ist eine **Station** (oder ein Mond) im Orbit, z. B. Kalender, Mail, Cloud-Dateien oder Notion.
   - Verbinden bedeutet **Andocken**: Die Station gleitet an den Planeten (die Abteilung), den sie speist, und ein Lichtfaden zeigt den Datenfluss.
   - Der Status ist räumlich:
     - angedockt und leuchtend = verbunden
     - im Orbit, gedimmt = bereit
     - als Kontur oder Schemen = braucht Admin-Einrichtung (für Kunden standardmäßig ausgeblendet)
   - Keine Liste.
2. **Eine fokussierte Aktion pro Bildschirm.**
   - MÔRA schlägt **die eine** nächste Quelle vor, mit Begründung aus dem Nutzen: „Mit deinem Kalender kann ich dir morgen früh das erste Briefing geben.“
   - Ein Knopf: „Andocken“. Alles andere ist sekundär erreichbar.
3. **MÔRA erklärt statt Textfelder.**
   - Der Stein spricht in einem kurzen Satz.
   - Fragen wie „Was liest SAIMÔR?“, „Wer sieht das?“ oder „Wie trenne ich es?“ beantwortet MÔRA auf Nachfrage (Progressive Disclosure), nicht als Absatz auf der Seite.
4. **Freigabe-Schleuse (Consent als Akt).**
   - Vor dem Andocken zeigt eine Schleuse, **was genau** hereinkommt („Termine der nächsten 14 Tage, nur Titel und Zeit“) und **wohin** (welcher Planet).
   - Abdocken ist eine Geste an der Station. Das macht Vertrauen sichtbar.
5. **Erster echter Moment statt Erfolgsmeldung.**
   - Nach dem Andocken fliegt das **erste echte Signal** sichtbar in „Heute“, und das Briefing schaltet von „startet, sobald …“ auf live.
   - Das ist der Aha-Moment, nicht ein grüner Haken.
6. **Progressive Disclosure für den Katalog.**
   - Standardmäßig nur die 3 bis 4 Stationen mit dem größten Nutzen für den Mittelstand: Kalender, Mail, Cloud-Dateien, später Finanzen.
   - „Weitere Stationen“ öffnet den Rest wie den Bearbeiten-Modus im Control Center.
   - Technische Felder erst im letzten Schritt und nur, wo OAuth nicht geht.
7. **Inbetriebnahme statt Onboarding-Wizard.**
   - Die Einführung passiert **im Universe selbst**, nicht in einem Modal: Look und Phase wählen, dann erscheint der Raum. Die Firma benennen, dann taucht der Kern auf. Abteilungen nennen, dann entstehen Planeten. Die erste Station andocken, dann fließt das erste Signal. Zum Schluss ein kurzer HUD-Hinweis auf Dock und ⌘K.
   - Der Ownership-Moment wird erwachsen gestaltet, z. B. als Betriebsbereitschaft: „Cockpit bereit · 1 Quelle · Briefing ab morgen 07:00“.
8. **Klar-Look als Instrument.** In „Klar“ wird dasselbe Konzept als schematisches Orbital-Diagramm gezeigt (wie ein Fluginstrument), nicht als Foto. Gleiche Logik, nüchtern.
9. **HUD-Statusring statt Statusseite.** Ein kleiner Andock-Ring in der Topbar („2 Stationen angedockt“). Ein Problem erscheint nur dann amber, wenn es Wirkung hat, z. B. weil das Briefing ausfällt.

## 3.4 Links
- Linear-Teardown: https://supademo.com/user-flow-examples/linear · https://screenrove.com/linear/flows · Kritik: https://nikolaylechev.com/blog/first-five-minutes-ep3
- SaaS-Onboarding 2026: https://www.aydesign.ai/blog/saas-onboarding-best-practices-2026
- Superhuman: https://review.firstround.com/superhuman-onboarding-playbook/ · https://blog.superhuman.com/the-fastest-way-to-inbox-zero-a-single-coaching-session/ · https://brianbalfour.com/quick-takes/concierge-onboarding-is-it-scalable
- Arc: https://www.inverse.com/input/design/the-browser-company-arc-design-interview · Kritik: https://deceptive.design/articles/arc-browsers-pushy-account-requirements/
- Raycast: https://manual.raycast.com/extensions · https://developers.raycast.com/api-reference/preferences
- Notion Connections: https://www.notion.com/help/add-and-manage-connections-with-the-api · https://www.notion.com/help/notion-ai-connectors
- Zapier und Make: https://docs.zapier.com/white-label/implementation/connection-flow · https://zapier.com/blog/zapier-partner-solutions/ · https://help.make.com/connect-an-application
- Apple Home: https://support.apple.com/en-us/104998 · https://support.apple.com/guide/iphone/set-up-accessories-iph125110541/26/ios/26
- Apple Control Center: https://appleinsider.com/articles/24/06/13/how-control-centers-new-design-in-ios-18-makes-it-faster-to-use-and-customize
- Limitless: https://help.limitless.ai/en/articles/10540861-how-to-ask-for-consent-and-let-others-know-you-are-recording · https://www.limitless.ai/privacy
- Tesla UX: https://uxmag.com/articles/teslas-groundbreaking-ux-an-interview-with-user-interface-manager-brennan-boblett
- Diegetische UI: https://www.polygon.com/2013/3/31/4166250/dead-space-user-interface-gdc-2013/ · https://www.uxmatters.com/mt/archives/2015/09/an-interview-with-louise-mclennan-designer-of-elite-dangerous.php · https://nastyrodent.com/diegetic-and-non-diegetic-ui/
- Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/


# 4 · Ehrliche Kritik und Redesign-Brief

> **Stand 07.10.2026, abends: Der Brief aus 4.3 ist für Quellen-Seite und Onboarding-Schritt 3 als V1.7 „Andockstation“ umgebaut** (Commit `9f969603` ff., Doc §29). Was erledigt ist und was bleibt, steht in **4.4**. 4.1 und 4.2 beschreiben den V1.6-Stand, der kritisiert wurde (Screens `10`–`23`).

Marius' Urteil zu V1.6: *Die Integrations- und Quellen-Seite und der Quellen-Schritt im Onboarding sehen wieder zu generisch aus, überladen, zu viele Infotext-Felder. Weg von seinem Know-how. Alles muss innovativ und premium sein.* Das Urteil trifft zu. Die Funktion stimmt (echte Status aus CORE, ehrlich, nur lokal verbindbar), die Form ist Standard-SaaS.

## 4.1 Quellen-Seite (Einstellungen › Quellen) – Kritik an V1.6
Screens: `screens/10-ist-quellen-seite-live.jpg`, `11-ist-quellen-seite-ohne-sitzung.jpg`, `12-ist-quelle-verbinden-fehler.jpg`

| # | Befund | Warum das falsch ist |
|---|---|---|
| 1 | Zehn gleichwertige Zeilen, jede mit Name, Beschreibungssatz, Status-Pille und Button | Genau das Zapier- bzw. Notion-Muster. Keine Hierarchie: Stripe wiegt so viel wie der Kalender. |
| 2 | Infotext über der Liste („Status direkt aus CORE … Briefing startet …“) und Erklärsätze pro Zeile | Textlastig. Ein Mittelständler liest das nicht, er will wissen, was er tun soll. |
| 3 | „Server-Einrichtung fehlt“ (amber) für Google Drive und SharePoint | Ein interner Admin-Zustand landet vor dem Kunden und wirkt wie ein Fehler des Produkts. |
| 4 | Formular klappt inline auf (App-Passwort, Token, Server-URL) | Technik vorab. Kein Vertrauensaufbau, keine Erklärung, was danach passiert. |
| 5 | CORE-Fehler wörtlich und auf Englisch („Notion rejected the token“) | Ehrlich, aber roh. Es fehlt eine Übersetzung in einen nächsten Schritt. |
| 6 | Kein Bezug zum Universe oder zu Abteilungen | Quellen schweben losgelöst in den Einstellungen. Der Kern von SAIMÔR, die Firma als Raum, fehlt. |
| 7 | Kein sichtbarer Nutzen | Es steht nirgends, was eine Quelle **bringt**, z. B. das Briefing. |
| 8 | Ohne Sitzung ein grauer Textkasten mit Aufzählung | Ein toter Zustand ohne Handlung und ohne Vorschau, wie es aussähe. |
| 9 | Tabs „Quellen“ **und** „Verbindungen“ nebeneinander | Doppelt und verwirrend. Die alte Verbindungsliste (`/v3/integrations/overview`) muss aufgelöst werden. |
| 10 | Grüne Hint-Kästen mit Rand und Icon überall | Ein generisches UI-Kit-Gefühl („vibe-coded“), keine eigene Handschrift. |

## 4.2 Onboarding – Kritik an V1.6
Screens: `screens/20-…` bis `23-ist-onboarding-*.jpg`

| # | Befund | Warum das falsch ist |
|---|---|---|
| 1 | Klassisches Modal über abgedunkelter Seite, Fortschrittsleiste „Schritt x von 4“ | Standard-Wizard. Das Universe als stärkstes Asset bleibt im Hintergrund unsichtbar. |
| 2 | Schritt 3 „Quelle“: ein Warnkasten plus Link „Zu Einstellungen › Quellen“ | Sackgasse ohne Handlung. Der wichtigste Schritt hat am wenigsten Gewicht. |
| 3 | Schritt 4 „Tour“: drei Info-Kästen untereinander | Erklärt statt zeigt. Linear und Superhuman lassen den Nutzer handeln. |
| 4 | Schritt 2 „Firma“: Formularfelder und Chips, dazu ein Hinweiskasten | Nichts passiert sichtbar. Es entstehen keine Planeten, es gibt keinen Ownership-Moment. |
| 5 | Schritt 1: Look-Karten mit leeren schwarzen Vorschau-Balken | Die Vorschau wirkt kaputt. Ein echtes Mini-Preview fehlt. |
| 6 | MÔRA kommt kaum vor (nur als kleines Icon) | MÔRA ist laut Vision die Bedienung. Im Onboarding müsste sie führen. |

## 4.3 Redesign-Brief für Astra
**Auftrag:** Quellen-Seite und Onboarding so neu gestalten, dass sie **unverwechselbar SAIMÔR** sind: Cockpit, Universe, MÔRA als Bedienung. Ruhig, hochwertig, selbsterklärend für den Mittelstand.

**Prinzipien**
1. **Andocken statt Liste.** Quellen sind Stationen bzw. Monde im Universe und docken an den Planeten (die Abteilung) an, den sie speisen. Der Status ist räumlich. Konzepte in 03 › 3.3.
2. **Eine Aktion pro Bildschirm.** MÔRA schlägt die eine nächste Quelle mit Nutzen-Begründung vor. Ein primärer Knopf.
3. **MÔRA spricht, die Seite schweigt.** Höchstens ein Satz sichtbarer Text pro Zustand. Details nur auf Nachfrage.
4. **Freigabe-Schleuse.** Vor dem Andocken genau zeigen, was hereinkommt und wohin. Abdocken mit einem Griff.
5. **Wirkung zeigen.** Nach dem Andocken erscheint das erste echte Signal in „Heute“ und das Briefing schaltet auf live.
6. **Progressive Disclosure.** Standardmäßig 3–4 Mittelstands-Stationen (Kalender, Mail, Cloud-Dateien). Der Rest liegt hinter „Weitere Stationen“. Admin-Zustände („Server-Einrichtung fehlt“) nur für Admins und dezent.
7. **Kosmos und Klar.** Kosmos zeigt die räumliche Szene. Klar zeigt dasselbe als schematisches Orbital-Instrument. Phasenfarben bleiben.
8. **Onboarding = Inbetriebnahme im Universe.** Kein Modal. Jeder Schritt verändert den Raum sichtbar: Look und Phase, dann Firmenkern, dann Planeten, dann erste Station. Abschluss mit Bereitschaftsmeldung statt Konfetti. Jederzeit überspringbar und wiederholbar.

**Zustände, die gestaltet werden müssen**
- Ohne Sitzung / Vorschau: ehrliche, schöne Szene mit „Beispiel“-Stationen (markiert), kein toter Textkasten.
- Demo-Konto: CORE liefert keine Quellen (`boundary`). In Ruhe erklären, Demo-Stationen klar als Beispiel zeigen.
- Bereit: Station im Orbit, gedimmt.
- Angedockt: leuchtend, Faden zum Planeten.
- Admin-Einrichtung nötig: nur für Admins, als Kontur.
- Fehler: MÔRA übersetzt den CORE-Fehler in einen nächsten Schritt; der Originaltext bleibt per Detail einsehbar.
- Ablauf oder Reconnect: dezenter Hinweis an der Station.

**Technische Leitplanken (vorhanden, nicht neu bauen)**
- Status: `GET /v3/connections` (`lib/os-prototype/useSources.ts`). Felder: `id`, `label`, `group`, `status` (`connected | available | setup_required`), `detail`, `action{kind: oauth|credentials, field_schema}`.
- Verbinden: `POST /v3/connections/{provider}/connect` (OAuth-Start bzw. Zugangsdaten). Im Prototyp nur, wenn Seite **und** CORE-URL auf localhost zeigen (`isLocalCore()`).
- Zugangsdaten nie im Browser speichern. Demo-Konten können serverseitig nicht verbinden.
- Abteilungen bzw. Planeten: `OrganizationField`, Demo-Pack `lib/os-prototype/demoPack.ts`. Echte Abteilungen nur mit Bestätigung (`DepartmentWizard`).
- Onboarding-Speicher: `lib/os-prototype/onboarding.ts` (Legacy-Schlüssel des `firstRunStore`).

**Abnahme**
- Marius' Blick: „Das gibt es so nirgends“. Kein Element, das in einem beliebigen SaaS stehen könnte.
- Maximal ein sichtbarer Erklärsatz pro Zustand. Keine Hint-Kästen-Stapel.
- In beiden Looks und allen 4 Phasen schön, Kontrast mindestens 4.5:1 (Skript laufen lassen).
- 1024×768 bis 1440×900 sowie iPad hoch und quer, ohne Überlappungen.
- Die alte Variante ist aufgelöst: Tab „Verbindungen“ und alte Liste entfernt bzw. integriert, keine doppelten Wege.
- Tests (tsc, lint, Jest, Playwright) grün, Privacy-Grep 0, Screens vorher/nachher.

**Nicht tun:** Logo-Raster, Katalog-first, Status-Tabellen, Infotext-Kästen, Modal-Wizard, Konfetti, Emojis, Comic-Illustrationen, erfundene Verbindungen oder Zahlen, Produktions-Calls.

## 4.4 Umsetzung V1.7 „Andockstation“ – erledigt und offen
Screens: `screens/60`–`68` (`65` ist eine **Testaufnahme mit gemockter CORE-Antwort**, weil es lokal noch keine echte Quelle gibt).

| Brief-Punkt | V1.7 | Beleg |
|---|---|---|
| Andocken statt Liste | ✅ Szene mit MÔRA-Kern, Abteilungs-Planeten (echt, sonst aus dem Onboarding, sonst Demo-Beispiel), Stationen auf dem Andock-Ring; angedockt = leuchtend seitlich am Planeten, mit Faden | `60`, `62` |
| Eine Aktion pro Bildschirm | ✅ ein MÔRA-Satz und ein Knopf („Google Kalender andocken“) | `60` |
| MÔRA spricht, die Seite schweigt | ✅ höchstens ein Satz je Zustand, Hinweis zu den Feldern eingeklappt | `60`–`64` |
| Freigabe-Schleuse | ✅ was hereinkommt, wo es andockt, „MÔRA handelt nur nach deiner Bestätigung“; Felder bzw. OAuth erst danach | `61` |
| Wirkung zeigen | ✅ „{Station} speist jetzt {Planet}“ und erstes Signal aus `/v3/briefing`, ehrlich „Kommt mit dem ersten Abgleich“, wenn noch nichts da ist | `65` (gemockt) |
| Progressive Disclosure | ✅ Kalender, Mail und Dateien sichtbar; Werkzeuge, Zahlungen und Admin-Fälle hinter „Weitere Stationen“; Admin nur als Kontur ohne Knopf | `62` |
| Kosmos / Klar, alle Phasen | ✅ Raumfenster gegen Orbital-Instrument, Phasenfarben; Kontrast 0 Unterschreitungen (auch SVG-Text gemessen) | `64`, `68` |
| Fehler übersetzt | ✅ MÔRA-Satz plus „Details von CORE“ mit dem Original | `63` |
| Onboarding-Schritt | ✅ „Erste Station andocken“ mit derselben Szene; die eben eingegebenen Abteilungen werden sofort Planeten | `66` |
| Alte Variante aufgelöst | ✅ Liste und Tab „Verbindungen“ entfernt, `?section=connections` führt auf Quellen, Universe-Planet „Quellen“ liest `/v3/connections` | Doc §29.4 |
| Desktop / iPad | ✅ 5 Größen ohne Label-Überlappung (Playwright), iPad hoch mit Karte unter der Szene | `67` |

**Noch offen (ehrlich):**
1. **Keine echte Quelle angedockt.** „Angedockt“ und das erste Signal sind nur gemockt belegt. Das Briefing auf „Heute“ ist noch nie live gewesen. → **Astras erste Aufgabe** (06).
2. **Onboarding als Ganzes** ist weiter ein Modal mit 4 Schritten. Nur Schritt 3 ist neu. Prinzip 8 („Inbetriebnahme im Universe statt Modal“) ist offen, ebenso die leeren Look-Vorschauen in Schritt 1 und die Tour-Kästen in Schritt 4.
3. **Abdocken** gibt es im UI nicht. Den CORE-Endpunkt prüfen und nur lokal anbinden.
4. **Zuordnung Station → Planet** ist eine Schlagwort-Heuristik, also nur Darstellung. Später wählbar und mit Bestätigung in CORE speichern.
5. **OAuth-Rückkehr** (`return_to`) ist mit keinem echten Provider getestet. Lokal ist Google-OAuth nicht konfiguriert.
6. Der Kopf der Einstellungsseite („Wenige Schalter, klar benannt.“) und der Darstellungsblock stehen weiter über den Tabs. Die Andockstation liegt dadurch unterhalb der ersten Bildschirmhöhe.


# 5 · Offene Punkte und priorisiertes Backlog

## P0 – als Nächstes
1. ✅ **Erledigt in V1.7:** Redesign Quellen und Onboarding-Quellen-Schritt („Andockstation“, Doc §29, 04 › 4.4).
2. **→ JETZT ZUERST: Erste echte lokale Quelle**, damit „angedockt“ und das Briefing echt werden.
   - Mit einem Test-Konto gegen den lokalen CORE: Nextcloud (WebDAV) oder Mail (IMAP mit App-Passwort). Zugangsdaten nur lokal, nie committen.
   - Prüfen, ob `/v3/briefing` mit verbundener Quelle nicht „degraded“ liefert.
   - In der Andockstation andocken (Freigabe → Felder). Prüfen: Die Station leuchtet am Planeten, das erste Signal kommt echt.
   - Ziel: Das Briefing auf „Heute“ schaltet sichtbar von „startet, sobald …“ auf live. Die gemockte Testaufnahme `screens/65` durch eine echte ersetzen.
3. **Onboarding-Firma und -Abteilungen in CORE übernehmen**, mit Bestätigung.
   - Heute bleiben die Namen nur lokal (`saimor_os_onboarding_org`).
   - Danach den Vorschlag „Als echte Abteilungen anlegen?“ anbieten, über den vorhandenen `DepartmentWizard` bzw. die CORE-Departments-API, nur nach Klick.

## P1
- **Andockstation, Rest:** Abdocken (CORE-Endpunkt prüfen, nur lokal), Planet-Zuordnung wählbar machen (mit Bestätigung), OAuth-Rückkehr mit echtem Provider testen, Quellen-Tab weiter oben auf der Einstellungsseite.
- **Onboarding als Inbetriebnahme im Universe** (Brief 4.3, Prinzip 8). Heute ist es ein Modal, nur Schritt 3 ist neu.
4. **Kontrastprüfung in CI.** `contrast-pixels.mjs` und `contrast-analyze.py` als Playwright-Check (Pfade relativ machen). Fehlschlag bei Werten unter 4.5:1. Seit V1.7 misst das Skript auch SVG-Text; die Fläche `sources` steht in `SURF`.
5. **Echte Ambient-Musik von Marius.** Vier Loops (flow, build, lounge, night) als `public/ambient/<phase>.mp3` mit gleichen Namen. Die heutigen sind synthetische Platzhalter: 48 s, 112 kbps.
6. **Look-Karten-Vorschau** in Einstellungen und Onboarding reparieren; heute sind es leere Balken (Klar-Karte; Kosmos zeigt nur den Phasen-Verlauf).
7. **Legacy-Teile, die noch fehlen** (§26): Sprache bzw. Mikrofon, Community Wall, Kunden-Vorschauen/Administration, Aufräumen-Bündel im Postfach, Mail-Triage (#54), Lesen und Antworten in Post, Finder-Kern (Ordnerbaum, Vorschau) in Wissen, Streaming und Tool-Traces in MÔRA. **Kalender-Fäden gehören zu YORI und bleiben getrennt.**

## P2
8. **Inventar ruhender Teile umsetzen** (Doc §27.5, Urteil „verbessern“): MoraThoughtStream ist als Agenten-Feed erledigt. Offen sind:
   - QuickMemoryInput (kaputter Import, Funktion lebt in MÔRA › Erinnerungen)
   - Onboarding-Bausteine: MoraHint und Badges teilweise erledigt, LockedPlanetTooltip und CognitionBadge offen
   - n8n-Workflow, Connector-Bausteine, lokale KI (`useLocalAI`), erst nach dem Connector-Backend
   - HomeSurface-Muster
   - „Vorerst weglassen“: Experimente (SpatialMindfield, IntelligencePlayfield, SemanticLines), Dev-Werkzeuge, `/v3/mise`, `/v3/blockchain`, `/v3/earth`
9. **Begrüßung mit echter Sitzung:** Ist kein Name im Profil, zeigt „Heute“ die E-Mail („Guten Tag, local.owner@example.com.“, siehe `screens/31`). Besser wäre ein Vorname aus dem Profil oder dem Onboarding, sonst nur „Guten Tag.“.
10. **Agenten-Feed:** Die Texte aus CORE sind englisch und technisch („Analysing semantic vector for …“). Sie bräuchten eine Übersetzung oder Formulierung in CORE oder UI.
11. **Staging-Deploy von `/os`**, nur nach Marius' Freigabe. Danach Verifikation mit echter Sitzung (Definition of Done).

## P3
12. **ESLint-Regel** gegen rgba und hex außerhalb der Tokens für `features/**` und `components/os-*`.
13. **Tailwind-Opacity-Skala:** Legacy nutzt Werte außerhalb der Skala (z. B. `/92`, `/48`), die nie erzeugt werden. Im Universe sind 36 Stellen repariert, der Rest des Legacy-Codes ist ungeprüft.
14. **Entscheiden, ob `/os` die Legacy-Shell `/` ablöst** (Doppelpflege beenden).

## Bekannte Grenzen
- Mit echter Produktions-Sitzung nie getestet, nur gegen den lokalen CORE.
- Demo-Konten liefern serverseitig keine Quellen und keine Agenten-Gedanken. Das ist so gewollt.
- Google-OAuth ist im lokalen CORE nicht konfiguriert. Die Fehlermeldung kommt von CORE.


# 6 · Startprompt für Astra (zum Einfügen)

```text
Du übernimmst den SAIMÔR-OS-Prototyp von einem anderen Agenten. Arbeite auf Deutsch.

KONTEXT
- Repo: Saimor-world/mora-ui · Branch: grok/os-recovery-prototype-v1 · PR #101 (Draft, nicht gemergt, nicht deployed).
- Code-Stand V1.7 „Andockstation“ (Quellen-Redesign ist gebaut). Lies zuerst docs/UEBERGABE-ASTRA.md (Status, Vision,
  Marktrecherche, Kritik + Umsetzung 4.4, Backlog) und OS-RECOVERY-PROTOTYPE-V1.md §23–§29 (§29 = V1.7, §27.5 = ruhende Teile).
- Lokal: NEXT_PUBLIC_OS_PROTOTYPE=1 NEXT_PUBLIC_OS_PREVIEW=local → http://localhost:3000/os (Demo-Daten).
  Mit lokalem CORE (Port 8081) für echte Sitzung; Details in docs/UEBERGABE-ASTRA.md Abschnitt 1.

VISION (Maßstab für alles)
„Ein ruhiges Cockpit für ein Unternehmen – mit MÔRA als Bedienung.“ Klarheit im Wandel.
Der Ansatz existiert so noch nicht am Markt – es muss innovativ und premium sein, nie generisch.
Universe, Hintergrund und Vibe bleiben und werden nur besser. Marius' Dock und seine Original-Planeten sind gesetzt.
Legacy übernehmen, wo es besser aussieht (erst im alten OS nachsehen). Wenige Elemente, wirklich gut.
Kein 0815-SaaS, kein „vibe-coded“-Look, keine kindliche Grafik. Looks Kosmos und Klar; vier Phasen
(Flow/Build/Lounge/Nacht) mit Farbe und Ambient. Nur Desktop und iPad (≥768 px). Selbsterklärend für Mittelstand.
Ehrliche Daten: Demo = „Beispiel“, keine erfundenen Finanzzahlen, nie „verbunden“ ohne CORE-Beleg.
Kontrast ≥ 4.5:1 in allen Phasen und beiden Looks.

DEFINITION OF DONE
Gebaut, integriert, sichtbar, (nach Freigabe) deployed, verifiziert, alte Variante aufgelöst.

SICHERHEIT (nicht verhandelbar)
Keine Produktion, keine Secrets, keine Migrationen, nichts löschen, keine Wallets/XRPL.
Keine privaten oder Pilot-Namen – Privacy-Grep über den Diff = 0. YORI bleibt getrennt vom OS.
Nur lokaler CORE. Push nur mit dem bereitgestellten Token, Token nie ausgeben.

DEINE ERSTE AUFGABE
Die erste echte lokale Quelle andocken, damit das MÔRA-Morgenbriefing auf „Heute“ zum ersten Mal live läuft.
Ausgangslage: Die Andockstation (Einstellungen › Quellen, Onboarding Schritt 3) ist fertig: Szene mit Abteilungs-
Planeten, ein MÔRA-Satz, Freigabe-Schleuse, Fehler übersetzt. Status kommt aus GET /v3/connections, Andocken über
POST /v3/connections/{provider}/connect (nur gegen lokalen CORE). „Angedockt“ und „erstes Signal“ sind bisher nur mit
gemockter CORE-Antwort belegt (screens/65). Das Briefing war noch nie live.
Vorgehen:
1) Lokalen CORE (8081) und /os gegen ihn starten (docs/UEBERGABE-ASTRA.md Abschnitt 1 B). Dev-Login mit lokalem Testkonto.
2) Eine Test-Quelle wählen, die keine echten Kunden- oder Privatdaten enthält: z. B. eine lokale Nextcloud-Testinstanz
   (Docker) oder ein IMAP-Testkonto, das Marius bereitstellt. Zugangsdaten nur lokal/als Umgebungsvariable, nie committen,
   nie ausgeben. Vorher prüfen, ob CORE localhost-Ziele zulässt (SSRF-Schutz) – nichts an CORE-Sicherheit aufweichen.
3) In der Andockstation andocken. Verifizieren: Station leuchtet am Planeten, GET /v3/connections meldet connected,
   „Erstes Signal“ kommt echt aus /v3/briefing, auf „Heute“ erscheint das Briefing statt „startet, sobald …“.
4) Wenn CORE ein Briefing nur „degraded“ liefert: Ursache in CORE finden und berichten, nicht im UI überdecken.
5) Echte Screens statt der gemockten Testaufnahme, Doc-Abschnitt §30, PR #101 aktualisieren.
Danach (nur nach Marius' Freigabe): Abdocken, Onboarding als Inbetriebnahme im Universe (Brief 4.3 Prinzip 8),
Onboarding-Abteilungen mit Bestätigung in CORE anlegen. Siehe Backlog (05).

QUALITÄT
Commit oft. tsc, npm run lint, npx jest --maxWorkers=2, npx playwright test e2e/os-prototype (Server :3000),
Viewports 1024×768, 1280×800, 1440×900, 1180×820, 820×1180. Kontrast-Skript laufen lassen. Screens vorher/nachher.
Doku-Abschnitt ergänzen, PR #101 aktualisieren. Berichte kurz auf Deutsch, mit ehrlichen Grenzen.
```


