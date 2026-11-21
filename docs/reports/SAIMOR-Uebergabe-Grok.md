# Grok Bot · Übergabe SAIMÔR OS und YORI
21. November 2026 · Auftrag von Marius · Arbeitsstand in Draft-PRs

## Starte hier

Arbeite am bestehenden SAIMÔR weiter. Beginne mit dem Rückweg von einem abgeleiteten Eintrag zur konkreten externen Quelle. Implementiere und teste den Weg mit fiktiven Daten und liefere einen reviewbaren Draft. Danach priorisiere den Test des YORI-Hauses für die Pilotkundin. Wenn ein Teil eine Freigabe von Marius braucht, halte den konkreten Entscheidungspunkt fest und führe unabhängige Entwicklungsarbeit fort.

SAIMÔR ist das gemeinsame Bild einer Firma. CORE liefert Herkunft, Zeitpunkt, Berechtigung und bestätigten Stand. Das OS macht sie zugänglich. MÔRA hilft beim Verstehen und bereitet Handlungen vor. Der Einstieg soll sich für einen kleinen Betrieb von selbst erklären. Beginne beim konkreten Gegenstand wie einer Mail, einem Termin oder einer Datei. Marius lehnt „Kommando & Strategie“ und „Aufgabe“ als allgemeine Produktbegriffe ab. Bestehende technische Feldnamen dürfen bestehen bleiben. Bewahre das vorhandene OS, seine Räume und die vorhandene MÔRA. Das Café ist ein Demomandant. Die Café-Illustration aus dem Gespräch ist keine Designvorlage.

## Verifizierte Ausgangspunkte

