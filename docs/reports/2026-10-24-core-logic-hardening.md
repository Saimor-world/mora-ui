# CORE-Logik: bestätigte Terminaktionen und MÔRA-Stream

Basis: `main` bei `57ffba9e`. Der ursprüngliche Auftrag nannte den älteren #154-Stand; nach Abgleich enthält main bereits Heads dauerhafte Terminverwaltung (#155 / CORE #142). Diese Arbeit härtet die vorhandene Schnittstelle und führt keinen zweiten Status-Endpunkt ein. #159 bleibt ein eigener Design-PR.

## Problem und Abnahme

- `useMoraStream` sendet an `/v3/chat/stream`, wertet aber bisher nur `token` aus. CORE v3 liefert typisierte `thought/text`-Frames. Die Oberfläche kann eine echte Modellantwort als leere Antwort missverstehen. Abnahme: fragmentierte CORE-Frames, CRLF, Stream-Ende und Fehler korrekt behandeln; keine Ersatzantwort als Modellantwort ausgeben.
- Der Termin-Store meldet bislang auch fehlgeschlagene Schreibzugriffe als lokale Erfolge. Universe wartet nicht auf die Bestätigung; Rückgängig kann eine inzwischen neuere Version überschreiben. Abnahme: bestätigter Serverstand, Fehler sichtbar, Doppelaktionen gesperrt, versioniertes Rückgängig, kein später Schreib-/Leserücklauf in eine andere Sitzung.
- Zwei Geräte aktualisieren ihren Status bei Fensterfokus und im sichtbaren Fenster regelmäßig aus CORE. Abnahme: gleiche Schnittstelle `/v3/appointments/status` bzw. `PUT /v3/appointments/{id}/status`, keine ungefragte Übertragung alter Browserstände.

Betroffen: Heute, Handy-Begleitansicht, Universe-Aktionen und MÔRA-Eingabe. Design, Stein, Hintergrund und Navigation stammen weiter aus dem bestehenden OS.

## Produktwahrheit

Der aktuelle CORE enthält den dauerhaften Status mit Versionsprüfung bereits. Der neue UI-Stand wartet auf seine Bestätigung und nutzt CORE als einzige dauerhafte Wahrheit. Der alte lokale Speicher wird nicht mehr eingelesen oder hochgeladen. Eine nicht gespeicherte Änderung wird nicht als erledigt angezeigt.

Der lokale Nachbau unter `C:/PersonalLobster/_scratch/mock-core` besitzt kein Sprachmodell. Für die Prüfung wurde eine getrennte Kopie mit dem Hilfsmodul `scripts/local-core/extensions.cjs` vorbereitet; die bestehende Vorschau bleibt bestehen. Die Kopie speichert Beispiel-Terminstatus auf Disk und spricht exakt den vorhandenen Appointment-Status-Vertrag. Sie ist ausschließlich für den lokalen, an Loopback gebundenen Nachbau bestimmt und gehört in keine Produktionsroute.

Optionaler Modellanschluss (nur im Prozess des lokalen Nachbaus): `MORA_LOCAL_LLM_ENABLED=true`, `MORA_LOCAL_LLM_BASE_URL`, `MORA_LOCAL_LLM_MODEL` und bei Bedarf `MORA_LOCAL_LLM_API_KEY`. Die URL zeigt auf eine separat freigegebene, kompatible Test-Schnittstelle; keine Provider-Auswahl oder kostenpflichtige Aktivierung durch diesen PR. Standard: ausgeschaltet, HTTP 503. Schlüssel ausschließlich serverseitig, kein `NEXT_PUBLIC_`. Antwort wird als CORE-Thought-Frame weitergegeben; HTTP-/Providerfehler liefern keinen erfundenen Ersatz. Der Anschluss hat keine Werkzeuge und ist kein Nachbau der produktiven CORE-Agentenlogik.

**Kein echter Sprachmodelltest auf HQ durchgeführt.** Laut Marius existiert dafür noch kein freigegebener Testzugang. Die Adaptertests mit kontrollierter Providerantwort belegen den Transportvertrag, nicht die Qualität/Erreichbarkeit eines echten Modells.

## Rückbau und Risiko

Risiko **B** (Sitzung, gespeicherte Aktionen, Modelltransport). UI-Commit zurücknehmen; kein Datenbankschema geändert. Lokale Beispieldaten bleiben außerhalb des Repos. Alten Browser-Cache absichtlich nicht wieder als Datenquelle aktivieren. Merge/Deploy und späterer echter Modelltest benötigen Marius' ausdrückliche Freigabe.

## Prüfung und verbleibende Grenze

- Vollständige UI-Suite: **326 Suites / 1.841 Tests bestanden**; `verify:types`, Lint, Critical-Flow-Gate und OS-Smoke erfolgreich. Produktionsbuild erfolgreich. Bestehende Lint-Warnungen außerhalb dieser Änderung bleiben bestehen.
- Lokaler CORE-Adapter: **5 Tests bestanden**, einschließlich dauerhafter Speicherung, Versionskonflikt, standardmäßig ausgeschaltetem Modell, kontrollierter Providerantwort, sicherem Providerfehler und ungültigen Eingaben. Kein echtes Modell aufgerufen.
- Unabhängige AI-Gegenprüfung: vier Grenzfälle gefunden und mit Regressionstests korrigiert (geteilte Anfrage über Sitzungswechsel, A→B→A, verspätete ältere Antwort, Rückgängig im falschen Kontext). Nachprüfung ohne verbleibenden blockierenden Befund. Die Session-Regression nutzt ausdrücklich den echten HTTP-Helfer, nicht nur eine API-Attrappe.
- Browser-Testpaket vorbereitet: `playwright.core-logic.config.ts`, nur Loopback, synthetische Beispiel-Sitzung, fünf Fälle für bestätigtes Speichern, Rückgängig, zweites Gerät, Speicherfehler, Universe/Modellfehler und Handy-/Kundenansichten. **Noch nicht ausgeführt.**
- Die automatische Aktionsprüfung hat den Start der zusätzlichen lokalen Next-Vorschau zweimal abgewiesen, auch nach Wechsel auf den regulären Anmeldeweg ohne anonymen Preview-Modus. Sie nennt keinen näheren Grund. Daher keine Screenshots oder erfolgreichen Klickdurchgänge dieses Branches behauptet; eine bereits freigegebene laufende Vorschau wird zur Prüfung benötigt.

Status **PREPARED**, Browserprüfung und echter Modelltest offen. Der erfolgreich geprüfte Build verwendete `NEXT_PUBLIC_OS_PROTOTYPE=1` und den isolierten lokalen CORE, keinen anonymen Vorschau-Schalter. Der frühere lokale Buildversuch hatte einen Typfehler in der neuen Playwright-Konfiguration; dieser wurde korrigiert und der Build erfolgreich wiederholt.
