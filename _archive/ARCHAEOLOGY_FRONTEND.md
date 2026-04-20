# MORA-UI ARCHAEOLOGY REPORT
## Audit Update (2026-02-25)

Latest frontend sweep confirmed:

- Runtime-critical shell stack is active and wired (`MoraShell`, `Dock`, `MemorySidebar`, shortcuts, focus/snapping).
- Layer-3 flow is now implemented in main path:
  - Department moon click drills directly to Space layer.
  - Space layer shows orbit-focused folder layout.
- Unused/legacy artifacts still present:
  - `components/home/layers/MoonLayer.tsx` (no imports)
  - `components/home/layers/DeepSpaceLayer.tsx` (no imports)
- `PhysicsDock` was previously imported but not rendered in `app/page.tsx`; unused import is removed.

### Current classification refresh

#### Active (keep)
- `components/os/shell/MoraShell.tsx`
- `components/mora/Dock.tsx`
- `components/layers/{DepartmentLayer,SpaceLayer,FolderLayer}.tsx`
- `components/os/{MemorySidebar,FocusMode,NotificationCenter,QuickPreview,SnapPreview}.tsx`

#### Unclear (review)
- `components/mora/{MoraIntelligenceBar,MoraThoughtStream}.tsx` (exists, but shell notes indicate cleanup/removal)
- `components/mora/PhysicsDock.tsx` (component exists, currently not used in primary app flow)

#### Legacy candidates
- `components/home/layers/MoonLayer.tsx`
- `components/home/layers/DeepSpaceLayer.tsx`

### Immediate UX verification tasks (Claude)

1. Validate live Layer-3 interaction on `hq.saimor.world`:
   - Core -> Department -> Moon -> Space layer (direct)
   - Folder click -> Folder layer.
2. Confirm no regressions in pane focus/hotkeys/memory save flow.
3. If stable, open cleanup PR to archive/remove unreferenced layer files.
4. Record screenshots and network evidence in `saimor-ops/docs/TEST_REPORT.md`.

> **Datum:** 2026-02-06
> **Von:** Local-Claude
> **Für:** SAIMOR Team

---

## ZUSAMMENFASSUNG

| Kategorie | Dateien | Status |
|-----------|---------|--------|
| **Aktiv genutzt** | ~120 | 🟢 Behalten |
| **Unklar/Minimal** | ~15 | 🟡 Review nötig |
| **Legacy/Unused** | ~8 | 🔴 Kann weg |

**Gesamtstatistik:**
- 141 Component Files (32,716 LOC)
- 78 Lib Files (10,959 LOC)
- 18 Custom Hooks
- 176 console.log Statements (sollten reduziert werden)

---

## 🟢 AKTIV GENUTZT (Behalten!)

### Core Components
| Ordner | Dateien | Beschreibung |
|--------|---------|--------------|
| `mora/` | 17 | MoraOrb, Dock, Command, Spotlight, ResonanceRoom |
| `organic/` | 15 | MyceliumOverlay, OrganicInput, SpaceSwitcher |
| `panes/` | 14 | FinderPane, ChatPane, TimelinePane, SettingsPane |
| `ui/` | 13 | Modals, Cards, Toast, Greeting, Stats |
| `visual/` | 5 | StarField, ForestLightCanopy, SemanticConstellation |
| `home/` | 6 | UniverseView, DepartmentCluster |
| `os/` | 2 | **MoraShell** (KRITISCH - Root Component!) |
| `auth/` | 3 | WelcomeScreen, OnboardingWizard, LockScreen |
| `layout/` | 3 | ViewPort, ContextRail, UserCursor |

### Core Libraries
| Ordner | Dateien | Beschreibung |
|--------|---------|--------------|
| `api/` | 14 | coreClient, moraAgentClient, semanticClient |
| `store/` | 5 | moraState, paneStore, dockStore (KRITISCH) |
| `hooks/` | 13 | useAuthBootstrapper, useUser, useConnectionStatus |
| `types/` | 5 | Core TypeScript definitions |

---

## 🟡 UNKLAR / MINIMAL GENUTZT (Review nötig)

