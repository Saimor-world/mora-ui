# Dock Magnetic Hover + ViewPort a11y Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-icon magnetic proximity hover to Dock.tsx and add `prefers-reduced-motion` guard to ViewPort.tsx.

**Architecture:** A `MagneticDockIcon` sub-component (inside Dock.tsx) tracks mouse position via `onMouseMove` + `useSpring(x/y/rotateX/rotateY)`. ViewPort.tsx gets a `useReducedMotion()` guard that collapses all transitions to opacity-only.

**Tech Stack:** Framer Motion (`useSpring`, `useReducedMotion`, `motion`), React `useRef`, existing Dock.tsx + ViewPort.tsx.

---

## Task 1: ViewPort.tsx — prefers-reduced-motion guard

**Files:**
- Modify: `components/layout/ViewPort.tsx:1-10` (imports)
- Modify: `components/layout/ViewPort.tsx:36-143` (each motion.div)

**Step 1: Add `useReducedMotion` import**

Open `components/layout/ViewPort.tsx`. Change line 9:
```tsx
// Before
import { AnimatePresence, motion } from 'framer-motion';

// After
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
```

**Step 2: Add hook inside the component**

After line 25 (`const viewMode = ...`), insert:
```tsx
const prefersReducedMotion = useReducedMotion();
```

**Step 3: Replace transition values for each motion.div**

For all four layer wrappers (core, department, space, folder), replace the `initial`, `animate`, `exit`, and `transition` props with reduced-motion variants.

Pattern — replace every block like:
```tsx
initial={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
exit={{ opacity: 0, scale: 2.85, filter: 'blur(16px)', transition: { duration: 0.35, ... } }}
transition={{ duration: 0.8, ease: [0.6, 0.05, 0, 0.9] }}
```

With conditional:
```tsx
initial={prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
animate={prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
exit={prefersReducedMotion
    ? { opacity: 0, transition: { duration: 0.15 } }
    : { opacity: 0, scale: 2.85, filter: 'blur(16px)', transition: { duration: 0.35, ease: [0.6, 0.05, 0, 0.9] } }}
transition={prefersReducedMotion
    ? { duration: 0.2 }
    : { duration: 0.8, ease: [0.6, 0.05, 0, 0.9] }}
```

Apply the same pattern to the `core` layer's exit (which has `scale: 2.85`) and the `folder` layer's exit (which has `scale: 1.1`).

**Step 4: TypeScript check**

```bash
cd C:/saimor/mora-ui && node_modules/.bin/tsc --noEmit --project tsconfig.json
```
Expected: `EXIT:0` (no output)

**Step 5: Commit**

```bash
git -C C:/saimor/mora-ui add components/layout/ViewPort.tsx
git -C C:/saimor/mora-ui commit -m "a11y(viewport): respect prefers-reduced-motion in layer transitions"
```

---

## Task 2: Dock.tsx — MagneticDockIcon component

**Files:**
- Modify: `components/mora/Dock.tsx`

### What to add

A `MagneticDockIcon` component replaces the existing `motion.button` for each dock item. It:
1. Tracks `onMouseMove` per-icon (self-contained, no shared state)
2. Computes cursor distance from icon center
3. Applies spring `x/y/rotateX/rotateY` proportional to proximity
4. Resets on `onMouseLeave`
5. Falls back to no-op if `prefersReducedMotion`

**Step 1: Add `useSpring` + `useReducedMotion` to framer-motion import**

Find line 4 in `components/mora/Dock.tsx`:
```tsx
// Before
import { motion, AnimatePresence } from 'framer-motion';

// After
import { motion, AnimatePresence, useSpring, useReducedMotion } from 'framer-motion';
```

**Step 2: Add the `MagneticDockIcon` component above `export const Dock`**

Insert after the `DockItem` interface (around line 51), before `export const Dock`:

