# OS Recovery Prototype V1 – SAIMÔR OS

Branch `grok/os-recovery-prototype-v1` · Basis `main @ a053dd39` (Merge #100; am 07.10.2026 ~09:45 Berlin neu geprüft, main hat sich seit dem Audit **nicht** bewegt) · Stand 07.10.2026 (Berlin) · **Nicht gemergt, nicht deployed.**

> „Ein ruhiges Cockpit für ein Unternehmen, mit MÔRA als Bedienung.“ – Klarheit im Wandel.

## 1 Ausgangslage
Audit `STAND-NULL-SAIMOR-OS.md`: mora-ui technisch gesund (tsc 0, Lint 0/1, Jest 255/1.469, Build grün), aber 29 Apps, ~114k LOC, Shell = MoraShell+Dock+Spotlight+NotificationCenter+MemorySidebar (~5.900 Z.) mit Wissen über jede App, Design-Tokens kaum genutzt, Finance v2 auf main aber **nicht verdrahtet** (`AppLoader` lud nur `apps/finance`), Live-CORE ohne `/v3/finance/profit-center` und `/capital-policy`.

## 2 Adressierte Probleme
| Audit-Befund | Antwort im Prototyp |
|---|---|
| Sprawl / keine IA | 6 Hauptflächen + Labs/System, alle 29 alten Apps eingeordnet (Tabelle §5) |
| Shell kennt jede App | Shell rendert nur aus Feature-Manifesten (`features/registry.ts`) |
| K1 Finance v2 toter Code | `finance-v2` im AppLoader/Registry registriert, in Finance eingebettet |
| K2 CORE-Verträge fehlen live | Contract-Adapter: 404 → klarer „nicht verfügbar“-Zustand, niemals „Verbunden“ |
| Design-System nominell | `lib/design/osTokens.ts` → `--os-*` CSS-Variablen; 13 Primitive; 0 harte Farben im neuen Code |
| Uneinheitliche Zustände | 8 gemeinsame Zustände (`components/os-kit/States.tsx`) |
| State-Zersplitterung | neue Regeln (§9): Server = React Query, UI = Zustand, keine Persistenz |
| K8 lokal ohne CORE nicht klickbar | lokale Vorschau (`NEXT_PUBLIC_OS_PREVIEW=local`, nur localhost) |

## 3 Architektur
```
app/os/page.tsx            Route /os (Flag-gesteuert), legacy "/" unverändert
components/os-shell/       OsShell (Rail, Topbar, Bottom-Bar mobil, MÔRA-Panel), CommandPalette, NotificationTray, FeatureBoundary
components/os-kit/         Primitive + Zustände + os-kit.css (nur var(--os-*))
lib/design/osTokens.ts     Tokens (Farbe, Abstand, Radius, Typo, Motion, Layout) → CSS-Variablen
lib/os-prototype/          flags, shellStore (UI), notifications (Bus), legacyApps (Platzierung + openLegacyApp), coreFailure, useCoreHealth
features/
  types.ts registry.ts     FeatureManifest + manifest-getriebene Registry/Navigation
  today|mora|finance|post|knowledge|settings|labs/
    manifest.ts            id, title, icon, slot, order, permissions, flag, visibility, mobile, load() (lazy), mora.{contextLabel,suggestions}, legacyApps
    index.tsx              Entry (Surface)
    data/                  React-Query-Hooks/Adapter (nur bestehende Clients)
    ui/                    Feature-UI
```
Schichtung: **Shell → Navigation (aus Manifesten) → Command/MÔRA → Notification-Service → Feature-Manifeste**. Ein Feature hinzufügen = Ordner + Manifest + Eintrag in `FEATURE_MANIFESTS`; die Shell ändert sich nicht. Jedes Feature hängt in einer `FeatureBoundary` (ein kaputter Bereich reißt die Shell nicht mit) und wird per `React.lazy` geladen. Deep-Links: `/os#finance`, `/os#knowledge` … (unbekannt/verboten → Heute).
Alte Apps öffnen sich als klassische Pane über der neuen Shell (`openLegacyApp()` → `paneStore.openPane` → bestehender `PaneManager`/`AppLoader`, inkl. dessen Rollenprüfung).

## 4 Fähigkeiten erhalten (wiederverwendet statt dupliziert)
| Fähigkeit | wiederverwendet aus |
|---|---|
| Finance v2 komplett (State/Flow/Treasury/Capital, Profit Center, Sources, XRPL Watch Lab) | `apps/finance-v2` – neu extrahiert: `FinanceV2Workspace` (pane-unabhängig), Default-Export = GlassPanel-Hülle wie bisher |
| Finance-Daten | `lib/queries/useFinanceStateFlow`, `useFinanceProfitCenter` |
| Heute-Tagesbild | `lib/os/useScopedToday` + `lib/api/todayClient` (`/v3/today`, Scope-Prüfung) |
| MÔRA-Chat | `lib/api/moraAgentClient` (`POST /v3/chat`, inkl. `buildChatContext`) – derselbe Client wie Chat/Dock |
| Suche | `lib/api/searchClient.searchGlobal` (wie Spotlight/Search-App) |
| Memory | `lib/queries/useMemories` (wie MemorySidebar) |
| Post | dieselben Verträge wie Mail/Kalender-Apps (`/v3/mail/messages`, `/v3/calendar/events`) |
| Verbindungen | Vertrag + Typen aus `lib/hooks/useIntegrationsOverview` (`/v3/integrations/overview`) |
| Rechte | `sessionStore.permissions` / `ROLE_PERMISSIONS` |
| Semantik-Farben | `lib/design/tokens.ts` (`semanticColor`) – osTokens baut darauf auf |
| Fenster/Apps | `PaneManager`, `AppLoader` (inkl. Rollen-Gate), `appRegistry` |

## 5 Neu eingeordnet (alte App → neue Fläche)
| alte App(s) | neue Fläche | wie |
|---|---|---|
| chat, Dock-Chat, Spotlight-„Frag MÔRA“ | **MÔRA** | globales Panel (Desktop rechts, Mobil Bottom-Sheet) + Seite; Chat-App als „klassisch öffnen“ |
| Spotlight | **Command-Palette** (⌘K) | Bereiche, alle alten Apps, „MÔRA fragen“, CORE-Suche |
| HomeSurface/HomeCockpit, TodayOverview | **Heute** | Aufmerksamkeit, Termine, Finance-Signal, offene Arbeit, Neues, MÔRA-Hinweise |
| finance-v2 | **Finance** | eingebettet |
| finance (alt) | Labs › **Legacy** | als Fenster |
| finder, meine-dateien, search, document, notes, MemorySidebar | **Wissen** | eine Suche + Erinnerungen + „Quellen“ (öffnen alte Apps) |
| mail, calendar | **Post** | Überblick + „Postfach/Kalender öffnen“ |
| settings, integrations | **Einstellungen** | Konto · Identität · Verbindungen · Berechtigungen · System; alte Settings „klassisch“ |
| scanner, nightwatch, lagefeld, codex, canvas, grid, website-dossier, timeline, feeds | Labs › **Labor** | als Fenster |
| work, tasks, action-center, work-session | Labs › **Arbeit** (offene Arbeit zusätzlich in Heute) | als Fenster |
| terminal, team, users, apps | Labs › **System** | als Fenster, Rollen-Gate bleibt |
| NotificationCenter | **Notification-Service** (`lib/os-prototype/notifications`) + Tray | minimal, sitzungsflüchtig |
| Universe/Spaces/DepartmentLayer/AmbientRoom/Planet/Dock | **klassische Oberfläche `/`** (Link in Rail, Labs, „Mehr“) | unverändert |

## 6 Labs / System
`/os#labs` listet **jede** alte App in fünf Gruppen (Labor, Arbeit, System, Legacy, „in neue Bereiche eingeordnet“) mit „Öffnen“ und ggf. „Zu <Bereich>“. Rollenpflichtige Apps (codex, users, terminal) zeigen „Rolle nötig“; der AppLoader blockt sie weiterhin. Test `legacy-reachability` erzwingt: jede ID aus `APP_MAP` hat genau eine Platzierung und öffnet als Pane.

## 7 Legacy (weiter bestehend)
- `/` mit MoraShell, Dock, Spotlight, Universe, Spaces, Ambient – **unverändert**.
- Alle 28 bisherigen App-IDs + neu `finance-v2` im `AppLoader`; `apps/finance` unverändert; alte Launcher sehen `finance-v2` nicht (`launcherHidden`).
- `/tunnel`, `/playground`, `/home` unverändert. Keine Stores umgeschrieben.

## 8 Finance
**Verdrahtung:** `apps/finance-v2/index.tsx` → `export function FinanceV2Workspace({ initialSection, hideSectionNav })` (Inhalt 1:1 aus dem Pane extrahiert) + Default-Export (GlassPanel) unverändert im Verhalten. Registrierung `finance-v2` in `AppLoader`, `appRegistry` (launcherHidden), `surfaceRegistry` (Tier `app`). `features/finance` lädt den Workspace lazy und steuert ihn über Tabs: Überblick (state) · Cashflow (flow) · Profit Center (capital) · Treasury & Quellen (treasury) · Capital · XRPL read-only (capital).
**Contract-Adapter** (`features/finance/data/contracts.ts`): prüft mit den bestehenden Hooks `/v3/finance/state`, `/profit-center`, `/capital-policy`. Zustände: verfügbar · fehlt im laufenden CORE (404) · CORE nicht erreichbar · keine bestätigte Sitzung · kein Zugriff · CORE-Fehler · nicht geprüft (keine Sitzung/kein Unternehmen). Tab „Profit Center“ wird bei fehlendem Vertrag **durch einen klaren Nicht-verfügbar-Zustand ersetzt** statt halb zu rendern. Der Text „Verbunden“ erscheint im neuen Code nicht (Test). Ohne Sitzung: keine Zahlen, auch keine Beispielzahlen.
**CORE-Vertragsstatus heute (07.10.2026, 10:09 Berlin, unauth. GET auf hq.saimor.world):** `/v3/finance/state` 401 (vorhanden) · `/records` 401 · `/sources` 401 · `/connections` 401 · `/mora-context` 401 · `/accounts` 405 · **`/profit-center` 404** · **`/capital-policy` 404** · Kontrolle `/v3/doesnotexist` 404. CORE `/health`: healthy, production, build **b564c995** (06.10. 12:52 Berlin) – unverändert seit Audit.
**Standard „gebaut → integriert → sichtbar → verifiziert → alte Variante geklärt“:**
| Schritt | Stand |
|---|---|
| gebaut | ja (PRs #95/#99/#100) |
| integriert | ja, auf diesem Branch (AppLoader + Feature) |
| sichtbar | ja unter `/os#finance` (Prototyp-Flag) |
| verifiziert | lokal: Unit-/Integrationstests + E2E ohne CORE. **Mit echter Sitzung/echtem CORE: nicht verifiziert.** |
| alte Variante geklärt | `finance` → Labs › Legacy; Löschen erst nach Live-Verifikation |
**Offen für Deploy/Verify:** (1) saimor-core main (mit #80/#87 → profit-center/capital-policy) deployen, (2) UI-Build mit `NEXT_PUBLIC_OS_PROTOTYPE=1` in Staging, (3) mit Owner-Sitzung alle drei Verträge „verfügbar“ sehen, (4) dann `finance` im Legacy-Shell durch `finance-v2` ersetzen, (5) `lib/finance/xrplProvider.ts` (zweite XRPL-Wahrheit) entfernen.

## 9 MÔRA
- **Global erreichbar:** Topbar-Button, ⌘J, mobil zentral in der Bottom-Bar (Sheet); auf der MÔRA-Seite als Vollansicht. Eine Implementierung: `features/mora/ui/MoraConsole.tsx`.
- **Kontextbewusst:** liest `activeFeatureId` + `surfaceContext` (z. B. „Finance · Profit Center“), zeigt ihn an und gibt ihn als `route_path`/`pane_id` an `/v3/chat` (zusätzlich zum bestehenden `buildChatContext`). Vorschläge kommen aus dem Manifest des aktiven Bereichs.
- **Arbeits-/Tool-Status:** CORE erreichbar/nicht, „denkt nach / bereit / fehlgeschlagen“, Hinweis „nur mit Bestätigung“.
- **Erklärbare Vorschläge** (`data/proposals.ts`): Navigation/Fenster öffnen = reversibel, mit Begründung, erst auf Klick. Alles mit Außenwirkung (senden, löschen, zahlen, signieren, minten …) = nicht reversibel → Bestätigungsdialog; im Prototyp wird **nichts** an CORE übergeben.
- Command-Palette übergibt Text an MÔRA nur als Entwurf; Absenden bleibt beim Menschen.
- Grenzen: keine Streaming-Antworten, keine Tool-Traces (bleiben in Chat-App; PR #89), keine ConfirmationCard-Ausführung.

## 10 State-Regeln (für neuen Code)
- Server-State **nur React Query** (alle `features/*/data`), Query-Keys unter `['os', …]` bzw. bestehende Finance-Keys.
- UI-State **nur Zustand**: `useOsShellStore` (aktiver Bereich, MÔRA offen, Palette, Kontext, Entwurf), `useMoraConversation` (flüchtig), `useOsNotifications` (flüchtig).
- **Keine** localStorage-Nutzung im neuen Code; Navigation über URL-Hash.
- Alte Stores unangetastet. Ausnahme bewusst: `useScopedToday` (bestehend, useState-basiert) wiederverwendet statt dupliziert.

## 11 Design-System
`lib/design/osTokens.ts`: Farben (canvas, surface, hairline, text-Stufen, accent, aura, focus), Abstände 0–16, Radien, Typo (display/title/body/meta/eyebrow), Motion, Layout (Rail, MÔRA-Breite, Bottom-Bar) + Semantik-Töne aus `tokens.ts` → `osCssVariables()` am Shell-Root. `components/os-kit`: **Text (Typography), Stack (Spacing), ResponsiveGrid (Layout), Divider, Surface, Panel, Button, Input, NavItem, Status, Dialog, StateView/Loading/Empty/ErrorState/FailureState, SampleTag**. Harte Farben: einzig in `osTokens.ts`; `rg '#hex|rgba(' features components/os-shell components/os-kit lib/os-prototype app/os` → 0 Treffer. Mobile: < 900 px → Bottom-Bar (Heute, MÔRA, Finance, Post, Wissen, Mehr), MÔRA als Sheet, einspaltige Raster. Atmosphäre: ruhiger zweifacher Aura-Verlauf statt 3D-Universe (Universe bleibt unter `/`; künftig als Manifest-Flag `atmosphere-universe` denkbar).

## 12 Gemeinsame Zustände
`loading · empty · error · offline · backend_unavailable · permission_denied · not_configured · feature_unavailable` (+ `FailureState` mappt `classifyCoreFailure`: 401→nicht angemeldet, 403→kein Zugriff, 404/405→Vertrag fehlt, 502–504/Netz→offline, sonst Fehler). Heute/Post/Wissen unterscheiden „leer“ von „unbekannt“.

## 13 Tests (Box, Node v20.19.2, 07.10.2026)
| Schritt | Ergebnis |
|---|---|
| `npm ci` | 909 Pakete, Exit 0 (1 min 12 s) |
| `npm run verify:types` (tsconfig.verify) | 0 Fehler (22 s) |
| `npx tsc --noEmit` (voll) | 0 Fehler (21 s) |
| `npm run lint` | 0 Fehler, 1 Warnung (bestehend: `HomeSurface.tsx:870`) |
| `npx jest --ci` | **262/262 Suites, 1.519/1.519 Tests** (vorher 255/1.469; +7 Suites/+50 Tests; 1 bestehender Test angepasst: Registry-Länge 28→29 wegen `finance-v2`) |
| `next build` (ohne Flags = Produktionsdefault) | Exit 0, `/os` 21,4 kB (157 kB First Load), `/` unverändert 44,3 kB, Middleware 55,6 kB |
| `next build` mit `NEXT_PUBLIC_OS_PROTOTYPE=1 NEXT_PUBLIC_OS_PREVIEW=local` | Exit 0 |
| Playwright `e2e/os-prototype.spec.ts` (Chrome, gegen Preview-Build) | **10/10 grün** (7 Flächen ohne Page-Errors, Finance ohne „Verbunden“, Legacy-Pane aus Labs, Mobil Bottom-Bar + MÔRA-Sheet) |
Neue Tests: `__tests__/features/{registry,legacy-reachability,finance-integration}`, `__tests__/components/os-shell/OsShell`, `__tests__/components/os-kit/states`, `__tests__/lib/os-prototype/flags-proposals`, `__tests__/middleware.os-preview`.

## 14 Screenshots
`/workspace/os-recovery-v1/shots/` (lokale Vorschau, ohne CORE, keine echten Daten): `os-{d,m}-{today,mora,finance,knowledge,post,settings,labs}.png`, `os-{d,m}-mora-panel-over-finance.png`, `os-{d,m}-command-palette.png`, `os-m-more-sheet.png`, `os-d-labs-legacy-pane-open.png`, `compare-d-finance-old-pane.png` vs `compare-d-finance-v2-pane.png`, `legacy-{d,m}-root.png` (alte Oberfläche ohne Sitzung = Login-Portal; die alte Innen-Navigation ist ohne CORE-Sitzung nicht erreichbar – Vergleich alt/neu der Navigation siehe Audit-Screenshots bzw. mit Sitzung nachholen). Heute zeigt in der Vorschau klar markierte **Beispieldaten** (`example.com`, „Beispiel: …“).

## 15 Start lokal
```bash
cd mora-ui && git checkout grok/os-recovery-prototype-v1 && npm ci
# Vorschau ohne CORE (nur localhost):
NEXT_PUBLIC_OS_PROTOTYPE=1 NEXT_PUBLIC_OS_PREVIEW=local npm run build && npm start
# → http://localhost:3000/os   (Deep-Links: /os#finance, /os#knowledge, /os#labs …)
# Dev-Modus:
NEXT_PUBLIC_OS_PROTOTYPE=1 NEXT_PUBLIC_OS_PREVIEW=local npm run dev
# Mit echtem CORE (Sitzung nötig, keine Vorschau):
NEXT_PUBLIC_OS_PROTOTYPE=1 SAIMOR_CORE_URL=<core> npm run dev
# E2E: BASE_URL=http://localhost:3000 npx playwright test e2e/os-prototype.spec.ts
```
Ohne `NEXT_PUBLIC_OS_PROTOTYPE`/`NEXT_PUBLIC_OS_PREVIEW` zeigt `/os` nur „nicht aktiviert“; die Werte werden beim Build eingebrannt. Vorschau greift zusätzlich nur bei Hostname localhost/127.0.0.1 (Client **und** Middleware). Ohne Vorschau verlangt die Middleware für `/os` wie für jede Seite eine CORE-Sitzung.

## 16 Bekannte Grenzen
- Mit echter CORE-Sitzung **nicht** getestet (kein Account genutzt); Finance-Einbettung, Post, Wissen, Settings mit Live-Daten n.v.
- MÔRA: keine Streams/Tool-Traces/Provider-Wahl; Vorschläge regelbasiert (Schlüsselwörter), nicht vom Modell.
- Post zeigt nur Listen; Lesen/Antworten/Termine anlegen über alte Apps. Mail-Triage (#54) nicht übernommen.
- Wissen: Treffer öffnen das alte Dokument-Fenster; keine Vorschau, keine Ordnernavigation.
- Notification-Service flüchtig, nicht mit Realtime/NotificationCenter verbunden.
- Alte Apps als Pane über der neuen Shell nutzen ihr altes Styling (GlassPanel), auch Finance v2 innen (eigene harte Farben, bestehend).
- Capital-Tab rendert `CapitalProfitCenter` mit; dessen eigener Fehlerzustand greift, wenn profit-center fehlt.
- Root-Layout ist `"use client"` und mountet PaneManager auch auf `/os` (gewollt, für Legacy-Panes).

## 17 Nicht angefasst
saimor-core (privat; Token weiterhin ohne Leserecht, kein Klon), YORI-Repo, Produktion/Deploy/Caddy/.env/Secrets, Wallet/XRPL/Treasury (nur Anzeige, kein Sign/Mint/Offer), ORIGIN #001–#110, offene PRs/Branches, alte Apps/Stores/Datenmodelle (nichts gelöscht), Legacy-Shell `/`, `WelcomeScreen`, `widgets/registry`, Root-Müll (Caddyfile-Varianten usw.).

## 18 Risiken vor Merge
1. `/os` darf in Produktion nur mit bewusstem Flag gebaut werden; `NEXT_PUBLIC_OS_PREVIEW=local` **nie** in Deploy-Env (Middleware-Ausnahme greift zwar nur auf localhost, trotzdem Policy: Deploy-Check auf diese Variable).
2. Finance-Tab Profit Center bricht nicht, ist aber live bis zum Core-Deploy „nicht verfügbar“.
3. `FinanceV2Workspace`-Extraktion ändert `apps/finance-v2/index.tsx` strukturell (Einrückung; Logik gleich, Tests grün) – Konfliktpotenzial mit offenem PR #97 (Revolut-Consent), Rebase nötig.
4. `appRegistry`-Länge 29: Tools/Tour (#88), die über die Registry iterieren, sehen `finance-v2` (launcherHidden).
5. Zwei Shells parallel → Doppelpflege, bis entschieden ist, ob `/os` `/` ersetzt.

## 19 Prototype V2 – empfohlene Schritte
1. Core main deployen, dann Finance mit Owner-Sitzung verifizieren → `finance` alt aus Legacy-Shell entfernen (eigener PR).
2. Build-SHA der UI sichtbar machen (Settings › System hat Platz dafür) + Staging-Deploy von `/os`.
3. MÔRA: Streaming (`useMoraStream`) und Tool-Traces (#89) in `MoraConsole`, ConfirmationCard als Ausführungsweg für „prepare“-Vorschläge.
4. Post: Mail-Triage (#54) als `features/post/ui`, Lesen/Antworten im Panel statt altem Fenster.
5. Wissen: Finder-Kern (Ordnerbaum, Vorschau) aus `apps/finder` (3.128 Z.) in `features/knowledge/ui` extrahieren.
6. Heute: Nightwatch-/Aufgaben-Aktionen inline; Realtime → Notification-Service.
7. ESLint-Regel „keine Hex/rgba außerhalb Tokens“ für `features/**`, `components/os-*`.
8. Entscheidung Universe als `atmosphere-universe`-Flag (lazy, ruhig) – Seele behalten, Navigation nicht.
9. Danach: `/` → `/os` umstellen, Legacy-Shell hinter Flag.

## 20 Production Truth (heute geprüft)
Methode: nur öffentliche HTTP GET (`curl`, 07.10.2026 10:09 Berlin) auf hq.saimor.world, ohne Login. `/` 200 · `/login` 200 · `/os` 307 (Middleware-Redirect ohne Sitzung; ob `/os` existiert, ist live nicht ableitbar – Branch ist nicht deployed) · `/api/core/health` 200 healthy, production, build `b564c995` · v3: `finance/state` 401, `finance/records` 401, `finance/sources` 401, `finance/connections` 401, `finance/mora-context` 401, `finance/accounts` 405, **`finance/profit-center` 404**, **`finance/capital-policy` 404**, `today` 401, `chat` 405 (nur POST), `memory/list` 401, `mail/messages` 401, `calendar/events` 401, `integrations/overview` 401, `search/keyword` 405 (nur POST), Kontrolle `doesnotexist` 404 → v3 ist live geladen (kein Totalausfall K4), Finance-Profit-Center-Verträge fehlen weiterhin.
SSH (`~/.ssh/grokbot_saimor`): **nicht genutzt** – Host-Key für hq.saimor.world unbekannt (strict checking), Verbindung hätte eine Änderung (Key akzeptieren) erfordert → gemäß Vorgabe übersprungen.

## 21 Gefundene direkte Agent-Kopplungen in der UI
| Agent | Fundstellen (mora-ui main) | Art |
|---|---|---|
| Larry | `lib/api/larryClient.ts` (`/v3/larry/artifacts`), `lib/queries/useLarryArtifacts.ts`, `components/widgets/registry.tsx` (Larry-Artefakt-Widget), `components/os/shell/MoraShell.tsx:551` (`onOpenLarry`), `lib/api/statsClient.ts`, 15 Dateien gesamt | direkter Daten-Client + Shell-Aktion |
| Nightwatch | `lib/api/nightwatchClient.ts` (`/v3/nightwatch/incidents`, `/monitors`), `apps/nightwatch`, `lib/openflow/nightwatch.ts`, Home-Komponenten; 51 Dateien | eigene App + Heute-Signal (über `/v3/today`) |
| OpenClaw | `lib/estate.ts:9`, `lib/openflow/presentation.ts:14-17` (nur Platzhalter/Copy-Filter) | Benennung, kein Client |
| n8n | `lib/config.ts:17-22` (Webhook-Konfig `n8nEmailDigest` …), `lib/connectors.ts`, `lib/workflowStore.ts` | Konfig/Typen, in App-Code nicht referenziert |
| Hermes | 0 Treffer | – |
Der Prototyp fügt **keine** neue Agent-Kopplung hinzu; MÔRA spricht nur `/v3/chat`.

## 22 Privatsphäre
Diff-Suche nach Pilot-/Kundennamen, gesperrtem Connector-Begriff und Token-/Key-Mustern (`ghp_`, `github_pat`, `sk-…`, `BEGIN … KEY`, Seeds) → 0 Treffer. Beispieldaten generisch (`example.com/.org`).

## 23 V1.1 Universe & Atmosphäre

Rückmeldung Marius: Universe, Hintergrundbild und Vibe bleiben – nur besser. Und: das volle Universe gibt es nur **im Universe**; alle anderen Flächen bekommen denselben Vibe, aber deutlich ruhiger.

**Zwei Atmosphären-Modi (Manifest-Feld `atmosphere`, Default `calm`):**

| Modus | Flächen | Was zu sehen ist |
|---|---|---|
| `calm` | Heute, MÔRA, Finance, Post, Wissen, Einstellungen, Labs | `ShellStaticBackdrop` + dasselbe `deep-space-warm.jpg`, stark weichgezeichnet und abgedunkelt (Filter aus `osAtmosphere.calm`), kräftiger Schleier. **Keine Sterne, keine Bewegung.** Inhalt steht vorn. |
| `universe` | Universe (`#universe`) | Dimmung fällt weg (Bild in voller Stärke, `UniverseAmbientField` aus `UniverseView`), `MoraLivingBackground` (gedämpft), `RitualSceneStyler muted`; `StarField` und `TemporalAtmosphere` werden **per Idle lazy** nachgeladen. |

- Übergang: weiche CSS-Transition (900 ms) auf Filter/Opacity von Bild, Schleier und Ebenen – mit `prefers-reduced-motion` **ohne** Animation (Sprung).
- Bewegung (`StarField`/`TemporalAtmosphere`) nur, wenn `useAmbientCapability` es erlaubt (kein reduced-motion, kein Save-Data) **und** Viewport ≥ 900 px. Mobil: statisches Bild mit Schleier.
- Umsetzung: `components/os-shell/OsAtmosphere.tsx`, Shell setzt `data-atmosphere` am Root.

**Wiederverwendet (keine Kopien):** `ShellStaticBackdrop` (→ `WorldSurface`), `MoraLivingBackground`, `StarField`, `TemporalAtmosphere`, `RitualSceneStyler`, `useAmbientCapability`, `UniverseView` (inkl. `UniverseAmbientField`, `OrganizationField`, Observatory/Ticker), Assets `public/universe/deep-space-warm.jpg`, `public/brand/mora-stone-v1.png`.

**Neu / verbessert:**
- Universe als eigener **Ort**: 2.-Ebene-Navigation „Universe“ (`#universe`, Mobil unter „Mehr“) – die 6 Hauptflächen bleiben. Feature `features/universe` rendert die echte `UniverseView` unter einer schmalen Intro-Leiste (kein Überlappen mehr mit „Woraus Organisation besteht“).
- Karte auf Heute: „Den Raum deines Unternehmens betreten“ → führt ins Universe.
- `MoraStone` (os-kit) aus `mora-stone-v1.png` mit Halo und Denk-Zustand – in Sidebar, Topbar, Mobil-Leiste und Konsole (ersetzt den CSS-Orb).
- Alle Flächen als ruhiges Glas (Blur, Sättigung, Kante, Innenlicht), Sidebar mit Schleier-Verlauf, Display-Schrift leichter/größer (38 px / 300), Marke gesperrt (`.os-brand`, 0.34em).
- Alle Farben aus `osTokens` (`glass*`, `veil*`, `railVeil*`, `stoneHalo*`, `osAtmosphere`); `os-kit.css` enthält kein rgba/hex.

**Zwei Bugfixes in Legacy (wirken auch in der klassischen Oberfläche):**
1. `lib/store/universeFieldStore.ts`: `setField`/`clearField` schreiben nur bei echter Änderung (vorher neues Array/Objekt bei jedem Messen → alle Leser rerendern).
2. `components/home/UniverseView.tsx`: setzt `statsMap`/`folderMoons` ohne Firma nicht mehr bei jedem Lauf auf ein neues `{}` – das war zusammen mit (1) die Render-Schleife (React #185) auf `/#universe` ohne Sitzung.

**Tests V1.1:** `__tests__/components/os-shell/OsUniverse.test.tsx` (Layer ruhig auf Heute, voll im Universe, Heute → Universe, Deep-Link, Nav), `__tests__/components/os-kit/MoraStone.test.tsx`, `__tests__/lib/universeFieldStore.test.ts`; Playwright: Universe-Fläche, Atmosphären-Modi, Heute → Universe ohne Page-Errors.

**Screenshots:** `shots-v1.1/` – `os-{d,m}-{today,mora,finance,knowledge,post,settings,labs,universe}.png`, `os-d-universe-reduced-motion.png`, `compare-d-today-v1-vs-v1.1.png` (V1 flach | V1.1 Heute | V1.1 Universe).

**Grenzen V1.1:** Universe ohne CORE-Sitzung leer (nur Raum + Platzhalter-Kacheln der Legacy-View); Übergang nicht auf schwachen Geräten gemessen; `TemporalAtmosphere` ist bewusst stark gedämpft (soft-light, 14 %), weil sie sonst das Foto überstrahlt.

## 24 V1.2 Universe-Experience

Rückmeldung Marius zu V1.1: „Wo sind die Planeten, die ganze Logik, die ganze Experience dahinter?“ Ohne CORE-Sitzung zeigte die eingebettete Legacy-`UniverseView` nur Überschrift und zwei Kacheln, weil ihre Planeten ausschließlich aus CORE-Abteilungen entstehen.

**Neu: `/os#universe` hat zwei Ansichten desselben Raums**

1. **Landschaft** (Standard, neu): die OS-Bereiche als Planeten um **MÔRA als Kern**.
   - Innerer Ring: Heute (Aufgaben & Termine), Post, Finance. Äußerer Ring: Wissen, Spaces, Verbindungen, Labs & System.
   - Geneigte Umlaufbahnen mit Tiefe (vorne größer, hinten kleiner), sanfte Bahnbewegung (innen im Uhrzeigersinn, außen langsamer dagegen). Sie pausiert beim Hover, im Fokus, bei verstecktem Tab und mit `prefers-reduced-motion`.
   - Planeten als ruhige Kugeln (Licht-Kern → Körper → Terminator, Atmosphärenring), Größe nach Substanz, Satelliten-Monde, Signalpunkt (warn/info). Die Farben kommen aus `osTokens.planet*`.
   - **Stränge** mit dem Beleg-Modell aus `OrganizationField`/`lib/universe/types`: *belegt* (MÔRA → Planet mit Signal, fließend) und *vermutet* (gepunktet, z. B. Post ↔ Finance, wenn Betreffe „Rechnung/Beleg“ enthalten). Ohne Beleg wird kein Strang gezeichnet.
   - **Hover:** Glühen, Bahn hält an, unter dem Namen steht das Signal.
   - **Fokus/Zoom:** Klick zoomt die Kamera auf den Planeten. Die anderen treten zurück, die Monde erscheinen mit Namen auf eigener Bahn, und ein Glas-Detailpanel (Desktop rechts, Mobil als Sheet) zeigt Rolle, Kennzahlen, Signale, Monde, Stränge, **„Bereich öffnen“** (→ passende /os-Fläche; Spaces → Organisationsfeld) und „MÔRA fragen“. Esc oder ✕ führt zurück.
   - **MÔRA-Aufmerksamkeit:** Die Pille „MÔRA schaut auf …“ wählt den wichtigsten Planeten (Warnung vor Info) und fokussiert ihn per Klick. Ein Klick auf den Kern öffnet MÔRA mit Kontext.
   - Mobil: rundere Bahnen, kleinere Planeten, Rollen erst im Fokus, Detail als Sheet. Der Raum bleibt räumlich.
   - Daten: `features/universe/data/useLandscape.ts` über **bestehende Hooks** (`useScopedToday`, `useFinanceSignal`, `useDepartments`, `useRecentMemories`, `useConnectionsOverview`, `LEGACY_APP_PLACEMENT`). In der lokalen Vorschau ohne Sitzung kommen klar markierte Beispieldaten (`Beispiel`-Badge, generische Inhalte). **Finance ist nie Beispiel**: ohne CORE steht dort „nicht belegt“ samt Vertragsstand. Ohne Daten ist ein Planet „unbekannt“ (entsättigt), nicht leer.
   - Modell rein und testbar: `features/universe/data/landscape.ts`.
2. **Organisationsfeld** (Legacy, unverändert eingebettet): die echte `UniverseView`.

**Was aus dem Legacy-Universe zurück ist**

| Legacy-Fähigkeit | Status V1.2 | Wo |
|---|---|---|
| Planeten für Abteilungen, Größe nach Substanz (`territoryDiameter`) | ✅ unverändert im Organisationsfeld; neu: Planeten für OS-Bereiche, Größe nach Substanz | Organisationsfeld / Landschaft |
| Monde (Spaces/Ordner, `groupFoldersByDepartment`, `buildOrbitals`) | ✅ Legacy unverändert; Landschaft: Monde je Planet (Termine, Betreffe, Bereiche, Erinnerungen …) | beide |
| Umlaufbahnen / Bewegung | ✅ neu gebaut (geneigte Ringe, Tiefe, Pause bei Hover/Fokus/reduced-motion) | Landschaft |
| Verbindungen mit Beleg (`buildRelationStrands`, assigned/inferred) | ✅ gleiches Beleg-Modell, auf OS-Bereiche übertragen | Landschaft |
| Fokus/Auswahl eines Planeten + Detail | ✅ Kamera-Zoom + Glas-Detailpanel + „Bereich öffnen“ | Landschaft |
| MÔRA im Feld (`CursorAgent`, `chooseMoraAttention`) | ✅ Legacy unverändert; neu: MÔRA als Kern + Aufmerksamkeits-Pille | beide |
| Signale (Mail, Kalender, Feed, Nightwatch) | ✅ Legacy-Observatory unverändert; Landschaft: Signalpunkte aus Tagesbild/Finance/Verbindungen | beide |
| Observatory / Horizont / Wirtschaft / Nightwatch-Kacheln | ✅ unverändert | Organisationsfeld |
| Fall-Capture (Gegenstand auf Planet ablegen → `intakeIntoDepartment`) | ✅ unverändert, nur mit Sitzung | Organisationsfeld |
| In Abteilung (`DeptSpaceMap`) / Ordner im Finder öffnen | ✅ unverändert | Organisationsfeld |
| „MÔRA fragen“ zu einem Planeten | ✅ beide (Landschaft → MÔRA-Panel der Shell) | beide |
| Atmosphäre (Foto, Sterne, Tageszeit, Szene) | ✅ aus V1.1 | Shell |
| Ticker (`buildTickerItems`) | ⚠️ nicht in der Landschaft; die Aufmerksamkeits-Pille erfüllt den Zweck ruhiger, ein Laufband widerspricht „ruhiges Cockpit“ | – |
| Substanz-Balken (`buildSubstanceBars`) | ⚠️ nur im Organisationsfeld (Observatory); in der Landschaft zeigen Planetengröße und Detail-Kennzahlen dasselbe | Organisationsfeld |
| Hover-Verweilzeiten (`hoverTiming`), Interaktionszonen (`interactionZones`) | ⚠️ nicht übernommen: Die Landschaft hat keine Widget-Spalten, mit denen Hover kollidiert. Stattdessen pausiert die Bahn beim Hover | – |
| Mycelium/NeuralGrid/Fabric-Layout, semantische Ähnlichkeitskanten | ❌ nicht übernommen: experimentell, in der klassischen Shell ebenfalls ausgegraut; Kanten ohne Beleg widersprechen dem Beleg-Prinzip | Legacy (`/`) |
| Onboarding/Ritual-Szenen (`RitualSceneStyler`) | ✅ Szenenfarbe gedämpft (V1.1). ❌ eigener Universe-Onboarding-Rundgang (QuickTips) nicht übernommen, weil er an MoraShell gebunden ist; der Einstieg kommt jetzt über die Heute-Karte und die Aufmerksamkeits-Pille | – |

**Tests V1.2:** `__tests__/features/universe/landscape.test.ts` (Bereich → Ziel, Beispiel-Kennzeichnung, Finance nie Beispiel, Stränge nur mit Beleg, unbekannt ≠ leer, Aufmerksamkeit), `__tests__/features/universe/UniverseLandscape.test.tsx` (Kern, 7 Planeten, Bahnen, Stränge, Fokus → Detail → Bereich öffnen, Esc, reduced-motion), `OsUniverse.test.tsx` angepasst (Landschaft als Standard, Organisationsfeld-Ansicht = Legacy-View). Playwright: Landschaft Desktop (Fokus → Detail → `#post`) und Mobil mit reduced-motion.

**Screenshots:** `shots-v1.2/os-{d,m}-universe-{overview,planet-hover,planet-focused,detail-panel,organisationsfeld}.png`.

**Grenzen V1.2:** Mit echter CORE-Sitzung nicht verifiziert (die Hooks sind dieselben wie auf Heute/Wissen/Einstellungen). Spaces-Monde mit Sitzung = Abteilungsnamen, noch keine Ordner. Planeten-Positionen sind fest (Winkel je Bereich), kein Drag. Das Organisationsfeld bleibt ohne Sitzung leer, und das ist Absicht: Es zeigt nur echte Abteilungen.
