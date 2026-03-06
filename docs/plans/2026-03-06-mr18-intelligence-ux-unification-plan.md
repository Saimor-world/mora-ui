# MR18 Intelligence UX Unification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify Mora's context display across Intel Bar, Memory Sidebar, and Mora Hub so all three surfaces answer the same four questions from a single normalized hook.

**Architecture:** Create `useMoraContext()` (normalization-only, reads `moraState`) and `<MoraContextChip />` (shared display component). Wire both into the three surfaces. No new store, no new API calls. Backend provenance fields degrade gracefully to null until Codex ships `answer_source` in the stream contract.

**Tech Stack:** Next.js 15, TypeScript strict, Zustand (`moraState`), Tailwind CSS, Lucide icons. **No Framer Motion** added to new components — CSS transitions only.

**Prerequisite:** MR17 at `78c0675` must be landed. Working directory: `mora-ui/`.

**Design doc:** `docs/plans/2026-03-06-mr18-intelligence-ux-unification-design.md`

---

## Quick Reference: Files Touched

| Task | File | Action |
|------|------|--------|
| 1 | `lib/store/moraState.ts` | Extend `LastChatScopeState` + `setLastChatScope` |
| 2 | `lib/mora/useMoraContext.ts` | **Create** normalization hook |
| 3 | `components/mora/MoraContextChip.tsx` | **Create** shared chip component |
| 4 | `components/mora/MoraIntelligenceBar.tsx` | Replace scope text block with chip |
| 5 | `components/os/MemorySidebar.tsx` | Add context header row |
| 6 | `components/panes/MoraHubPane.tsx` | Add chip to overview; freshness to stats |
| 7 | (all above) | TypeScript verify + smoke check |

---

## Task 1: Extend `LastChatScopeState` with timestamp

**Files:**
- Modify: `lib/store/moraState.ts:86-91` (interface) and `:443` (setter)

The `updatedAt` field lets surfaces show freshness without a new API call. It is stamped in `setLastChatScope` at the moment the stream frame arrives.

**Step 1: Add `updatedAt` to the interface**

Find this block at line 86:
```typescript
export interface LastChatScopeState {
    resolved_scope: Record<string, string | undefined>;
    scope_policy: string;
    scope_enforced: boolean;
    scope_contract?: ScopeContract;
    ui_scope_hints?: UiScopeHints;
}
```

Replace with:
```typescript
export interface LastChatScopeState {
    resolved_scope: Record<string, string | undefined>;
    scope_policy: string;
    scope_enforced: boolean;
    scope_contract?: ScopeContract;
    ui_scope_hints?: UiScopeHints;
    updatedAt?: string;  // ISO timestamp — set by setLastChatScope, not by backend
}
```

**Step 2: Stamp timestamp in the setter**

Find line 443:
```typescript
    setLastChatScope: (scope) => set({ lastChatScope: scope }),
```

Replace with:
```typescript
    setLastChatScope: (scope) => set({
        lastChatScope: scope ? { ...scope, updatedAt: new Date().toISOString() } : null
    }),
```

**Step 3: Type-check**

```bash
cd /path/to/mora-ui && npm run verify:types
```
Expected: no errors (this is an additive interface extension).

**Step 4: Commit**

```bash
git add lib/store/moraState.ts
git commit -m "feat(mr18): stamp updatedAt on lastChatScope in setLastChatScope"
```

---

## Task 2: Create `useMoraContext()` hook

**Files:**
- Create: `lib/mora/useMoraContext.ts`

This hook is the single normalization point. It reads from `moraState` and `useMemoryPendingCount`. It does NOT fetch. It does NOT mutate state. Every field that requires a future backend signal degrades to `null`.

**Step 1: Create the file**

