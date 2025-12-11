# Universal Navigation Flow (Universe Edition)

## Philosophy
Navigation in SAIMÔR is not about switching pages; it is about **travelling deeper into the universe**.
The user starts at the Galactic Core (Company) and dives into specific Sectors (Departments), Solar Systems (Spaces), and finally lands on surfaces (Folders).

---

## 1. The Zoom Hierarchy (Z-Axis)

### Level 0: The Core (Company View)
*   **Visual:** Rotating Galaxy of Departments. Huge scale.
*   **Scale:** 1.0 (Base)
*   **Action:** Click a Department Planet.
*   **Transition:** Camera accelerates FORWARD (Scale 2.5x), blurring the galaxy as it passes.

### Level 1: Sector (Department View)
*   **Visual:** Giant background Title. Distant stars. Spaces serve as "Solar Systems" orbiting a central gravity well.
*   **Entry:** Fades in from Scale 0.5 (distant) to 1.0.
*   **Action:** Click a Space System.
*   **Transition:** Camera accelerates FORWARD (Scale 2.5x), blurring the sector.

### Level 2: System (Space View)
*   **Visual:** Similar to Sector but "closer". Stars are brighter. Folders act as clusters/constellations.
*   **Entry:** Fades in from Scale 0.5 to 1.0.
*   **Action:** Click a Folder.
*   **Transition:** Camera accelerates FORWARD (Scale 2.5x), blurring the system.

### Level 3: Surface (Folder View)
*   **Visual:** The "ground" level. Network/Mycelium view of Nodes.
*   **Entry:** Fades in from Scale 0.5 to 1.0.
*   **Action:** Open a Node (Detail Panel).
*   **Transition:** Detail Panel slides in from Right (X-axis), overlaying the view.

---

## 2. Navigation State Machine

### Enter (Deep Dive)
*   **Trigger:** `setActiveDepartment(id)`, `setActiveSpace(id)`, `setActiveFolder(id)`.
*   **Animation:**
    *   **Old View:** `Exit { opacity: 0, scale: 2.5, filter: blur(16px) }`
    *   **New View:** `Enter { opacity: 0, scale: 0.5, filter: blur(10px) } → { opacity: 1, scale: 1, filter: blur(0px) }`
    *   **Timing:** 0.8s Cinematic Ease (`[0.6, 0.05, -0.01, 0.9]`).

### Exit (Return to Orbit)
*   **Trigger:** `navigateToCore()`, `navigateToDepartment(id)`, etc.
*   **Animation:** (Currently symmetric/reset).
    *   *Ideal Future State:* Reverse the zoom (Scale 1.0 → 0.5 for Old, Scale 2.5 → 1.0 for New).
    *   *Current Implementation:* Standard fade/reset.

---

## 3. Gestures & Interactions
*   **Hover:** Magnetic Spring (Scale 1.15, Stiffness 400).
*   **Click:** Immediate state change + sound trigger (future).
*   **Scroll:** Pans the Starfield (Parallax).

## 4. Breadcrumbs (The "Context Thread")
Breadcrumbs are not just links; they are coordinates.
Layout: `Home > [Department Name] > [Space Name] > [Folder Name]`
Position: Top Left, integrated into Context Bar.
Behavior: Clicking a parent level triggers the "Return to Orbit" flow.
