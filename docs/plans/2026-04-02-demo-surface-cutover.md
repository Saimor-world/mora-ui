# Demo Surface Cutover

Stand: 2. April 2026

## Entscheidung

`hq.saimor.world` wird ab jetzt als **oeffentliche Demo-Instanz** behandelt.

Das ist **nicht** die kuenftige Produktwahrheit fuer Kundeninstanzen.

Zielmodell:

- `www.saimor.world` = Website
- `owner.saimor.world` = Owner Console
- `hq.saimor.world` = Demo / Showcase
- private interne Instanz = echtes internes SAIMOR-HQ
- Kundeninstanz = eigene Single-Company-Instanz

## Was in diesem Slice bereits umgesetzt wurde

- neues Surface-Profil fuer `hq.saimor.world`
- Demo-Surface blendet globale Mehrkontext-Signale im Shell-Chrome zurueck
- `Workspace`-Tab im oberen Chrome wird auf Demo-Surface als `Demo` gezeigt
- globale Kontextwechsel im oberen Chrome werden auf Demo-Surface unterdrueckt
- Dock und rechte Rail zeigen auf Demo-Surface nicht mehr `2 Firmenkontexte`, sondern `Demo-Instanz`
- Shell-Kontext beschreibt das Universe auf Demo-Surface als kuratierte Demo statt als allgemeine Produktinstanz

Betroffene Dateien:

- `lib/os/surfaceProfile.ts`
- `lib/hooks/useSurfaceProfile.ts`
- `lib/os/shellContext.ts`
- `components/os/shell/MoraShell.tsx`
- `components/home/UniverseControls.tsx`
- `components/mora/Dock.tsx`
- `components/os/MoraPulsePanel.tsx`

## Prioritaeten fuer die naechsten Slices

### P1

- globale Owner/Demo/Firmen-Switcher weiter reduzieren
- Demo-Einstieg klar als Demo markieren, nicht als Produktstandard
- `Workspace` als dominanter Produktbegriff aus Kundenpfaden herausziehen
- Demo-Reset aus normalen Settings isolieren

### P2

- sichtbare `Tenant`-/`Instance`-Identifier aus Kunden-UX entfernen
- Admin-/Owner-Begriffe weiter sauber zwischen HQ und Owner Console trennen
- `Control Center` sprachlich fuer reine Kundeninstanzen ueberpruefen

## Inventur aus dem Parallelagenten

### Nur fuer Demo erlaubt

- `WelcomeScreen.tsx`: Quick Demo / Simple Coffee Group erkunden
- `ContextRail.tsx`, `UniverseControls.tsx`, `MoraShell.tsx`: expliziter Demo-Modus
- `ResonanceRoom.tsx`, `Dock.tsx`, `OwnerOrbit.tsx`, `MoraPlayground.tsx`: Demo-/Sandbox-Badges
- `SettingsPane.tsx`: kompletter Demo-Reset

### Soll aus Kundeninstanzen verschwinden

- `AdminHome.tsx`, `AdminModeSwitcher.tsx`, `AdminRosterView.tsx`: Workspace-Admin / HQ / Owner-Console-Leaks
- `UniverseView.tsx`, `ContextRail.tsx`: sichtbare Tenant-/Instance-Identifier
- `UniverseControls.tsx`, `Dock.tsx`, `Spotlight.tsx`: globale Mehrkontext-/Company-Switcher
- `WelcomeScreen.tsx`, `ContextRail.tsx`, `SettingsPane.tsx`: Demo-Einstieg und Demo-Reset

### Bitte vorerst nicht parallel anfassen

Claude-Hotzone:

- `HomeSurface.tsx`
- `FinderPane.tsx`
- `GridPane.tsx`
- `SearchPane.tsx`
- `DocumentPane.tsx`
- `AppLibraryPane.tsx`
- `CalendarPane.tsx`
- `MailPane.tsx`
- `UsersPane.tsx`
- `IntegrationsPane.tsx`
- `TeamPane.tsx`
- `SpacePane.tsx`
- `CompanyDetailPane.tsx`
- `TerminalPane.tsx`
- `NotesPane.tsx`
- `WorkSessionPane.tsx`
- `ScannerPane.tsx`
- `MeineDateienPane.tsx`
- `components/ui/*`

## Rule of Thumb

Bei jeder UI-Entscheidung zuerst fragen:

1. Ist das nur fuer die Demo gut?
2. Ist das auf einer Single-Company-Kundeninstanz noch sinnvoll?
3. Leakt hier gerade internes Plattformwissen in die Produktoberflaeche?