```typescript
// lib/mora/useMoraContext.ts
"use client";

import { useMemo } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { useMemoryPendingCount } from '@/lib/hooks/useMemoryPendingCount';
import type { OrbState } from '@/lib/api/awarenessClient';

// ─── Contract ───────────────────────────────────────────────────────────────

export interface MoraContextSnapshot {
    // Active scope
    scopeLevel: 'global' | 'company' | 'department' | 'space' | 'folder';
    scopeLabels: {
        company?: string;
        department?: string;
        space?: string;
        folder?: string;
    };
    scopeEnforced: boolean;
    scopeReason: string | null;
    scopeDroppedFields: string[];

    // Runtime state
    orbState: OrbState;
    isOffline: boolean;

    // Memory state
    memoryPendingCount: number;
    memoryFactCount: number;

    // Freshness
    lastScopeUpdateAt: string | null;
    lastScopeSource: 'stream' | 'local' | null;

    // Answer provenance — null until backend sends answer_source in StreamFrame
    lastAnswerSource: 'memory' | 'context' | 'inference' | null;
    lastAnswerScopeLabel: string | null;
}

// ─── Scope level derivation ─────────────────────────────────────────────────

function deriveScopeLevel(
    resolved: Record<string, string | undefined> | undefined
): MoraContextSnapshot['scopeLevel'] {
    if (!resolved) return 'global';
    if (resolved.folder_id) return 'folder';
    if (resolved.space_id) return 'space';
    if (resolved.department_id) return 'department';
    if (resolved.company_id) return 'company';
    return 'global';
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * useMoraContext
 *
 * Normalization-only hook. Reads moraState + useMemoryPendingCount.
 * No fetches. No mutations. Safe to call in any surface.
 */
export function useMoraContext(): MoraContextSnapshot {
    const orbState = useMoraStore((s) => s.orbState);
    const coreError = useMoraStore((s) => s.coreError);
    const lastChatScope = useMoraStore((s) => s.lastChatScope);
    const companies = useMoraStore((s) => s.companies);
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const activeDepartment = useMoraStore((s) => s.activeDepartment);
    const activeSpace = useMoraStore((s) => s.activeSpace);
    const activeFolder = useMoraStore((s) => s.activeFolder);

    const memoryPendingCount = useMemoryPendingCount();

    return useMemo((): MoraContextSnapshot => {
        const resolved = lastChatScope?.resolved_scope;
        const contract = lastChatScope?.scope_contract;

        // Scope level
        const scopeLevel = deriveScopeLevel(resolved);

        // Scope labels — prefer resolved_scope names, fall back to store entity names
        const safeCompanies = Array.isArray(companies) ? companies : [];
        const activeCompany = safeCompanies.find((c) => c.id === activeCompanyId);

        const scopeLabels: MoraContextSnapshot['scopeLabels'] = {};
        if (resolved?.company_id || activeCompanyId) {
            scopeLabels.company = activeCompany?.name ?? resolved?.company_id ?? undefined;
        }
        if (resolved?.department_id || activeDepartment?.id) {
            scopeLabels.department = activeDepartment?.name ?? resolved?.department_id ?? undefined;
        }
        if (resolved?.space_id || activeSpace?.id) {
            scopeLabels.space = activeSpace?.name ?? resolved?.space_id ?? undefined;
        }
        if (resolved?.folder_id || activeFolder?.id) {
            scopeLabels.folder = activeFolder?.name ?? resolved?.folder_id ?? undefined;
        }

        // Scope enforcement
        const scopeEnforced = lastChatScope?.scope_enforced ?? false;
        // scope_reason: populated by backend in scope_contract (P1 dep).
        // Falls back to generic label when enforced but reason absent.
        const rawReason = (contract as any)?.scope_reason as string | undefined;
        const scopeReason = rawReason
            ?? (scopeEnforced ? 'Scope eingeschränkt' : null);

        const scopeDroppedFields = contract?.dropped_fields ?? [];

        // Freshness
        const lastScopeUpdateAt = lastChatScope?.updatedAt ?? null;
        const lastScopeSource: MoraContextSnapshot['lastScopeSource'] =
            lastChatScope ? 'stream' : null;

        // Answer provenance — backend dep (P0). Graceful null until StreamFrame ships these fields.
        // When Codex adds answer_source to StreamFrame, wire it here via lastChatScope extension.
        const lastAnswerSource: MoraContextSnapshot['lastAnswerSource'] = null;
        const lastAnswerScopeLabel: string | null = null;

        return {
            scopeLevel,
            scopeLabels,
            scopeEnforced,
            scopeReason,
            scopeDroppedFields,
            orbState,
            isOffline: coreError !== null,
            memoryPendingCount,
            memoryFactCount: 0,  // extend when metrics are in store
            lastScopeUpdateAt,
            lastScopeSource,
            lastAnswerSource,
            lastAnswerScopeLabel,
        };
    }, [
        orbState, coreError, lastChatScope,
        companies, activeCompanyId, activeDepartment, activeSpace, activeFolder,
        memoryPendingCount,
    ]);
}
```

**Step 2: Verify types**