| Projekt | Richtige Basis | Bedeutung |
|---|---|---|
| mora-ui | [Draft #225](https://github.com/Saimor-world/mora-ui/pull/225), codex/os-rundgang, eae6ebbbc5067c918122f87110350aa2efde0165 | #225 basiert auf [#224](https://github.com/Saimor-world/mora-ui/pull/224), codex/werkstatt-randzettel-quellen. Für neue Arbeit zuerst aktuellen Head und vorhandene Änderungen vergleichen. |
| mora-ui Performance | [#223](https://github.com/Saimor-world/mora-ui/pull/223), grok/os-schlank-startcode, 1c59215d | Separater Entwurf gegen main. #217/#218 und #212–#215 enthalten überlappende Vorarbeiten. Vor Übernahme Diffs vergleichen. |
| saimor-core | [Repo](https://github.com/Saimor-world/saimor-core), beim Audit geprüfter Build bb604b29a997 | Für Backend-Arbeit aktuellen main und offene [#125](https://github.com/Saimor-world/saimor-core/pull/125), [#177](https://github.com/Saimor-world/saimor-core/pull/177), [#178](https://github.com/Saimor-world/saimor-core/pull/178) abgleichen. |
| YORI | [Draft #52](https://github.com/Saimor-world/yori/pull/52), codex/yori-verbundener-tag-20261117, 20b2736e60f2a12b569929fa1ef5935a207d44d9 | Aufsteigende Reihenfolge main → #48 → #49 → #50 → #51 → #52. #51 enthält das Puppenhaus, #52 den verbundenen Arbeitstag. #46 ist separat. |

Zum geprüften OS-Stand sind Lint, Typprüfung, kritischer Ablauf, OS-Smoke, alle 2.295 Tests in 402 Testsuiten und Produktionsbuild grün. Die Aufnahme zeigt eine lokale Vorschau mit Desktop und 390-px-Handyansicht. Sie umfasst Heute, Abteilung, Werkstatt, Buch, Planung, Post, Wissen, Finance, MÔRA, Einstellungen und Labs. Die Navigation läuft häufig über die Befehlssuche. Ein Erstnutzer-Rundgang sollte normale sichtbare Bedienelemente nutzen. [CI](https://github.com/Saimor-world/mora-ui/actions/runs/44951031988) · [Video und Protokoll als GitHub-Artefakt](https://github.com/Saimor-world/mora-ui/actions/runs/44951027178) · [MP4 für Marius](https://chatgpt.com/library?file_id=libfile_2738ba3b039c8191834760e67af6f434&account_id=personal)

## Erster Entwicklungsauftrag · vom Eintrag zur Originalmail

1. Lies in CORE core/services/mail_tasks.py und core/services/task_service.py. Die Ableitung hält mail_id, owner_user_id, tenant_id und task_id in mail_task_links fest. Der geprüfte Task-Leseweg reicht die Mailkennung nicht an die UI weiter. Ähnliche Rechnungstexte sind kein Beweis für eine gemeinsame Mail.
2. Verfolge einen mit Testdaten angelegten Eintrag durch CORE, Tagesübersicht, Werkstatt und Post. Ergänze die kleinste passende Schnittstelle, die einer berechtigten Person das verknüpfte Original erschließt. Berücksichtige bestehende Einträge ohne Link und separat berechtigte Postfächer. Verwende die vorhandene Zuordnung. Lade keinen Mailtext in gemeinsame Listen.
3. Nutze im OS den vorhandenen Detailweg in features/post/MailClient.tsx und features/post/data/usePost.ts. Die Nachrichtenzeilen in features/today/index.tsx öffnen bereits per ID. Ergänze am abgeleiteten Eintrag die konkrete Aktion „Originalmail öffnen“, sobald ein nutzbarer Bezug vorhanden ist. Für verschwundene oder nicht verfügbare Quellen braucht es eine verständliche Rückmeldung.
4. Abnahme mit Mira: zwei Mails mit gleichem Betreff und unterschiedlichem Inhalt, eine gelöschte Quelle, ein älterer manueller Eintrag und zwei synthetische Konten mit verschiedenen Rechten. Ergänze den Fall einer verspäteten Antwort nach Wechsel der Auswahl. Im Demomodus bleibt die persönliche Post unberührt. Bestehender Test: __tests__/features/postOriginal.test.tsx.
5. Zeige den Weg mit normalen Klicks am Desktop und auf 390 px. Prüfe Zurück, Tastatur, Ladezustand, fehlende Rechte und den Fehlerfall. Berichte getrennt, was im Code belegt, mit Fixtures getestet oder im angemeldeten OS tatsächlich gesehen wurde. Für das OS die Gates aus AGENTS.md ausführen.

## Weitere OS-Arbeit

Der angehängte Audit umfasst neun korrigierte und 22 offene Befunde, davon acht mit hoher Priorität. Die Prüfbedingungen stehen je Zeile. Als Nächstes verdienen beispielhafte Betriebszahlen und lokal umgeschaltete Freigaben in der Werkstatt, erfundene Leitung und Anwesenheit im Universe sowie die Gleichsetzung von Lesefehler und Leerstand in Wissen, MÔRA und Cloud-Ablage Aufmerksamkeit. Prüfe außerdem normale Klickwege ohne Befehlsmenü, Druckansichten, Tastatur und Rückmeldungen beim Speichern.

## Zweiter Entwicklungsauftrag · YORI bis zum privaten Pilottest

#52 verbindet Heute, Terminmappe, Call, private Nachbereitung, manuell festgehaltene Legung, Brief und Rechnungsentwurf. Erst die Bestätigung erzeugt den Entwurf. Das Haus bleibt der persönliche Arbeitsort der Creatorin. Die Crew arbeitet in ihren Räumen. Die Klientinnensicht braucht einen eigenen, privaten Weg. YORI zieht keine Karten.

Im PR dokumentiert: 144/144 Node-Haustests grün und ein Offline-DOM-Rundgang mit Mira. Beim damaligen Worker-Lauf bestanden 483 Vitest-Tests, fünf scheiterten wegen lokal fehlender Bilddateien. Der Build wurde in diesem Lauf nicht erreicht. Ziehe zuerst die im Repo vorhandenen Originalbilder vollständig und prüfe den aktuellen CI-Stand. Verwende scripts/build-house-preview.py, scripts/verify-house-preview.mjs und die Abnahme in docs/YORI_CONNECTED_DAY_2026-11-17.md. Wiederhole pnpm verify:worker und die Browserprüfung mit YORI_VERIFY_BROWSER=1. Dokumentiere Desktop und 390 px, insbesondere Termin → Nachbereitung → Rechnung und die Trennung der Rollen.

Die Mitgliederliste hat CSV-Vorschau, Duplikaterkennung und ausdrückliche Übernahme. „CSV importiert“ ist ihr korrekter Status. Echte Calendly- und Skool-Verbindungen stehen aus. Prüfe die tatsächlich verfügbaren Schnittstellen, vorhandenen Adapter und Berechtigungen. Zuerst mit Testkonto die Kette Verbinden → Daten abrufen → Zeitpunkt und Herkunft zeigen → Verbindung trennen nachvollziehen. Beziehe auch einen umgebuchten oder abgesagten Termin ein. Halte fest, was ein unterstützter Live-Abruf leisten kann und wo manueller Import nötig bleibt.

Offen bei Marius sind Agentinnennamen und Objekte, der Einstieg im Genkan und eine mögliche eigene Agentin für die Begleitung. Die funktionale Abnahme mit Mira kann weitergehen. Keine echten Klientendaten, kein Foto und kein sichtbarer Name der Pilotkundin, kein Versand an sie ohne Marius.

## Betrieb und Freigaben

Die Betriebsangaben stammen aus Marius’ Übergabe, letzter Server-Check 15.11. Damals liefen UI v15 vom 10.11., CORE bb604b2 und Alembic 20261104_0015. Nightwatch hatte laut Übergabe seitdem keine Credits. Letztes damals belegtes Backup war am 04.11. Aktuellen Stand und Backup vor jedem Produktionsschritt neu feststellen. #219–#222 wurden als gemergt und noch nicht deployt übergeben. Vor einem Release die zusätzlichen Änderungen vom 10./11.11. gegen die v15-Raumregeln prüfen.

Historisch gemeldete Sicherheitsbaustellen betreffen /tunnel, die Middleware-Routengrenzen, Abhängigkeiten und den Wechsel zwischen persönlichen und Demo-Quellen. Bestehende OS-PRs #110, #135 und #172 zuerst prüfen. Paketstände aus der alten Übergabe sind historische Angaben. Vor einem Patch aktuelle Advisories und das tatsächlich ausgelieferte Lockfile abgleichen. Marius gibt Auth, Secrets, Geld, SQL, Deploys und Nachrichten an echte Menschen gesondert frei. Vor jeder Prod-Änderung frisches Backup samt Rückweg. Für den YORI-Stapel ausdrücklich Merge-Go abwarten. Die SQL aus #48, die Begleiterin-SQL und CORE-Migration 0016 bleiben separate Entscheidungen.

Nachgelagert: Nach Absicherung des Tunnels die neun vereinbarten Funktionen der alten OS-Oberfläche prüfen (Zeig drauf, Admin-/Kundenvorschau, Datei-Drop, Mikro, Songs pro Szene, Klicks, Planetenprofile, Leertaste-Vorschau, Willkommen). Entfernung von classic/playground, rund 3 MB ungenutzte YORI-Bilder, Website #77 und die übrigen Betriebsaufräumarbeiten sind eigene Arbeitsblöcke. Bestehende Inhalte und offene Branches bewahren.

## Was Marius am Ende sehen will

Liefere den konkreten Arbeitsablauf mit Ausgangsproblem, Commit, PR, Testnachweis und kurzem Klickvideo. Gib eine klare Aussage zur Nutzbarkeit des Hauses und benenne für jeden offenen Pilotblocker die fehlende technische Voraussetzung oder Entscheidung. Arbeite selbstständig bis zu einem belegbaren Ergebnis.

---

# Wo das OS mehr behauptet, als seine Quellen hergeben

Prüfstand vom 21. November 2026. Ausgangspunkt ist der OS-Entwurf d833b127. Geprüft wurden die neun registrierten Hauptbereiche, die Werkstatt, der Handy-Begleiter und ausgewählte Wege in den klassischen Apps. Die 29 Verzeichnisse unter apps wurden nach wiederkehrenden Mustern durchsucht. Eine vollständige Bedienprüfung aller klassischen Apps, Rollen und externen Anbieter steht aus. Die Befunde unten stammen aus dem Code, sofern kein konkreter Test angegeben ist. Für die Regressionstests wurden ausschließlich Testdaten verwendet.

## Im Entwurf korrigiert

| Bereich | Beobachtung und neue Prüfung |
|---|---|
| Team und MÔRA | Abwesenheit wurde aus Wörtern wie „Ausfall“ im Betreff abgeleitet. Der vordere Teil der Absenderadresse wurde einer Person zugeordnet. Diese Vermutung erschien in Briefing, Tagesleiste, Schichtkarte und Dock. Offene Schichten kommen jetzt aus ausdrücklichen Offen-Markierungen am heutigen Schichttermin. Einträge ohne Dauer erhalten keine geschätzte Endzeit. Eine belegte Schicht heißt auch bei fehlender Abwesenheitsmeldung schlicht „1 Schicht“. Test mit übereinstimmendem Vornamen und unbestätigter Mail. |
| Morgenbriefing | Null ungelesene Mails hieß „Der Posteingang ist leer“, selbst wenn er gelesene Nachrichten enthielt. Der Text benennt jetzt die ungelesenen Nachrichten. |
| Heute und Post | Mailzeilen unter „Neue Informationen“ öffnen ihre eigene Nachrichtenkennung. Die Detailansicht akzeptiert nur die angeforderte Kennung. Getestet mit gleichem Betreff, verzögertem älteren Abruf, fehlendem Listeneintrag und falscher Antwortkennung. Der Demo-Leser ruft keine Originalmail ab. |
| Posteingang und Termine | Demo-Texte konnten in der Post als Nachrichteninhalt erscheinen. Der Leser verwendet vorhandene Felder und kennzeichnet Auszüge. Im Live-Modus überdecken Tagesdaten keinen leeren oder fehlgeschlagenen Postfach- bzw. Kalenderabruf mehr. |
| Post | Eine ungültige numerische Zeichenreferenz konnte die Textanzeige abbrechen. Der Rest der Nachricht bleibt lesbar. |
| Heute und Kalender | Zwei Kalenderkacheln und der Link bei „Termine heute“ führten zur kombinierten Postansicht. Alle drei öffnen jetzt das Kalenderfenster. |
| Klassischer Kalender | Bei Auswahl des 21.11.2026 um Mitternacht in Berlin ergab die UTC-Umwandlung den 20.11. Beide Speichereinstiege übergeben jetzt das im Raster gewählte lokale Datum. |
| Handy | „Alle anzeigen“ hatte keinen Effekt. Bei mehr als vier wichtigen Mails lässt sich die Liste nun erweitern und wieder einklappen. Ein Interaktionstest öffnet den fünften Eintrag. |
| Home, Tagesmond | Der Haken erschien vor der Bestätigung von CORE und blieb bei einem Fehler stehen. Im Live-Modus werden Kennung und gespeicherter Status geprüft. Bis zur Antwort ist der Knopf gesperrt. Eine Ablehnung bleibt sichtbar und die Person kann es erneut versuchen. Der Test deckt Ablehnung, Doppelklick und erfolgreichen zweiten Versuch ab. |

## Offene Befunde in Arbeitsabläufen

| Priorität | Wo und unter welcher Bedingung | Folge und Abnahme |
|---|---|---|
| Hoch | Werkstatt, Tisch der Leitung oder des Kontors. DeskWorkstation.tsx schaltet die Anzeige „Freigegeben“ bzw. „Geprüft“ im lokalen Zustand um. | Eine reale Freigabe braucht eine bestätigte Speicherung und muss nach erneutem Öffnen durch die berechtigte Person nachvollziehbar sein. |
| Hoch | Werkstatt, Beschriftung physischer Gegenstände. resolveStationKind liefert unter anderem einen festen Kassenstand, eine Reservierung und „3 Entscheidungen“. Werkstatt.tsx rendert sie am Möbel. | Ein passender Raumtyp genügt für scheinbar konkrete Betriebsaussagen. Im Kundenraum nur Zahlen oder Termine mit Quelle zeigen. Beispiele auf den ausgewiesenen Demoraum begrenzen. |
| Hoch | Universe, Abteilung ohne hinterlegte Crew. UnifiedUniverse.tsx zieht die allgemeine Teamliste heran, erklärt deren erste Person zur Leitung und weist Beteiligten aus Arbeitsvorgängen „online“ zu. Bei leerer Liste wird die angemeldete Person als Leitung eingesetzt. | Mitgliedschaft, Leitungsrolle und Anwesenheit benötigen jeweils einen eigenen Beleg. Mit zwei Abteilungen und einer Person ohne Leitungsrolle prüfen. |
| Hoch | Aus einer Mail abgeleiteter Eintrag in Heute. CORE bb604b29a997 speichert Mailkennung, Inhaber und Eintragskennung in mail_task_links. Der geprüfte Task-Leseweg liefert die Mailkennung nicht mit. | Für diese Einträge fehlt der sichere Rückweg. Abnahme mit zwei gleichnamigen Mails sowie einer später entfernten Mail. Die Gleichheit der beiden besprochenen Rechnungseinträge ist unbewiesen. |
| Hoch | Wissen, ausbleibende Antwort auf die Inhaltssuche. searchClient.ts erzeugt eine leere Ergebnismenge. Die Oberfläche zeigt „Keine Treffer“. | Ein bestätigtes leeres Suchergebnis und ein fehlgeschlagener Abruf müssen unterscheidbar sein. |
| Hoch | Dateien, Ausfall einer einzelnen Cloud. apps/meine-dateien/index.tsx ersetzt mehrere fehlgeschlagene Lesevorgänge durch leere Listen. | Eine Quelle kann geräuschlos aus der gemeinsamen Ablage verschwinden. Die übrigen Dateien und die betroffene Quellbezeichnung gemeinsam anzeigen. |
| Hoch | MÔRA, Freigaben für Erinnerungen. MoraSignals.tsx bildet aus fehlenden Daten eine leere Liste. Der Speicher-Client normalisiert auch ausbleibende Antworten zu einer Liste. | Beim Laden, bei fehlender Firma und bei einem Lesefehler kann „Nichts offen“ stehen. Auch eine fehlgeschlagene Entscheidung braucht eine Rückmeldung. |
| Hoch | Quellen, Erklärung nach dem Verbinden. sourceDock.ts wählt die Zielabteilung per Namensmuster, SourceDock.tsx sagt „speist jetzt …“. | Eine vermutete Zuordnung klingt wie eine gespeicherte Integration. Als Vorschlag kenntlich machen oder bestätigte Zuordnung verwenden. |
| Mittel | Quellen, bestätigter Abruf ohne Mengenangabe. SourceDock.tsx setzt die fehlende Zahl mit fetched ?? 0 gleich null. | „Abruf bestätigt“ genügt, solange die Quelle keine Anzahl liefert. |
| Mittel | Heute, Mailquelle noch nie abgeglichen. Der Zweig für not_synced kann zugleich einen Quellenhinweis und „Nichts Neues“ anzeigen. Der Kalender-Ersatzpfad kann „Heute frei“ anzeigen, wenn die Ereignisliste fehlt oder leer ist. | Fehlender Erstabgleich darf keine Entwarnung auslösen. Mit unverbundener, alter und noch ladender Quelle prüfen. |
| Mittel | Heute, Aufmerksamkeit und Hinweise. deriveAttention überspringt unlesbare Quellen. Ein leeres Ergebnis löst den grünen Leertext aus. deriveHints berücksichtigt bei fehlenden Quellen nur einen Teil der möglichen Zustände. | Ein ruhiger Tag braucht hinreichend aktuelle und vollständige Quellen. |
| Mittel | Heute, „Ansehen“ bei Arbeit ohne auflösbare Abteilung und ohne Auffangort. openWorkTask kehrt still zurück. | Den Eintrag direkt öffnen oder erklären, warum er nicht geöffnet werden kann. |
| Mittel | Werkstatt, Person zuweisen. TaskSheet.tsx schreibt sofort ins Formular und in den gemeinsamen Abfragecache. Bei fehlender Bestätigung steht lokal „nur hier vermerkt“. | Andere Anzeigen können dieselbe Zuweisung aus dem Cache als bestätigt übernehmen. Abnahme mit abgelehnter Zuweisung und Wechsel zwischen zwei Ansichten. |
| Mittel | Post, „Antwort mit MÔRA“. askMora setzt einen Entwurf mit Betreff und Absender auf. Die Nachrichtenkennung oder der gelesene Text wird hier nicht übergeben. | Bei zwei gleichnamigen Mails bleibt offen, auf welche sich MÔRAs Entwurf bezieht. Den gewählten Bezug vor der Antwort nachvollziehbar machen. |
| Mittel | Post und Dock, unbekannter Lesestatus. mailCounts berücksichtigt read !== true, die Postansicht zählt nur read === false. | Derselbe Datenstand kann zwei verschiedene Ungelesen-Zahlen ergeben. Zudem ist eine Teilmenge geladener Nachrichten kein Postfachgesamtwert. |
| Mittel | Wissen, Erinnerungen durchsuchen oder Ergebnis ohne Dokumentkennung wählen. Die Erinnerungsansicht besitzt keinen eigenen Fehlerzweig, der Trefferknopf ohne Kennung hat keine Wirkung. | Rückmeldung bei fehlgeschlagener Abfrage. Nur auflösbare Treffer als öffnendes Bedienelement anbieten. |
| Mittel | Kalender, Formular bei fehlgeschlagener Speicherung. CalendarEventPanel leert und schließt die Eingabe vor Abschluss. Der Hook meldet den Fehler, der eingegebene Titel ist bereits weg. | Eingabe behalten und erneut speichern können. |
| Mittel | Kalender, Tastatur. Die Tage im Monatsraster sind klickbare div-Elemente. Auch den Pfeilknöpfen für den Monatswechsel fehlen zugängliche Namen. | Einen Tag und einen benachbarten Monat nur mit Tastatur und verständlichen Bedienelementen wählen können. |
| Mittel | Kalender, Anzeige reiner Datumswerte. Die Anzeige verwendet an mehreren Stellen new Date(e.date).toDateString(). | Westlich von UTC kann ein reiner Tageswert am Vortag erscheinen. Getrennt vom korrigierten Speicherweg mit zeitlosen und zeitgebundenen Terminen prüfen. |
| Mittel | Finance, „Profit Center“ und „Capital“. features/finance/index.tsx übergibt für beide Reiter dieselbe section und denselben React-Schlüssel an die eingebettete Ansicht. | Bei erfüllten Verträgen können beide Reiter denselben Inhalt zeigen. Mit erlaubtem Testkonto prüfen. Keine Bewertung realer Finanzzahlen. |
| Mittel | Labs, „Klassische Oberfläche öffnen“ verweist auf /, die Einstiegseite mit Anmeldung und Weiterleitung ins OS. Zusätzlich steht bei experimentellen Apps pauschal „Funktioniert“. | Das konkrete Ziel und der Funktionsstand jeder angezeigten App müssen zur Beschriftung passen. |
| Mittel | Werkstatt und Tastenkürzel. „Kommando & Strategie“, „Strategische Direktiven“, „Captain / Owner“ und „Kommandozentrale“ sind tatsächliche Beschriftungen. | Betreiber eines kleinen Ladens sollen eine Freigabe erkennen und den zuständigen Menschen auswählen können. „Wer gibt das frei?“ und „Tastenkürzel“ sind verständliche Bezeichnungen. |

## Abnahme und Reichweite

Zuerst einen echten Arbeitsweg mit Mira als Testperson prüfen. Eine externe Mail erzeugt einen Eintrag, die Originalmail lässt sich aus dem Eintrag öffnen, eine zuständige Person bestätigt den nächsten Schritt und sieht nach erneutem Öffnen den gespeicherten Stand. Anschließend denselben Weg mit zwei identischen Betreffzeilen, abgelaufener Verbindung und abgewiesener Speicherung wiederholen.

Die Produktionsverbindungen, alle Rollenwechsel mit laufenden Datenabrufen, Druckansichten und der vollständige Rundgang durch jedes klassische Fenster sind in diesem Bericht offen. YORI hat einen eigenen Pilotstand. Der OS-Bericht ist keine Freigabe für das Haus oder für echte Klientendaten.

Technische Belege stehen insbesondere in lib/mora/bridgeData.ts, features/post/MailClient.tsx, features/today/index.tsx, features/home/cockpit/Scene.tsx, features/universe/ui/UnifiedUniverse.tsx, features/werkstatt/ui/DeskWorkstation.tsx, features/mora/ui/MoraSignals.tsx, lib/api/searchClient.ts, features/settings/ui/SourceDock.tsx und den genannten Kalenderkomponenten.
