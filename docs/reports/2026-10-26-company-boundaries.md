# Firmenkontext und Accountverwaltung · 26.10.2026

Status: PREPARED, Risiko B. Basis enthält Groks gemergte UI-PRs #166–173 (aktueller Stand `c0d0342d`, einschließlich #171 und #173). Kein Produktionsdeploy aus diesem Arbeitsstand.

## Problem und Verhalten

Der Demo-Schalter wechselte nur einen Teil der Abfragen. Post, persönliche Quellen, Such- und Erinnerungspfade sowie offene Fenster konnten weiterhin HQ-Kontext verwenden. Das Quellenzeichen im Universe öffnete die klassische Designverwaltung statt der betreffenden Verbindung. Allgemeine Termintexte unterstellten einen Studiobetrieb.

Die gewählte Firma wird nun ausdrücklich an die betreffenden CORE-Lesewege übergeben. Jede Änderung des effektiven Benutzer-/Firmenkontexts bekommt eine neue Generation: Abfragecache, Anfragebündelung, MÔRA-Antworten, offene Fenster, zuletzt geöffnete Inhalte und Übergaben bleiben getrennt. Alte ungebundene Fenster-/Verlaufsdaten werden nicht mehr im Browser gespeichert oder beim Start wieder eingeblendet. Ein Wechsel warnt vorher vor lokalen Entwürfen. Serverdokumente werden dadurch nicht gelöscht.

Quellenzeichen führen zu Quelleninformationen in den nativen Einstellungen; dabei wird keine Verbindung gestartet. Generische Dokumentknoten können geöffnet werden. Einstellungen und Tagesaussagen sind vom angenommenen Nagelstudio gelöst. Groks Post-Lesebereich, Heute-Eule, Dock, Full-HD-Layout und Hintergrundfilter bleiben erhalten.

## Verwaltung

Neue native Oberfläche für Systeminhaber: Accounts und Firmen aus den bestehenden `/v3/system/owner/*`-Endpunkten, Filter und Aktualisieren. Name, Rolle, Aktivstatus und Standardfirma sind als konkrete Änderung vor dem Speichern sichtbar. Erfolg wird erst nach einer passenden CORE-Antwort angezeigt; eigener Zugang und letzter Inhaber werden zusätzlich im Backend geschützt. Keine Passwörter oder Schlüssel in dieser Oberfläche. Die UI blendet globale Verwaltung in Demos aus; die Autorisierung bleibt in CORE.

Die tatsächliche Accountinventur liegt ausschließlich als private lokale Datei außerhalb des Repositorys. Es wurden keine bestehenden Accounts durch den Agenten geändert.

## Grenzen dieser Etappe

- Eine vollständige Demo-Firma mit eigenem Team, rollengeprüften Arbeitstagen und reproduzierbarem Reset ist noch nicht geliefert.
- Klassische Apps mit noch unklarer Firmenbindung werden in Demos ausdrücklich abgewiesen. Native Heute-/Post-/Universe-Lesewege bleiben nutzbar; tenantweite Kalender-Fäden werden dort nicht geladen. Dies ist ein Schutz bis zur Anpassung, keine Behauptung vollständiger Demo-Funktionalität.
- Das Quellenbriefing bzw. der alte Aktivitätsverlauf wird bei fehlender firmengebundener Grundlage nicht aus HQ aufgefüllt.
- Die passenden CORE-Änderungen gehören zum selben Paket. Eine alte CORE-Quellenantwort mit HQ-Verbindungen wird im Demo-Kontext auch clientseitig zurückgewiesen.
- Kein 60-fps-Nachweis und keine neue Browser-Sichtfreigabe. Marius hatte Prüfung durch Typecheck, Tests und Build freigegeben; die Sichtprüfung bleibt separat.

## Prüfung und Gegenprüfung

Nach Übernahme von Groks späteren PRs: vollständige Jest-Suite 349/349, 2.009 Tests grün. Zusätzlich aktueller gezielter Durchlauf mit 35 Tests einschließlich Rollenwechsel und Shell-Übergaben grün. Typprüfung, Lint (bestehende Warnungen), kritischer Fluss gegen gespeicherte Baseline, 53 OS-Smoke-Tests und Build mit `NEXT_PUBLIC_OS_PROTOTYPE=1` grün. GitHub-CI und Browser-Sichtprüfung separat führen; der kleine anschließende Rollen-Cache-Schlüssel wird zusätzlich durch den gezielten Test abgesichert.

Nach Groks anschließendem #173: 111 Tests der betroffenen Bereiche grün. Firmenmenü übernimmt dieselbe bestätigte Wechselgrenze. Eine vom ersten GitHub-Lauf gefundene Reihenfolge im App-Library-Test wurde korrigiert: erst Benutzerkontext etablieren, dann Fenster öffnen; 12 Tests des betroffenen Falls und der Grenze grün. Neuer GitHub-Lauf und abschließender Build bestätigen den gepushten Stand separat. Keine Behauptung, ein älterer vollständiger Lauf allein prüfe spätere Änderungen.

Unabhängige statische AI-Gegenprüfung der zentralen Schutzpfade: fehlender Post-Kontext, widersprüchliche Chat-Hierarchie, reale Firmenwechsel A→B→A sowie spätere Node-/Artefaktziele wurden gefunden und korrigiert. Kein Ersatz für Live-/Browserprüfung. Die Gegenprüfung der allerletzten kleinen Nachträge war wegen Kontingentgrenze nicht verfügbar; das ist keine Releasefreigabe.

Rückbau: normale Commit-Reverts; keine Datenbankmigration. Private Daten und Accounts nicht zur UI-Rücknahme löschen.