### Components
| Datei | Grund | Empfehlung |
|-------|-------|------------|
| `integrations/GoogleConnect.tsx` | OAuth Flow unvollständig | Später fertig machen oder archivieren |
| `integrations/CalendarIntegration.tsx` | Importiert aber nicht aktiv | Behalten für Phase 4 |
| `integrations/EmailIntegration.tsx` | Nur Day 1 Onboarding | Behalten für Phase 4 |
| `visual/NeuralGrid.tsx` | Definiert, selten genutzt | Behalten (nice-to-have) |
| `visual/OrbitalCanvas.tsx` | Definiert, selten genutzt | Behalten (nice-to-have) |
| `operator/OperatorStatusPane.tsx` | Sekundäres UI | Behalten |
| `panes/MailPane.tsx` | Minimal implementiert | Behalten für Phase 4 |
| `panes/NotesPane.tsx` | Minimal implementiert | Behalten |
| `panes/TerminalPane.tsx` | Power User Feature | Behalten |

### Hooks (0 Grep Usage - nie referenziert)
| Hook | Status | Empfehlung |
|------|--------|------------|
| `usePresence.ts` | Definiert, nicht importiert | 🟡 Prüfen ob noch geplant |
| `useAutonomousCognition.ts` | 0 Usage | 🔴 Archivieren |
| `useDemoFlow.ts` | 0 Usage | 🔴 Archivieren |
| `useOrbitalPhysics.ts` | 0 Usage | 🔴 Archivieren |
| `useOrbitalAnimation.ts` | 0 Usage | 🔴 Archivieren |

---

## 🔴 LEGACY / KANN WEG

### Definitiv archivieren/löschen:

| Datei/Ordner | Grund | Aktion |
|--------------|-------|--------|
| `components/debug/EventsViewer.tsx` | Dev-only Panel (Shift+E) | → `_archive/` |
| `components/folder/FolderRoom.tsx` | **ORPHANED** - nie importiert! | → Löschen |
| `lib/data/` | **LEERER ORDNER** | → Löschen |
| `hooks/useAutonomousCognition.ts` | 0 Usage | → `_archive/` |
| `hooks/useDemoFlow.ts` | 0 Usage | → `_archive/` |
| `hooks/useOrbitalPhysics.ts` | 0 Usage | → `_archive/` |
| `hooks/useOrbitalAnimation.ts` | 0 Usage | → `_archive/` |

---

## CODE QUALITY ISSUES

### TODOs (4 gefunden)
```
lib/utils/logger.ts:35  - "TODO: Send to monitoring service in production"
lib/utils/logger.ts:52  - "TODO: Send to monitoring service (Sentry, etc.)"
components/mora/MoraCommand.tsx - "TODO: Company navigation"
components/panes/FinderPane.tsx - "TODO: Create subfolder API"
```

### Console.log Cleanup
- **176 console.log Statements** gefunden
- Sollten durch `logger.ts` ersetzt werden
- Oder in Production entfernt werden

---

## CLEANUP SCRIPT

```bash
# 1. Legacy archivieren
mkdir -p mora-ui/_archive/legacy-hooks
mv lib/hooks/useAutonomousCognition.ts _archive/legacy-hooks/
mv lib/hooks/useDemoFlow.ts _archive/legacy-hooks/
mv lib/hooks/useOrbitalPhysics.ts _archive/legacy-hooks/
mv lib/hooks/useOrbitalAnimation.ts _archive/legacy-hooks/

# 2. Debug archivieren
mkdir -p mora-ui/_archive/debug
mv components/debug/EventsViewer.tsx _archive/debug/

# 3. Orphaned löschen
rm components/folder/FolderRoom.tsx
rm -rf lib/data/

# 4. Leere Ordner aufräumen
find . -type d -empty -delete
```

---

## FAZIT

**mora-ui ist relativ sauber!**

Nur ~8 Dateien sind wirklich Legacy. Der Rest ist entweder aktiv oder "nice-to-have" für zukünftige Features.

**Hauptprobleme:**
1. 5 ungenutzte Hooks → Archivieren
2. 1 orphaned Component (FolderRoom) → Löschen
3. 1 leerer Ordner (lib/data/) → Löschen
4. 176 console.logs → Cleanup
5. 4 TODOs → Irgendwann fixen

**Kein Voice/Twilio/n8n Legacy im Frontend gefunden!** Das ist alles im Backend (saimor-core).
