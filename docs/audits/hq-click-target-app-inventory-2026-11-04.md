# HQ/OS – Klickziel- und App-Center-Inventur

Stand: 04.11.2026, **statische Code-Inventur**, keine Browser- oder Laufzeitfreigabe. Grundlage: features/registry.ts, neun features/*/manifest.ts, lib/apps/appRegistry.ts (29 Legacy-Einträge), lib/os-prototype/legacyApps.ts, features/home/cockpit/LiveCockpit.tsx und coreAdapter.ts, components/os-shell/CommandPalette.tsx, features/post/index.tsx.

## 1. Native OS-Flächen (neun Manifeste)

| Feature-ID | Name | Sichtbarkeit / Einschränkung | Bewertung |
|---|---|---|---|
| home | Home | Hauptnavigation | Bestand – reale/Demo-Flows im Browser testen |
| today | Heute | Hauptnavigation | Bestand – Objektziele und Demo-IDs testen |
| mora | MÔRA | Hauptnavigation | Bestand – Kontextrechte gesondert prüfen |
| finance | Finance | internalOnly und Rollenfilter | Nur interne Fläche; keine Kundenfreigabe ohne Produktentscheid |
| post | Post | Hauptnavigation | Bestand – Demo-Mail und Demo-Kalender derzeit leer (usePost.ts) |
| knowledge | Wissen | Hauptnavigation | Datei- und Mandantengrenzen prüfen |
| settings | Einstellungen | Hauptnavigation | Persönliche Quellen im Demo-Kontext verstecken, PR #213 |
| universe | Universe | sekundär | An Abteilungs-/Objekt-IDs koppeln |
| labs | Labs & System | internalOnly | Nicht als funktionsfertiges Kunden-App-Center darstellen |

**Befund:** features/registry.ts hat nur diese neun nativen Flächen. lib/apps/appRegistry.ts listet darüber hinaus **29 klassische Apps**; ein Registereintrag ist noch kein Beleg für funktionierende Demo-Daten.

## 2. Klassische Apps – vollständige Erstklassifikation

Legende: **Demo-Audit** = anhand echter CORE-Demo-Objekte testen/anschließen; **intern** = Rollen/Launcher-Schutz behalten; **Ausblendkandidat** = nicht werblich/prominent anzeigen, bis ein End-to-End-Test belegt, dass die App sinnvoll funktioniert. **Keine** der 29 Apps ist mit diesem Dokument als „läuft“ zertifiziert.

| ID | Name | Erstklassifikation | Begründung / konkreter Prüfschritt |
|---|---|---|---|
| finder | Finder | Demo-Audit | Firmenordner muss echte Demo-Dateien öffnen |
| document | Dokument | Demo-Audit | nodeId muss auf lesbares Objekt führen |
| website-dossier | Website Dossier | Ausblendkandidat | Labs/Tool; Demo-Datenanbindung nachweisen |
| notes | Notizen | Demo-Audit | Echte Demo-Notizen und Rechte prüfen |
| grid | Alle Inhalte | Ausblendkandidat | Doppelung zu Wissen/Universe; Nutzwert prüfen |
| finance | Saimôr Finance (alt) | Ausblendkandidat | legacyApps.ts nennt hartkodierte Konten; keine realen Finanzen vortäuschen |
| finance-v2 | Finance | intern | launcherHidden, über native Finance-Surface |
| chat | Chat | Demo-Audit | Prompt-Mandant und Chat-Kontext strikt isolieren |
| scanner | Scanner | Ausblendkandidat | Upload- und Tenant-Rechte prüfen |
| search | Suche | Demo-Audit | Treffer muss tatsächliche Demo-Objekt-ID öffnen |
| timeline | Zeitverlauf | Demo-Audit | Nur Ereignisse aus eigenem Tenant |
| nightwatch | Nightwatch | intern | Infrastruktur-Werkzeug; nicht als Demo-Service simulieren |
| lagefeld | Lagefeld | Demo-Audit | Fakten aus richtiger Demo-Firma, keine echten Quellen |
| codex | Engineering | intern | launcherHidden, Owner/Admin und Ausführungsrechte |
| work | Arbeit | intern | launcherHidden, über bestehende Oberflächen |
| calendar | Kalender | Demo-Audit | Schicht/Termin direkt über ID öffnen |
| tasks | Aufgaben | Demo-Audit | Aufgabe über ID, Status und Abteilung |
| work-session | Arbeitssitzung | Ausblendkandidat | Szenario, Zustand und Persistenz vorführen oder verbergen |
| team | Team | Demo-Audit | Fiktive Mitglieder und Schichten konsistent |
| users | Benutzerverwaltung | intern | Owner/Admin-Rollen; keine Demo-Mitglieder in echte Accounts |
| action-center | Action Center | Demo-Audit | Freigaben führen zu konkretem freigabefähigem Objekt |
| integrations | Integrationen | Ausblendkandidat | Reale OAuth-Accounts im Demo-Kontext verbergen |
| mail | Mail | Demo-Audit | Fiktives Demo-Postfach statt persönlichem Gmail |
| feeds | Dein Feed | Demo-Audit | Nur mandanteneigene fiktive Quellen, sonst verbergen |
| apps | Apps | Ausblendkandidat | App-Center selbst; keine Sackgassen zeigen |
| meine-dateien | Meine Dateien | Demo-Audit | Nur vom Demo-Tenant erlaubte Dateien |
| terminal | Terminal | intern | system_owner; niemals öffentliche Demo |
| settings | Saimôr Setup | intern | Legacy-Settings; Quellensichtbarkeit und Rollen |
| canvas | Canvas | Ausblendkandidat | Whiteboard-Zustand/Save/Read vor sichtbarer Freigabe testen |

Empfohlene Default-Regel nach Runtime-Audit: Eine App darf im Kunden-/Demo-App-Center nur sichtbar sein, wenn **Route erreichbar + mindestens ein sinnvoller Datenfall + alle Klicks erfolgreich + Rechte korrekt**. Fehlende Evidenz bedeutet ausblenden, nicht eine dekorative leere App öffnen. Das ist eine empfohlene zukünftige UI-Änderung, **noch nicht umgesetzt**.

## 3. Klickziel → erwartetes Objekt → aktueller Codezustand

| Oberfläche/Code | Angezeigte Handlung | Erwartetes Objekt | Im Code beobachtetes Ist | Priorität |
|---|---|---|---|---|
| Home, coreAdapter.ts deriveLiveAttention / live-mail | „Post öffnen“ | Mail oder wenigstens Post | navigate('mora') – falsche native Fläche | P1 |
| Home, coreAdapter.ts / live-cal | „Schicht besetzen“ bzw. Kalender | konkrete Kalender-/Schicht-ID | navigate('calendar') – kein natives Feature; resolveFeatureId fällt auf Home zurück | P1 |
| Home, coreAdapter.ts / live-task | „Aufgabe erledigen“ | konkrete Task-ID | navigate('tasks') – kein natives Feature; fällt auf Home zurück | P1 |
| Home, LiveCockpit.tsx handleWidgetOpen | Tasks/Überfällig | Heute-Aufgabe | navigate('tasks') – falsche native ID | P1 |
| Home, LiveCockpit.tsx handleWidgetOpen | Kalender | Termin-/Schicht-ID | navigate('calendar') – falsche native ID | P1 |
| Home, LiveCockpit.tsx handleWidgetOpen | Mail | Mail | navigate('mora') statt Post | P1 |
| Suche, CommandPalette.tsx | gefundenen Termin wählen | exakt e.id | navigate('post') – nur generische Fläche, ID verloren | P2 |
| BridgeConcept.tsx Tagesmarke | Termin anklicken | konkrete m.id | openLegacyApp('calendar') ohne m.id | P2 |
| PostSurface (features/post/index.tsx) | Termin in Liste | konkretes Ereignis | nur statisches div, kein klickbares Detailziel | P2 |
| Demo Home vs Online | Mails/Schichten/Kacheln | dieselbe CORE-ID über Apps | sowohl lokale MORGENROT_SEED/structure als auch Live CORE-Pfad; Gleichheit nicht nachgewiesen | P1 |

**Wichtig:** „Falsche native Feature-ID“ ist aus registry.ts + resolveFeatureId in OsShell.tsx nachvollziehbar. Objekt-Deep-Links sind noch nicht implementiert; ein Redirect in einen generischen Kalender reicht nicht als Produktabnahme.

## 4. Abnahme und Folgearbeiten

1. **P1:** Offensichtliche falsche native Navigationsziele korrigieren, mit Jest-Test für ausgelöste Ziel-IDs. Keine Fake-Objekt-IDs erfinden.
2. **P1:** Eine Quelle je Demo-Firma: seed → CORE object ID → Today/Post/Calendar/Universe/Feed. Keine auseinanderlaufenden lokalen Varianten.
3. **P2:** Definierte Objekt-Navigation (Task, Event, Mail, File), zunächst vorhandene Pane-APIs und deren zulässige Datenparameter inventarisieren. Sichtbare Aktion ohne Detailroute lieber neutral kennzeichnen oder verbergen.
4. **P2:** Für alle 29 Legacy-Apps eine echte Session-Smoke-Matrix ausführen: Startet, Daten vorhanden, Verknüpfung, Schreib-/Leserechte, leere Zustände, Demo-vs-Live.
5. Vor dem Ausblenden/Entfernen Designentscheidung und Screenshot-Gegenprüfung. **Mit diesem Inventur-PR wird keine App entfernt.**

## 5. Testprotokoll – auszufüllen bei Browserprüfung

| Umgebung | Demo-Tenant | Objekt-ID | UI-Klick | Erwartung | Tatsächlicher Zustand | Screenshot/Test |
|---|---|---|---|---|---|---|
| Desktop | demo-morgenrot | nach CORE-Seed | Schicht im Home | genau diesen Termin öffnen | offen | offen |
| Desktop | demo-morgenrot | nach CORE-Seed | Mail im Home | genau diese Demo-Mail | offen | offen |
| Desktop | demo-morgenrot | nach CORE-Seed | Aufgabe im Heute | genau diese Aufgabe | offen | offen |
| Phone 390 | demo-morgenrot | nach CORE-Seed | Kalender/Heute | richtige mobile Detailansicht | offen | offen |
| Desktop | Presenter-Real | echter Account, nur Testdatensatz | Demo betreten | kein echter Inhalt sichtbar | offen | offen |

Dieses Dokument trennt **nachgewiesenen Code-Befund** von **noch offener Laufzeitprüfung**.
