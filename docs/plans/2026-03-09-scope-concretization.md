# Scope Concretization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the active company-backed scope concrete and legible across ChatPane, MoraHub, MemorySidebar, and IntelligenceContextBar, using the backend's explicit `operational_state` / `setup_required` session fields as the primary gate.

**Architecture:** `useMoraContext()` is the single normalization layer — it reads session operational state + chat scope preamble, derives `isOperational: boolean` and `scopeSource: string | null`, and exposes them on `MoraContextSnapshot`. All surfaces branch on `snapshot.isOperational`. No new store. No new hook. 7 files, 6 commits.

**Tech Stack:** Next.js 15, TypeScript, Zustand, Jest 29, `@testing-library/react` for hook tests

**Design doc:** `docs/plans/2026-03-09-scope-concretization-design.md`
**Backend baseline:** Core `e2fa9d1` — `/v3/auth/session` now returns `operational_state`, `setup_required`, `active_company_id`, `active_company_name`, `company_count`, `scope_source`
**Test command:** `npx jest --no-coverage --testPathPattern="__tests__"`
**Type check:** `npm run verify:types`

---

## Task 1: Extend type interfaces — UserProfile, User, ResolvedScope

**Files:**
- Modify: `lib/api/coreClient.ts` (find `UserProfile` interface)
- Modify: `lib/store/moraState.ts` (find `User` interface and `ResolvedScope` interface)

These are pure type additions — TypeScript is the test. No runtime code changes in this task.

### Step 1: Extend `UserProfile` in `coreClient.ts`

Find the `UserProfile` interface (currently lines ~270–282). Add 6 optional fields at the end:

```typescript
export interface UserProfile {
    user_id: string;
    email?: string;
    full_name?: string;
    role: AccountRole;
    tenant_id: string;
    scope?: string;
    demo_mode?: boolean;
    // Session operational contract (Core e2fa9d1+)
    operational_state?: 'operational' | 'setup_required';
    setup_required?: boolean;
    active_company_id?: string;
    active_company_name?: string;
    company_count?: number;
    scope_source?: string;
}
```

### Step 2: Extend `User` in `moraState.ts`

Find the `User` interface. Add the fields that must survive the `UserProfile → User` mapping:

```typescript
export interface User {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    role: UserRole;
    settings?: Record<string, unknown>;
    tenant_id?: string;
    // Session operational contract (Core e2fa9d1+)
    operational_state?: 'operational' | 'setup_required';
    setup_required?: boolean;
    active_company_id?: string;
    active_company_name?: string;
    company_count?: number;
}
```

### Step 3: Extend `ResolvedScope` in `moraState.ts`

Find `ResolvedScope` interface (or `LastChatScopeState` → `resolved_scope` type). Make `scope_source` an explicit field:

```typescript
export interface ResolvedScope {
    company_id?: string;
    department_id?: string;
    space_id?: string;
    folder_id?: string;
    scope_source?: string;   // backend resolution provenance — stored, not shown in main UX
    [key: string]: string | undefined;
}
```

If `resolved_scope` is typed as `Record<string, string | undefined>` inline (not a named interface), extract it into a named `ResolvedScope` interface and update the `LastChatScopeState` to reference it.

### Step 4: Find the UserProfile → User mapping and pass through new fields

Search for where `fetchUserProfile()` result is mapped into the `User` shape stored by `setUser()`. This is typically in a `useAccount`-style hook or a bootstrap call. Run:

```bash
cd /c/saimor/mora-ui && grep -rn "fetchUserProfile\|setUser\|setFromProfile\|user_id.*name\|full_name" --include="*.ts" --include="*.tsx" lib/ components/ -l
```

Find the mapping site and add the new fields:

```typescript
// Wherever UserProfile is converted to User — add:
operational_state: profile.operational_state,
setup_required:    profile.setup_required,
active_company_id: profile.active_company_id,
active_company_name: profile.active_company_name,
company_count:     profile.company_count,
```

### Step 5: Run type check

```bash
cd /c/saimor/mora-ui && npm run verify:types
```

Expected: 0 errors. Fix any type errors before proceeding.

### Step 6: Commit