```bash
npm run verify:types
```
Expected: 0 errors. If you see "Property 'activeDepartment' does not exist on MoraState", check the export names in `moraState.ts` — use `grep -n "activeDepartment\|activeSpace\|activeFolder" lib/store/moraState.ts` to find exact field names and adjust the destructuring.

**Step 3: Commit**

```bash
git add lib/mora/useMoraContext.ts
git commit -m "feat(mr18): add useMoraContext normalization hook"
```

---

## Task 3: Create `<MoraContextChip />`

**Files:**
- Create: `components/mora/MoraContextChip.tsx`

This component renders scope breadcrumb + enforced badge + memory badge + source pill. Three variants control density. No Framer Motion — CSS transitions only.

**Step 1: Create the file**

```typescript
// components/mora/MoraContextChip.tsx
"use client";

import React from 'react';
import { Layers, Lock, Brain, ArrowRight } from 'lucide-react';
import type { MoraContextSnapshot } from '@/lib/mora/useMoraContext';

export interface MoraContextChipProps {
    snapshot: MoraContextSnapshot;
    /** bar = compact single-line (Intel Bar)
     *  sidebar = slightly wider, same line
     *  hub = full row with more label space */
    variant?: 'bar' | 'sidebar' | 'hub';
    className?: string;
}

// ─── Scope breadcrumb string ─────────────────────────────────────────────────

function buildBreadcrumb(labels: MoraContextSnapshot['scopeLabels']): string {
    const parts: string[] = [];
    if (labels.company) parts.push(labels.company);
    if (labels.department) parts.push(labels.department);
    if (labels.space) parts.push(labels.space);
    if (labels.folder) parts.push(labels.folder);
    // Keep to 2 parts max for bar/sidebar; hub allows 3
    return parts.slice(0, 3).join(' › ');
}

function truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// ─── Answer source pill ──────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<
    NonNullable<MoraContextSnapshot['lastAnswerSource']>,
    { label: string; className: string }
> = {
    memory: {
        label: 'Gedächtnis',
        className: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
    },
    context: {
        label: 'Kontext',
        className: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    },
    inference: {
        label: 'Inferenz',
        className: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    },
};

// ─── Component ───────────────────────────────────────────────────────────────

export const MoraContextChip: React.FC<MoraContextChipProps> = ({
    snapshot,
    variant = 'bar',
    className = '',
}) => {
    const {
        scopeLevel,
        scopeLabels,
        scopeEnforced,
        scopeReason,
        memoryPendingCount,
        lastAnswerSource,
    } = snapshot;

    // Don't render if there is genuinely nothing to show
    const hasScopeInfo = scopeLevel !== 'global';
    const hasMemory = memoryPendingCount > 0;
    const hasSource = lastAnswerSource !== null;
    if (!hasScopeInfo && !hasMemory && !hasSource) return null;

    const breadcrumb = hasScopeInfo ? buildBreadcrumb(scopeLabels) : null;
    const maxChars = variant === 'hub' ? 36 : variant === 'sidebar' ? 28 : 22;

    return (
        <div
            className={`flex items-center gap-1.5 flex-wrap ${className}`}
            aria-label="Mora Kontext"
        >
            {/* Scope breadcrumb */}
            {breadcrumb && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 transition-colors duration-150">
                    <Layers size={10} className="text-emerald-400/70 shrink-0" />
                    <span className="text-[11px] text-white/70 font-light leading-none">
                        {truncate(breadcrumb, maxChars)}
                    </span>
                </div>
            )}

            {/* Enforced lock */}
            {scopeEnforced && (
                <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 transition-colors duration-150 cursor-default"
                    title={scopeReason ?? 'Scope eingeschränkt'}
                    aria-label={`Scope eingeschränkt: ${scopeReason ?? ''}`}
                >
                    <Lock size={9} className="text-amber-400/80 shrink-0" />
                    {variant === 'hub' && (
                        <span className="text-[10px] text-amber-300/80 leading-none">
                            {scopeReason ?? 'Eingeschränkt'}
                        </span>
                    )}
                </div>
            )}

            {/* Memory pending badge */}
            {hasMemory && (
                <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 transition-colors duration-150"
                    title={`${memoryPendingCount} Einträge warten auf Überprüfung`}
                >
                    <Brain size={9} className="text-violet-400/70 shrink-0" />
                    <span className="text-[10px] text-violet-300/80 leading-none font-medium">
                        {memoryPendingCount > 9 ? '9+' : memoryPendingCount}
                    </span>
                </div>
            )}

            {/* Answer source pill */}
            {hasSource ? (
                <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] leading-none transition-colors duration-150 ${SOURCE_CONFIG[lastAnswerSource!].className}`}
                    title={`Antwortquelle: ${SOURCE_CONFIG[lastAnswerSource!].label}`}
                >
                    <ArrowRight size={9} className="shrink-0" />
                    {SOURCE_CONFIG[lastAnswerSource!].label}
                </div>
            ) : (
                // Graceful degradation: source unknown, show neutral dash
                <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/25 leading-none"
                    title="Antwortquelle nicht verfügbar (Backend-Abhängigkeit)"
                >
                    —
                </div>
            )}
        </div>
    );
};

