# Design: Dock Magnetic Hover + Layer Zoom/Blur Transitions
**Datum:** 2026-02-28
**Status:** Approved

---

## Feature A — Dock Magnetic Hover

### Ziel
Jedes Dock-Icon reagiert magnetisch auf die Mausposition: nahes Hover zieht das Icon leicht in Richtung des Cursors und kippt es dreidimensional. Fühlt sich wie ein physisches Objekt an.

### Ansatz: Dock-Level Proximity Tracking

Ein einzelner `onMouseMove`-Handler auf dem Dock-Container-`div`. Bei jedem Frame:
1. Cursor-Position relativ zum Dock berechnen
2. Für jedes Icon: Distanz zur Icon-Mitte via `ref.getBoundingClientRect()`
3. `dx/dy` auf `[0, MAX_RADIUS]` normalisieren → `strength` (0.0–1.0)
4. `x/y` Spring-Values aktualisieren: max 6px Shift, `rotateY/rotateX`: max 8°

**Spring-Config:** `stiffness: 300, damping: 22` — schnell genug für "lebendig", gedämpft genug gegen Overshooting.

**Radius:** 80px — Icon reagiert wenn die Maus ≤80px entfernt ist.

**onMouseLeave auf Dock:** Alle Springs zurück auf 0.

**`prefers-reduced-motion`:** Wenn aktiv → keine Springs, kein Tilt, nur normaler Hover.

### Dateien
- `components/mora/Dock.tsx` — einzige Datei, kein neuer State außerhalb

### Nicht in Scope
- Kein "Finder-Dock"-Style Scale-Up der Nachbarn
- Kein Sound

---

## Feature B — L1→L2→L3 Zoom+Blur Morph

### Ziel
Beim Wechsel zwischen den drei Layern (Universe → Department → Space) entsteht ein weiches "Einfliegen": der alte Layer zoomt nach außen weg, der neue zoomt von innen heran. Beides verbunden mit Blur für Tiefeneffekt.

### Ansatz: AnimatePresence + per-Layer motion.div

Der Layer-Dispatcher in `/app/home/page.tsx` (oder äquivalenter Render-Punkt) wird mit `AnimatePresence mode="wait"` umschlossen. Key = `viewLevel` (z.B. `"core" | "department" | "space"`).

**Enter-Animation:**
```
initial: { scale: 0.96, opacity: 0, filter: 'blur(8px)' }
animate: { scale: 1.00, opacity: 1, filter: 'blur(0px)' }
transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }
```

**Exit-Animation:**
```
exit: { scale: 1.04, opacity: 0, filter: 'blur(10px)' }
transition: { duration: 0.25, ease: [0.55, 0, 1, 0.45] }
```

Exit ist schneller als Enter (0.25s vs 0.38s) — das Alte "fällt weg", das Neue "schwebt ein".

**`prefers-reduced-motion`:** Nur `opacity` animieren, kein scale/blur.

### Dateien
- Primär: Wrapper-Komponente `components/mora/LayerTransition.tsx` (neu, ~30 Zeilen)
- Integration: `app/home/page.tsx` oder der Layer-Dispatch-Punkt

### Nicht in Scope
- Keine Richtungs-abhängigen Slides (links/rechts nach Layer-Index)
- Kein shared-layout zwischen Layer-Elementen

---

## Implementierungsreihenfolge

1. `LayerTransition.tsx` erstellen (B — unabhängig, klein)
2. Layer-Dispatch-Punkt finden + `AnimatePresence` einbauen (B)
3. Dock Proximity Tracking implementieren (A — größte Änderung)
4. `tsc --noEmit` + `npm run build`
5. Commit
