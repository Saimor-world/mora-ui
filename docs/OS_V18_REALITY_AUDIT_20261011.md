# SAIMÔR OS V1.8 – Realitätsprüfung der alten Apps
**Stand:** 11.10.2026 · Basis: OS Recovery #101 (`040983e`), Ergänzungen #103 und #105.
**Beweisklasse:** Statische Inspektion ausgewählter React-App-Einstiege und API-Imports; keine vollständige Laufzeit- oder Kundentestabnahme.

## Architekturentscheidung

- **Heute:** beobachtete Quellen und belegte nächste Schritte. Keine erfundene Entwarnung.
- **Einstellungen › Quellen:** An-/Abdocken, Verbindungszustände, explizite Freigaben. Kein zweiter Connector-Markt.
- **App-Center:** ein einziger Einstieg zu Werkzeugen und vorläufigen Legacy-Fenstern. Der Eintrag allein beweist **nicht** Live-Funktionalität.
- **Control Center:** kleine Kontext-/Schnellzugriffsebene, kein eigenständiges Policy-Backend oder zweites App-Center.
- **MÔRA:** Vorschläge und Vorbereitung; wirkliche Ausführungsbefugnisse und Belege liegen in CORE.
- **CORE:** authoritative tenancy/policy/connector data. Vercel READY bestätigt nur Build/Serving, nicht Datenanbindung.

## Konkrete Bestandsaufnahme

| Bestand | Was im Code belegt ist | Kein belegter Anspruch / nächste Prüfung |
|---|---|---|
| Mail | `apps/mail/index.tsx` nutzt `coreGet/corePost`; OS V1.8 hat Quellenstatus | IMAP-Account, Abruf, Nutzerrechte, Postfach-Daten und Fehlerfälle auf echter Instanz nachweisen; niemals automatisch senden |
| Kalender | `apps/calendar/index.tsx` nutzt `useCalendarEvents`; Quelle in CORE | Echte Events plus Disconnect/Stale-Fall prüfen; `Heute frei` nur mit verifizierter Leermeldung |
| Aufgaben, Work, Work Session | CORE API-Calls bzw. `useScopedToday` sind vorhanden | Tenant/Benutzergrenzen, Schreibfreigaben, Duplikatschutz und tatsächliche Backend-Antworten prüfen |
| Nightwatch | `nightwatchClient` / Incidents in altem Fenster | Keine grüne Sicherheits-Entwarnung aus leeren/stalen/unverfügbaren Daten ableiten |
| Action Center | CORE `/v3/actions/events`, Journal-Endpunkte und Realtime im Code | Audit-Quelle, Freigabezustände, wirkliche Wirkung / Notbremse sind getrennt nachzuweisen |
| Scanner | `coreClient` für Ordner/Statistiken und Upload-UI | Upload/Indexierung/Quellenherkunft, Sichtbarkeit, Löschpfad sowie Bedrohungstests |
| Team, Users | CORE Team-/Admin-Clients und lokale Rollenprüfungen | Echte Server-autorisierte Rechte prüfen, UI-Verbergen ist keine Autorisierung |
| Terminal | CORE-Terminalsession-Client wird referenziert | Ausschließlich explizit freigegebene Aktionen; keine Produktions-Shell/unerlaubte Privilegien |
| Integrationen (alt) | Mehrere Integrationskomponenten; CORE-Mutationspfade | Durch Einstellungen › Quellen ersetzen, keine zweite Statuswahrheit |
| Finance V2 | Neue CORE-Finance-/Treasury-/XRPL-Panels | Read-only versus writable, tenant scope, Deploy-/DB-Parität, echte Datenquelle je Panel nachweisen |
| Finance (alt) | Import von `KNOWN_ACCOUNTS`, `ORIGIN_NFT`, `MINTING_STATUS` | **Archiv**, niemals als aktuelle Kontowahrheit anbieten |
| Website-Dossier | `coreGet('/v3/dossier')` mit explizitem Kommentar `API not yet live — show placeholder` | Ehrlich als unbestätigt labeln, erst nach Live-Endpoint-Test produktiv nennen |
| Canvas | HTML-Canvas-Pen/Eraser/UI im Code | Lokale Zeichenfunktion, **keine** geprüfte Cloud-Synchronisierung oder zentrale Speicherung |
| Codex, Lagefeld | `useMoraStream`, `useLagefeldSignals`, `useMoraEngine` | Modell-/CORE-Runtime und Ausführung/Review separat belegen |
| Feeds, Timeline | `useRssFeed`, `coreGet('/v3/activities')` | Reale Quelle, Aktualität, Berechtigungen und Downstream-Aktion überprüfen |
| App-Bibliothek (alt) | Eigene klassische Oberfläche, parallel zum neuen App-Center | Übergangsweise verfügbar, keine zweite kanonische Navigation |

**Weitere in der Registry vorhandene Einstiege, deren Laufzeitstatus hier noch nicht einzeln geprüft ist:** Chat, Document, Finder, Grid, Meine Dateien, Notes, Search, Settings, Website-bezogene Unterflächen. Nicht `live` oder `fertig` nennen, nur weil sie im App-Center erscheinen.

## P0-Abnahme für eine reale Quelle

1. **Anmelden:** tatsächliche, vom CORE geprüfte Tenant-/Benutzer-Sitzung; keine Demo-Konten.
2. **Verbinden:** Connector-Status `available → connected` nur nach Serverbestätigung; nie anhand lokaler UI-Farben.
3. **Lesen:** nachvollziehbarer Eintrag mit Timestamp/Source-ID erscheint in Post und `Heute`.
4. **Abziehen oder Fehler simulieren:** `disconnected/unavailable/partial/stale` führt nie zu `frei`, `nichts offen`, `keine Vorfälle`, `verbunden`.
5. **Arbeit:** MÔRA liest nur autorisierte Daten, benennt Grenzen und bereitet eine Aktion vor; keine Veröffentlichung oder Send-Aktion ohne Freigabe.
6. **Nachweis:** CORE Action-Receipt/Run-Kontrolle sind eine **eigene** noch offene Sicherheitsaufgabe (#98/#99), nicht von dieser UI simuliert.

## Rollout-Grenzen

Diese Integration ist eine kombinierte **Preview/Testbasis**. Sie bedeutet weder Merge von Recovery #101 nach `main`, noch produktiven CORE-Connector, noch freigegebene Echtgeld-/Mailaktionen. Vor Merge: Github-Lint/Types/Unit/Build und Vercel Preview auf exakt derselben SHA sowie browserbasierte Benutzerwege prüfen. Vor Production: CORE-/Alembic-/Tenant-/Backup-Gates separat schließen.

## Nächste Priorität

Erst **ein** durchgängiger echter E-Mail-Pfad (read-only, kontrollierte Testmail, Tenantgrenze, Quellennachweis) und ein vollständiger Rollen-/Offline-E2E. Danach weitere klassische Werkzeuge migrationsweise integrieren; keine General-Neugestaltung ohne belegtes Bedürfnis.