export default MoraContextChip;
```

**Step 2: Verify types**

```bash
npm run verify:types
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/mora/MoraContextChip.tsx
git commit -m "feat(mr18): add MoraContextChip shared display component"
```

---

## Task 4: Wire `MoraIntelligenceBar` to use chip

**Files:**
- Modify: `components/mora/MoraIntelligenceBar.tsx`

The bar currently shows an unreadable 10px `boundary_level` span and a vague `intelText` string in the context area. Replace both with `<MoraContextChip variant="bar" />`. The orb dot, status text ("Mora • READY"), and action buttons are preserved unchanged.

**Step 1: Update imports at the top of `MoraIntelligenceBar.tsx`**

Add these two imports after the existing imports:
```typescript
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from './MoraContextChip';
```

Remove this import (no longer needed after change):
```typescript
import { useIntelFeed } from "@/lib/mora/useIntelFeed";
```

**Step 2: Update the component body**

Remove the `useIntelFeed` call and `intelText` memo. Add `useMoraContext()`:

Remove these lines:
```typescript
    const { hint } = useIntelFeed();
    // ...
    // Only show real context, no fake placeholder text
    const intelText = hint?.summary || hint?.title || null;
```

Add after `const coreError` line:
```typescript
    const ctx = useMoraContext();
```

**Step 3: Replace the context area JSX**

Find this block (lines ~59–74):
```tsx
                    {/* Context & Status Area */}
                    <div className="flex-1 flex flex-col justify-center min-w-0 cursor-pointer" onClick={onOpenIntelligence}>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold tracking-[0.15em] uppercase ${coreError ? 'text-red-400' : 'text-emerald-400'}`}>
                                Mora • {statusText}
                            </span>
                            {coreError && <AlertTriangle size={10} className="text-red-400 animate-pulse" />}
                        </div>
                        {intelText && (
                            <div className="text-xs text-white/60 font-light truncate mt-0.5">
                                {intelText}
                            </div>
                        )}
                    </div>
```

Replace with:
```tsx
                    {/* Context & Status Area */}
                    <div className="flex-1 flex flex-col justify-center min-w-0 gap-0.5 cursor-pointer" onClick={onOpenIntelligence}>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold tracking-[0.15em] uppercase ${coreError ? 'text-red-400' : 'text-emerald-400'}`}>
                                Mora • {statusText}
                            </span>
                            {coreError && <AlertTriangle size={10} className="text-red-400 animate-pulse" />}
                        </div>
                        <MoraContextChip variant="bar" snapshot={ctx} />
                    </div>
```

**Step 4: Remove the floating hints block that used `hint`**

Find and remove this block at the bottom of the component (it used `hint` from `useIntelFeed`):
```tsx
                {/* Floating Hints (Optional, can be expanded later) */}
                <AnimatePresence>
                    {hint && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs text-emerald-200/80 whitespace-nowrap pointer-events-none"
                        >
                            New insight available
                        </motion.div>
                    )}
                </AnimatePresence>
```

Also remove `AlertTriangle` from lucide imports if it was only used in the floating hint (check — it's still used in the status area, so keep it). Remove `Activity` if it is now unused.

**Step 5: Verify types**

```bash
npm run verify:types
```
Expected: 0 errors. If `useIntelFeed` removal breaks something else, check `grep -rn "useIntelFeed" components/` first — it may still be used in other files (don't remove the import from the library, only from this component file).

**Step 6: Commit**

```bash
git add components/mora/MoraIntelligenceBar.tsx
git commit -m "feat(mr18): wire MoraContextChip into IntelligenceBar"
```

---

## Task 5: Wire `MemorySidebar` context header

**Files:**
- Modify: `components/os/MemorySidebar.tsx`

Add a slim 32px context header above the pending queue. The chip is pulled from `useMoraContext()`. No existing memory logic changes.

**Step 1: Add imports**

At the top of `MemorySidebar.tsx`, add:
```typescript
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from '@/components/mora/MoraContextChip';
```

**Step 2: Locate the main sidebar body render**

Find the section that renders the main sidebar open state — it contains a `QuickMemoryInputInline` at around line 730. The structure looks like:
```tsx
<div className="flex items-center justify-between p-3 border-b border-white/5">
    {/* header with Brain icon and title */}
