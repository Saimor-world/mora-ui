# Aufräum-Inventur — Visual-Layer Konsolidierung (Fundament)

**Stand:** 2026-06-17 · **Methode:** repo-weiter Dead-Import-Scan (Kandidaten `components/**`, Haystack `components + app + apps + lib`, Tests/_archive ausgeschlossen). Keine Template-Literal-/String-Imports im Repo → grep-Ergebnis ist verlässlich. Reine Inventur.

Prinzip (User): **erst aus allem das Beste mitnehmen → EIN Produkt bauen → dann die Reste löschen.** Cluster- und Themen-Rohmaterial ist darum als DEFER markiert, nicht gelöscht.

---

## ✅ Sweep 2 — AUSGEFÜHRT: eindeutiger Junk + Duplikate (28 Dateien)

Nur abgelöste Alt-Plumbing, das tote Organic-UI-Kit, generische tote Primitives und verifizierte Duplikate. Kein Cluster-/Universe-Wert. Verifiziert mit `tsc --noEmit` (grün).

> **Korrektur:** `mora/MoraContextLabel` war im Scan als tot markiert, wird aber von `apps/chat` importiert — von `tsc` gefangen, wieder hergestellt (samt Test). Bleibt **live**.

**Alt-Plumbing / abgelöste UI (7):**
content/NodeViewer · icons/MoraIcons · integrations/GoogleConnect · layout/ContextRail · mora/PhysicsDock · mora/SearchOverlay · operator/OperatorStatusPane

**Totes Organic-UI-Kit (12):**
organic/{ConnectorNode, ContextActionMenu, DataCluster, FileUploadZone, GlobalCommandBar, NavIcon, OrganicInput, OrganicNode, OrganicSidebar, OrganicStatePanel, RoleCard, SpaceSwitcher}

**Generische tote Primitives (5):**
ui/{Breadcrumb, PageSection, PanelCard, SideDrawer, ToastViewport}

**Verifizierte Duplikate (3):**
- `components/user/UserAvatar.tsx` (live: `components/mora/UserAvatar.tsx`)
- `lib/chat/chatStore.ts` (live: `lib/store/chatStore.ts`)
- `lib/roles.ts` (live: `lib/auth/roles.ts` — alle Importer nutzen auth/roles)

**Verwaiste Tests (1):**
- `__tests__/components/layout/ContextRail.navigation.test.tsx`

---

## ⏸ Sweep 1 — offen: Legacy-Panes, abgelöst durch `apps/*` (22 + ~20 Tests)

`PaneManager` lädt Apps über `AppLoader` → `apps/<id>`. Die alten `components/panes/*Pane.tsx` sind die abgelösten Vorgänger — null Live-Imports (auch nicht aus `apps/`). **Live bleiben:** `CompanyDetailPane`, `MoraHubPane`, `BrowserPane`, `WallPane`.

Löschen (nach Test-Abgleich apps/*): ActionCenterPane · AppLibraryPane · CalendarPane · CanvasPane · ChatPane · DocumentPane · FinderPane · GridPane · IntegrationsPane · MailPane · MeineDateienPane · NotesPane · ScannerPane · SearchPane · SettingsPane · TasksPane · TeamPane · TerminalPane · TimelinePane · UsersPane · WebsiteDossierPane · WorkSessionPane

`__tests__/components/panes/*` (21) — außer `WallPane.test.tsx` (bleibt) — testen toten Code. Vor dem Löschen prüfen, ob `apps/*` äquivalente Coverage hat; sonst Test portieren.

---

## ⏸ DEFER — Cluster- & Themen-Rohmaterial (NICHT löschen, erst minen)

Tot, aber Quelle fürs jeweilige Zielprodukt / die genannten Zukunftsthemen.

- **Orb:** `mora/LiquidOrb` · `effects/OrbMessageEffect`  (+ live `mora/PlasmaOrb`, `mora/MoraOrb`)
- **Mycelium / Semantik:** `organic/Mycelium25D` · `organic/MyceliumLayer` · `visual/OrbitalCanvas` · `visual/SemanticConstellation` · `semantic/SemanticLinesRenderer` · `layers/FolderLayer`  (+ live `organic/MyceliumOverlay`, `organic/MyceliumField3D`, `mora/MyceliumDropfield`)
- **Mora-Raum:** `mora/MoraThoughtStream` · `mora/QuickMemoryInput` · `mora/CognitionBadge` · `mora/MoraCommand` · `mora/MoraHint` · `organic/InsightCard` · `home/MemoryWidget` · `ui/MemoryBadge` · `intelligence/SynthesisPanel` · `intelligence/IntelligencePlayfield`
- **Universe-Neudenken:** `home/DepartmentCluster` · `home/layers/{DeepSpaceLayer,MoonLayer,PlanetLayer}` · `orbits/CompanyOrbit` · `spaces/SpaceTileGrid`
- **Boot / Setup:** `organic/BootSequence` + `ui/BootSequence` (Duplikat → mergen + mit echten Daten einsetzen) · `wizards/DepartmentWizard`

---

## Verifikation nach jedem Sweep
`npx tsc --noEmit` grün · `npm test` (bekannte Baseline) · `npm run build` grün. Branch + PR, kein Direkt-Push.
