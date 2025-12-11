# Pane Ecosystem V2

## Overview
The "Glass Pane" ecosystem has been upgraded to Phase 6 standards, bridging the gap between a 2D Operating System and a 3D Universe.

## The Glass Metaphor
> "Windows into functionality, floating in the void."

Panes are no longer just opaque boxes; they are frosted glass slices of the interface that focus user attention while maintaining context of the "Universe" behind them.

## Key Upgrades (Phase 6.2)
### 1. Active State Management
*   **Focus Awareness**: Panes now track `isActive` state.
*   **Visual Feedback**:
    *   **Active**: Emerald glow border (`rgba(16, 185, 129, 0.3)`) + Enhanced shadow.
    *   **Inactive**: Dimmed border, standard shadow.

### 2. Deep Dive Transitions
*   **Zoom Logic**: The pane system mimics camera depth steps.
*   **Entrance**: Fades in with blur (simulating focusing a lens).
*   **Exit**: Scales down to `0.85` (simulating the camera pulling back/zooming out).

### 3. Orchestration Strategy
*   **Full-Screen Views (Space/Folder)**:
    *   `isActive={false}` implies "Ambient" mode.
    *   `disableAnimations={true}` defers transition logic to the parent `ViewPort`, preventing double-animation glitches.
*   **Modal/Detail Views (Nodes)**:
    *   `isActive={true}` implies "Focused" mode.
    *   Full entry/exit animations enabled.

### 4. Technical Specifications
*   **Base Component**: `GlassPanel.tsx`
*   **Default Blur**: `20px` (High privacy/separation).
*   **Ambient Blur**: `15px` (For semi-transparent overlays like SpaceLayer).
*   **Opacity**: `0.85` - `0.9`.

## Usage Guidelines
*   **Node Detail**: Use `GlassPanel` with `width={800}`.
*   **Space/Folder**: Use `GlassPanel` with `width="full"`, `disableAnimations={true}`.
*   **Dock**: Independent glass surface (Bottom-center).
