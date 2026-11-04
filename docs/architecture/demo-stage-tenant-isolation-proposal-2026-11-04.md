# Demo-Tenant-Wechsel / Stage – Architekturentwurf (Review, keine Auth-Implementierung)

Stand: 04.11.2026. Verantwortlich: SAIMÔR Produkt / CORE / HQ. **Status: VORSCHLAG – Marius' ausdrückliche Freigabe vor der Implementierung erforderlich.**

## Ziel und Sicherheitsgrenze

Es gibt drei **verschiedene Identitäten**: (1) Presenter-Konto, (2) eigenständiger Demo-Tenant mit ausschließlich fiktiven Inhalten, (3) späterer Customer-Trial-Tenant mit eigener Authentisierung. Der Presenter kann eine Demo zeitlich begrenzt betreten und sicher zurückkehren; keine echten Gmail-, Kalender-, Zahlungs- oder privaten Firmendaten dürfen durch die Demo-Grenze gelangen.

**Die Firmen-ID als Browser-Parameter oder Zustand ist keine Berechtigung.** CORE muss die Identität und den zulässigen Tenant serverseitig aus einer speziell gebundenen Sitzung herleiten.

## Bestandsbefund (Repo mora-ui, 04.11.)

- lib/demo/demoStore.ts speichert demoCompanyId in sessionStorage; useScopeCompanyId bevorzugt diese ID. Der Kommentar bestätigt ausdrücklich: Die CORE-Sitzung selbst wird dabei nicht gewechselt.
- lib/demo/demoSourceGuard.ts benennt den Kernfehler: persönliche Provider-/Briefing-Routen sind an den angemeldeten Nutzer gebunden, nicht zuverlässig an company_id.
- features/post/data/usePost.ts liefert im Demo-Modus leere Listen statt eines fiktiven Demo-Postfachs. Gleiches gilt für den Kalender: Ergebnis ist teilweise eine leere Oberfläche statt einer glaubwürdigen Firma.
- features/today/ui/MoraBriefing.tsx und features/settings/ui/SourceDock.tsx hatten zusätzliche persönliche Quellenpfade; die begleitende UI-Guard-PR #213 schließt diese defensiv, ist aber ausdrücklich KEINE serverseitige Auth-Isolation.
- lib/queries/useDailyBriefing.ts und lib/lea/useHorizonSources.ts sperren persönliche Demo-Abrufe bereits, ebenso Teilpfade in lib/hooks/useCommunicationLiveData.ts. Weitere Consumer und gecachte Daten müssen zentral auditiert werden.

## Vorgeschlagener CORE-Vertrag (neue Endpunkte, NICHT als existent behauptet)

1. GET /v3/presenter/demo-worlds: Liefert nur dem berechtigten Presenter die von ihm verwalteten Demo-Tenants, deren Branche, Version, Ablaufdatum und Seed-Status.
2. POST /v3/presenter/demo-sessions: Nimmt eine Demo-World-ID entgegen, prüft presenter_id, Berechtigung und is_demo serverseitig; erzeugt eine **neue, kurzlebige, ausdrücklich auf genau einen Demo-Tenant beschränkte** Session. Kein allgemeines Impersonation-Token und kein frei wählbares tenant_id-Feld.
3. GET /v3/presenter/demo-sessions/current: Liefert target_tenant_id, role=presenter_demo, verified demo=true, expiry und session_id aus der tatsächlich validierten Session.
4. POST /v3/presenter/demo-sessions/current/leave: Widerruft die Demo-Session und führt kontrolliert über den ursprünglichen, separat geschützten Presenter-Login zurück; keine automatische Rückschaltung durch Manipulation von company_id.
5. Auditeintrag für Enter, Leave, Expiry, Verweigerung und abgelehnte Cross-Tenant-Zugriffe: actor_id, demo_tenant_id, session_id, timestamp, outcome, reason, niemals Tokens oder Inhalte.

