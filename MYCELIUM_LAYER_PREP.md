# Mycelium Layer v1 (Preparation)

## Overview
The **Mycelium Layer** is the connective tissue of the Môra UI. In its final form (Phase F), it will be a 3D force-directed graph representing the semantic relationships between all knowledge nodes.

For **Phase E**, we are implementing a **2D visual precursor**. This layer acts as a subtle, organic background overlay that reacts to system events, symbolizing the "living" nature of the knowledge base.

## Architecture

### 1. Visual Component (`MyceliumOverlay`)
- **Type**: 2D Canvas / SVG Overlay
- **Position**: Fixed, z-index between background and content (or top-level with `pointer-events: none`).
- **Style**:
  - Organic, neural-like strands or particles.
  - "Forest & Gold" palette (Emerald-900 to Mora-Gold).
  - Low opacity, ambient motion.

### 2. Event Reactivity
The layer listens to "Pulse" events from the application state (even if simulated for now).

- **Heartbeat**: A constant, slow rhythmic pulse (breathing).
- **Semantic Event**: When a node is created/updated, a "shimmer" travels across the overlay.
- **Awareness Input**: Mouse movement or interaction triggers local "ripples".

## UI Philosophy
> "The interface is not a tool, but an environment."

- **Organic**: Avoid rigid grids where possible; use fluid motion.
- **Alive**: The system should never be perfectly static.
- **Calm**: Animations must be slow and subtle, never distracting.

## Implementation Plan (Phase E)
1.  **`MyceliumOverlay.tsx`**: A React component using HTML5 Canvas for performance.
2.  **Integration**: Placed in the main layout to persist across navigation.
3.  **Triggers**:
    - `useEffect` hooks listening to `activeNode` changes to trigger shimmers.
    - Mouse move event listeners for ripples.

## Future (Phase F)
- Transition to Three.js / R3F.
- Real-time force-directed graph.
- Semantic clustering based on vector embeddings.
