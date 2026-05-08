# Sprint 1 — Visual Polish (Demo-First Impression)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Den ersten 30 Sekunden in HQ den größtmöglichen „lebt"-Eindruck geben. Drei Bausteine: Mora-Orb-Idle-Breath, Briefing-Stack (max 3 Karten statt 1), First-Run-Tour (3-step Spotlight).

**Architecture:** Reine Frontend-Arbeit in `INTERFACE`. Kein CORE-Touch. Kein neuer Datenkontrakt — alle nötigen Daten existieren bereits in den Stores (`useActivityStore`, `useRadarStore`, `useCommunicationLiveData`).

**Tech Stack:** Next.js 15, Framer Motion, Zustand, Tailwind, lucide-react

---

### Task 1: Mora-Orb Idle-Breath

**Files:**
- Modify: `components/mora/Dock.tsx` (oder wo der Orb gerendert wird — siehe Schritt 1)

- [ ] **Step 1: Orb-Position lokalisieren**

```bash
grep -n "MoraOrb\|LiquidOrb\|orb-glass\|<Orb" C:/saimor/INTERFACE/components/mora/Dock.tsx | head -10
```

Notiere die Komponente die den Bottom-Right Mora-Orb rendert.

- [ ] **Step 2: Atem-Animation hinzufügen**

Wrap das Orb-Element mit:
```tsx
<motion.div
    animate={{ scale: [1, 1.018, 1] }}
    transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
    style={{ transformOrigin: 'center' }}
>
    {/* existing orb */}
</motion.div>
```

Wichtig: 4.2s Duration (Atemrhythmus). Nichts darunter — wirkt sonst nervös.

- [ ] **Step 3: Visual Smoke Test**

```bash
cd C:/saimor/INTERFACE && npm run dev
```

Öffne `http://localhost:3000/home`. Orb sollte ruhig pulsieren — kaum sichtbar, aber spürbar.

- [ ] **Step 4: Commit**

```bash
git add components/mora/Dock.tsx
git commit -m "polish(mora): add idle breath animation to Mora orb"
```

---

### Task 2: Briefing-Stack — 3 Karten statt 1

**Files:**
- Create: `components/home/BriefingStack.tsx`
- Modify: `components/home/HomeSurface.tsx`