</div>
```

Search for the header with `Brain` icon in the sidebar open state. It should be around line 680–690. Below that header and above the `QuickMemoryInputInline`, insert the context chip row.

**Step 3: Add `useMoraContext()` call**

Find where `useMemory()` is called in the component (around line 559):
```typescript
    const { pendingCount, pendingItems, refresh, approve, reject, debugScope } = useMemory();
```

Add directly below it:
```typescript
    const ctx = useMoraContext();
```

**Step 4: Insert chip header**

Find the `QuickMemoryInputInline` usage (around line 730):
```tsx
<QuickMemoryInputInline onSuccess={refresh} companyId={activeCompanyId} />
```

Insert a context header row immediately **before** it:
```tsx
{/* MR18: Mora context header — same scope as Intel Bar */}
<div className="px-3 py-2 border-b border-white/5">
    <MoraContextChip variant="sidebar" snapshot={ctx} />
</div>
```

**Step 5: Verify types**

```bash
npm run verify:types
```
Expected: 0 errors.

**Step 6: Commit**

```bash
git add components/os/MemorySidebar.tsx
git commit -m "feat(mr18): add Mora context header to MemorySidebar"
```

---

## Task 6: Wire `MoraHubPane` — overview chip + stats freshness

**Files:**
- Modify: `components/panes/MoraHubPane.tsx`

Two changes:
1. Overview tab: prepend `<MoraContextChip variant="hub" />` before `MoraPlayground`
2. Stats tab: append `lastScopeUpdateAt` freshness label beneath the BarChart3 header

**Step 1: Add imports**

```typescript
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from '@/components/mora/MoraContextChip';
```

**Step 2: Call hook inside the component**

Add after the existing state/store calls near the top of `MoraHubPane`:
```typescript
    const ctx = useMoraContext();
```

**Step 3: Modify the overview case in `renderContent()`**

Find:
```tsx
            case "overview":
            default:
                return (
                    <MoraPlayground
                        scope={viewLevel === "department" ? "department" : "company"}
                        title=""
                        className="h-full"
                        compact={isCompact}
                    />
                );
```

Replace with:
```tsx
            case "overview":
            default:
                return (
                    <div className="h-full flex flex-col">
                        {/* MR18: Mora context — always visible when scope is known */}
                        <div className="px-4 pt-3 pb-2 border-b border-white/5 shrink-0">
                            <MoraContextChip variant="hub" snapshot={ctx} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <MoraPlayground
                                scope={viewLevel === "department" ? "department" : "company"}
                                title=""
                                className="h-full"
                                compact={isCompact}
                            />
                        </div>
                    </div>
                );
```

**Step 4: Modify the stats case to add freshness label**

Find:
```tsx
            case "stats":
                return (
                    <div className="h-full p-4 overflow-y-auto">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="h-4 w-4 text-emerald-400" />
                                <span className="text-xs font-medium text-white/80">Mora Statistics (Live)</span>
                            </div>
                            <MemoryStats compact={isCompact} companyId={resolvedCompanyId} />
                        </div>
                    </div>
                );
