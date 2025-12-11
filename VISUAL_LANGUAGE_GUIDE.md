# Visual Language Guide (Universe Edition)

## Core Principles
1.  **Tactile Glass:** Surfaces are not just transparent; they have texture (noise), weight (borders), and depth (shadows).
2.  **Living Silence:** The UI breeds life (breathing orb, drifting nebulas) but remains silent/calm until interacted with.
3.  **Cinematic Depth:** We use the Z-axis for context. Things don't slide; they zoom.

---

## 1. Materials & Textures

### `bg-noise`
*   **Usage:** All glass panels, Department backgrounds, Planet surfaces.
*   **Implementation:** CSS Class with SVG Data URI. 5% Opacity. Mix-Blend-Overlay.
*   **Purpose:** Prevents "flatness" on digital screens. Gives "frosted aerogel" look.

### `GlassPanel`
*   **Base:** `rgba(3, 8, 6, 0.7)` (Dark Emerald/Black).
*   **Blur:** `backdrop-filter: blur(12px-20px)`.
*   **Border:** Multi-layer technique:
    *   Inner: `white/10` (Highlight).
    *   Outer: Gradient `white/20` (top) to `black/40` (bottom).

---

## 2. Typography

### Headings (Universe Titles)
*   **Font:** Sans-serif (Inter/Geist).
*   **Weight:** Thin (`font-thin`).
*   **Size:** Huge (120px - 140px).
*   **Color:** `white/[0.04]` (Barely visible watermark).
*   **Kerning:** Wide (`tracking-[0.25em]`).
*   **Position:** Absolute Center, Z-index 0 (Background).

### Body & Labels
*   **Primary:** `white/90` (High readability).
*   **Secondary:** `white/50` (Metadata).
*   **Accent:** `emerald-400` (Active/Success).

---

## 3. Motion Physics

### "The Breath" (Idle State)
*   **Target:** Orb, Important Buttons.
*   **Keyframes:** `scale: [1, 1.02, 1]`.
*   **Timing:** 4s - 6s loop.
*   **Ease:** `easeInOut`.

### "The Dive" (Transition)
*   **Target:** Viewport Layers.
*   **Values:** Zoom 2.5x, Blur 16px.
*   **Curve:** Cinematic Ease-In (`[0.6, 0.05, -0.01, 0.9]`).

### "The Spring" (Hover)
*   **Target:** Dock Icons, Space Stars.
*   **Config:** `type: "spring", stiffness: 400, damping: 10`.
*   **Effect:** Snappy, responsive, "magnetic".

---

## 4. Particles & Atmosphere

### Starfields
*   **Construction:** HTML `div`s (not canvas).
*   **Animation:** CSS `@keyframes twinkle { opacity: 0.3 -> 1.0 -> 0.3 }`.
*   **Density:** ~50 stars per view.

### Nebulas
*   **Layers:** 3 distinct radial gradient layers.
*   **Motion:** Independent drift (x, y) + Pulse (scale/opacity).
*   **Color:** Deep Emerald (`#10b981`), Cyan, Void Black.

### Cursor Stardust
*   **Emitter:** Mouse cursor.
*   **Particle:** `div` with `blur(1px)`.
*   **Life:** 0.8s fade out.
*   **Scatter:** Random X/Y jitter (+/- 20px).
