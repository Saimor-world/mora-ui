# Funktionaler HQ-Release: Kalender, MÔRA und OS-Einstieg

## Verhalten und Abnahme

Der normale Einstieg `/home` zeigte trotz aktiviertem neuem OS noch die alte Oberfläche. Bei `NEXT_PUBLIC_OS_PROTOTYPE=1` führt er jetzt durch die bestehende geschützte Route `/os`. Query und Hash bleiben erhalten; ein Dokument-Handoff wird erst mit bestehender Sitzung genau einmal geöffnet. HQ-interne Nutzer können die klassische Ansicht ausdrücklich über `/home?classic=1` wählen. Kunden bekommen dadurch keinen klassischen Einstieg. Middleware und CORE-Autorisierung bleiben bestehen.

MÔRA verarbeitet CORE-Thought-/Text-Frames, bestätigt Terminaktionen erst nach Speicherung und verwirft verspätete Rückläufe nach Kontextwechsel. Status und versioniertes Rückgängig verwenden CORE statt alten Browserständen. Eine Sprachaufnahme stoppt beim Verlassen der Komponente; eine verspätete Antwort erzeugt dort keinen nachträglichen Erfolg. Fehler erzeugen eine ehrliche Meldung.

Der integrierte Kalender-Leseweg aus #165 zeigt unvollständige, veraltete, verweigerte und unbekannte Daten ausdrücklich als solche. Der Fokus-Refresh für Terminstatus verwendet weiterhin das Browserfenster; das Kalender-Zeitfenster heißt `readWindow`, damit es dieses nicht überschattet.

## Gegenprüfung, Risiken und Freigabe

Risiko B: Navigation, Sitzungsgrenzen, persistenter Status und Modelltransport. Unabhängige lesende AI-Prüfung der Integration und abschließende Prüfung des Einstiegs und der Links ohne verbleibenden Blocker. Gefundener Desktop-Link zur alten Startseite wurde auf den expliziten klassischen Einstieg korrigiert. React-Prüfliste angewendet: bestehende dynamische Imports, Hook-Reihenfolge, Listener-Aufräumen, keine neuen Animationsschleifen, keine neuen Datenwasserfälle im Einstieg. Keine Behauptung eines aktuellen 60-fps-Gerätenachweises.

Marius hat Merge und HQ-Veröffentlichung ausdrücklich freigegeben („doh freigabe“). #163 bleibt ein separater visueller Entwurf. CORE #150/#149/#151 und UI #165 sind bereits auf main; dieser PR integriert deren Datenvertrag mit den bestätigten Aktionen. Keine Datenbankmigration und keine öffentliche Test-/Debug-Route durch diesen UI-PR.

## Nachweise vor Veröffentlichung

- 340 Testsuites / 1.956 Tests bestanden.
- OS-Smoke: 53 Tests bestanden. Lokaler CORE-Adapter: 5 Tests bestanden (kontrollierter Provider, kein echter Modellaufruf).
- Typecheck, Lint und Critical-Flow-Baseline erfolgreich; vorhandene Lint-Warnungen außerhalb dieser Änderung bleiben bestehen.
- Einstieg: fünf negative/positive Fälle für Flag, Kunden, interne klassische Wahl und Dokument-Übergabe. MÔRA: ausstehende Speicherung, verspätete Antwort und Aufnahme-Aufräumen getestet.
- Produktionsbuild mit `NEXT_PUBLIC_OS_PROTOTYPE=1` wird im Releaseprotokoll festgehalten, ebenso GitHub-CI und die tatsächlich veröffentlichte Revision.
- Browserprüfung erfolgt nach Veröffentlichung in Marius' selbst angemeldeter HQ-Sitzung. Keine Screenshots, Modellantworten oder Geräteleistung vorweggenommen.

## Rückbau

Vor dem Release wurde `/root/backups/releases/20261025T161647Z-mora-functional` angelegt: Datenbanken, CORE-Datenvolume, tatsächliche Konfiguration, Revisionsdatei und getaggte Containerimages. UI kann auf `saimor-ui:rollback-20261025t161647z` zurückgesetzt werden. Keine automatische Wiederherstellung alter Datenbanken: Der Release ändert das Schema nicht, neue produktive Daten sollen erhalten bleiben. Konkrete Deployment- und Rückbau-Nachweise liegen außerhalb des Repos im HQ-Releaseprotokoll.