```

Replace with:
```tsx
            case "stats":
                return (
                    <div className="h-full p-4 overflow-y-auto">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="h-4 w-4 text-emerald-400" />
                                <span className="text-xs font-medium text-white/80">Mora Statistics (Live)</span>
                            </div>
                            {/* MR18: scope freshness — honest about staleness */}
                            {ctx.lastScopeUpdateAt && (
                                <p className="text-[10px] text-white/25 mb-4">
                                    Scope aktualisiert: {new Date(ctx.lastScopeUpdateAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                            )}
                            <MemoryStats compact={isCompact} companyId={resolvedCompanyId} />
                        </div>
                    </div>
                );
```

**Step 5: Verify types**

```bash
npm run verify:types
```
Expected: 0 errors.

**Step 6: Commit**

```bash
git add components/panes/MoraHubPane.tsx
git commit -m "feat(mr18): add context chip to MoraHub overview and freshness to stats"
```

---

## Task 7: Final verification + smoke check

**Step 1: Full type check**

```bash
npm run verify:types
```
Expected: exit 0, 0 errors.

**Step 2: Critical flow gate**

```bash
npm run verify:critical-flow
```
Expected: pass (this checks that no critical `/v1` leaks exist in Finder/Chat flow).

**Step 3: Manual smoke check — four surfaces**

Start the dev server:
```bash
npm run dev
```

Then in browser at `http://localhost:3000`:

1. **Login** with demo credentials (see `mora-ui/CLAUDE.md`).
2. **Intel Bar (bottom-left):** After sending one chat message, the Intel Bar should show a scope chip. If `lastChatScope` is null before chat, chip renders nothing — correct.
3. **Memory Sidebar (Ctrl+Shift+M):** Open sidebar. Confirm the context header row appears above the quick input. Scope chip should match Intel Bar.
4. **Mora Hub Pane:** Open via Dock → Brain icon. In Overview tab, confirm chip appears between panel header and `MoraPlayground`. In Stats tab, if you have sent a chat, "Scope aktualisiert: HH:MM:SS" appears below the header.
5. **Answer source pill:** Shows `—` on all surfaces (expected — backend dep not yet shipped). No surface should show a blank where the dash should be.
6. **Offline state:** Disconnect from backend or set `coreError` via store devtools. Intel Bar orb dot turns red — chip should still render if `lastChatScope` was already populated.

**Step 4: Acceptance criteria check**

| Check | Expected |
|---|---|
| Intel Bar scope chip readable | ✓ visible at normal font size |
| Intel Bar matches Memory Sidebar scope | ✓ same `useMoraContext()` output |
| Memory Sidebar matches Mora Hub overview | ✓ same hook |
| Hub overview not empty when scope known | ✓ chip renders |
| Hub stats shows freshness | ✓ if `lastScopeUpdateAt` present |
| `scopeEnforced=true` with no `scopeReason` | "Scope eingeschränkt" fallback visible |
| `lastAnswerSource=null` | `—` pill, not blank |
| TypeScript strict | 0 errors |
| No new API calls | Confirm in DevTools Network tab — no new requests after chip renders |

**Step 5: Final commit if any last fixes applied**

```bash
git add -p  # stage only intentional changes
git commit -m "fix(mr18): verification fixes"
```

**Step 6: Summarize for handoff**

After passing all checks, report:
- Commit SHAs (one per task, 6 commits + any fix commits)
- Files changed (7 files)
- Residual risks (see below)
- Backend deps Codex must satisfy (see design doc)

---

## Residual Risks

| Risk | Mitigation |
|---|---|
| `activeDepartment / activeSpace / activeFolder` field names may differ from store | Run `grep -n "activeDepartment" lib/store/moraState.ts` before Task 2 to confirm exact names |
| `useIntelFeed` may still be imported in other files | Check `grep -rn "useIntelFeed" components/` before removing from IntelligenceBar |
| `MemorySidebar` has multiple render paths (open/closed/tabs) | Insert chip only in the open-state render, not the collapsed icon strip |
| `lastScopeUpdateAt` is `undefined` not `null` if scope was never set | Hook initializes it as `null` via `?? null` — safe |
| Answer source pill shows `—` permanently until Codex ships stream contract | Expected behavior, documented in design doc — not a bug |

---

## Backend Dependencies for Codex

As called out in the design doc `2026-03-06-mr18-intelligence-ux-unification-design.md`:

| # | Field | Location | Priority |
|---|---|---|---|
| 1 | `answer_source: 'memory' \| 'context' \| 'inference'` | `StreamFrame` in `/v3/chat` stream | **P0** |
| 2 | `answer_scope_label: string` | Same `StreamFrame` | **P0** |
| 3 | `scope_reason: string` | `ScopeContract.scope_reason` | **P1** |
| 4 | `v3/memory/overview` unified | Already in flight | — |

When Codex ships `answer_source`, the frontend wiring is:
1. Add `answer_source?: string` and `answer_scope_label?: string` to `StreamFrame` in `lib/hooks/useMoraStream.ts`
2. In `extractScopeUpdate()` or a new `extractProvenance()` function, read these fields
3. Extend `LastChatScopeState` with `answerSource` and `answerScopeLabel`
4. `useMoraContext()` already returns `lastAnswerSource` and `lastAnswerScopeLabel` as `null` — just wire the values through