```tsx
// --- Magnetic Dock Icon ---
interface MagneticDockIconProps {
    item: DockItem;
    isStandardMode: boolean;
    onAction: (action: string) => void;
}

const MAGNETIC_RADIUS = 72; // px — proximity detection range
const MAX_SHIFT = 6;         // px — max x/y displacement
const MAX_TILT = 8;          // deg — max rotateX/Y

const MagneticDockIcon: React.FC<MagneticDockIconProps> = ({ item, isStandardMode, onAction }) => {
    const ref = useRef<HTMLButtonElement>(null);
    const prefersReducedMotion = useReducedMotion();

    const springConfig = { stiffness: 320, damping: 24 };
    const x         = useSpring(0, springConfig);
    const y         = useSpring(0, springConfig);
    const rotateX   = useSpring(0, springConfig);
    const rotateY   = useSpring(0, springConfig);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current || item.disabled || prefersReducedMotion) return;
        const rect = ref.current.getBoundingClientRect();
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < MAGNETIC_RADIUS) {
            const s = 1 - dist / MAGNETIC_RADIUS; // 1 = dead center, 0 = edge
            x.set(dx * s * (MAX_SHIFT / MAGNETIC_RADIUS) * MAGNETIC_RADIUS);
            y.set(dy * s * (MAX_SHIFT / MAGNETIC_RADIUS) * MAGNETIC_RADIUS);
            rotateY.set( dx * s * (MAX_TILT  / MAGNETIC_RADIUS) * MAGNETIC_RADIUS * 0.01);
            rotateX.set(-dy * s * (MAX_TILT  / MAGNETIC_RADIUS) * MAGNETIC_RADIUS * 0.01);
        }
    };

    const resetSprings = () => {
        x.set(0); y.set(0); rotateX.set(0); rotateY.set(0);
    };

    return (
        <motion.button
            ref={ref}
            style={{
                x, y, rotateX, rotateY,
                transformPerspective: 400,
            }}
            className={`p-3.5 rounded-2xl transition-all duration-200 relative group ${
                item.disabled
                    ? isStandardMode
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-white/20 cursor-not-allowed'
                    : item.action === 'memory'
                        ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/15'
                        : isStandardMode
                            ? 'text-gray-600 hover:text-[#0078D4] hover:bg-gray-100'
                            : 'text-white/60 hover:text-emerald-300 hover:bg-emerald-500/10'
            }`}
            onMouseMove={handleMouseMove}
            onMouseLeave={resetSprings}
            whileHover={item.disabled || prefersReducedMotion ? {} : { scale: 1.18 }}
            whileTap={item.disabled   || prefersReducedMotion ? {} : { scale: 0.92 }}
            onClick={() => !item.disabled && onAction(item.action)}
            disabled={item.disabled}
        >
            <item.icon size={26} strokeWidth={1.5} />

            {/* BADGE for pending items */}
            {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-violet-500 text-[10px] text-white font-bold items-center justify-center">
                        {item.badge > 9 ? '!' : item.badge}
                    </span>
                </span>
            )}

            {/* TOOLTIP */}
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[200]">
                <div className={`rounded-lg px-3 py-2 min-w-[120px] text-center shadow-2xl ${
                    isStandardMode
                        ? 'bg-gray-800 border border-gray-700'
                        : 'bg-black/95 backdrop-blur-xl border border-white/10'
                }`}>
                    <div className="text-white text-xs font-medium">{item.label}</div>
                    <div className="text-white/50 text-[10px] mt-0.5">{item.description}</div>
                    {item.shortcut && (
                        <kbd className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono ${
                            isStandardMode ? 'bg-gray-700 text-blue-300' : 'bg-white/10 text-emerald-400'
                        }`}>
                            {item.shortcut}
                        </kbd>
                    )}
                </div>
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
                    isStandardMode
                        ? 'bg-gray-800 border-r border-b border-gray-700'
                        : 'bg-black/95 border-r border-b border-white/10'
                }`} />
            </div>

            {/* ACTIVE DOT */}
            {!item.disabled && (
                <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-colors ${
                    isStandardMode
                        ? 'bg-transparent group-hover:bg-[#0078D4]'
                        : 'bg-emerald-400/0 group-hover:bg-emerald-400'
                }`} />
            )}
        </motion.button>
    );
};
// --- End MagneticDockIcon ---
```

**Step 3: Replace the existing dock items loop with `MagneticDockIcon`**

Find this block in `Dock.tsx` (around line 273–335):
```tsx
{/* CENTER: DOCK APPS - Larger Icons */}
<div className="flex items-center gap-1.5">
    {dockItems.filter(item => !item.hidden).map((item, i) => (
        <motion.button
            key={i}
            className={`p-3.5 rounded-2xl ...`}
            whileHover={...}
            whileTap={...}
            onClick={...}
            disabled={...}
        >
            ...
        </motion.button>
    ))}
</div>
```

Replace with:
```tsx
{/* CENTER: DOCK APPS — Magnetic Icons */}
<div className="flex items-center gap-1.5">
    {dockItems.filter(item => !item.hidden).map((item, i) => (
        <MagneticDockIcon
            key={i}
            item={item}
            isStandardMode={isStandardMode}
            onAction={handleDockClick}
        />
    ))}
</div>
```

**Step 4: TypeScript check**

```bash
cd C:/saimor/mora-ui && node_modules/.bin/tsc --noEmit --project tsconfig.json
```
Expected: `EXIT:0`

**Step 5: Production build**

```bash
cd C:/saimor/mora-ui && npm run build 2>&1 | tail -20
```
Expected: clean output, `EXIT:0`

**Step 6: Commit**

```bash
git -C C:/saimor/mora-ui add components/mora/Dock.tsx
git -C C:/saimor/mora-ui commit -m "feat(dock): magnetic proximity hover — per-icon spring x/y/tilt, prefers-reduced-motion safe"
```

---

## Task 3: Regression verification

**Step 1: Final tsc**
```bash
cd C:/saimor/mora-ui && node_modules/.bin/tsc --noEmit --project tsconfig.json; echo "EXIT:$?"
```
Expected: `EXIT:0`

**Step 2: Final build**
```bash
cd C:/saimor/mora-ui && npm run build 2>&1 | tail -25; echo "EXIT:$?"
```
Expected: all routes listed, `EXIT:0`

**Step 3: Update TEST_REPORT.md**

Append to the "Still Open" section in `docs/TEST_REPORT.md`:
- `Dock: Magnetisches Hover/Tilt` → `✅ Implementiert (MagneticDockIcon, spring stiffness:320 damping:24)`
- `Layer-Transition Zoom+Blur Morph` → `✅ Bereits implementiert in ViewPort.tsx — prefers-reduced-motion Guard ergänzt`

**Step 4: Final commit**
```bash
git -C C:/saimor/mora-ui add docs/TEST_REPORT.md
git -C C:/saimor/mora-ui commit -m "docs: update TEST_REPORT — dock magnetic + viewport a11y complete"
```
