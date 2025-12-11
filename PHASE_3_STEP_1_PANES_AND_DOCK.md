# PHASE 3 - STEP 1: Pane System & Dock Implementation
**Status:** COMPLETE
**Date:** 2025-12-10

## 1. Overview
The basic **Pane System** and **Dock Integration** have been implemented. The application now supports a windowed interface managed by `paneStore`, running independently of the underlying Universe simulation.

## 2. Changes Implemented

### New Components
*   **`components/mora/PaneManager.tsx`**: The central orchestrator that renders active panes over the Universe view. Handles z-indexing and mounting/unmounting.
*   **`components/panes/SettingsPane.tsx`**: A functional "Settings" pane stub using `GlassPanel`.
*   **`components/panes/AppLibraryPane.tsx`**: A functional "App Library" pane stub using `GlassPanel`.

### Modified Components
*   **`components/mora/Dock.tsx`**:
    *   Integrated `usePaneStore`.
    *   Wired **Settings** icon to open/restore `SettingsPane`.
    *   Wired **Apps** icon to open/restore `AppLibraryPane`.
    *   Implemented **Minimized Pane Area** to show icons for minimized panes (distinct from minimized nodes for now).
    *   Clicking a minimized pane icon restores it.
*   **`components/layout/MoraShell.tsx`**:
    *   Injects `<PaneManager />` into the render tree (Layer `z-[100]`).
    *   Ensures panes float above the Universe but below the Dock and top-level toasts.

### Store Usage
*   **`lib/store/paneStore.ts`** is now the source of truth for all "Window" state.
*   **`lib/store/moraState.ts`** remains the source of truth for Universe state (Universe/Dept/Space/Folder active IDs).

## 3. How It Works

### Opening a Pane
When you click **Settings** in the Dock:
1.  Dock calls `paneStore.getPane('settings-pane')`.
2.  If missing, it calls `addPane(...)` with initial config.
3.  `PaneManager` detects the new pane and renders `<SettingsPane />`.
4.  If existing but minimized, it calls `restorePane(...)`.
5.  If existing and visible, it calls `focusPane(...)` to bring to front.

### Minimizing
1.  Clicking "Minimize" (-) on a `GlassPanel` calls `paneStore.minimizePane(id)`.
2.  `PaneManager` unmounts the component (triggering exit animation).
3.  `Dock` detects `pane.minimized === true` and renders a specialized icon in the minimized area.

### Stacking (Z-Index)
1.  `GlassPanel` receives `zIndex` from `paneStore`.
2.  Clicking a pane triggers `onFocus`, calling `focusStore(id)`.
3.  `paneStore` increments global `nextZIndex` and updates the focused pane.

## 4. Manual Test Script

Run this script to verify the implementation:

### TEST 1: Open Settings
*   **Action:** Click the "Settings" (Gear) icon in the Dock.
*   **Expected:** The Settings Pane appears centered on screen with a glass effect. It is draggable.

### TEST 2: Minimize Pane
*   **Action:** Click the "Minus" (-) button in the top-right header of the Settings Pane.
*   **Expected:** The pane disappears (animates out). A new "Settings" icon appears in the right-side "minimized area" of the Dock.

### TEST 3: Restore Pane
*   **Action:** Click the minimized Settings icon in the Dock.
*   **Expected:** The Settings Pane reappears in its last position. The minimized icon disappears from the Dock.

### TEST 4: Open App Library & Stacking
*   **Action:** Open Settings Pane. Then click "Apps" (Grid) icon in the Dock.
*   **Expected:** App Library pane opens *on top* of Settings Pane.
*   **Action:** Click on the Settings Pane (background).
*   **Expected:** Settings Pane comes to the front (higher z-index).

### TEST 5: Legacy Universe Safety
*   **Action:** Click "Home" in Dock or navigate through standard Universe hierarchy (Planets/Moons).
*   **Expected:** Universe navigation works exactly as before. Panes float *above* the universe and do not interfere with 3D navigation.

## 5. Known Limitations (Step 1)
*   **Persistence:** Panes reset when page reloads (by design for now).
*   **Positioning:** All new panes open in the center (`0,0`). Dragged positions are stored in local component state (`GlassPanel`), so closing and reopening resets position. Minimizing/Restoring *preserves* state in `paneStore` (if we mapped it back, but currently `GlassPanel` manages its own drag delta). *Note: Step 1 scope accepted this limitation.*
*   **Types:** Only 'settings' and 'document' (as generic) types are fully wired.

## 6. Next Steps (Step 2 Preview)
*   **Universe Navigation Stabilization:** Fix TypeScript errors in DepartmentLayer.
*   **View Transitions:** Refine the deep zoom effect.
