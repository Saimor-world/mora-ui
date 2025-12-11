# ViewLevel Hierarchy V3

## Overview
The SAIMÔR Hierarchy (V3) refines the navigation flow from the Core (Universe Root) down to the atomic Node. The goal is "Seamless Cognitive Continuity."

## The Hierarchy Stack
1.  **CORE (Orbit)**: High-level overview. All Departments visible.
2.  **DEPARTMENT (Galaxy)**: Focused sector. Spaces orbiting a central sun.
3.  **SPACE (Solar System)**: Organized collection. Folders as constellations.
4.  **FOLDER (Nebula)**: Dense data cluster. Nodes as stardust.
5.  **NODE (Atom)**: The fundamental unit. detailed content view.

## Navigation Transitions (Phase 6.3)
### The "Deep Dive"
*   **Direction**: Inward (Zoom In).
*   **Visuals**:
    *   Current View: Scales up (2.5x) and blurs (16px) -> Dissolves.
    *   Next View: Fades in from background (Scale 0.9 -> 1.0).
*   **Trigger**: Clicking a Department, Space, or Folder.

### The "Return Orbit"
*   **Direction**: Outward (Zoom Out).
*   **Visuals**:
    *   Current View: Scales down (0.85x) and fades out.
    *   Previous View: Restores from blur (Scale 1.1 -> 1.0).
*   **Trigger**: Back Button, Breadcrumb Navigation.

## Breadcrumb Strategy
*   **Location**: Top-Left (`IntelligenceContextBar`).
*   **Format**: `Home / [Department] / [Space] / [Folder]`.
*   **Behavior**:
    *   Clicking a segment triggers the "Return Orbit" sequence to that specific level.
    *   Segments are strictly hierarchical (no cross-linking in the bar).

## Technical Implementation
*   **Orchestrator**: `components/layout/ViewPort.tsx`
*   **Animation Engine**: `framer-motion` (`AnimatePresence` with `mode="wait"` or overlapping keys).
*   **Glass Panel Integration**: Inner panels disable their own animations to prevent conflict with the ViewPort's global camera moves.