```bash
cd /c/saimor/mora-ui
git add lib/api/coreClient.ts lib/store/moraState.ts
# include any other files touched by the UserProfile→User mapping
git commit -m "feat(scope): extend UserProfile and User with session operational contract fields"
```

---

## Task 2: useMoraContext — isOperational, scopeSource, pre-chat company label

**Files:**
- Modify: `lib/mora/useMoraContext.ts`
- Create: `__tests__/lib/mora/useMoraContext.test.ts`

### Step 1: Read the current file

Before touching anything, read `lib/mora/useMoraContext.ts` in full. Note:
- The exact store fields read via `useMoraStore`
- The `MoraContextSnapshot` interface definition
- The `useMemo` block that builds the snapshot
- Where `scopeLabels.company` is currently derived

### Step 2: Write the failing tests

Create `__tests__/lib/mora/useMoraContext.test.ts`:

```typescript
/**
 * useMoraContext — isOperational + scopeSource derivation tests
 */

// Mock the entire store — useMoraContext calls useMoraStore(selector)
jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn(),
}));

import { renderHook } from '@testing-library/react';
import { useMoraStore } from '@/lib/store/moraState';
import { useMoraContext } from '@/lib/mora/useMoraContext';

// Minimal valid store state — extend as needed per test
const baseStore = {
    orbState: 'idle',
    coreError: null,
    lastChatScope: null,
    companies: [],
    activeCompanyId: null,
    activeDepartmentId: null,
    activeSpaceId: null,
    activeFolderId: null,
    departments: [],
    spacesByDepartment: {},
    foldersBySpace: {},
    lastAnswerSource: null,
    lastAnswerSourceMode: null,
    lastAnswerScopeLabel: null,
    memoryPendingCount: 0,
    memoryFactCount: 0,
    user: null,
};

function mockStore(overrides: Partial<typeof baseStore>) {
    const state = { ...baseStore, ...overrides };
    (useMoraStore as jest.Mock).mockImplementation((selector: (s: typeof state) => unknown) =>
        selector(state)
    );
}

beforeEach(() => jest.clearAllMocks());

describe('isOperational — backend truth', () => {
    it('is true when session operational_state is "operational"', () => {
        mockStore({ user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'operational' } as any });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(true);
    });

    it('is false when session operational_state is "setup_required"', () => {
        mockStore({ user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'setup_required' } as any });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(false);
    });
});

describe('isOperational — heuristic fallback (no session operational_state)', () => {
    it('is true when activeCompanyId is set and no operational_state', () => {
        mockStore({ user: { id: 'u1', name: 'Test', role: 'member' } as any, activeCompanyId: 'co-1' });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(true);
    });

    it('is false when no operational_state and no activeCompanyId', () => {
        mockStore({ user: { id: 'u1', name: 'Test', role: 'member' } as any });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(false);
    });
});

describe('pre-chat company label from session', () => {
    it('uses active_company_name from session when no lastChatScope', () => {
        mockStore({
            user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'operational', active_company_name: 'Acme GmbH' } as any,
        });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.scopeLabels.company).toBe('Acme GmbH');
    });
});

describe('scopeSource', () => {
    it('returns scope_source from resolved_scope when present', () => {
        mockStore({
            lastChatScope: {
                resolved_scope: { company_id: 'co-1', scope_source: 'tenant_default_company' },
                scope_policy: 'passthrough',
                scope_enforced: false,
            },
        });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.scopeSource).toBe('tenant_default_company');
    });

    it('returns null when no lastChatScope', () => {
        mockStore({});
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.scopeSource).toBeNull();
    });
});
```

### Step 3: Run tests — verify they FAIL

```bash
cd /c/saimor/mora-ui && npx jest --no-coverage --testPathPattern="useMoraContext"
```

Expected: FAIL — `isOperational` and `scopeSource` do not exist on the snapshot yet.

**If any test passes unexpectedly, stop and investigate before proceeding.**

### Step 4: Add isOperational and scopeSource to MoraContextSnapshot interface

In `lib/mora/useMoraContext.ts`, find the `MoraContextSnapshot` interface and add two fields:

```typescript
export interface MoraContextSnapshot {
    // ... all existing fields unchanged ...

    /** true = concrete company context available; false = setup-required state */
    isOperational: boolean;
    /** Raw backend scope_source value. Admin/diagnostics only — do not show in main UX. */
    scopeSource: string | null;
}
```