Aktuell zeigt HEUTE-Karte nur einen Text („Weiter in X."). Stattdessen: bis zu 3 stapelbare Briefings mit Swipe-Through.

- [ ] **Step 1: Failing Test schreiben**

```typescript
// __tests__/components/home/BriefingStack.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BriefingStack } from '@/components/home/BriefingStack';

const briefings = [
    { id: '1', label: 'Aktivität', title: 'Weiter in Team', detail: 'vor 12 Min.' },
    { id: '2', label: 'Mail', title: '3 ungelesene', detail: 'Letzte vor 2 Std.' },
    { id: '3', label: 'Termin', title: 'Standup um 10', detail: 'in 35 Min.' },
];

it('shows first briefing initially', () => {
    render(<BriefingStack briefings={briefings} />);
    expect(screen.getByText('Weiter in Team')).toBeInTheDocument();
});

it('swipes to next briefing on indicator click', () => {
    render(<BriefingStack briefings={briefings} />);
    const indicators = screen.getAllByRole('button', { name: /Briefing/i });
    fireEvent.click(indicators[1]);
    expect(screen.getByText('3 ungelesene')).toBeInTheDocument();
});

it('handles single briefing without indicators', () => {
    render(<BriefingStack briefings={[briefings[0]]} />);
    expect(screen.queryByRole('button', { name: /Briefing/i })).toBeNull();
});
```

- [ ] **Step 2: Test laufen lassen → FAIL**

```bash
npx jest --no-coverage --testPathPattern="BriefingStack" 2>&1 | tail -10
```

- [ ] **Step 3: BriefingStack-Komponente schreiben**

```tsx
'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Briefing {
    id: string;
    label: string;     // z.B. "Aktivität", "Mail", "Termin"
    title: string;     // z.B. "Weiter in Team"
    detail: string;    // z.B. "vor 12 Min."
    accentColor?: string; // optional override (default: emerald)
}

interface BriefingStackProps {
    briefings: Briefing[];
    autoCycleMs?: number; // default 6000, 0 = disabled
}

export const BriefingStack: React.FC<BriefingStackProps> = ({ briefings, autoCycleMs = 6000 }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const safeIdx = Math.min(activeIdx, briefings.length - 1);
    const active = briefings[safeIdx];

    useEffect(() => {
        if (briefings.length <= 1 || autoCycleMs === 0) return;
        const t = setInterval(() => {
            setActiveIdx((i) => (i + 1) % briefings.length);
        }, autoCycleMs);
        return () => clearInterval(t);
    }, [briefings.length, autoCycleMs]);

    if (!active) return null;
    const accent = active.accentColor ?? 'rgba(52,211,153,0.92)';

    return (
        <div className="relative">
            <AnimatePresence mode="wait">
                <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">{active.label}</div>
                    <h2 className="mt-2 max-w-[28rem] text-[32px] font-light leading-[1.05] tracking-[-0.04em] text-white/92">
                        {active.title}
                    </h2>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[13px] text-white/58">{active.detail}</span>
                    </div>
                </motion.div>
            </AnimatePresence>

            {briefings.length > 1 && (
                <div className="mt-5 flex items-center gap-1.5">
                    {briefings.map((b, idx) => (
                        <button
                            key={b.id}
                            type="button"
                            onClick={() => setActiveIdx(idx)}
                            aria-label={`Briefing ${idx + 1}`}
                            className="h-1 rounded-full transition-all"
                            style={{
                                width: idx === safeIdx ? 28 : 12,
                                background: idx === safeIdx ? accent : 'rgba(255,255,255,0.18)',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
```

- [ ] **Step 4: Test → PASS**

```bash
npx jest --no-coverage --testPathPattern="BriefingStack" 2>&1 | tail -10
```

- [ ] **Step 5: HomeSurface integrieren**

In `components/home/HomeSurface.tsx`, finde den HEUTE-Block (`focusTitle` rendering, ~Zeile 685). Ersetze die Heading + Detail durch:

```tsx
const briefings: Briefing[] = useMemo(() => {
    const items: Briefing[] = [];
    if (overlayRecentActivityItems[0] && !websiteEntryContext) {
        items.push({
            id: 'activity',
            label: 'Aktivität',
            title: `Weiter in ${overlayRecentActivityItems[0].label}`,
            detail: relativeTime(new Date(overlayRecentActivityItems[0].openedAt).toISOString()),
        });
    }
    if (latestMail) {
        items.push({
            id: 'mail',
            label: 'Mail',
            title: latestMail.subject || 'Neue Mail',
            detail: latestMail.from || 'Posteingang',
        });
    }
    if (nextCalendarEvent) {
        items.push({
            id: 'calendar',
            label: 'Termin',
            title: nextCalendarEvent.title,
            detail: nextCalendarEvent.time || nextCalendarEvent.date || 'heute',
        });
    }
    return items.slice(0, 3);
}, [overlayRecentActivityItems, latestMail, nextCalendarEvent, websiteEntryContext]);

// Im JSX, statt <h2>{focusTitle}</h2>:
{briefings.length > 0 ? (
    <BriefingStack briefings={briefings} />
) : (
    <h2 className="mt-3 max-w-[28rem] text-[32px] font-light leading-[1.05] tracking-[-0.04em] text-white/92">
        {focusTitle}
    </h2>
)}
```

Import hinzufügen: `import { BriefingStack, type Briefing } from './BriefingStack';`

- [ ] **Step 6: TS-Check + alle Tests**

```bash
npx tsc --noEmit 2>&1 | grep -E "HomeSurface|BriefingStack" | head -5
npx jest --no-coverage --testPathPattern="__tests__" 2>&1 | tail -10
```

Baseline ~502 passing. Keine Regression.

- [ ] **Step 7: Commit**

```bash
git add components/home/BriefingStack.tsx components/home/HomeSurface.tsx __tests__/components/home/BriefingStack.test.tsx
git commit -m "feat(home): briefing stack — up to 3 cycling briefing cards on HEUTE"
```

---

### Task 3: First-Run Tour (3-Step Spotlight)

**Files:**
- Create: `components/onboarding/FirstRunTour.tsx`
- Create: `lib/onboarding/firstRunStore.ts`
- Modify: `components/os/shell/MoraShell.tsx`

Beim ersten Login (nach der Greeting-Bubble) startet eine nicht-blockierende Tour: 3 Spotlight-Highlights mit kurzem Tooltip — Universe → Mora-Orb → Tageslage.

- [ ] **Step 1: Failing Test schreiben**

```typescript
// __tests__/components/onboarding/FirstRunTour.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FirstRunTour } from '@/components/onboarding/FirstRunTour';

it('shows first step on mount', async () => {
    render(<FirstRunTour />);
    await waitFor(() => {
        expect(screen.getByText(/Universe/i)).toBeInTheDocument();
    });
});

it('advances on next button', async () => {
    render(<FirstRunTour />);
    await waitFor(() => screen.getByText(/Universe/i));
    fireEvent.click(screen.getByRole('button', { name: /weiter/i }));
    expect(screen.getByText(/Mora/i)).toBeInTheDocument();
});

it('persists dismissal to localStorage', async () => {
    render(<FirstRunTour />);
    await waitFor(() => screen.getByText(/Universe/i));
    fireEvent.click(screen.getByRole('button', { name: /überspringen/i }));
    expect(localStorage.getItem('saimor_first_run_tour_v1')).toBe('done');
});
```

- [ ] **Step 2: firstRunStore.ts erstellen**

```typescript
'use client';
const KEY = 'saimor_first_run_tour_v1';

export function isFirstRunTourDone(): boolean {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(KEY) === 'done';
}

export function markFirstRunTourDone(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(KEY, 'done');
}
```

- [ ] **Step 3: FirstRunTour-Komponente erstellen**

```tsx
'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, Activity, ArrowRight, X } from 'lucide-react';
import { isFirstRunTourDone, markFirstRunTourDone } from '@/lib/onboarding/firstRunStore';

interface TourStep {
    id: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    body: string;
    target: { selector: string; offsetX?: number; offsetY?: number };
}

const STEPS: TourStep[] = [
    {
        id: 'universe',
        icon: Compass,
        title: 'Dein Universe',
        body: 'Hier siehst du alle Bereiche und ihre Verbindungen — wie eine Karte deiner Arbeit.',
        target: { selector: '[data-testid="universe-toggle"]', offsetY: -8 },
    },
    {
        id: 'mora',
        icon: Sparkles,
        title: 'Mora hört zu',
        body: 'Der Smaragd-Orb unten rechts ist Mora. Klick drauf oder frag sie was — sie kennt deinen Workspace.',
        target: { selector: '[data-mora-orb]', offsetY: -16 },
    },
    {
        id: 'tageslage',
        icon: Activity,
        title: 'Tageslage',
        body: 'Hier zeigt Mora dir was wirklich wichtig ist — ohne Lärm, nur echte Signale.',
        target: { selector: '[data-tageslage-panel]', offsetX: -16 },
    },
];

const APPEAR_DELAY_MS = 9000; // After greeting bubble dismissed (1.5s + 7s)

export const FirstRunTour: React.FC = () => {
    const [active, setActive] = useState(false);
    const [stepIdx, setStepIdx] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (isFirstRunTourDone()) return;
        const t = setTimeout(() => setActive(true), APPEAR_DELAY_MS);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!active) return;
        const step = STEPS[stepIdx];
        const el = document.querySelector(step.target.selector);
        if (el) {
            setTargetRect(el.getBoundingClientRect());
        } else {
            setTargetRect(null);
        }
    }, [active, stepIdx]);

    const handleNext = () => {
        if (stepIdx < STEPS.length - 1) {
            setStepIdx(stepIdx + 1);
        } else {
            handleDismiss();
        }
    };

    const handleDismiss = () => {
        markFirstRunTourDone();
        setActive(false);
    };

    if (!active) return null;
    const step = STEPS[stepIdx];
    const Icon = step.icon;

    // Card position: prefer right side of target, fallback to center
    const cardLeft = targetRect
        ? Math.min(targetRect.right + 24, window.innerWidth - 360)
        : window.innerWidth / 2 - 160;
    const cardTop = targetRect
        ? Math.max(20, targetRect.top + (step.target.offsetY ?? 0))
        : window.innerHeight / 2 - 100;

    return (
        <AnimatePresence>
            <motion.div
                key={step.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32 }}
                className="fixed inset-0 z-[7500] pointer-events-none"
            >
                {/* Spotlight ring around target */}
                {targetRect && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: [1, 1.04, 1] }}
                        transition={{ scale: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }}
                        className="absolute pointer-events-none rounded-2xl"
                        style={{
                            left: targetRect.left - 8,
                            top: targetRect.top - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                            border: '2px solid rgba(52,211,153,0.62)',
                            boxShadow: '0 0 32px rgba(52,211,153,0.42), inset 0 0 12px rgba(52,211,153,0.18)',
                        }}
                    />
                )}

                {/* Tooltip card */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.12 }}
                    className="absolute pointer-events-auto rounded-[20px] border p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-[24px]"
                    style={{
                        left: cardLeft,
                        top: cardTop,
                        width: 340,
                        background: 'linear-gradient(135deg, rgba(8,20,16,0.94), rgba(4,12,11,0.88))',
                        borderColor: 'rgba(52,211,153,0.30)',
                    }}
                >
                    <div className="flex items-start gap-3">
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{ background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.32)' }}
                        >
                            <Icon size={16} className="text-emerald-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/72">
                                Schritt {stepIdx + 1} von {STEPS.length}
                            </div>
                            <h3 className="mt-1 text-[15px] font-medium text-white/92">{step.title}</h3>
                            <p className="mt-1.5 text-[13px] leading-snug text-white/64">{step.body}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDismiss}
                            aria-label="Überspringen"
                            className="shrink-0 rounded-full p-1 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60"
                        >
                            <X size={12} />
                        </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="text-[11px] uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-white/65"
                        >
                            Überspringen
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/14 border border-emerald-400/32 px-3 py-1.5 text-[12px] font-medium text-emerald-100 transition-colors hover:bg-emerald-500/22"
                        >
                            {stepIdx === STEPS.length - 1 ? 'Fertig' : 'Weiter'}
                            <ArrowRight size={12} />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FirstRunTour;
```

- [ ] **Step 4: Targets im UI mit data-attributes versehen**

In den drei Ziel-Komponenten:
- Universe-Toggle-Button: `data-testid="universe-toggle"` (existiert evtl. schon — checken)
- Mora-Orb-Container in Dock.tsx: `data-mora-orb`
- Tageslage-Panel in HomeSurface.tsx: `data-tageslage-panel` (am `<div className="...rounded-[28px]...">` für Tageslage)

```bash
grep -n "Tageslage\|UNIVERSE\|HOME.*UNIVERSE" C:/saimor/INTERFACE/components/home/HomeSurface.tsx | head -5
```

- [ ] **Step 5: In MoraShell mounten**

```tsx
// Nach <MoraGreetingBubble />:
{!hasFullscreenPane && <FirstRunTour />}
```

Import: `import { FirstRunTour } from '@/components/onboarding/FirstRunTour';`

- [ ] **Step 6: Tests + TS-Check**

```bash
npx jest --no-coverage --testPathPattern="FirstRunTour" 2>&1 | tail -10
npx tsc --noEmit 2>&1 | grep -E "FirstRunTour|MoraShell" | head -5
```

- [ ] **Step 7: Commit**

```bash
git add components/onboarding/FirstRunTour.tsx lib/onboarding/firstRunStore.ts components/os/shell/MoraShell.tsx components/home/HomeSurface.tsx components/mora/Dock.tsx __tests__/components/onboarding/FirstRunTour.test.tsx
git commit -m "feat(onboarding): 3-step first-run tour with smaragd spotlights"
```

---

## Success Criteria

1. Mora-Orb pulsiert ruhig (kaum sichtbar, spürbar) — 4.2s Atemrhythmus
2. HEUTE zeigt bis zu 3 Briefings, wechselt automatisch alle 6s, Indicator-Klick funktioniert
3. First-Run-Tour startet 9s nach Login (nach Greeting-Bubble), 3 Steps, dismiss persistiert
4. Tour erscheint nicht beim 2. Login (localStorage-Flag)
5. Keine TS-Errors, keine Test-Regressionen
6. Bundle-Size-Wachstum < 5%