Empfohlene maximale Dauer einer Demo-Sitzung: 30 Minuten, serverseitig widerrufbar. Die eigentliche Auth-Implementierung soll vorhandene CORE-Session-/Cookie-/CSRF-Mechanismen erweitern und vorab durch das CORE-Security-Review bestätigt werden.

## Frontend-Wechsel als atomarer Vorgang

- Während Enter/Leave alle ausstehenden Abfragen abbrechen, Mutationen blockieren und die Darstellung kurz sperren.
- Authentisierte Session vollständig umschalten, **danach** QueryClient-Caches entfernen oder an Session-/Tenant-ID binden. Betroffen u. a. os/sources, os/mail-summary, daily-briefing, os/today, Mail/Calendar, Universe, Horizon, CommunicationLiveData, MÔRA-Kontext und lokale UI-Stores.
- Demo-Header signalisiert sichtbar und beständig: FIKTIVE DEMO · Name des Demo-Tenants. Keine Übernahme von Presenter-OAuth-Verbindungen in Demo-Sessions.
- Jeder Deep-Link muss seine Tenant-Berechtigung erneut serverseitig nachweisen; ein Link aus der Presenter-Firma darf im Demo-Tenant nicht auflösbar sein.
- Rückweg explizit, auch bei Session-Timeout oder Netzwerkfehler; keine Wiederverwendung von React Query-Daten aus der vorherigen Identität.

## Demo-Daten als EINE Quelle

- Ein versioniertes Demo-Paket erzeugt für jede fiktive Firma reale CORE-Objekte im eigenen Tenant: departments, members, shifts/events, tasks, mail messages, files, actions und MÔRA-Notizen.
- Fiktive Mail und Kalender dürfen NUR aus den Demo-Objekten gelesen werden. Nie eine echte OAuth-Gmail-Verbindung des Presenters als Fallback.
- App-übergreifende IDs müssen identisch bleiben (Heute-Schicht → derselbe Kalendertermin; Post → dieselbe fiktive Nachricht; Aufgabe → dasselbe Aufgabenobjekt). Keine händisch duplizierten Frontend-Listen.
- Jedes angezeigte Signal muss ein tatsächlich lesbares Zielobjekt haben; andernfalls Signal nicht anzeigen.
- Trial aus Demo: neuer Customer-Trial-Tenant, ausschließlich freigegebene, neutralisierte Strukturen/Vorlagen; **keine** Nachrichten, privaten Notizen, persönlichen Daten oder fremden Berechtigungen. Keine Tenant-ID-Übernahme.

## Verbindliche Tests vor Freigabe

| Fall | Erwartung |
|---|---|
| Presenter mit verbundenem echten Gmail betritt Demo | Kein echter Mail-/Kalender-/Briefing-/Connector-Request im Demo-Kontext; kein Cache-Überbleibsel |
| Versuch, Demo-Session auf anderen Tenant umzubiegen | 403/404; auch mit gültiger Objekt-ID kein Zugriff |
| Demo A und Demo B wechseln | Daten, Caches, Session und Deep-Links jeweils strikt getrennt |
| Demo verlassen, ablaufen lassen oder widerrufen | Zugriff auf Demo-Daten beendet; Presenter-Konto separat und eindeutig wiederhergestellt |
| Schicht oder Aufgabe im Heute-Signal anklicken | Öffnet genau das Objekt mit derselben ID; keine leere generische Ansicht |
| Demo ohne fiktive Quelle | Als unbekannt/nicht vorhanden darstellen, niemals echte Quelle substituieren |
| Trial anlegen | Nur erlaubte Strukturen; kein Demo-Postfach oder Presenter-OAuth übertragen |
| Audit-Logs | Enter/Leave/Denial/Expiry nachvollziehbar, keine Secrets |

## Freigabe-Gate

**Bis Marius ausdrücklich zustimmt: keine neue Impersonation-/Tenant-Session-API, keine Live-Auth-Änderung.** Erlaubt sind ausschließlich defensive UI-Guards, Testentwürfe, Objekt-/Link-Audits und dieser Entwurf. Die eigentliche Umsetzung beginnt erst nach Review von CORE-Security, Session-Cookies, CSRF und Rollenmodell.