### Step 5: Add `user` to store reads

In `useMoraContext()`, find the section that reads from the store (the `useMoraStore` calls around lines 70–88). Add `user`:

```typescript
const user = useMoraStore((s) => s.user);
```

(Add this alongside the other store reads, not inside the useMemo.)

### Step 6: Derive isOperational in useMemo

Inside the `useMemo` block, add the `isOperational` derivation. Find where `resolvedCompanyId` or `activeCompanyId` is used. Add before the snapshot return:

```typescript
// isOperational: backend session truth first, heuristic fallback
const resolvedCompanyId = lastChatScope?.resolved_scope?.company_id;
const isOperational: boolean =
    user?.operational_state != null
        ? user.operational_state === 'operational'
        : !!(resolvedCompanyId ?? activeCompanyId);
```

### Step 7: Derive scopeSource in useMemo

```typescript
const scopeSource = lastChatScope?.resolved_scope?.scope_source ?? null;
```

### Step 8: Add pre-chat company label fallback

Find where `companyLabel` (or the equivalent `scopeLabels.company` value) is derived. It likely looks like:

```typescript
const companyName = resolvedCompanyName ?? activeCompany?.name ?? undefined;
```

Extend the fallback chain to include the session-bootstrapped name:

```typescript
const companyName =
    resolvedCompanyName           // from lastChatScope resolved_scope (highest priority)
    ?? activeCompany?.name        // from store entity (user navigated to company)
    ?? user?.active_company_name  // from session bootstrap (pre-chat)
    ?? undefined;
```

### Step 9: Add fields to snapshot return

In the snapshot object returned by `useMemo`, add:

```typescript
isOperational,
scopeSource,
```

### Step 10: Run tests — verify they PASS

```bash
cd /c/saimor/mora-ui && npx jest --no-coverage --testPathPattern="useMoraContext"
```

Expected: 7 PASS (all new tests). Fix any failures before proceeding.

### Step 11: Full suite

```bash
cd /c/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```

Expected: all existing tests still pass (no regressions). Note the new total.

### Step 12: Type check

```bash
cd /c/saimor/mora-ui && npm run verify:types
```

Expected: 0 errors. If you see errors about `isOperational` or `scopeSource` being used by a surface that already reads the snapshot — that's fine and expected, fix those as you reach the surface tasks below.

### Step 13: Commit

```bash
cd /c/saimor/mora-ui
git add lib/mora/useMoraContext.ts __tests__/lib/mora/useMoraContext.test.ts
git commit -m "feat(scope): add isOperational and scopeSource to useMoraContext snapshot"
```

---

## Task 3: Remove 'Gesamter Workspace' from IntelligenceContextBar

**Files:**
- Modify: `components/layers/IntelligenceContextBar.tsx`

This is a one-line removal. No new tests — the QA is TypeScript + the live QA prompts.

### Step 1: Find the vague label

In `IntelligenceContextBar.tsx`, search for the string `Gesamter Workspace`:

```bash
cd /c/saimor/mora-ui && grep -n "Gesamter Workspace" components/layers/IntelligenceContextBar.tsx
```

It will look like:

```typescript
const scopeLabel = scopeParts.length > 0 ? scopeParts.join(' › ') : 'Gesamter Workspace';
```

### Step 2: Remove the fallback

Replace that line with:

```typescript
const scopeLabel = scopeParts.join(' › ');
```

When `scopeParts` is empty, `scopeLabel` becomes `''`. The IntelligenceContextBar auto-hides on inactivity — an empty label causes the bar to show nothing, then disappear. This is correct.

### Step 3: Verify no other vague labels nearby

```bash
cd /c/saimor/mora-ui && grep -n "Gesamter\|global.*workspace\|workspace.*global\|tenant.*fallback" components/layers/IntelligenceContextBar.tsx
```

Expected: no matches.

### Step 4: Type check

```bash
cd /c/saimor/mora-ui && npm run verify:types
```

Expected: 0 errors.

### Step 5: Commit

```bash
cd /c/saimor/mora-ui
git add components/layers/IntelligenceContextBar.tsx
git commit -m "fix(scope): remove Gesamter Workspace vague scope label from IntelligenceContextBar"
```

---

## Task 4: ChatPane — isOperational gate + SetupRequiredCard

**Files:**
- Modify: `components/panes/ChatPane.tsx`

### Step 1: Read ChatPane.tsx

Before touching anything, read `components/panes/ChatPane.tsx`. Find:
1. Where `useMoraContext()` is called (around line 362)
2. The JSX section containing the message composer / input area (typically near the bottom of the returned JSX)
3. The import section at the top

### Step 2: Destructure isOperational from the hook

Find the existing `useMoraContext()` call and add `isOperational` to its destructuring:

```typescript
const { /* existing fields */ isOperational } = useMoraContext();
// or if accessed via moraCtx variable:
const moraCtx = useMoraContext();
// then use moraCtx.isOperational below
```

### Step 3: Add SetupRequiredCard component

At the bottom of `ChatPane.tsx`, before the main export, add a small inline component:

```tsx
// ─── SetupRequiredCard ────────────────────────────────────────────────────────

interface SetupRequiredCardProps {
    onOpenSettings?: () => void;
}

function SetupRequiredCard({ onOpenSettings }: SetupRequiredCardProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 mx-4 mb-4 rounded-xl border border-white/10 bg-white/[0.03] text-center">
            <p className="text-sm font-medium text-foreground/80">
                Kein Workspace konfiguriert
            </p>
            <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                Richte eine Firma oder einen Workspace ein, um Mora nutzen zu können.
            </p>
            {onOpenSettings && (
                <button
                    onClick={onOpenSettings}
                    className="mt-1 text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                    Einstellungen öffnen
                </button>
            )}
        </div>
    );
}
```

### Step 4: Gate the composer on isOperational

Find the JSX section that renders the message composer / input area. It will be a `<div>` or `<form>` containing the text input, send button, etc. Wrap it:

```tsx
{isOperational ? (
    /* existing composer JSX — unchanged */
    <div className="...">
        {/* textarea, send button, attachments, etc. */}
    </div>
) : (
    <SetupRequiredCard
        onOpenSettings={() => {
            // Open settings pane — find the existing pattern used in ChatPane
            // for opening panes (look for usePaneStore or openPane calls in the file)
            openPane({ id: 'settings', type: 'settings', title: 'Einstellungen' });
        }}
    />
)}
```

If `openPane` is not already in scope, find how other buttons in the file open panes and follow the same pattern.

### Step 5: Verify the header and history are unchanged

The message history list and chat header (including `MoraContextChip`) must remain visible when `isOperational === false`. Only the composer area is gated. Do not wrap the entire pane content.

### Step 6: Type check

```bash
cd /c/saimor/mora-ui && npm run verify:types
```

Expected: 0 errors.

### Step 7: Commit

```bash
cd /c/saimor/mora-ui
git add components/panes/ChatPane.tsx
git commit -m "feat(scope): gate ChatPane composer on isOperational with setup-required card"
```

---

## Task 5: MoraHubPane — setup-required empty state in Overview

**Files:**
- Modify: `components/panes/MoraHubPane.tsx`

### Step 1: Read MoraHubPane.tsx

Find:
1. Where `useMoraContext()` is called (the `ctx` variable)
2. The Overview tab JSX — specifically the `<MoraContextChip variant="hub" snapshot={ctx} />` section (lines ~108–111)

### Step 2: Destructure isOperational

Add `isOperational` to the destructuring from `useMoraContext()`, or access it via `ctx.isOperational`.

### Step 3: Gate the Overview tab content

Find the Overview tab's JSX container. Wrap the contents (context chip + stats/overview) in an `isOperational` branch:

```tsx
{isOperational ? (
    <>
        {/* existing MoraContextChip + stats content — unchanged */}
        <div className="px-4 pt-3 pb-2 border-b border-white/5 shrink-0">
            <MoraContextChip variant="hub" snapshot={ctx} />
        </div>
        {/* rest of overview content */}
    </>
) : (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground/70">
            Noch nicht operativ
        </p>
        <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
            Richte einen Workspace ein, damit Mora operativ wird.
        </p>
    </div>
)}
```

### Step 4: Type check

```bash
cd /c/saimor/mora-ui && npm run verify:types
```

Expected: 0 errors.

### Step 5: Commit

```bash
cd /c/saimor/mora-ui
git add components/panes/MoraHubPane.tsx
git commit -m "feat(scope): gate MoraHub overview on isOperational with setup-required state"
```

---

## Task 6: MemorySidebar — suppress memory input when not operational

**Files:**
- Modify: `components/os/MemorySidebar.tsx`

### Step 1: Read MemorySidebar.tsx

The file is large (~52 KB). Focus on:
1. Where `useMoraContext()` is called (line 24)
2. The quick memory input section (the text area / input where users add memories)
3. The memory list section (recent memories)

### Step 2: Access isOperational

`useMoraContext()` is already called. Add `isOperational` to its destructuring:

```typescript
const { /* existing fields */, isOperational } = useMoraContext();
```

### Step 3: Gate the memory input and memory list

Find the quick memory input component and the memory list. Wrap them together:

```tsx
{isOperational ? (
    <>
        {/* existing quick memory input — unchanged */}
        {/* existing memory list — unchanged */}
    </>
) : (
    <p className="text-xs text-muted-foreground px-4 py-6 text-center leading-relaxed">
        Speicher ist verfügbar, sobald ein Workspace eingerichtet ist.
    </p>
)}
```

**Important:** Do NOT gate the sidebar chrome, the sidebar toggle/keyboard shortcut, or the sidebar header. Only the memory input and memory list are gated. The sidebar itself remains openable.

### Step 4: Type check

```bash
cd /c/saimor/mora-ui && npm run verify:types
```

Expected: 0 errors.

### Step 5: Commit

```bash
cd /c/saimor/mora-ui
git add components/os/MemorySidebar.tsx
git commit -m "feat(scope): suppress MemorySidebar memory input when not operational"
```

---

## Task 7: Final verification

### Step 1: Full test suite

```bash
cd /c/saimor/mora-ui && npx jest --no-coverage --testPathPattern="__tests__"
```

Expected: all tests pass (existing count + 7 new useMoraContext tests). No regressions.

### Step 2: Full type check

```bash
cd /c/saimor/mora-ui && npm run verify:types
```

Expected: 0 errors across all 7 modified files.

### Step 3: Grep audit — no vague labels remain

```bash
cd /c/saimor/mora-ui && grep -rn "Gesamter Workspace\|tenant_default_company\|scope_source" components/ --include="*.tsx" | grep -v "// " | grep -v "diagnostics\|admin"
```

Expected: no matches in user-facing render paths.

### Step 4: QA prompts (live, with backend running)

Start dev server: `npm run dev` (port 3000)

Test these prompts in ChatPane:
- **"was weißt du gerade?"** → answer should reference a concrete company, not a void. Chip should show company name.
- **"was kannst du mir vorschlagen?"** → answer should feel scoped. Chip, hub, and sidebar should all agree on the same company.

Success criteria:
- [ ] Chip shows company name immediately on session load (before any message sent)
- [ ] No surface shows `'Gesamter Workspace'` or `tenant_default_company`
- [ ] `setup_required = true` path shows setup-required card (not a blank/broken hole)
- [ ] MoraHub Overview and MemorySidebar agree with ChatPane scope

### Step 5: Report deliverables

Collect and report:
- Final UI SHA (`git rev-parse HEAD`)
- Exact files changed (`git diff ad5b96d HEAD --name-only`)
- Before/after summary for each surface
- Any surface that still feels too vague despite implementation (for follow-up)

---

## Commit sequence summary

| # | Message | Files |
|---|---|---|
| 1 | `feat(scope): extend UserProfile and User with session operational contract fields` | `coreClient.ts`, `moraState.ts` |
| 2 | `feat(scope): add isOperational and scopeSource to useMoraContext snapshot` | `useMoraContext.ts`, `__tests__/lib/mora/useMoraContext.test.ts` |
| 3 | `fix(scope): remove Gesamter Workspace vague scope label from IntelligenceContextBar` | `IntelligenceContextBar.tsx` |
| 4 | `feat(scope): gate ChatPane composer on isOperational with setup-required card` | `ChatPane.tsx` |
| 5 | `feat(scope): gate MoraHub overview on isOperational with setup-required state` | `MoraHubPane.tsx` |
| 6 | `feat(scope): suppress MemorySidebar memory input when not operational` | `MemorySidebar.tsx` |
